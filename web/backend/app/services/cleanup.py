import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import SessionLocal
from app.models import GuestbookMessage

logger = logging.getLogger(__name__)

# Configurable retention period (default 30 days)
ANONYMOUS_RETENTION_DAYS = int(os.getenv("ANONYMOUS_RETENTION_DAYS", "30"))
# Configurable cleanup interval (default 1 day = 86400 seconds)
CLEANUP_INTERVAL_SECONDS = int(os.getenv("CLEANUP_INTERVAL_SECONDS", "86400"))

def purge_expired_anonymous_messages(db: Session, retention_days: int = None) -> int:
    """
    Purge guestbook messages sent by anonymous users (user_id is None)
    that are older than retention_days (or where expires_at <= NOW).
    """
    if retention_days is None:
        retention_days = ANONYMOUS_RETENTION_DAYS

    try:
        now = datetime.utcnow()
        cutoff_date = now - timedelta(days=retention_days)

        # Target anonymous messages where expires_at <= now OR created_at <= cutoff_date
        query = db.query(GuestbookMessage).filter(
            GuestbookMessage.user_id.is_(None),
            or_(
                GuestbookMessage.expires_at <= now,
                GuestbookMessage.created_at <= cutoff_date
            )
        )

        deleted_count = query.delete(synchronize_session=False)
        db.commit()
        if deleted_count > 0:
            logger.info(f"Purged {deleted_count} expired anonymous guestbook messages (retention: {retention_days} days).")
        return deleted_count
    except Exception as e:
        db.rollback()
        logger.error(f"Error purging expired anonymous messages: {e}")
        return 0

async def cleanup_loop_task():
    """
    Periodic background loop running at configurable interval (default daily)
    to clean up expired anonymous messages.
    """
    logger.info(f"Starting background anonymous message cleanup scheduler (interval: {CLEANUP_INTERVAL_SECONDS}s, retention: {ANONYMOUS_RETENTION_DAYS}d).")
    while True:
        try:
            db = SessionLocal()
            try:
                purge_expired_anonymous_messages(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in cleanup background task: {e}")

        # Sleep for configured interval before next execution
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
