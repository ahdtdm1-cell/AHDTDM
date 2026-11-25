from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
import os
import shutil
from pathlib import Path

from app.database import get_db
from app.models import User
from app.schemas import UserResponse, PublicUserProfileResponse, UserProfileUpdate, UserPasswordUpdate, EncryptedPayload
from app.crypto import decrypt_payload
from app.security import get_current_user, get_optional_current_user, verify_password, get_password_hash
from app.services.image_optimizer import process_and_save_image
from app.services.presence import update_user_presence
from app.websocket_manager import manager
from pydantic import ValidationError

router = APIRouter(prefix="/users", tags=["users"])


def _with_live_online(schema_cls, user: User):
    resp = schema_cls.model_validate(user)
    resp.is_online = manager.is_user_online(user.id)
    return resp


@router.get("", response_model=List[PublicUserProfileResponse])
def search_users(
    search: Optional[str] = Query(None, min_length=1, max_length=50),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search users by username or display name with live online status."""
    query = db.query(User).filter(User.id != current_user.id)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(User.username.ilike(term), User.display_name.ilike(term))
        )
    users = query.order_by(User.username.asc()).limit(limit).all()
    return [_with_live_online(PublicUserProfileResponse, u) for u in users]


@router.get("/me/profile", response_model=UserResponse)
def get_user_profile(current_user: User = Depends(get_current_user)):
    """
    Get the current user's profile information.
    Returns 200 with profile data if authenticated, 401 if not.
    """
    return _with_live_online(UserResponse, current_user)


@router.post("/me/heartbeat")
async def user_presence_heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Keep user presence alive when WebSocket is unavailable (e.g. serverless proxy)."""
    came_online = manager.touch_heartbeat(current_user.id)
    now = datetime.utcnow()
    last_seen = current_user.last_seen
    was_offline = not current_user.is_online or not last_seen or (now - last_seen).total_seconds() >= 15
    if was_offline:
        current_user.is_online = True
        current_user.last_seen = now
        db.commit()
        # Persist presence with row-level locking to prevent race conditions
        await update_user_presence(current_user.id, True, db=db)

    if came_online:
        await manager.broadcast_presence(current_user.id, True, exclude_user_id=current_user.id)

    return {
        "status": "ok",
        "online_user_ids": manager.get_online_user_ids()
    }


@router.post("/me/offline")
async def user_presence_offline(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Best-effort offline notification on tab close when no WebSocket is active."""
    if not current_user:
        return {"status": "ignored"}

    manager.clear_heartbeat(current_user.id)
    if not manager.is_user_online(current_user.id):
        current_user.is_online = False
        current_user.last_seen = datetime.utcnow()
        db.commit()
        # Persist presence with row-level locking before broadcasting
        await update_user_presence(current_user.id, False, db=db)
        await manager.broadcast_presence(current_user.id, False, exclude_user_id=current_user.id)

    return {"status": "ok"}


@router.get("/{user_id}", response_model=PublicUserProfileResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get profile information for a user.
    Requires authentication to prevent unauthenticated IDOR reconnaissance.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return _with_live_online(PublicUserProfileResponse, user)


@router.put("/me/profile", response_model=UserResponse)
def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information.
    All fields are optional - only provided fields will be updated.
    Returns 200 with updated profile data.
    """
    # Update only the fields that were provided (not None)
    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url
    if profile_data.cover_url is not None:
        current_user.cover_url = profile_data.cover_url
    if profile_data.display_name is not None:
        current_user.display_name = profile_data.display_name
    if profile_data.bio is not None:
        current_user.bio = profile_data.bio
    if profile_data.website_url is not None:
        current_user.website_url = profile_data.website_url
    if profile_data.location is not None:
        current_user.location = profile_data.location

    # updated_at will be automatically updated by SQLAlchemy due to onupdate=datetime.utcnow

    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật hồ sơ: {str(e)}")

    return current_user

@router.put("/me/password")
def update_password(encrypted_payload: EncryptedPayload, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    decrypted_data = decrypt_payload(encrypted_payload.encrypted_key, encrypted_payload.payload)
    try:
        password_data = UserPasswordUpdate(**decrypted_data)
    except ValidationError as e:
        error_msg = e.errors()[0].get("msg", "Dữ liệu mật khẩu không hợp lệ.")
        if "Value error, " in error_msg:
            error_msg = error_msg.replace("Value error, ", "")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    """
    Update the current user's password.
    """
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()
    return {"message": "Mật khẩu đã được thay đổi thành công"}

@router.post("/me/avatar", response_model=dict)
def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload avatar image for the current user.
    Validates file type and size, saves the file, and updates the user's avatar_url.
    Returns 200 with avatar URL on success.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )

    # Validate file size (5MB limit)
    max_size = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )

    # Process & optimize avatar image
    contents = file.file.read()
    file.file.close()

    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )
    
    unique_filename = process_and_save_image(contents, "uploads/avatars", prefix="avatar", is_avatar=True)

    # Update user's avatar_url in database
    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    return {
        "avatar_url": avatar_url,
        "message": "Avatar uploaded successfully"
    }

@router.post("/me/cover", response_model=dict)
def upload_cover(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload cover image for the current user.
    """
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )

    max_size = 5 * 1024 * 1024  # 5MB
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )

    contents = file.file.read()
    file.file.close()

    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum allowed size is 5MB."
        )

    unique_filename = process_and_save_image(contents, "uploads/covers", prefix="cover", is_avatar=False)

    cover_url = f"/uploads/covers/{unique_filename}"
    current_user.cover_url = cover_url
    db.commit()
    db.refresh(current_user)

    return {
        "cover_url": cover_url,
        "message": "Cover uploaded successfully"
    }