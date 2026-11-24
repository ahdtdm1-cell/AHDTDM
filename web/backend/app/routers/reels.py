import os
import json
import uuid
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import desc, func, or_, and_
import bleach

from app.database import get_db
from app.models import Reel, Reaction, ReelComment, User, Friendship, Notification
from app.schemas import (
    ReelCreate,
    ReelResponse,
    ReelCommentCreate,
    ReelCommentResponse,
    PostReactionCreate,
    UserResponse
)
from app.security import get_current_user, get_optional_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/reels", tags=["Reels"])

UPLOAD_DIR = "uploads/reels"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed video MIME types
ALLOWED_VIDEO_MIME_TYPES = [
    "video/mp4",
    "video/quicktime",
    "video/x-m4v",
    "video/webm",
    "video/ogg",
    "video/3gpp",
]
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB for reels


def serialize_reel(reel: Reel, current_user_id: Optional[int] = None) -> dict:
    """Serialize Reel model to response dict with reaction/comment breakdown."""
    breakdown = {}
    user_reaction = None

    if reel.reactions:
        for r in reel.reactions:
            breakdown[r.reaction_type] = breakdown.get(r.reaction_type, 0) + 1
            if current_user_id and r.user_id == current_user_id:
                user_reaction = r.reaction_type

    latest_comments = []
    if reel.comments:
        for c in reel.comments[-3:]:  # latest 3 comments
            latest_comments.append({
                "id": c.id,
                "reel_id": c.reel_id,
                "author_id": c.author_id,
                "parent_id": c.parent_id,
                "content": c.content,
                "created_at": c.created_at
            })

    return {
        "id": reel.id,
        "author_id": reel.author_id,
        "author": reel.author,
        "content": reel.content,
        "thumbnail_url": reel.thumbnail_url,
        "privacy": reel.privacy,
        "likes_count": reel.likes_count,
        "comments_count": reel.comments_count,
        "views_count": reel.views_count,
        "expires_at": reel.expires_at,
        "created_at": reel.created_at,
        "user_reaction": user_reaction,
        "reactions_breakdown": breakdown,
    }


def check_reel_access(db: Session, reel_id: int, current_user: Optional[User]) -> bool:
    """Check if current_user can view this reel based on privacy settings."""
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        return False

    if reel.privacy == "public":
        return True
    elif reel.privacy == "friends":
        if not current_user:
            return False
        # Check if current_user is a friend of reel.author
        friendship = db.query(Friendship).filter(
            or_(
                and_(Friendship.user_id == current_user.id, Friendship.friend_id == reel.author_id),
                and_(Friendship.user_id == reel.author_id, Friendship.friend_id == current_user.id)
            )
        ).first()
        return friendship is not None and friendship.status == "accepted"
    elif reel.privacy == "private":
        return current_user is not None and current_user.id == reel.author_id
    return False


@router.get("", response_model=List[ReelResponse])
def get_reel_feed(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    cursor_id: Optional[int] = Query(None, description="Cursor for pagination: fetch reels with id < cursor_id"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get feed of reels with privacy filtering and cursor-based pagination."""
    query = db.query(Reel).options(
        joinedload(Reel.author),
        selectinload(Reel.reactions),
        selectinload(Reel.comments)
    ).filter(Reel.expires_at > func.now())  # Only show non-expired reels

    if cursor_id is not None:
        query = query.filter(Reel.id < cursor_id)

    # Privacy filter
    if current_user:
        # Show public reels + author's own reels
        query = query.filter(
            or_(
                Reel.privacy == "public",
                Reel.author_id == current_user.id
            )
        )
    else:
        query = query.filter(Reel.privacy == "public")

    reels = query.order_by(desc(Reel.id)).offset(skip).limit(limit).all()
    uid = current_user.id if current_user else None
    return [serialize_reel(r, uid) for r in reels]


@router.post("", response_model=ReelResponse, status_code=status.HTTP_201_CREATED)
async def create_reel(
    content: str = Form(..., description="Video content URL/path"),
    privacy: str = Form("public", description="Privacy level: public, friends, private"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new reel with video upload."""
    # Create payload from form data
    payload = ReelCreate(content=content, privacy=privacy)

    # Validate file type
    if file.content_type not in ALLOWED_VIDEO_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Định dạng video không được hỗ trợ. Các định dạng được phép: {', '.join(ALLOWED_VIDEO_MIME_TYPES)}"
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Kích thước video vượt quá giới hạn 100MB."
        )

    # Generate unique ID and thumbnail
    unique_id = uuid.uuid4().hex
    thumbnail_url = None

    # Try to extract thumbnail from video first frame
    try:
        from PIL import Image
        import io
        # Try to read as image (works for first frame of video)
        image = Image.open(io.BytesIO(contents[:2 * 1024 * 1024]))  # Read first 2MB for thumbnail
        image.thumbnail((320, 180), Image.Resampling.LANCZOS)
        thumb_filename = f"thumb_{unique_id}.webp"
        thumb_filepath = os.path.join(UPLOAD_DIR, thumb_filename)
        image.save(thumb_filepath, format="WEBP", quality=82, method=4)
        thumbnail_url = f"/uploads/reels/{thumb_filename}"
    except Exception:
        # If video processing fails, create a placeholder
        thumbnail_url = None

    # Set expires_at: 24 hours from now (like Facebook reel)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    # Store video file
    video_filename = f"{unique_id}.mp4"
    video_filepath = os.path.join(UPLOAD_DIR, video_filename)
    with open(video_filepath, "wb") as f:
        f.write(contents)
    video_url = f"/uploads/reels/{video_filename}"

    # Create reel record
    reel = Reel(
        author_id=current_user.id,
        content=video_url,
        thumbnail_url=thumbnail_url,
        privacy=payload.privacy,
        expires_at=expires_at
    )
    db.add(reel)
    db.commit()
    db.refresh(reel)

    # Broadcast new reel via WebSocket
    try:
        await manager.broadcast_all({
            "type": "new_reel",
            "reel": {
                "id": reel.id,
                "content": reel.content,
                "author_id": reel.author_id,
                "author_name": current_user.display_name or current_user.username,
                "author_avatar": current_user.avatar_url,
                "created_at": reel.created_at.isoformat(),
                "expires_at": reel.expires_at.isoformat()
            }
        })
    except Exception:
        pass

    return {
        "id": reel.id,
        "author_id": reel.author_id,
        "author": current_user,
        "content": reel.content,
        "thumbnail_url": reel.thumbnail_url,
        "privacy": reel.privacy,
        "likes_count": reel.likes_count,
        "comments_count": reel.comments_count,
        "views_count": reel.views_count,
        "expires_at": reel.expires_at,
        "created_at": reel.created_at,
        "user_reaction": None,
        "reactions_breakdown": {},
    }


@router.post("/{reel_id}/react", status_code=status.HTTP_200_OK)
async def react_to_reel(
    reel_id: int,
    payload: PostReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """React to a reel with like/love/etc."""
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Không tìm thấy reel.")

    # Check if reel expired
    now = datetime.now(timezone.utc)
    expires_at = reel.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=410, detail="Reel đã hết hạn và bị xóa.")

    existing_reaction = db.query(Reaction).filter(
        Reaction.reel_id == reel_id,
        Reaction.user_id == current_user.id
    ).first()

    user_reaction = None
    if existing_reaction:
        if existing_reaction.reaction_type == payload.reaction_type:
            # Toggle off
            db.delete(existing_reaction)
            reel.likes_count = max(0, reel.likes_count - 1)
            user_reaction = None
        else:
            # Change reaction type
            existing_reaction.reaction_type = payload.reaction_type
            user_reaction = payload.reaction_type
    else:
        # New reaction
        new_r = Reaction(
            reel_id=reel_id,
            user_id=current_user.id,
            reaction_type=payload.reaction_type
        )
        db.add(new_r)
        reel.likes_count += 1
        user_reaction = payload.reaction_type

    # Create notification if reacting to another user's reel
    notification = None
    if reel.author_id != current_user.id:
        notification = Notification(
            recipient_id=reel.author_id,
            actor_id=current_user.id,
            type="post_reaction",  # Reuse existing notification type
            reference_id=reel.id,
            content=f"{current_user.display_name or current_user.username} đã bày tỏ cảm xúc về reel của bạn."
        )
        db.add(notification)

    db.commit()
    db.refresh(reel)

    # Broadcast updated count via WebSocket
    try:
        await manager.send_personal_message(reel.author_id, {
            "type": "reel_reaction_update",
            "reel_id": reel.id,
            "likes_count": reel.likes_count,
            "user_reaction": user_reaction
        })
    except Exception:
        pass

    return {
        "reel_id": reel.id,
        "likes_count": reel.likes_count,
        "user_reaction": user_reaction
    }


@router.post("/{reel_id}/comments", response_model=ReelCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_reel_comment(
    reel_id: int,
    payload: ReelCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a reel."""
    reel = db.query(Reel).filter(Reel.id == reel_id).first()
    if not reel:
        raise HTTPException(status_code=404, detail="Không tìm thấy reel.")

    # Check access
    if not check_reel_access(db, reel_id, current_user):
        raise HTTPException(status_code=403, detail="Bạn không có quyền bình luận reel này.")

    clean_content = bleach.clean(payload.content.strip(), tags=[], strip=True)
    if not clean_content:
        raise HTTPException(status_code=400, detail="Bình luận không được để trống.")

    comment = ReelComment(
        reel_id=reel_id,
        author_id=current_user.id,
        parent_id=payload.parent_id,
        content=clean_content
    )
    db.add(comment)

    # Update comments_count
    reel.comments_count += 1

    # Create notification if commenting on another user's reel
    notification = None
    if reel.author_id != current_user.id:
        preview = clean_content[:30] if clean_content else "[Hình ảnh]"
        notification = Notification(
            recipient_id=reel.author_id,
            actor_id=current_user.id,
            type="post_comment",
            reference_id=reel.id,
            content=f"{current_user.display_name or current_user.username} đã bình luận reel của bạn: \"{preview}\""
        )
        db.add(notification)

    db.commit()
    db.refresh(comment)

    # Broadcast notification via WebSocket
    try:
        await manager.send_personal_message(reel.author_id, {
            "type": "reel_comment_update",
            "reel_id": reel.id,
            "comment_id": comment.id,
            "comment_author": current_user.display_name or current_user.username,
            "content": clean_content
        })
    except Exception:
        pass

    return comment


@router.delete("/comments/{comment_id}", status_code=status.HTTP_200_OK)
def delete_reel_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a comment from a reel."""
    comment = db.query(ReelComment).options(joinedload(ReelComment.reel)).filter(ReelComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Không tìm thấy bình luận.")

    # Check authorization: author of comment, or reel author, or admin
    if comment.author_id != current_user.id and comment.reel.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền xóa bình luận này.")

    reel = comment.reel
    db.delete(comment)

    # Decrement comments_count
    if reel.comments_count > 0:
        reel.comments_count -= 1

    db.commit()
    return {"message": "Đã xóa bình luận thành công."}


@router.get("/{reel_id}", response_model=ReelResponse)
def get_reel_detail(
    reel_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Get detailed view of a single reel."""
    reel = db.query(Reel).options(
        joinedload(Reel.author),
        selectinload(Reel.reactions),
        selectinload(Reel.comments)
    ).filter(Reel.id == reel_id).first()

    if not reel:
        raise HTTPException(status_code=404, detail="Không tìm thấy reel.")

    # Check access
    if not check_reel_access(db, reel_id, current_user):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem reel này.")

    uid = current_user.id if current_user else None
    return serialize_reel(reel, uid)