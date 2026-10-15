# Sobook - Modern Social Network & Realtime Chat

![Project Banner](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20SQLServer%20%7C%20Tailscale-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Một nền tảng mạng xã hội kết hợp trò chuyện thời gian thực hiện đại, gọn gàng, tinh tế và bảo mật, mang giao diện lấy cảm hứng từ Apple Design. Nền tảng hỗ trợ bảng tin đa phương tiện, câu chuyện (Stories), tương tác biểu cảm, nhắn tin trực tiếp và nhóm chat lưu bút cộng đồng.

---

## ✨ Tính Năng Cốt Lõi

1. **Menu "Danh sách chat" (Sidebar Navigation)**:
   - Cột bên trái hoạt động như một ứng dụng nhắn tin thực thụ.
   - Danh sách trò chuyện tập trung vào:
     - 💬 **Public Guestbook**: Sổ lưu bút cộng đồng cho phép tương tác 2 chiều và thử nghiệm bảo mật.

2. **Khung Chat Thông Tin (Chat Window)**:
   - Bong bóng chat (bubble chat) hiển thị tự động dạng hội thoại live.
   - Mô phỏng hiệu ứng tác giả đang trực tiếp gõ tin nhắn (Typing Indicator).
   - Chip gợi ý câu hỏi nhanh (Quick Reply Chips) giúp người dùng tương tác tức thì.

3. **Group Chat Lưu Bút Công Cộng (Public Guestbook)**:
   - Người xem có thể gửi tin nhắn bằng thanh công cụ bên dưới (tên tác giả, màu sắc avatar, biểu tượng cảm xúc).
   - Tin nhắn lưu bút được lưu trữ trong cơ sở dữ liệu và hiển thị realtime cho tất cả khách truy cập.
   - Hỗ trợ thả tim (Like) tin nhắn lưu bút.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend (`/frontend`):

- **Framework**: React 18, TypeScript, Vite.
- **Styling**: Tailwind CSS v4, Glassmorphic UI Tokens (`backdrop-filter: blur(20px)`).
- **Icons & Motion**: Lucide React Icons, Framer Motion (`motion/react` spring physics).
- **Testing**: Vitest + React Testing Library.

### Backend & Database (`/backend`):

- **Framework**: Python 3.11+, FastAPI, Pydantic v2.
- **Database**: SQL Server / SQLite (kết nối qua SQLAlchemy 2.0 ORM).
- **Testing**: Pytest + FastAPI TestClient.

### Networking & Public URL (`/tailscale`):

- Triển khai giải pháp Tailscale Public Proxy độc lập.
- 2 Container Tailscale Proxy (`tailscale-frontend` và `tailscale-backend`) public các dịch vụ nội bộ ra Internet an toàn thông qua **Tailscale Funnel / Serve** mà không cần mở port trên router.

---

## 🚀 Hướng Dẫn Chạy Cục Bộ (Local Development)

### 1. Khởi chạy Backend API:

```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 7000
```

- Endpoint API Health: `http://localhost:7000/api/health`
- OpenAPI Swagger Docs: `http://localhost:7000/docs`

### 2. Khởi chạy Frontend React:

```bash
cd frontend
npm install
npm run dev
```

- Trang web chạy tại: `http://localhost:5173`

---

## 🐳 Triển Khai Self-Hosted với Docker & Tailscale

Dự án đi kèm cấu hình `docker-compose.yml` sẵn sàng cho sản xuất:

```bash
# Thiết lập Auth Key của Tailscale trong biến môi trường
export TS_AUTHKEY="tskey-auth-xxxxxx"

# Khởi chạy toàn bộ hệ thống
docker-compose up -d --build
```

### Sơ đồ luồng mạng Tailscale Public URL:

```
Internet Public URL (https://<tailscale-funnel-domain>)
       │
       ├──► tailscale-frontend (Proxy Port 443 -> frontend:80)
       └──► tailscale-backend (Proxy Port 7443 -> backend:7000)
```

---

## 🧪 Kiểm Thử (Testing)

- **Backend Pytest**:
  ```bash
  python -m pytest backend/tests -v
  ```
- **Frontend Vitest**:
  ```bash
  cd frontend
  npm test
  ```

---

## 📄 Giấy Phép (License)

Dự án phát hành theo giấy phép mã nguồn mở MIT.
