from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models import Friendship, User, Notification
from app.schemas import FriendshipResponse, UserResponse
from app.security import get_current_user
from app.websocket_manager import manager

router = APIRouter(prefix="/friends", tags=["Friends"])

@router.post("/request/{friend_id}", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    friend_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể gửi lời mời kết bạn cho chính mình.")

    target_user = db.query(User).filter(User.id == friend_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Check existing friendship in either direction
    existing = db.query(Friendship).filter(
        or_(
            and_(Friendship.user_id == current_user.id, Friendship.friend_id == friend_id),
            and_(Friendship.user_id == friend_id, Friendship.friend_id == current_user.id)
        )
    ).first()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=400, detail="Hai bạn đã là bạn bè của nhau.")
        if existing.status == "pending":
            if existing.user_id == current_user.id:
                raise HTTPException(status_code=400, detail="Lời mời kết bạn đã được gửi trước đó.")
            else:
                # Target user had already sent a request to current_user -> auto accept!
                existing.status = "accepted"
                existing.updated_at = datetime.utcnow()
                db.commit()
                return {"id": existing.id, "status": "accepted", "message": "Đã chấp nhận lời mời kết bạn."}

    # Create new pending friendship
    friendship = Friendship(
        user_id=current_user.id,
        friend_id=friend_id,
        status="pending"
    )
    db.add(friendship)

    # Create notification for target_user
    notif = Notification(
        recipient_id=friend_id,
        actor_id=current_user.id,
        type="friend_request",
        reference_id=friendship.id,
        content=f"{current_user.display_name or current_user.username} đã gửi cho bạn lời mời kết bạn."
    )
    db.add(notif)
    db.commit()
    db.refresh(friendship)

    # Push realtime event
    try:
        await manager.send_personal_message(friend_id, {
            "type": "notification",
            "notification": {
                "type": "friend_request",
                "actor_id": current_user.id,
                "actor_name": current_user.display_name or current_user.username,
                "avatar_url": current_user.avatar_url,
                "content": notif.content
            }
        })
    except Exception:
        pass

    return {"id": friendship.id, "status": "pending", "message": "Đã gửi lời mời kết bạn thành công."}


@router.post("/accept/{request_id}", status_code=status.HTTP_200_OK)
async def accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời kết bạn.")

    # Only recipient can accept
    if friendship.friend_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền chấp nhận lời mời này.")

    friendship.status = "accepted"
    friendship.updated_at = datetime.utcnow()

    # Notify requester
    notif = Notification(
        recipient_id=friendship.user_id,
        actor_id=current_user.id,
        type="friend_accept",
        reference_id=friendship.id,
        content=f"{current_user.display_name or current_user.username} đã chấp nhận lời mời kết bạn của bạn."
    )
    db.add(notif)
    db.commit()

    try:
        await manager.send_personal_message(friendship.user_id, {
            "type": "notification",
            "notification": {
                "type": "friend_accept",
                "actor_id": current_user.id,
                "actor_name": current_user.display_name or current_user.username,
                "avatar_url": current_user.avatar_url,
                "content": notif.content
            }
        })
    except Exception:
        pass

    return {"id": friendship.id, "status": "accepted", "message": "Đã chấp nhận kết bạn."}


@router.post("/decline/{request_id}", status_code=status.HTTP_200_OK)
def decline_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Không tìm thấy lời mời kết bạn.")

    if friendship.friend_id != current_user.id and friendship.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền hủy lời mời này.")

    db.delete(friendship)
    db.commit()
    return {"message": "Đã từ chối hoặc hủy lời mời kết bạn."}


@router.get("/list", response_model=List[UserResponse])
def get_friends_list(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_uid = user_id or current_user.id

    friendships = db.query(Friendship).filter(
        or_(Friendship.user_id == target_uid, Friendship.friend_id == target_uid),
        Friendship.status == "accepted"
    ).all()

    friend_ids = []
    for f in friendships:
        if f.user_id == target_uid:
            friend_ids.append(f.friend_id)
        else:
            friend_ids.append(f.user_id)

    friends = db.query(User).filter(User.id.in_(friend_ids)).all() if friend_ids else []
    
    # Inject real-time online status from WebSocket manager
    result = []
    for u in friends:
        res = UserResponse.model_validate(u)
        res.is_online = manager.is_user_online(u.id)
        result.append(res)
    return result


@router.get("/requests")
def get_incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = db.query(Friendship).filter(
        Friendship.friend_id == current_user.id,
        Friendship.status == "pending"
    ).order_by(Friendship.created_at.desc()).all()

    output = []
    for r in requests:
        sender = db.query(User).filter(User.id == r.user_id).first()
        output.append({
            "id": r.id,
            "user_id": r.user_id,
            "friend_id": r.friend_id,
            "created_at": r.created_at,
            "sender": UserResponse.model_validate(sender) if sender else None
        })
    return output
