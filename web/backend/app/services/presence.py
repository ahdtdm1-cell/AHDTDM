"""Presence service for managing user online/offline state.

This module provides async-friendly presence management that avoids
race conditions during WebSocket teardown and handles graceful degradation
when database operations fail.
"""
from datetime import datetime
from typing import Optional, Awaitable, Callable
import logging

from app.database import SessionLocal
from app.models import User

logger = logging.getLogger("presence_service")

# Callback for async presence update (set by main.py at startup)
_async_update_callback: Optional[Callable[[int, bool], Awaitable[None]]] = None


def set_async_update_callback(callback: Callable[[int, bool], Awaitable[None]]):
    """Register the async function to update user presence in DB."""
    global _async_update_callback
    _async_update_callback = callback


async def update_user_presence(user_id: int, is_online: bool, db: Optional[Session] = None) -> None:
    """Persist online/last_seen state for a user with proper transaction handling.

    Uses row-level locking (FOR UPDATE) to prevent race conditions when
    multiple WebSocket connections or heartbeats try to update presence
    simultaneously.

    Args:
        user_id: The user's database ID
        is_online: True if user is coming online, False if going offline
        db: Optional database session (for testing). If None, creates a new session.
    """
    created_session = db is None
    if db is None:
        db = SessionLocal()
    try:
        # Use with_for_update() for row-level locking to prevent race conditions
        user = db.query(User).filter(User.id == user_id).with_for_update().first()
        if user:
            user.is_online = is_online
            user.last_seen = datetime.utcnow()
            db.commit()
            logger.debug(f"Updated presence for user {user_id}: online={is_online}")
    except Exception as e:
        logger.error(f"Failed to persist presence for user {user_id}: {e}")
        if not created_session:
            db.rollback()
    finally:
        if created_session:
            db.close()


async def sync_update_user_presence(user_id: int, is_online: bool) -> None:
    """Synchronous wrapper for backward compatibility during import cycles."""
    await update_user_presence(user_id, is_online)