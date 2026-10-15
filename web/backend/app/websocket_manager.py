from typing import Dict, Set, List, Optional, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("websocket_manager")

class ConnectionManager:
    def __init__(self):
        # user_id -> Set of active WebSocket instances (supports multiple open tabs)
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected. Active connections: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected.")

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    def get_online_user_ids(self) -> List[int]:
        return list(self.active_connections.keys())

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
        for uid in user_ids:
            await self.send_personal_message(uid, message)

    async def broadcast_all(self, message: dict):
        for uid in list(self.active_connections.keys()):
            await self.send_personal_message(uid, message)

    async def broadcast_presence(self, user_id: int, is_online: bool, exclude_user_id: Optional[int] = None):
        for uid in list(self.active_connections.keys()):
            if exclude_user_id is not None and uid == exclude_user_id:
                continue
            await self.send_personal_message(uid, {
                "type": "presence_update",
                "user_id": user_id,
                "is_online": is_online
            })

manager = ConnectionManager()
