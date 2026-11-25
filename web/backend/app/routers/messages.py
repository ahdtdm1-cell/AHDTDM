import os
import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, and_, or_, func
import bleach

from app.database import get_db
from app.models import Conversation, ConversationParticipant, Message, MessageReaction, User, Notification
from app.schemas import (
    ConversationResponse, ConversationCreate, MessageResponse,
    MessageCreate, MessageReactionCreate, MessageReactionResponse,
    UserResponse
)
from app.security import get_current_user
from app.websocket_manager import manager
from app.services.image_optimizer import process_and_save_image

router = APIRouter(prefix="", tags=["Messenger"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024

def serialize_message(msg: Message) -> dict:
    content = "Tin nhắn đã bị thu hồi" if msg.is_unsent else msg.content
    reactions_data = []
    if msg.reactions:
        for r in msg.reactions:
            reactions_data.append({
                "id": r.id,
                "message_id": r.message_id,
                "user_id": r.user_id,
                "emoji": r.emoji,
                "created_at": r.created_at,
                "user": r.user
            })

    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "sender_id": msg.sender_id,
        "sender": msg.sender,
        "content": content,
        "message_type": msg.message_type,
        "media_url": None if msg.is_unsent else msg.media_url,
        "reply_to_id": msg.reply_to_id,
        "is_unsent": msg.is_unsent,
        "created_at": msg.created_at,
        "reactions": reactions_data
    }


MESSAGE_NOTIFICATION_DEDUPE_MINUTES = 5


def create_offline_message_notifications(
    db: Session,
    conversation_id: int,
    conversation: Optional[Conversation],
    sender: User,
    recipient_ids: List[int],
) -> List[Notification]:
    """Create (or refresh) a notification for recipients who are currently offline.

    Notifications are de-duplicated per (sender, recipient, conversation) within a
    short window so a burst of messages does not flood the notification list.
    """
    if not recipient_ids:
        return []

    cutoff = datetime.utcnow() - timedelta(minutes=MESSAGE_NOTIFICATION_DEDUPE_MINUTES)
    sender_name = sender.display_name or sender.username
    conversation_title = conversation.title if conversation and conversation.is_group else None
    if conversation_title:
        content = f"{sender_name} đã gửi tin nhắn mới trong nhóm \"{conversation_title}\"."
    else:
        content = f"{sender_name} đã gửi cho bạn tin nhắn mới."

    touched: List[Notification] = []
    for recipient_id in recipient_ids:
        if manager.is_user_online(recipient_id):
            continue

        existing = db.query(Notification).filter(
            Notification.recipient_id == recipient_id,
            Notification.actor_id == sender.id,
            Notification.type == "message",
            Notification.reference_id == conversation_id,
            Notification.created_at >= cutoff,
        ).order_by(desc(Notification.created_at)).first()

        if existing:
            # Re-surface the notification if the recipient already read the previous one.
            if existing.is_read:
                existing.is_read = False
                existing.content = content
                existing.created_at = datetime.utcnow()
                touched.append(existing)
            continue

        notif = Notification(
            recipient_id=recipient_id,
            actor_id=sender.id,
            type="message",
            reference_id=conversation_id,
            content=content,
        )
        db.add(notif)
        touched.append(notif)

    if touched:
        db.commit()
        for notif in touched:
            db.refresh(notif)

    return touched


def serialize_notification(notif: Notification, actor: User) -> dict:
    return {
        "id": notif.id,
        "recipient_id": notif.recipient_id,
        "actor_id": notif.actor_id,
        "actor": {
            "id": actor.id,
            "username": actor.username,
            "display_name": actor.display_name,
            "avatar_url": actor.avatar_url,
            "role": actor.role,
            "created_at": actor.created_at.isoformat() if actor.created_at else None,
        },
        "type": notif.type,
        "reference_id": notif.reference_id,
        "content": notif.content,
        "is_read": notif.is_read,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }


def _serialize_participants(participants: List[ConversationParticipant]) -> List[dict]:
    serialized = []
    for p in participants:
        user_data = None
        if p.user:
            user_resp = UserResponse.model_validate(p.user)
            user_resp.is_online = manager.is_user_online(p.user.id)
            user_data = user_resp
        serialized.append({
            "id": p.id,
            "conversation_id": p.conversation_id,
            "user_id": p.user_id,
            "nickname": p.nickname,
            "role": p.role,
            "last_read_message_id": p.last_read_message_id,
            "joined_at": p.joined_at,
            "user": user_data
        })
    return serialized


@router.get("/conversations", response_model=List[ConversationResponse])
def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all conversations where current user is a participant
    participant_records = db.query(ConversationParticipant).filter(
        ConversationParticipant.user_id == current_user.id
    ).all()
    conv_ids = [p.conversation_id for p in participant_records]

    if not conv_ids:
        return []

    # Unread counts in one query: messages newer than the participant's read marker.
    unread_rows = db.query(
        Message.conversation_id,
        func.count(Message.id)
    ).join(
        ConversationParticipant,
        and_(
            ConversationParticipant.conversation_id == Message.conversation_id,
            ConversationParticipant.user_id == current_user.id
        )
    ).filter(
        Message.conversation_id.in_(conv_ids),
        Message.sender_id != current_user.id,
        Message.is_unsent == False,
        Message.id > func.coalesce(ConversationParticipant.last_read_message_id, 0)
    ).group_by(Message.conversation_id).all()

    unread_map = {conversation_id: count for conversation_id, count in unread_rows}

    conversations = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user)
    ).filter(
        Conversation.id.in_(conv_ids)
    ).order_by(desc(Conversation.last_message_at)).all()

    result = []
    for conv in conversations:
        # Get unread count from precomputed map
        unread_count = unread_map.get(conv.id, 0)

        # Format title & avatar for 1-1 conversation if not set
        title = conv.title
        avatar = conv.avatar_url
        if not conv.is_group:
            other_part = next((p for p in conv.participants if p.user_id != current_user.id), None)
            if other_part and other_part.user:
                title = other_part.user.display_name or other_part.user.username
                avatar = other_part.user.avatar_url

        conv_dict = {
            "id": conv.id,
            "is_group": conv.is_group,
            "title": title,
            "avatar_url": avatar,
            "last_message_text": conv.last_message_text,
            "last_message_at": conv.last_message_at,
            "created_at": conv.created_at,
            "participants": _serialize_participants(conv.participants),
            "unread_count": unread_count
        }
        result.append(conv_dict)

    return result


@router.post("/conversations/direct/{user_id}", response_model=ConversationResponse)
def get_or_create_direct_conversation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Không thể tạo cuộc trò chuyện với chính mình.")

    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    # Search for an existing direct (non-group) conversation between these 2 users
    p1_convs = db.query(ConversationParticipant.conversation_id).join(Conversation).filter(
        Conversation.is_group == False,
        ConversationParticipant.user_id == current_user.id
    ).scalar_subquery()

    shared_conv = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user)
    ).join(ConversationParticipant).filter(
        Conversation.id.in_(p1_convs),
        ConversationParticipant.user_id == user_id
    ).first()

    if shared_conv:
        return {
            "id": shared_conv.id,
            "is_group": False,
            "title": other_user.display_name or other_user.username,
            "avatar_url": other_user.avatar_url,
            "last_message_text": shared_conv.last_message_text,
            "last_message_at": shared_conv.last_message_at,
            "created_at": shared_conv.created_at,
            "participants": _serialize_participants(shared_conv.participants),
            "unread_count": 0
        }

    # Create new direct conversation
    new_conv = Conversation(is_group=False)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    part1 = ConversationParticipant(conversation_id=new_conv.id, user_id=current_user.id, role="member")
    part2 = ConversationParticipant(conversation_id=new_conv.id, user_id=user_id, role="member")
    db.add_all([part1, part2])
    db.commit()

    conv_fresh = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user)
    ).filter(Conversation.id == new_conv.id).first()

    return {
        "id": conv_fresh.id,
        "is_group": False,
        "title": other_user.display_name or other_user.username,
        "avatar_url": other_user.avatar_url,
        "last_message_text": conv_fresh.last_message_text,
        "last_message_at": conv_fresh.last_message_at,
        "created_at": conv_fresh.created_at,
        "participants": _serialize_participants(conv_fresh.participants),
        "unread_count": 0
    }


@router.post("/conversations/group", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_group_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_members = set(payload.participant_ids)
    all_members.add(current_user.id)

    if len(all_members) < 2:
        raise HTTPException(status_code=400, detail="Nhóm chat cần ít nhất 2 thành viên.")

    group = Conversation(
        is_group=True,
        title=payload.title or "Nhóm chat mới"
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    for uid in all_members:
        role = "admin" if uid == current_user.id else "member"
        db.add(ConversationParticipant(conversation_id=group.id, user_id=uid, role=role))
    db.commit()

    fresh_group = db.query(Conversation).options(
        joinedload(Conversation.participants).joinedload(ConversationParticipant.user)
    ).filter(Conversation.id == group.id).first()

    return {
        "id": fresh_group.id,
        "is_group": True,
        "title": fresh_group.title,
        "avatar_url": fresh_group.avatar_url,
        "last_message_text": None,
        "last_message_at": fresh_group.last_message_at,
        "created_at": fresh_group.created_at,
        "participants": fresh_group.participants,
        "unread_count": 0
    }


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[int] = Query(None, description="Cursor for historical message pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Security / IDOR check: Is current user a participant?
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập cuộc trò chuyện này.")

    query = db.query(Message).options(
        joinedload(Message.sender),
        joinedload(Message.reactions).joinedload(MessageReaction.user)
    ).filter(
        Message.conversation_id == conversation_id
    )

    if before_id is not None:
        query = query.filter(Message.id < before_id)
        # Fetch the N messages immediately preceding before_id (descending), then reverse to maintain chronological order
        messages = query.order_by(Message.id.desc()).offset(skip).limit(limit).all()
        messages.reverse()
    else:
        # Normal conversation load: oldest to newest
        messages = query.order_by(Message.created_at.asc()).offset(skip).limit(limit).all()

    # Update last_read_message_id
    if messages and participant:
        max_id = max(m.id for m in messages)
        participant.last_read_message_id = max_id
        # Reading the conversation also clears its "new message" notifications.
        db.query(Notification).filter(
            Notification.recipient_id == current_user.id,
            Notification.type == "message",
            Notification.reference_id == conversation_id,
            Notification.is_read == False,
        ).update({"is_read": True}, synchronize_session=False)
        db.commit()

    return [serialize_message(m) for m in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()

    if not participant and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không thuộc cuộc trò chuyện này.")

    clean_content = bleach.clean(payload.content.strip(), tags=[], strip=True) if payload.content else None
    if not clean_content and not payload.media_url:
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống.")

    msg = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=clean_content,
        message_type=payload.message_type or "text",
        media_url=payload.media_url,
        reply_to_id=payload.reply_to_id
    )
    db.add(msg)

    # Update conversation last message
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.last_message_text = clean_content or "[Hình ảnh]"
        conv.last_message_at = datetime.utcnow()

    db.commit()
    db.refresh(msg)

    # Automatically mark as read for sender
    if participant:
        participant.last_read_message_id = msg.id
        db.commit()

    serialized = serialize_message(msg)

    # Realtime push via WebSocket
    try:
        participants = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id
        ).all()
        participant_ids = [p.user_id for p in participants]

        # Notify participants who are offline (online users already receive chat_message).
        offline_notifications = create_offline_message_notifications(
            db,
            conversation_id=conversation_id,
            conversation=conv,
            sender=current_user,
            recipient_ids=[uid for uid in participant_ids if uid != current_user.id],
        )

        await manager.broadcast_to_users(participant_ids, {
            "type": "chat_message",
            "message": {
                "id": msg.id,
                "conversation_id": conversation_id,
                "sender_id": current_user.id,
                "sender_name": current_user.display_name or current_user.username,
                "sender_avatar": current_user.avatar_url,
                "sender": {
                    "id": current_user.id,
                    "username": current_user.username,
                    "display_name": current_user.display_name,
                    "avatar_url": current_user.avatar_url,
                    "role": current_user.role,
                    "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
                    "is_online": True,
                },
                "content": serialized["content"],
                "media_url": msg.media_url,
                "message_type": msg.message_type,
                "is_unsent": False,
                "reactions": [],
                "created_at": msg.created_at.isoformat()
            }
        })

        for notif in offline_notifications:
            await manager.send_personal_message(notif.recipient_id, {
                "type": "notification",
                "notification": serialize_notification(notif, current_user)
            })
    except Exception:
        pass

    return serialized


@router.put("/messages/{message_id}/unsend", response_model=MessageResponse)
async def unsend_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")

    if msg.sender_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn chỉ có thể thu hồi tin nhắn của chính mình.")

    msg.is_unsent = True
    db.commit()
    db.refresh(msg)

    # Broadcast unsend event
    try:
        participants = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == msg.conversation_id
        ).all()
        p_ids = [p.user_id for p in participants]
        await manager.broadcast_to_users(p_ids, {
            "type": "message_unsent",
            "message_id": msg.id,
            "conversation_id": msg.conversation_id
        })
    except Exception:
        pass

    return serialize_message(msg)


@router.post("/messages/{message_id}/react")
async def react_to_message(
    message_id: int,
    payload: MessageReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn.")

    # Check participant
    part = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == msg.conversation_id,
        ConversationParticipant.user_id == current_user.id
    ).first()
    if not part and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Bạn không thuộc cuộc trò chuyện này.")

    existing = db.query(MessageReaction).filter(
        MessageReaction.message_id == message_id,
        MessageReaction.user_id == current_user.id
    ).first()

    if existing:
        if existing.emoji == payload.emoji:
            db.delete(existing)
            active_emoji = None
        else:
            existing.emoji = payload.emoji
            active_emoji = payload.emoji
    else:
        new_react = MessageReaction(
            message_id=message_id,
            user_id=current_user.id,
            emoji=payload.emoji
        )
        db.add(new_react)
        active_emoji = payload.emoji

    db.commit()

    # Broadcast reaction
    try:
        parts = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == msg.conversation_id
        ).all()
        p_ids = [p.user_id for p in parts]
        await manager.broadcast_to_users(p_ids, {
            "type": "message_reaction",
            "message_id": msg.id,
            "conversation_id": msg.conversation_id,
            "user_id": current_user.id,
            "emoji": active_emoji
        })
    except Exception:
        pass

    return {
        "message_id": message_id,
        "emoji": active_emoji
    }


@router.post("/conversations/upload-media")
async def upload_chat_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP).")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Kích thước tệp vượt quá 10MB.")

    safe_name = process_and_save_image(contents, UPLOAD_DIR, prefix="chat", is_avatar=False)
    return {"url": f"/uploads/{safe_name}"}
