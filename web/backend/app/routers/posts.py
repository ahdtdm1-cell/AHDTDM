import os
import json
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
import bleach

from app.database import get_db
from app.models import Post, PostReaction, PostComment, User, Notification
from app.schemas import (
    PostCreate, PostResponse, PostReactionCreate,
    PostCommentCreate, PostCommentResponse, UserResponse
)
from app.security import get_current_user, get_optional_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/posts", tags=["Social Posts"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

def serialize_post(post: Post, current_user_id: Optional[int] = None) -> dict:
    user_reaction = None
    breakdown = {}
    if post.reactions:
        for r in post.reactions:
            breakdown[r.reaction_type] = breakdown.get(r.reaction_type, 0) + 1
            if current_user_id and r.user_id == current_user_id:
                user_reaction = r.reaction_type

    # Format media_urls
    media = []
    if post.media_urls:
        try:
            media = json.loads(post.media_urls)
        except Exception:
            media = [post.media_urls]

    latest_comments_data = []
    if post.comments:
        for c in post.comments[-3:]:  # latest 3 comments
            latest_comments_data.append({
                "id": c.id,
                "post_id": c.post_id,
                "author_id": c.author_id,
                "author": c.author,
                "parent_id": c.parent_id,
                "content": c.content,
                "media_url": c.media_url,
                "likes_count": c.likes_count,
                "created_at": c.created_at
            })

    return {
        "id": post.id,
        "author_id": post.author_id,
        "author": post.author,
        "content": post.content,
        "media_urls": json.dumps(media) if media else None,
        "privacy": post.privacy,
        "likes_count": post.likes_count,
        "comments_count": post.comments_count,
        "shares_count": post.shares_count,
        "is_pinned": post.is_pinned,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "user_reaction": user_reaction,
        "reactions_breakdown": breakdown,
        "latest_comments": latest_comments_data
    }


@router.get("", response_model=List[PostResponse])
def get_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    query = db.query(Post).options(
        joinedload(Post.author),
        joinedload(Post.reactions),
        joinedload(Post.comments).joinedload(PostComment.author)
    )

    if user_id:
        query = query.filter(Post.author_id == user_id)
        # Privacy filter
        if not current_user or current_user.id != user_id:
            query = query.filter(Post.privacy == "public")
    else:
        # Feed view: public posts or author's own posts
        if current_user:
            query = query.filter((Post.privacy == "public") | (Post.author_id == current_user.id))
        else:
            query = query.filter(Post.privacy == "public")

    posts = query.order_by(desc(Post.created_at)).offset(skip).limit(limit).all()
    uid = current_user.id if current_user else None
    return [serialize_post(p, uid) for p in posts]


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_content = bleach.clean(payload.content.strip(), tags=[], strip=True)
    if not clean_content and not payload.media_urls:
        raise HTTPException(status_code=400, detail="Nội dung bài viết hoặc ảnh không được để trống.")

    media_json = json.dumps(payload.media_urls) if payload.media_urls else None

    post = Post(
        author_id=current_user.id,
        content=clean_content,
        media_urls=media_json,
        privacy=payload.privacy or "public"
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    serialized = serialize_post(post, current_user.id)
    # Broadcast to online users via WebSocket
    try:
        await manager.broadcast_all({
            "type": "new_post",
            "post": {
                "id": post.id,
                "content": post.content,
                "author_id": post.author_id,
                "author_name": current_user.display_name or current_user.username,
                "created_at": post.created_at.isoformat()
            }
        })
    except Exception:
        pass

    return serialized


@router.get("/{post_id}", response_model=PostResponse)
def get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    post = db.query(Post).options(
        joinedload(Post.author),
        joinedload(Post.reactions),
        joinedload(Post.comments).joinedload(PostComment.author)
    ).filter(Post.id == post_id).first()

    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    if post.privacy == "private" and (not current_user or current_user.id != post.author_id):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem bài viết này.")

    uid = current_user.id if current_user else None
    return serialize_post(post, uid)


@router.delete("/{post_id}", status_code=status.HTTP_200_OK)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    # IDOR Check: Only the author or an admin can delete the post
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bài viết này."
        )

    db.delete(post)
    db.commit()
    return {"message": "Đã xóa bài viết thành công."}


@router.post("/{post_id}/react")
async def react_to_post(
    post_id: int,
    payload: PostReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    existing_reaction = db.query(PostReaction).filter(
        PostReaction.post_id == post_id,
        PostReaction.user_id == current_user.id
    ).first()

    user_reaction = None
    if existing_reaction:
        if existing_reaction.reaction_type == payload.reaction_type:
            # Toggle off
            db.delete(existing_reaction)
            post.likes_count = max(0, post.likes_count - 1)
            user_reaction = None
        else:
            # Change reaction type
            existing_reaction.reaction_type = payload.reaction_type
            user_reaction = payload.reaction_type
    else:
        # New reaction
        new_r = PostReaction(
            post_id=post_id,
            user_id=current_user.id,
            reaction_type=payload.reaction_type
        )
        db.add(new_r)
        post.likes_count += 1
        user_reaction = payload.reaction_type

        # Create notification if reacting to another user's post
        if post.author_id != current_user.id:
            notif = Notification(
                recipient_id=post.author_id,
                actor_id=current_user.id,
                type="post_reaction",
                reference_id=post.id,
                content=f"{current_user.display_name or current_user.username} đã bày tỏ cảm xúc về bài viết của bạn."
            )
            db.add(notif)
            try:
                await manager.send_personal_message(post.author_id, {
                    "type": "notification",
                    "notification": {
                        "type": "post_reaction",
                        "actor_name": current_user.display_name or current_user.username,
                        "content": notif.content,
                        "reference_id": post.id
                    }
                })
            except Exception:
                pass

    db.commit()
    db.refresh(post)

    return {
        "post_id": post.id,
        "likes_count": post.likes_count,
        "user_reaction": user_reaction
    }


@router.post("/{post_id}/comments", response_model=PostCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: int,
    payload: PostCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài viết.")

    clean_content = bleach.clean(payload.content.strip(), tags=[], strip=True)
    if not clean_content and not payload.media_url:
        raise HTTPException(status_code=400, detail="Bình luận không được để trống.")

    comment = PostComment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=payload.parent_id,
        content=clean_content,
        media_url=payload.media_url
    )
    db.add(comment)
    post.comments_count += 1

    # Create notification if commenting on another user's post
    if post.author_id != current_user.id:
        notif = Notification(
            recipient_id=post.author_id,
            actor_id=current_user.id,
            type="post_comment",
            reference_id=post.id,
            content=f"{current_user.display_name or current_user.username} đã bình luận bài viết của bạn: \"{clean_content[:30]}...\""
        )
        db.add(notif)
        try:
            await manager.send_personal_message(post.author_id, {
                "type": "notification",
                "notification": {
                    "type": "post_comment",
                    "actor_name": current_user.display_name or current_user.username,
                    "content": notif.content,
                    "reference_id": post.id
                }
            })
        except Exception:
            pass

    db.commit()
    db.refresh(comment)

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_200_OK)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(PostComment).filter(PostComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")

    post = db.query(Post).filter(Post.id == comment.post_id).first()

    # IDOR check: author of comment, author of post, or admin
    if comment.author_id != current_user.id and (post and post.author_id != current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này.")

    if post and post.comments_count > 0:
        post.comments_count -= 1

    db.delete(comment)
    db.commit()
    return {"message": "Đã xóa bình luận thành công."}


@router.post("/upload-media")
async def upload_post_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP).")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Kích thước ảnh vượt quá giới hạn 10MB.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        ext = ".jpg"

    safe_filename = f"post_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/{safe_filename}"}
