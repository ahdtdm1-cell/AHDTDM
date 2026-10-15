# Social & Messenger Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển đổi và nâng cấp dự án thành Web Nhắn Tin Messenger kết hợp Mạng Xã Hội Facebook hoàn chỉnh với Realtime WebSockets, Bảng tin Newsfeed, Quản lý bạn bè, Cửa sổ chat mini popup & Trang Messenger toàn màn hình, kiểm thử bảo mật nghiêm ngặt.

**Architecture:** Sử dụng FastAPI làm Backend API & WebSocket Hub phục vụ hai chiều. Cơ sở dữ liệu SQLAlchemy ORM mở rộng hỗ trợ Friends, Posts, Comments, Reactions, Conversations, Messages, Notifications. Frontend xây dựng bằng React 18, TypeScript, Tailwind CSS v4 và Framer Motion theo thiết kế chuẩn Facebook Shell 3 cột kết hợp Messenger Floating Chat Docks và Fullscreen Chat Workspace.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy 2.0, WebSockets, Pytest, React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Lucide React, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-social-messenger-platform-design.md`

## Global Constraints

- Không dùng thư viện UI nặng nề bên ngoài; dùng Vanilla CSS / Tailwind CSS v4 với thiết kế hiện đại, bóng bẩy (Hallmark aesthetic).
- Mọi API truy cập tài nguyên người dùng phải xác thực JWT và kiểm tra IDOR (chống can thiệp trái phép tài nguyên người khác).
- Mọi dữ liệu văn bản người dùng nhập phải qua bộ lọc chống XSS (`html.escape` hoặc sanitizer).
- Các endpoint tải ảnh phải kiểm tra kích thước (< 10MB) và chỉ chấp nhận định dạng ảnh hợp lệ (jpg, jpeg, png, gif, webp).
- Toàn bộ test suite phải vượt qua (100% pass) trước khi kết luận hoàn thành.

---

### Task 1: Mở rộng Cơ sở dữ liệu và Models (Data Layer)

**Files:**
- Modify: `web/backend/app/models.py`
- Modify: `web/backend/app/schemas.py`
- Create: `web/backend/tests/test_models.py`

**Interfaces:**
- Consumes: `app.database.Base`, SQLAlchemy ORM types
- Produces: `User`, `Friendship`, `Post`, `PostReaction`, `PostComment`, `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction`, `Notification` models và Pydantic schemas tương ứng.

- [ ] **Step 1: Viết test kiểm tra khởi tạo và quan hệ giữa các models mới**

```python
# web/backend/tests/test_models.py
import pytest
from app.models import User, Post, PostReaction, PostComment, Conversation, ConversationParticipant, Message, Friendship, Notification
from app.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_create_social_and_messenger_models(db_session):
    u1 = User(username="user1", hashed_password="pw1", display_name="User One")
    u2 = User(username="user2", hashed_password="pw2", display_name="User Two")
    db_session.add_all([u1, u2])
    db_session.commit()

    # Friendship
    f = Friendship(user_id=u1.id, friend_id=u2.id, status="accepted")
    db_session.add(f)

    # Post with Reaction and Comment
    post = Post(author_id=u1.id, content="First social post!", privacy="public")
    db_session.add(post)
    db_session.commit()

    reaction = PostReaction(post_id=post.id, user_id=u2.id, reaction_type="love")
    comment = PostComment(post_id=post.id, author_id=u2.id, content="Great post!")
    db_session.add_all([reaction, comment])
    db_session.commit()

    # Conversation and Message
    conv = Conversation(is_group=False)
    db_session.add(conv)
    db_session.commit()

    p1 = ConversationParticipant(conversation_id=conv.id, user_id=u1.id)
    p2 = ConversationParticipant(conversation_id=conv.id, user_id=u2.id)
    msg = Message(conversation_id=conv.id, sender_id=u1.id, content="Hello there!")
    db_session.add_all([p1, p2, msg])
    db_session.commit()

    assert post.author.username == "user1"
    assert len(post.reactions) == 1
    assert len(post.comments) == 1
    assert msg.sender.username == "user1"
```

- [ ] **Step 2: Chạy test để xác nhận test thất bại**

Chạy: `python -m pytest web/backend/tests/test_models.py -v`
Kết quả mong đợi: FAIL do chưa định nghĩa các model mới.

- [ ] **Step 3: Cập nhật `models.py` và `schemas.py`**

Triển khai đầy đủ các models: `Friendship`, `Post`, `PostReaction`, `PostComment`, `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction`, `Notification` cùng các relationship tương ứng trong `web/backend/app/models.py`, và bổ sung các Pydantic schema trong `web/backend/app/schemas.py`.

- [ ] **Step 4: Chạy lại test để xác nhận vượt qua**

Chạy: `python -m pytest web/backend/tests/test_models.py -v`
Kết quả mong đợi: PASS.

- [ ] **Step 5: Commit thay đổi**

```bash
git add web/backend/app/models.py web/backend/app/schemas.py web/backend/tests/test_models.py
git commit -m "feat(backend): add database models and schemas for social and messenger features"
```

---

### Task 2: WebSocket Hub & Connection Manager cho Realtime Messaging

**Files:**
- Create: `web/backend/app/websocket_manager.py`
- Modify: `web/backend/app/main.py`
- Create: `web/backend/tests/test_websocket.py`

**Interfaces:**
- Consumes: FastAPI `WebSocket`, `jwt_token` validation
- Produces: `manager.connect(user_id, websocket)`, `manager.disconnect(user_id, websocket)`, `manager.send_personal_message(user_id, data)`, `manager.broadcast_to_conversation(conv_id, data, participant_ids)`, `manager.broadcast_presence(user_id, is_online)`

- [ ] **Step 1: Viết test cho WebSocket connection manager**

Kiểm tra quản lý kết nối nhiều tab cho cùng 1 user_id, gửi tin nhắn cá nhân, broadcast và ngắt kết nối.

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `python -m pytest web/backend/tests/test_websocket.py -v`
Kết quả: FAIL.

- [ ] **Step 3: Cài đặt `ConnectionManager` trong `web/backend/app/websocket_manager.py` và route `/api/ws` trong `main.py`**

Hỗ trợ xử lý các tin nhắn JSON: `chat_message`, `typing_indicator`, `message_seen`, `presence`.

- [ ] **Step 4: Chạy test xác nhận vượt qua**

Chạy: `python -m pytest web/backend/tests/test_websocket.py -v`
Kết quả: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/websocket_manager.py web/backend/app/main.py web/backend/tests/test_websocket.py
git commit -m "feat(backend): implement WebSocket Hub and ConnectionManager for real-time messaging"
```

---

### Task 3: REST API Mạng Xã Hội (Posts, Reactions, Comments, Feed)

**Files:**
- Create: `web/backend/app/routers/posts.py`
- Modify: `web/backend/app/main.py`
- Create: `web/backend/tests/test_posts.py`

**Interfaces:**
- Consumes: SQLAlchemy DB Session, `get_current_user` auth dependency
- Produces: `GET /api/posts`, `POST /api/posts`, `DELETE /api/posts/{id}`, `POST /api/posts/{id}/react`, `POST /api/posts/{id}/comments`, `DELETE /api/posts/comments/{id}`

- [ ] **Step 1: Viết test kiểm tra CRUD bài viết, bảo mật IDOR và reactions**

```python
# web/backend/tests/test_posts.py
# Kiểm tra tạo bài viết, kiểm tra chỉ tác giả mới xóa được bài viết (chống IDOR), kiểm tra thả reaction và comment
```

- [ ] **Step 2: Chạy test xác nhận thất bại**

Chạy: `python -m pytest web/backend/tests/test_posts.py -v`

- [ ] **Step 3: Cài đặt router `posts.py` và đăng ký vào `main.py`**

Xử lý sanitization chống XSS cho nội dung, upload nhiều ảnh đính kèm, kiểm tra quyền hạn tác giả.

- [ ] **Step 4: Chạy test xác nhận vượt qua**

Chạy: `python -m pytest web/backend/tests/test_posts.py -v`
Kết quả: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/backend/app/routers/posts.py web/backend/app/main.py web/backend/tests/test_posts.py
git commit -m "feat(backend): implement social feed, posts, reactions, and comments API"
```

---

### Task 4: REST API Bạn Bè & Thông Báo (Friends & Notifications)

**Files:**
- Create: `web/backend/app/routers/friends.py`
- Create: `web/backend/app/routers/notifications.py`
- Modify: `web/backend/app/main.py`
- Create: `web/backend/tests/test_friends_notifications.py`

**Interfaces:**
- Consumes: `get_current_user`, `manager` WebSocket notification
- Produces: `POST /api/friends/request/{friend_id}`, `POST /api/friends/accept/{id}`, `GET /api/friends/list`, `GET /api/notifications`, `PUT /api/notifications/{id}/read`

- [ ] **Step 1: Viết test cho luồng kết bạn và sinh thông báo**
- [ ] **Step 2: Chạy test xác nhận thất bại**
- [ ] **Step 3: Cài đặt routers `friends.py` và `notifications.py`**
- [ ] **Step 4: Chạy test xác nhận vượt qua**
- [ ] **Step 5: Commit**

```bash
git add web/backend/app/routers/friends.py web/backend/app/routers/notifications.py web/backend/app/main.py web/backend/tests/test_friends_notifications.py
git commit -m "feat(backend): implement friends system and notifications API"
```

---

### Task 5: REST API Nhắn tin Messenger (Conversations & Messages)

**Files:**
- Create: `web/backend/app/routers/messages.py`
- Modify: `web/backend/app/main.py`
- Create: `web/backend/tests/test_messages.py`

**Interfaces:**
- Consumes: `get_current_user`, `manager` WebSocket push
- Produces: `GET /api/conversations`, `POST /api/conversations/direct/{user_id}`, `POST /api/conversations/group`, `GET /api/conversations/{id}/messages`, `POST /api/conversations/{id}/messages`, `PUT /api/messages/{id}/unsend`, `POST /api/messages/{id}/react`

- [ ] **Step 1: Viết test cho luồng hội thoại 1-1, nhóm chat, gửi tin nhắn và thu hồi tin nhắn**
- [ ] **Step 2: Chạy test xác nhận thất bại**
- [ ] **Step 3: Cài đặt router `messages.py`**
- [ ] **Step 4: Chạy test xác nhận vượt qua**
- [ ] **Step 5: Commit**

```bash
git add web/backend/app/routers/messages.py web/backend/app/main.py web/backend/tests/test_messages.py
git commit -m "feat(backend): implement messenger conversations and messages API"
```

---

### Task 6: Tái cấu trúc Layout Frontend & Facebook Topbar

**Files:**
- Modify: `web/frontend/src/App.tsx`
- Create: `web/frontend/src/components/Topbar.tsx`
- Create: `web/frontend/src/components/LeftSidebar.tsx`
- Create: `web/frontend/src/components/RightSidebar.tsx`
- Create: `web/frontend/src/services/socialApi.ts`
- Create: `web/frontend/src/types/social.ts`

**Interfaces:**
- Consumes: Auth token, user profile
- Produces: Navigation giữa Bảng tin (Feed), Bạn bè (Friends), Trang cá nhân (Profile), Messenger (`/messages`), Popover Thông báo, Popover Chat Messenger thu nhỏ.

- [ ] **Step 1: Định nghĩa types trong `social.ts` và API client trong `socialApi.ts`**
- [ ] **Step 2: Xây dựng component `Topbar.tsx` với Search, Tabs, Messenger Icon Badge, Notification Icon Badge, User Menu**
- [ ] **Step 3: Xây dựng `LeftSidebar.tsx` (Shortcuts) và `RightSidebar.tsx` (Danh sách bạn bè online bấm vào là mở chat)**
- [ ] **Step 4: Kiểm thử hiển thị và chuyển tab trơn tru trên `App.tsx`**
- [ ] **Step 5: Commit**

```bash
git add web/frontend/src/components/Topbar.tsx web/frontend/src/components/LeftSidebar.tsx web/frontend/src/components/RightSidebar.tsx web/frontend/src/types/social.ts web/frontend/src/services/socialApi.ts web/frontend/src/App.tsx
git commit -m "feat(frontend): implement modern Facebook 3-column shell and topbar navigation"
```

---

### Task 7: Xây dựng Bảng Tin Mạng Xã Hội (News Feed, Create Post, Post Card, Reactions, Comments)

**Files:**
- Create: `web/frontend/src/components/StoriesBar.tsx`
- Create: `web/frontend/src/components/CreatePostBox.tsx`
- Create: `web/frontend/src/components/PostCard.tsx`
- Create: `web/frontend/src/components/ReactionPicker.tsx`
- Create: `web/frontend/src/components/CommentSection.tsx`
- Modify: `web/frontend/src/App.tsx`

**Interfaces:**
- Consumes: `socialApi.getPosts`, `socialApi.createPost`, `socialApi.reactPost`, `socialApi.addComment`
- Produces: Trải nghiệm tương tác bảng tin sinh động với hiệu ứng thả cảm xúc Facebook (Like, Love, Haha, Wow, Sad, Angry), bình luận trực tiếp, xem ảnh mở rộng.

- [ ] **Step 1: Xây dựng `CreatePostBox.tsx` với modal soạn thảo, upload ảnh preview, chọn quyền riêng tư**
- [ ] **Step 2: Xây dựng `ReactionPicker.tsx` với animation pop-up mượt mà bằng Framer Motion**
- [ ] **Step 3: Xây dựng `PostCard.tsx` và `CommentSection.tsx`**
- [ ] **Step 4: Tích hợp vào dòng thời gian chính giữa `App.tsx`**
- [ ] **Step 5: Commit**

```bash
git add web/frontend/src/components/StoriesBar.tsx web/frontend/src/components/CreatePostBox.tsx web/frontend/src/components/PostCard.tsx web/frontend/src/components/ReactionPicker.tsx web/frontend/src/components/CommentSection.tsx web/frontend/src/App.tsx
git commit -m "feat(frontend): implement interactive news feed, post creation, reactions, and comments"
```

---

### Task 8: Xây dựng Hệ thống Messenger Đa tầng (Floating Chat Dock & Fullscreen Messenger Page)

**Files:**
- Create: `web/frontend/src/components/FloatingChatDock.tsx`
- Create: `web/frontend/src/components/FloatingChatWindow.tsx`
- Create: `web/frontend/src/components/MessengerPage.tsx`
- Create: `web/frontend/src/components/MessengerSidebar.tsx`
- Create: `web/frontend/src/hooks/useWebSocket.ts`
- Modify: `web/frontend/src/App.tsx`

**Interfaces:**
- Consumes: WebSocket connection, `socialApi.getMessages`, `socialApi.sendMessage`, `socialApi.unsendMessage`
- Produces:
  - Cửa sổ chat mini góc phải dưới (cho phép mở nhiều cửa sổ cùng lúc, thu nhỏ, đóng, gửi ảnh, emoji, hiển thị typing).
  - Trang `/messages` chuyên sâu với danh sách hội thoại, tìm kiếm, xem đa phương tiện và thông tin nhóm.

- [ ] **Step 1: Xây dựng custom hook `useWebSocket.ts` tự động kết nối, reconnect, phân phối sự kiện**
- [ ] **Step 2: Cài đặt `FloatingChatWindow.tsx` và `FloatingChatDock.tsx`**
- [ ] **Step 3: Cài đặt trang `MessengerPage.tsx`**
- [ ] **Step 4: Kết nối sự kiện click bạn bè trong danh sách sang mở chat window**
- [ ] **Step 5: Commit**

```bash
git add web/frontend/src/components/FloatingChatDock.tsx web/frontend/src/components/FloatingChatWindow.tsx web/frontend/src/components/MessengerPage.tsx web/frontend/src/components/MessengerSidebar.tsx web/frontend/src/hooks/useWebSocket.ts web/frontend/src/App.tsx
git commit -m "feat(frontend): implement floating chat docks and full-screen messenger experience"
```

---

### Task 9: Trang Cá Nhân Facebook (Profile Page) & Quản lý Bạn Bè

**Files:**
- Modify: `web/frontend/src/components/ProfilePage.tsx`
- Create: `web/frontend/src/components/FriendsTab.tsx`
- Create: `web/frontend/src/components/FriendRequestCard.tsx`
- Modify: `web/frontend/src/App.tsx`

**Interfaces:**
- Consumes: `users/profile`, `friends/list`, `friends/requests`
- Produces: Xem cover photo, avatar, bio, danh sách bài viết riêng của người dùng, tab bạn bè, gửi/hủy kết bạn, nhắn tin nhanh.

- [ ] **Step 1: Cập nhật `ProfilePage.tsx` theo chuẩn Facebook (Cover lớn, Avatar xếp đè, Tab Bài viết, Giới thiệu, Bạn bè)**
- [ ] **Step 2: Cài đặt `FriendsTab.tsx` hiển thị danh sách bạn bè và lời mời kết bạn**
- [ ] **Step 3: Kiểm thử luồng kết bạn từ trang cá nhân sang Messenger**
- [ ] **Step 4: Commit**

```bash
git add web/frontend/src/components/ProfilePage.tsx web/frontend/src/components/FriendsTab.tsx web/frontend/src/components/FriendRequestCard.tsx web/frontend/src/App.tsx
git commit -m "feat(frontend): upgrade profile page to Facebook style with friends management"
```

---

### Task 10: Kiểm Thử Toàn Diện, Penetration Testing & Hoàn Tất (Verification)

**Files:**
- Create: `web/backend/tests/test_security_pentest.py`
- Create: `web/frontend/src/tests/SocialMessenger.test.tsx`

**Interfaces:**
- Consumes: Toàn bộ backend test suite & frontend test suite
- Produces: Báo cáo kết quả kiểm thử bảo mật (XSS, IDOR, SQLi, Rate Limiting), xác nhận 100% tests pass và build thành công.

- [ ] **Step 1: Chạy Pytest backend xác nhận toàn bộ test cases đạt 100%**
- [ ] **Step 2: Chạy Vitest frontend xác nhận các components render và tương tác đúng**
- [ ] **Step 3: Chạy `npm run build` trên frontend xác nhận bundle thành công không lỗi TypeScript**
- [ ] **Step 4: Chạy kiểm thử an ninh bảo mật API (`test_security_pentest.py`)**
- [ ] **Step 5: Cập nhật README.md với tài liệu chi tiết về tính năng mới và hướng dẫn chạy**
- [ ] **Step 6: Commit hoàn tất**
