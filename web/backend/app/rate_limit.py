import os
import time
from fastapi import Request, HTTPException, status
from collections import defaultdict

# Try to import Redis, fallback to in-memory if not available
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 10
AUTH_RATE_LIMIT_WINDOW = 900  # 15 minutes
AUTH_RATE_LIMIT_MAX_REQUESTS = 5

# Redis client (lazy initialization)
_redis_client = None

# In-memory fallback stores
_rate_limit_store = defaultdict(list)
_auth_rate_limit_store = defaultdict(list)

def _get_redis_client():
    """Get or create Redis client with connection pooling."""
    global _redis_client
    if _redis_client is None and REDIS_AVAILABLE:
        try:
            _redis_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=2, socket_timeout=2)
            # Test connection
            _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client

def reset_rate_limits():
    """Reset all rate limit stores (in-memory and Redis)."""
    _rate_limit_store.clear()
    _auth_rate_limit_store.clear()
    redis_client = _get_redis_client()
    if redis_client:
        try:
            # Only delete rate limit keys
            for pattern in ["ratelimit:*", "authratelimit:*"]:
                for key in redis_client.scan_iter(match=pattern):
                    redis_client.delete(key)
        except Exception:
            pass

def get_client_ip(request: Request) -> str:
    """
    Extract client IP securely.
    Do not trust spoofed client headers like X-Forwarded-For or X-Real-IP
    unless TRUST_PROXY_HEADERS is explicitly set to true in environment.
    """
    trust_proxy = os.getenv("TRUST_PROXY_HEADERS", "False").lower() in ("true", "1", "t")
    if trust_proxy:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
    return request.client.host if request.client else "unknown_ip"

def _check_rate_limit_redis(key: str, window: int, max_requests: int) -> bool:
    """Check rate limit using Redis sorted set (sliding window)."""
    redis_client = _get_redis_client()
    if not redis_client:
        return None  # Fall back to in-memory

    now = time.time()
    try:
        # Remove expired entries
        redis_client.zremrangebyscore(key, 0, now - window)

        # Count current requests
        current_count = redis_client.zcard(key)

        if current_count >= max_requests:
            return False

        # Add current request
        redis_client.zadd(key, {str(now): now})
        redis_client.expire(key, window + 1)
        return True
    except Exception:
        return None  # Fall back to in-memory on any Redis error

def _check_rate_limit_memory(store: dict, key: str, window: int, max_requests: int) -> bool:
    """Check rate limit using in-memory store."""
    now = time.time()
    store[key] = [ts for ts in store[key] if now - ts < window]

    if len(store[key]) >= max_requests:
        return False

    store[key].append(now)
    return True

def rate_limiter(request: Request):
    try:
        client_ip = get_client_ip(request)
        key = f"ratelimit:{client_ip}"

        # Try Redis first, fall back to in-memory
        allowed = _check_rate_limit_redis(key, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS)
        if allowed is None:
            allowed = _check_rate_limit_memory(_rate_limit_store, client_ip, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX_REQUESTS)

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Bạn gửi tin nhắn quá nhanh. Vui lòng chờ 1 phút để tiếp tục."
            )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

def auth_rate_limiter(request: Request):
    """
    Limits authentication requests to 5 per 15 minutes (900 seconds) per IP address.
    """
    client_ip = get_client_ip(request)
    key = f"authratelimit:{client_ip}"

    # Try Redis first, fall back to in-memory
    allowed = _check_rate_limit_redis(key, AUTH_RATE_LIMIT_WINDOW, AUTH_RATE_LIMIT_MAX_REQUESTS)
    if allowed is None:
        allowed = _check_rate_limit_memory(_auth_rate_limit_store, client_ip, AUTH_RATE_LIMIT_WINDOW, AUTH_RATE_LIMIT_MAX_REQUESTS)

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Bạn đã thử quá nhiều lần. Vui lòng chờ 15 phút để tiếp tục."
        )
