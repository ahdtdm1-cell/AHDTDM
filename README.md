# SocialChat - Nền tảng Mạng Xã Hội (Facebook) & Nhắn Tin Thời Gian Thực (Messenger)

SocialChat là một nền tảng web hiện đại kết hợp hoàn hảo giữa **Mạng xã hội kiểu Facebook** và **Hệ thống nhắn tin thời gian thực kiểu Messenger**, xây dựng với kiến trúc hướng hiệu năng cao, giao diện chuẩn Hallmark / Apple Design, và bảo mật theo chuẩn OWASP Top 10.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🌐 Mạng Xã Hội Toàn Diện (Facebook Style)
- **Bố cục 3 cột chuẩn Facebook**:
  - **Cột trái (Shortcuts)**: Điều hướng nhanh giữa Bảng tin, Bạn bè, Messenger, Sổ lưu bút, Trang cá nhân.
  - **Cột giữa (Feed chính)**:
    - **Thanh Stories**: Trải nghiệm xem tin ảnh/video lướt ngang sinh động.
    - **Khung tạo bài viết**: Hỗ trợ đính kèm nhiều ảnh, chọn quyền riêng tư (*Công khai*, *Bạn bè*, *Chỉ mình tôi*).
    - **Thẻ bài viết (Post Card)**: Hỗ trợ layout lưới ảnh responsive, gắn tag quyền riêng tư, menu xóa bài viết bảo vệ IDOR.
    - **Bộ 7 biểu cảm Facebook**: Thích (👍), Yêu thích (❤️), Thương thương (🥰), Haha (😆), Wow (😮), Buồn (😢), Phẫn nộ (😡) với hiệu ứng động spring animation.
    - **Bình luận trực tiếp**: Bình luận thời gian thực, hiển thị avatar người dùng và xóa bình luận có xác thực quyền tác giả.
  - **Cột phải (Danh bạ & Trực tuyến)**: Danh sách bạn bè kèm chấm xanh báo trạng thái online thời gian thực qua WebSocket. Bấm vào bất kỳ ai để mở ngay cửa sổ chat.
- **Hệ thống Bạn bè**:
  - Gửi lời mời kết bạn, danh sách lời mời chờ duyệt, chấp nhận hoặc từ chối kết bạn.
  - Tự động đồng bộ trạng thái trực tuyến / offline của bạn bè.
- **Trang cá nhân (Profile Page)**:
  - Ảnh bìa (cover photo), ảnh đại diện (avatar), tiểu sử (bio), thông tin cá nhân.
  - Tab lọc bài viết của người dùng và danh sách bạn bè.
  - Nút nhắn tin trực tiếp và kết bạn ngay trên trang cá nhân.

---

### 2. 💬 Hệ Thống Nhắn Tin Thời Gian Thực (Messenger Style)
- **Khung Chat nổi thu nhỏ (Floating Mini Windows)**:
  - Neo ở góc dưới bên phải màn hình (Docked Chatheads).
  - Hỗ trợ mở nhiều cửa sổ chat đồng thời, thu nhỏ (minimize) hoặc phóng to toàn màn hình.
  - Hiệu ứng bong bóng chat thời gian thực, typing indicator động ("đang soạn tin nhắn...").
  - Gửi tin nhắn văn bản, emoji và đính kèm hình ảnh trực tiếp.
- **Trang Messenger chuyên dụng (`/messages`)**:
  - Giao diện 2 cột chuẩn Messenger: Danh sách hội thoại ở bên trái (kèm huy hiệu chưa đọc) và cửa sổ chat toàn diện ở bên phải.
  - Tạo cuộc trò chuyện 1-1 hoặc tạo nhóm chat nhiều thành viên.
  - Thu hồi / Gỡ tin nhắn (Unsend message).
  - Thả biểu cảm cảm xúc (Reactions) lên từng tin nhắn.
  - Tải lên hình ảnh an toàn (< 10MB, đặt tên UUID chống xung đột).

---

### 3. 🛡️ Bảo Mật & Kiểm Thử Thâm Nhập (Security & Penetration Hardening)
- **Chống IDOR (Insecure Direct Object References)**:
  - Người dùng không thể xóa bài viết, xóa bình luận hoặc thu hồi tin nhắn của người khác.
  - Người ngoài không thuộc cuộc trò chuyện không thể đọc trộm hay gửi tin nhắn vào cuộc hội thoại riêng tư.
- **Phòng chống tấn công XSS**:
  - Làm sạch và loại bỏ các thẻ script/img nguy hại trước khi lưu trữ hoặc phát sóng.
- **Bảo vệ xác thực & Session**:
  - Mã hóa mật khẩu an toàn với hàm băm một chiều.
  - Token JWT có thời hạn, khóa tài khoản tạm thời khi đăng nhập sai nhiều lần liên tiếp.
  - Tích hợp mã CAPTCHA chống tấn công dò mật khẩu (Brute-force).
- **Rate Limiting**:
  - Hạn chế tần suất gọi API ở các endpoint nhạy cảm chống spam và DoS.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend
- **React 18** + **TypeScript**
- **Vite** (Build tool siêu tốc)
- **Tailwind CSS** (Giao diện hiện đại, hỗ trợ Dark / Light mode)
- **Framer Motion** (Chuyển động mượt mà, micro-interactions)
- **Lucide React** (Bộ icon thiết kế cao cấp)
- **Vitest & React Testing Library** (Kiểm thử tự động frontend)

### Backend
- **FastAPI** (Python 3.14 / 3.12+ async REST API)
- **SQLAlchemy ORM** + **SQLite** (hoặc SQL Server / PostgreSQL)
- **WebSockets Hub** (`ConnectionManager` quản lý kết nối realtime đa tab trên mỗi người dùng)
- **Pydantic V2** (Validation dữ liệu chặt chẽ)
- **Pytest** (Hơn 49 test cases kiểm thử tự động toàn diện)

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi chạy Backend

```bash
cd web/backend

# Kích hoạt môi trường ảo Python
source venv/bin/activate

# Khởi chạy server FastAPI
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend sẽ chạy tại: `http://localhost:8000` (Tài liệu API Swagger tại: `http://localhost:8000/docs`).

### 2. Khởi chạy Frontend

```bash
cd web/frontend

# Cài đặt dependencies (nếu chưa có)
npm install

# Khởi chạy dev server
npm run dev
```

Giao diện web sẽ mở tại: `http://localhost:5173`.

---

## 🧪 Kiểm Thử Tự Động (Automated Testing)

### Chạy Backend Tests (Pytest)
```bash
cd web/backend
./venv/bin/pytest tests/ -v
```
> Kết quả: **49/49 tests passed** bao gồm Auth, Posts, Friends, Messages, Security Hardening và Penetration Testing.

### Chạy Frontend Tests (Vitest)
```bash
cd web/frontend
npm test -- --run
```
> Kết quả: **17/17 tests passed** bao gồm Topbar, PostCard, FloatingChatWindow, CreatePostBox, Sidebar, AuthModal, ThemeToggle.

### Kiểm tra Build Production Frontend
```bash
cd web/frontend
npm run build
```
> Kết quả: TypeScript biên dịch và Vite build thành công bundle tĩnh (`dist/`) với **0 lỗi**.
