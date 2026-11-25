import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import traceback

from app.config import settings
from app.database import engine, Base, SessionLocal, ensure_schema_columns
from app.models import User
from app.security import get_password_hash
from app.routers import health, guestbook, topics, auth, users, posts, friends, notifications, messages, reels
from app.crypto import router as crypto_router
from app.captcha import router as captcha_router
from app.services.cleanup import cleanup_loop_task

logger = logging.getLogger(__name__)

# Ensure DB schemas and required columns exist
ensure_schema_columns(engine)
Base.metadata.create_all(bind=engine)

def seed_default_admin():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            logger.info("No admin user found. Creating default admin account...")
            import secrets
            admin_password = os.getenv("ADMIN_PASSWORD") or "admin1234567890!@#$%^&*()"
            if not admin_password:
                admin_password = secrets.token_urlsafe(16)
                logger.warning(f"⚠️ ADMIN_PASSWORD chưa được thiết lập. Đã tự động tạo mật khẩu admin ngẫu nhiên an toàn: {admin_password}")
            
            default_admin = User(
                username="admin",
                hashed_password=get_password_hash(admin_password),
                role="admin"
            )
            db.add(default_admin)
            db.commit()
            logger.info("Default admin account created successfully (username: 'admin'). Vui lòng lưu lại mật khẩu!")
        else:
            logger.info("Admin account already exists. Skipping password override.")
    except Exception as e:
        logger.error(f"Error seeding default admin account: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed default admin user
    seed_default_admin()
    # Start background 30-day message cleanup scheduler
    cleanup_task = asyncio.create_task(cleanup_loop_task())
    yield
    # Shutdown background task
    cleanup_task.cancel()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json" if settings.ENABLE_SWAGGER else None,
    docs_url="/docs" if settings.ENABLE_SWAGGER else None,
    redoc_url="/redoc" if settings.ENABLE_SWAGGER else None,
    lifespan=lifespan,
    debug=os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Đã xảy ra lỗi hệ thống nội bộ."}
    )

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    if "Server" in response.headers:
        del response.headers["Server"]
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


DEFAULT_ALLOWED_ORIGINS = [
    "https://chat.tail97b77a.ts.net",
    "https://ahdtdm.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173"
]

allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env and allowed_origins_env != "*":
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]
    allow_origin_regex = None
elif allowed_origins_env == "*":
    allowed_origins = ["*"]
    allow_origin_regex = None
else:
    allowed_origins = DEFAULT_ALLOWED_ORIGINS
    allow_origin_regex = r"^(https://.*\.ts\.net|https://.*\.vercel\.app)$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
from fastapi.staticfiles import StaticFiles
from starlette.datastructures import MutableHeaders


class UploadCacheMiddleware:
    """Cache complete uploads at the edge, never partial (206) responses.

    Vercel's CDN keys cached responses by URL only. Caching a 206 range
    response would make later full requests receive a half file, which is why
    some videos appeared stuck and could not be played.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or not scope.get("path", "").startswith("/uploads/"):
            await self.app(scope, receive, send)
            return

        async def send_with_cache_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                if message["status"] == 206:
                    headers["cache-control"] = "no-store"
                    headers["vercel-cdn-cache-control"] = "no-store"
                elif message["status"] == 200:
                    headers["cache-control"] = "public, max-age=31536000, immutable"
                    headers["vercel-cdn-cache-control"] = "public, max-age=31536000, immutable"
                    headers["vercel-cache-tag"] = "uploads"
            await send(message)

        await self.app(scope, receive, send_with_cache_headers)


app.add_middleware(UploadCacheMiddleware)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Route registration (/api and /api/v1 for backward compatibility and standards)
for prefix in [settings.API_PREFIX, f"{settings.API_PREFIX}/v1"]:
    app.include_router(health.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(guestbook.router, prefix=prefix)
    app.include_router(topics.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(crypto_router, prefix=prefix)
    app.include_router(captcha_router, prefix=prefix)
    app.include_router(posts.router, prefix=prefix)
    app.include_router(friends.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(messages.router, prefix=prefix)
    app.include_router(reels.router, prefix=prefix)

# Realtime WebSocket Gateway for Messenger & Notifications
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from typing import Optional
from app.websocket_manager import manager
from app.services.presence import update_user_presence, set_async_update_callback


# Register the persistence callback for WebSocket events (callback-based to avoid race conditions)
set_async_update_callback(update_user_presence)


@app.websocket("/api/ws")
@app.websocket("/ws")
async def websocket_gateway(websocket: WebSocket, token: Optional[str] = None):
    # Retrieve token from query, cookie, or Authorization header
    if not token:
        token = websocket.cookies.get("access_token")
    if not token:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    user_id = None
    username = None
    if token:
        try:
            from app.security import SECRET_KEY, ALGORITHM
            import jwt
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            username = payload.get("sub")
        except Exception as e:
            logger.warning(f"WebSocket auth failed: {e}")

    if not user_id:
        await websocket.close(code=1008)
        return

    await manager.connect(user_id, websocket)
    await update_user_presence(user_id, True)

    try:
        await websocket.send_json({
            "type": "connected",
            "user_id": user_id,
            "username": username,
            "online_users": manager.get_online_user_ids()
        })
        await manager.broadcast_presence(user_id, True, exclude_user_id=user_id)

        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")
            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif event_type == "typing_indicator":
                participant_ids = data.get("participant_ids", [])
                await manager.broadcast_to_users(participant_ids, {
                    "type": "typing_indicator",
                    "conversation_id": data.get("conversation_id"),
                    "user_id": user_id,
                    "is_typing": data.get("is_typing", False)
                })
            elif event_type == "message_seen":
                participant_ids = data.get("participant_ids", [])
                await manager.broadcast_to_users(participant_ids, {
                    "type": "message_seen",
                    "conversation_id": data.get("conversation_id"),
                    "user_id": user_id,
                    "message_id": data.get("message_id")
                })
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        if not manager.is_user_online(user_id):
            await update_user_presence(user_id, False)
            await manager.broadcast_presence(user_id, False)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(user_id, websocket)
        if not manager.is_user_online(user_id):
            await update_user_presence(user_id, False)
            await manager.broadcast_presence(user_id, False)