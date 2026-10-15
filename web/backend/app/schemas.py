import re
from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator

def validate_password_strength(v: str) -> str:
    if len(v) < 8:
        raise ValueError("Mật khẩu phải có tối thiểu 8 ký tự.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết thường.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa.")
    if not re.search(r"[0-9]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 chữ số.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
        raise ValueError("Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.")
    return v

# --- User & Auth Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, description="Tên đăng nhập")
    password: str = Field(..., min_length=8, max_length=100, description="Mật khẩu")
    captcha_token: Optional[str] = Field(None, description="Token mã CAPTCHA")
    captcha_answer: Optional[str] = Field(None, description="Đáp án mã CAPTCHA")

    @field_validator("password")
    @classmethod
    def check_password_complexity(cls, v: str) -> str:
        return validate_password_strength(v)

class UserLogin(BaseModel):
    username: str = Field(..., description="Tên đăng nhập")
    password: str = Field(..., description="Mật khẩu")
    captcha_token: Optional[str] = Field(None, description="Token mã CAPTCHA")
    captcha_answer: Optional[str] = Field(None, description="Đáp án mã CAPTCHA")

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    created_at: datetime
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PublicUserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None
    is_online: Optional[bool] = False
    last_seen: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AuthResponse(BaseModel):
    user: UserResponse

class UserProfileUpdate(BaseModel):
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    website_url: Optional[str] = None
    location: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

    @field_validator("new_password")
    @classmethod
    def check_new_password_complexity(cls, v: str) -> str:
        return validate_password_strength(v)

class EncryptedPayload(BaseModel):
    encrypted_key: str
    payload: str

# --- Guestbook Schemas ---
class GuestbookCreate(BaseModel):
    author_name: str = Field(..., min_length=2, max_length=50, description="Tên tác giả tin nhắn")
    content: str = Field(..., min_length=1, max_length=1000, description="Nội dung lưu bút")
    avatar_color: str = Field("#2563EB", max_length=20, description="Màu sắc đại diện avatar")
    user_token: Optional[str] = Field(None, max_length=64, description="Session token của người nhắn")
    image: Optional[str] = None

class GuestbookUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000, description="Nội dung tin nhắn sau khi chỉnh sửa")

class GuestbookResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_name: str
    content: str
    avatar_color: str
    likes_count: int
    created_at: datetime
    user_token: Optional[str] = None
    user_id: Optional[int] = None
    image: Optional[str] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    author_role: str = "anonymous"

# --- Social Posts Schemas ---
class PostCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)
    media_urls: Optional[List[str]] = Field(default_factory=list)
    privacy: str = Field("public", max_length=20)

class PostCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None
    media_url: Optional[str] = None

class PostCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author_id: int
    author: Optional[UserResponse] = None
    parent_id: Optional[int] = None
    content: str
    media_url: Optional[str] = None
    likes_count: int = 0
    created_at: datetime

class PostReactionCreate(BaseModel):
    reaction_type: str = Field("like", max_length=20)  # like, love, care, haha, wow, sad, angry

class PostReactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    user_id: int
    reaction_type: str
    created_at: datetime
    user: Optional[UserResponse] = None

class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    author: Optional[UserResponse] = None
    content: str
    media_urls: Optional[str] = None
    privacy: str
    likes_count: int
    comments_count: int
    shares_count: int
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    user_reaction: Optional[str] = None
    reactions_breakdown: Optional[dict] = None
    latest_comments: Optional[List[PostCommentResponse]] = None

# --- Friendship Schemas ---
class FriendshipResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    friend: Optional[UserResponse] = None
    user: Optional[UserResponse] = None

# --- Messenger Schemas ---
class MessageCreate(BaseModel):
    content: Optional[str] = Field(None, max_length=5000)
    message_type: str = Field("text", max_length=20)
    media_url: Optional[str] = None
    reply_to_id: Optional[int] = None

class MessageReactionCreate(BaseModel):
    emoji: str = Field(..., max_length=10)

class MessageReactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message_id: int
    user_id: int
    emoji: str
    created_at: datetime
    user: Optional[UserResponse] = None

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    sender: Optional[UserResponse] = None
    content: Optional[str] = None
    message_type: str
    media_url: Optional[str] = None
    reply_to_id: Optional[int] = None
    is_unsent: bool
    created_at: datetime
    reactions: Optional[List[MessageReactionResponse]] = None

class ConversationParticipantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    user_id: int
    nickname: Optional[str] = None
    role: str
    last_read_message_id: Optional[int] = None
    joined_at: datetime
    user: Optional[UserResponse] = None

class ConversationCreate(BaseModel):
    is_group: bool = False
    title: Optional[str] = None
    participant_ids: List[int] = Field(..., min_length=1)

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_group: bool
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    last_message_text: Optional[str] = None
    last_message_at: datetime
    created_at: datetime
    participants: Optional[List[ConversationParticipantResponse]] = None
    unread_count: Optional[int] = 0

# --- Notification Schemas ---
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    recipient_id: int
    actor_id: int
    actor: Optional[UserResponse] = None
    type: str
    reference_id: Optional[int] = None
    content: str
    is_read: bool
    created_at: datetime
