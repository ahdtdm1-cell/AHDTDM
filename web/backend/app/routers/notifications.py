from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.database import get_db
from app.models import Notification, User
from app.schemas import NotificationResponse
from app.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def get_user_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).options(
        joinedload(Notification.actor)
    ).filter(
        Notification.recipient_id == current_user.id
    )

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifs = query.order_by(desc(Notification.created_at)).offset(skip).limit(limit).all()

    return notifs


@router.put("/{notif_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.recipient_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all", status_code=status.HTTP_200_OK)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"message": "Đã đánh dấu tất cả thông báo là đã đọc.", "updated": updated}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(Notification).filter(
        Notification.recipient_id == current_user.id,
        Notification.is_read == False
    ).count()
    return {"unread_count": count}


@router.delete("/{notif_id}", status_code=status.HTTP_200_OK)
def delete_notification(
    notif_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.recipient_id == current_user.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")

    db.delete(notif)
    db.commit()
    return {"message": "Đã xóa thông báo.", "deleted": 1}


@router.delete("", status_code=status.HTTP_200_OK)
def clear_notifications(
    read_only: bool = Query(True, description="Chỉ xóa các thông báo đã đọc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Notification).filter(
        Notification.recipient_id == current_user.id
    )
    if read_only:
        query = query.filter(Notification.is_read == True)

    deleted = query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Đã xóa thông báo.", "deleted": deleted}
