from typing import Dict, Set, List, Optional, Any, Callable, Awaitable
from fastapi import WebSocket
import json
import logging
import asyncio
import time

logger = logging.getLogger("websocket_manager")

PRESENCE_TTL_SECONDS = 45.0

# Callback to persist presence state to database (set at startup in main.py)
_persist_presence_callback: Optional[Callable[[int, bool], Awaitable[None]]] = None


def set_persist_presence_callback(callback: Callable[[int, bool], Awaitable[None]]):
    """Register a callback to persist user presence state to the database."""
    global _persist_presence_callback
    _persist_presence_callback = callback


async def _async_set_user_db_online_state(user_id: int, is_online: bool) -> None:
    """Persist online/last_seen state when the user exists in DB (best-effort).

    Uses the registered callback to avoid DB access during WebSocket teardown.
    """
    if _persist_presence_callback is not None:
        try:
            await _persist_presence_callback(user_id, is_online)
        except Exception as e:
            logger.error(f"Failed to persist presence for user {user_id}: {e}")


class ConnectionManager:
    def __init__(self):
        # user_id -> Set of active WebSocket instances (supports multiple open tabs)
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # user_id -> monotonic timestamp of latest HTTP presence heartbeat
        self.http_heartbeats: Dict[int, float] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        # WS is now authoritative for this user's presence so disconnect goes offline immediately.
        self.http_heartbeats.pop(user_id, None)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    def touch_heartbeat(self, user_id: int) -> bool:
        """Record an HTTP presence heartbeat. Returns True if the user just came online."""
        was_online = self.is_user_online(user_id)
        self.http_heartbeats[user_id] = time.monotonic()
        return not was_online

    def clear_heartbeat(self, user_id: int) -> None:
        self.http_heartbeats.pop(user_id, None)

    def _prune_expired_heartbeats(self) -> List[int]:
        now = time.monotonic()
        expired = [
            uid for uid, ts in list(self.http_heartbeats.items())
            if now - ts > PRESENCE_TTL_SECONDS
        ]
        went_offline: List[int] = []
        for uid in expired:
            self.http_heartbeats.pop(uid, None)
            if uid not in self.active_connections:
                went_offline.append(uid)
        return went_offline

    def is_user_online(self, user_id: int) -> bool:
        if user_id in self.active_connections and len(self.active_connections[user_id]) > 0:
            return True
        ts = self.http_heartbeats.get(user_id)
        if ts is not None:
            if time.monotonic() - ts <= PRESENCE_TTL_SECONDS:
                return True
            self.http_heartbeats.pop(user_id, None)
        return False

    def get_online_user_ids(self) -> List[int]:
        self._prune_expired_heartbeats()
        online_ids = set(self.active_connections.keys()) | set(self.http_heartbeats.keys())
        return sorted(online_ids)

    async def close_user_connections(self, user_id: int, code: int = 1000):
        sockets = list(self.active_connections.pop(user_id, set()))
        for ws in sockets:
            try:
                await ws.close(code=code)
            except Exception:
                pass

    async def send_personal_message(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            dead_sockets = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.disconnect(user_id, ws)

    async def broadcast_to_users(self, user_ids: List[int], message: dict):
        """Fan-out to multiple users concurrently using asyncio.gather."""
        if not user_ids:
            return
        await asyncio.gather(*[
            self.send_personal_message(uid, message) for uid in user_ids
        ], return_exceptions=True)

    async def broadcast_all(self, message: dict):
        """Fan-out to all connected users concurrently using asyncio.gather."""
        user_ids = list(self.active_connections.keys())
        if not user_ids:
            return
        await asyncio.gather(*[
            self.send_personal_message(uid, message) for uid in user_ids
        ], return_exceptions=True)

    async def broadcast_presence(self, user_id: int, is_online: bool, exclude_user_id: Optional[int] = None):
        """Fan-out presence updates concurrently using asyncio.gather."""
        user_ids = [uid for uid in self.active_connections.keys() if uid != exclude_user_id]
        if not user_ids:
            return
        presence_msg = {
            "type": "presence_update",
            "user_id": user_id,
            "is_online": is_online
        }
        await asyncio.gather(*[
            self.send_personal_message(uid, presence_msg) for uid in user_ids
        ], return_exceptions=True)

manager = ConnectionManager()
