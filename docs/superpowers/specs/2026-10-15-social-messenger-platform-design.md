# Tài liệu Thiết kế Kiến trúc: Nền tảng Mạng Xã Hội & Web Nhắn Tin (Facebook + Messenger)

- **Ngày tạo**: 2026-10-15
- **Tác giả**: Antigravity Pair Programmer
- **Dự án**: AHDTDM (Nâng cấp từ Portfolio Guestbook sang Full-stack Social & Messenger Web App)
- **Mục tiêu**: Nâng cấp toàn diện ứng dụng web thành mạng xã hội phong cách Facebook kết hợp hệ thống nhắn tin thời gian thực phong cách Messenger, đáp ứng tiêu chuẩn giao diện cao cấp (Hallmark / High-End Design) và bảo mật nghiêm ngặt (OWASP Top 10, API & Web App Penetration Testing).

---

## 1. Tổng quan Kiến trúc Hệ thống (System Architecture)

Hệ thống được thiết kế theo mô hình **Client-Server phân lớp tách biệt** với khả năng tương tác Real-time hai chiều:

```
[ Frontend: React 18 + Vite + TS + Tailwind CSS v4 + Framer Motion ]
       │                                     ▲
       │ REST API (HTTP/JSON)                │ WebSocket (ws/wss)
       ▼                                     │
[ Backend: FastAPI (Python 3.11+) ]          │
   ├── Security & Auth Middleware (JWT, RateLimit, XSS Sanitize)
   ├── REST Routers (/api/auth, /api/posts, /api/friends, /api/messages, /api/users, /api/notifications)
   ├── WebSocket Hub (ConnectionManager: presence, messaging, typing, seen events)
   └── ORM Layer (SQLAlchemy 2.0 async/sync compatible)
       ▼
[ Database: SQLite (Local) / SQL Server & PostgreSQL Compatible ]
   └── Media Store: Local secure upload directory (/uploads)
```

---

## 2. Mô hình Cơ sở dữ liệu (Data Models & Schemas)

### 2.1. Bảng `users` (Mở rộng từ bảng hiện tại)
- `id`: Integer (PK, autoincrement)
- `username`: String(50) (unique, indexed)
- `hashed_password`: String(255)
- `display_name`: String(100)
- `avatar_url`: String(255)
- `cover_url`: String(255)
- `bio`: Text
- `role`: String(20) ("user", "admin")
- `is_online`: Boolean (default False)
- `last_seen`: DateTime (default utcnow)
- `failed_login_attempts`: Integer (default 0)
- `locked_until`: DateTime (nullable)
- `created_at`: DateTime (default utcnow)

### 2.2. Bảng `friendships` (Quan hệ bạn bè)
- `id`: Integer (PK)
- `user_id`: Integer (FK users.id, indexed)
- `friend_id`: Integer (FK users.id, indexed)
- `status`: String(20) ("pending", "accepted", "declined", "blocked")
- `created_at`: DateTime (default utcnow)
- `updated_at`: DateTime (default utcnow)

### 2.3. Bảng `posts` (Bài viết mạng xã hội)
- `id`: Integer (PK)
- `author_id`: Integer (FK users.id, indexed)
- `content`: Text (nullable=False, max 5000 ký tự)
- `media_urls`: Text (JSON string lưu mảng URL hình ảnh/tệp đính kèm)
- `privacy`: String(20) ("public", "friends", "private", default "public")
- `likes_count`: Integer (default 0)
- `comments_count`: Integer (default 0)
- `shares_count`: Integer (default 0)
- `is_pinned`: Boolean (default False)
- `created_at`: DateTime (default utcnow)
- `updated_at`: DateTime (nullable)

### 2.4. Bảng `post_reactions` (Cảm xúc bài viết phong cách Facebook)
- `id`: Integer (PK)
- `post_id`: Integer (FK posts.id, ondelete="CASCADE", indexed)
- `user_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `reaction_type`: String(20) ("like", "love", "care", "haha", "wow", "sad", "angry")
- `created_at`: DateTime (default utcnow)
- *Unique Constraint*: (post_id, user_id)

### 2.5. Bảng `post_comments` (Bình luận bài viết)
- `id`: Integer (PK)
- `post_id`: Integer (FK posts.id, ondelete="CASCADE", indexed)
- `author_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `parent_id`: Integer (FK post_comments.id, nullable=True, hỗ trợ trả lời bình luận)
- `content`: Text (nullable=False, max 2000 ký tự)
- `media_url`: String(255) (nullable=True)
- `likes_count`: Integer (default 0)
- `created_at`: DateTime (default utcnow)

### 2.6. Bảng `conversations` (Cuộc hội thoại Messenger)
- `id`: Integer (PK)
- `is_group`: Boolean (default False)
- `title`: String(100) (tên nhóm chat, nullable nếu là chat 1-1)
- `avatar_url`: String(255) (nullable)
- `last_message_text`: Text (nullable)
- `last_message_at`: DateTime (default utcnow, indexed)
- `created_at`: DateTime (default utcnow)

### 2.7. Bảng `conversation_participants` (Thành viên cuộc hội thoại)
- `id`: Integer (PK)
- `conversation_id`: Integer (FK conversations.id, ondelete="CASCADE", indexed)
- `user_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `nickname`: String(50) (biệt danh trong phòng chat)
- `role`: String(20) ("admin", "member", default "member")
- `last_read_message_id`: Integer (nullable, theo dõi trạng thái đã xem)
- `joined_at`: DateTime (default utcnow)
- *Unique Constraint*: (conversation_id, user_id)

### 2.8. Bảng `messages` (Tin nhắn Messenger)
- `id`: Integer (PK)
- `conversation_id`: Integer (FK conversations.id, ondelete="CASCADE", indexed)
- `sender_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `content`: Text (nội dung tin nhắn)
- `message_type`: String(20) ("text", "image", "file", "system", default "text")
- `media_url`: String(255) (nullable)
- `reply_to_id`: Integer (FK messages.id, nullable, trả lời tin nhắn)
- `is_unsent`: Boolean (default False - thu hồi tin nhắn)
- `created_at`: DateTime (default utcnow, indexed)

### 2.9. Bảng `message_reactions` (Thả cảm xúc tin nhắn)
- `id`: Integer (PK)
- `message_id`: Integer (FK messages.id, ondelete="CASCADE", indexed)
- `user_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `emoji`: String(10) ("👍", "❤️", "😂", "😮", "😢", "😡")
- `created_at`: DateTime (default utcnow)
- *Unique Constraint*: (message_id, user_id)

### 2.10. Bảng `notifications` (Thông báo hệ thống)
- `id`: Integer (PK)
- `recipient_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `actor_id`: Integer (FK users.id, ondelete="CASCADE", indexed)
- `type`: String(30) ("friend_request", "friend_accept", "post_reaction", "post_comment", "message")
- `reference_id`: Integer (ID của post/comment/conversation liên quan)
- `content`: String(255)
- `is_read`: Boolean (default False)
- `created_at`: DateTime (default utcnow)

---

## 3. Kiến trúc Real-Time: FastAPI WebSocket Hub (`ConnectionManager`)

WebSocket Hub đặt tại `/api/ws?token=<jwt_token>`:
1. **Xác thực**: Kiểm tra tính hợp lệ của JWT token khi kết nối; giải mã lấy `user_id`.
2. **Quản lý phiên (Active Connections)**: `active_connections: Dict[int, Set[WebSocket]]` ánh xạ một `user_id` tới tập các socket đang mở (cho phép 1 người dùng mở nhiều tab mà vẫn đồng bộ).
3. **Sự kiện hai chiều (Event Payload Types)**:
   - `chat_message`: Gửi và nhận tin nhắn mới ngay lập tức.
   - `typing_indicator`: Báo hiệu `{ user_id, conversation_id, is_typing: true/false }`.
   - `message_seen`: Báo hiệu `{ conversation_id, user_id, last_message_id }`.
   - `message_reaction`: Báo hiệu cập nhật reaction của tin nhắn.
   - `presence_update`: Broadcast trạng thái `{ user_id, is_online, last_seen }` cho bạn bè.
   - `notification`: Đẩy thông báo tức thời (lời mời kết bạn, reaction, comment) đến khay thông báo.

---

## 4. Đặc tả REST API

### 4.1. Auth & Users (`/api/auth`, `/api/users`)
- `POST /api/auth/register`: Đăng ký tài khoản (xác thực độ mạnh mật khẩu, captcha nếu kích hoạt).
- `POST /api/auth/login`: Đăng nhập cấp JWT token (bảo vệ chống brute-force lockout).
- `GET /api/auth/me`: Thông tin người dùng hiện tại kèm số thông báo/tin nhắn chưa đọc.
- `GET /api/users/{user_id}/profile`: Xem trang cá nhân người dùng.
- `PUT /api/users/profile`: Cập nhật bio, avatar, cover photo, display_name.
- `GET /api/users/search?q=...`: Tìm kiếm người dùng theo tên hoặc username.

### 4.2. Friends (`/api/friends`)
- `POST /api/friends/request/{friend_id}`: Gửi lời mời kết bạn.
- `POST /api/friends/accept/{request_id}`: Chấp nhận kết bạn.
- `POST /api/friends/decline/{request_id}`: Từ chối kết bạn.
- `GET /api/friends/list`: Danh sách bạn bè kèm trạng thái online/offline.
- `GET /api/friends/requests`: Danh sách lời mời kết bạn đang chờ duyệt.

### 4.3. Social Feed (`/api/posts`)
- `GET /api/posts`: Lấy bảng tin (hỗ trợ phân trang offset/limit, bài viết công khai và bài viết của bạn bè).
- `POST /api/posts`: Tạo bài viết mới (text + danh sách ảnh đính kèm).
- `GET /api/posts/{post_id}`: Chi tiết bài viết kèm danh sách comments.
- `DELETE /api/posts/{post_id}`: Xóa bài viết (kiểm tra quyền tác giả hoặc admin).
- `POST /api/posts/{post_id}/react`: Thả/đổi/hủy cảm xúc bài viết.
- `POST /api/posts/{post_id}/comments`: Bình luận vào bài viết.
- `DELETE /api/posts/comments/{comment_id}`: Xóa bình luận.

### 4.4. Messenger (`/api/conversations`, `/api/messages`)
- `GET /api/conversations`: Danh sách các cuộc trò chuyện gần đây, tin nhắn mới nhất, unread count.
- `POST /api/conversations/direct/{user_id}`: Tạo hoặc lấy cuộc trò chuyện 1-1 với một người dùng.
- `POST /api/conversations/group`: Tạo nhóm chat mới với danh sách thành viên.
- `GET /api/conversations/{conv_id}/messages`: Lấy lịch sử tin nhắn (hỗ trợ phân trang ngược).
- `POST /api/conversations/{conv_id}/messages`: Gửi tin nhắn qua REST (dự phòng khi không dùng WebSocket).
- `PUT /api/messages/{msg_id}/unsend`: Thu hồi tin nhắn.
- `POST /api/messages/{msg_id}/react`: Thả reaction cho tin nhắn.

### 4.5. Notifications (`/api/notifications`)
- `GET /api/notifications`: Danh sách thông báo.
- `PUT /api/notifications/{id}/read`: Đánh dấu đã đọc.
- `PUT /api/notifications/read-all`: Đánh dấu tất cả đã đọc.

---

## 5. Thiết kế Giao diện Người dùng (Frontend & Hallmark Design System)

Ứng dụng tuân theo chuẩn thiết kế Facebook Web 2026 hiện đại kết hợp Messenger liền mạch:

### 5.1. Bố cục 3 Cột Tổng Thể (The Facebook Shell)
1. **Top Navigation Bar (Cố định phía trên)**:
   - Bên trái: Logo thương hiệu cao cấp với gradient ánh xanh tím, ô tìm kiếm thông minh (Search Bar).
   - Ở giữa: Các Tab điều hướng chính (Bảng tin Feed, Bạn bè, Watch/Media, Tin nhắn Messenger).
   - Bên phải: Nút Menu nhanh, Nút Messenger (mở dropdown danh sách chat với badge đỏ), Nút Thông báo (dropdown thông báo thời gian thực), Avatar người dùng (menu tài khoản, đổi theme Dark/Light, Đăng xuất).
2. **Cột Trái (Left Sidebar - Shortcuts & Navigation)**:
   - Thẻ profile tóm tắt của user.
   - Lối tắt nhanh: Bảng tin, Bạn bè, Đã lưu, Nhóm, Cài đặt cá nhân.
3. **Cột Giữa (Main Feed Container)**:
   - **Stories Bar**: Hàng Story thu hút với hiệu ứng hover bóng bẩy và avatar viền sáng.
   - **Khung Tạo Bài Viết (Create Post Widget)**: Input "Bạn đang nghĩ gì thế?", các nút tiện ích nhanh: Ảnh/Video, Cảm xúc/Hoạt động. Click vào mở Popup Soạn thảo đầy đủ với Preview hình ảnh tải lên.
   - **Dòng Thời Gian (Feed Stream)**: Danh sách Card bài viết thiết kế kính mờ (glassmorphism/clean modern card), thanh công cụ Reaction với popup animation mượt mà (Like, Love, Haha, Wow, Sad, Angry), khu vực bình luận tương tác tức thì.
4. **Cột Phải (Right Sidebar - Contacts & Online Friends)**:
   - Danh sách "Người liên hệ": Hiển thị avatar, tên, chấm xanh online/thời gian online gần nhất.
   - Click vào bất kỳ người bạn nào -> Bật ngay **Cửa sổ Chat Mini (Floating Messenger Popup)** ở góc phải dưới màn hình!

### 5.2. Hệ thống Nhắn tin Messenger Toàn diện (Messenger Dock & Fullscreen)
1. **Floating Chat Windows (Messenger Docks)**:
   - Hiển thị ở góc phải phía dưới màn hình (hỗ trợ mở 1 hoặc nhiều khung chat thu nhỏ đồng thời giống Facebook Messenger Web).
   - Header có tên, avatar, chấm xanh online, nút thu nhỏ/đóng, nút mở toàn màn hình.
   - Thân chat hiển thị tin nhắn dạng bong bóng (speech bubbles) với hiệu ứng trượt mượt mà.
   - Thanh input: đính kèm ảnh, emoji picker, typing event, gửi tin nhắn bằng phím Enter.
2. **Trang Messenger Toàn màn hình (`/messages`)**:
   - Dành cho trải nghiệm tập trung nhắn tin chuyên sâu.
   - Cột trái: Tìm kiếm hội thoại, danh sách tất cả các cuộc trò chuyện, bộ lọc (Hộp thư đến, Chưa đọc, Nhóm).
   - Khung chat chính: Lịch sử tin nhắn phân trang, chi tiết trạng thái đã xem (seen status với avatar nhỏ), thanh công cụ gửi file, hình ảnh, voice message mô phỏng, reaction picker.
   - Cột phải: Thông tin chi tiết cuộc trò chuyện (Ảnh đại diện, file phương tiện đã chia sẻ, thành viên trong nhóm, tùy chọn màu chủ đề chat).

---

## 6. Chiến lược An Toàn & Bảo Mật (Security & Pentesting Hardening)

Tuân thủ nghiêm ngặt các nguyên tắc OWASP Top 10 và các tiêu chí pentest Strix:
1. **XSS Protection**: Sử dụng hàm chuẩn hóa nội dung (HTML entity escaping, bleach/sanitize) cho mọi input bài viết, comment, tin nhắn.
2. **IDOR & Broken Access Control**: Kiểm tra quyền tác giả chặt chẽ trong mọi thao tác sửa/xóa bài viết, thu hồi tin nhắn, truy cập cuộc trò chuyện.
3. **File Upload Security**:
   - Kiểm tra MIME type thực tế của file bằng `python-magic` hoặc header check.
   - Giới hạn kích thước file tải lên (tối đa 10MB cho ảnh).
   - Sinh tên file ngẫu nhiên an toàn (UUID4) để chống Path Traversal (`../../`).
4. **Rate Limiting & Anti-Spam**:
   - Giới hạn tần suất đăng bài, gửi tin nhắn (token bucket algorithm / in-memory rate limiter).
   - Chống tấn công brute-force với cơ chế khóa tài khoản tạm thời khi đăng nhập sai nhiều lần.
5. **CORS & Security Headers**: Cấu hình Content-Security-Policy (CSP), X-Frame-Options: DENY, X-Content-Type-Options: nosniff.

---

## 7. Kế hoạch Kiểm Thử (Testing & Verification Strategy)

1. **Backend Tests (Pytest)**:
   - `test_auth.py`: Đăng ký, đăng nhập, JWT expiry, brute-force lockout.
   - `test_posts.py`: Tạo bài viết, reactions, phân trang, bình luận, phân quyền xóa bài viết (IDOR check).
   - `test_friends.py`: Gửi lời mời kết bạn, chấp nhận, từ chối, danh sách bạn bè.
   - `test_messages.py`: Tạo hội thoại 1-1, gửi tin nhắn, thu hồi tin nhắn, kiểm tra quyền truy cập hội thoại riêng tư.
   - `test_websocket.py`: Bắt tay kết nối, xác thực token, phát tán tin nhắn qua WebSocket.
2. **Frontend Tests (Vitest)**:
   - Kiểm thử render Topbar, Navigation, CreatePost, PostCard, FloatingChatWindow, MessengerPage.
   - Kiểm thử tương tác: like bài viết, gửi comment, gửi tin nhắn chat.
3. **End-to-End Build Verification**:
   - Chạy `npm run build` trên Frontend (TypeScript compiler không lỗi).
   - Chạy toàn bộ test suite Pytest (100% test passes).
