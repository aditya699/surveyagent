from datetime import datetime, timedelta, timezone
from server.db.mongo import get_db

RATE_LIMIT = 20           # max messages per window
WINDOW_HOURS = 1          # rolling window length
BLOCK_HOURS = 2           # block duration after limit hit


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def check_and_increment(user_id: str) -> tuple[bool, int | None]:
    """
    Atomically check and increment the chatbot rate limit for a user.

    Uses find_one_and_update with $inc to avoid TOCTOU race conditions
    under concurrent requests.

    Returns:
        (allowed, retry_after)
        - allowed=True  → request may proceed; retry_after is None
        - allowed=False → request is blocked; retry_after is a Unix timestamp
    """
    db = await get_db()
    col = db.chatbot_rate_limits
    now = _now()

    # Atomically insert-or-increment. upsert=True creates the doc on first use.
    record = await col.find_one_and_update(
        {"user_id": user_id},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {"window_start": now, "blocked_until": None},
        },
        upsert=True,
        return_document=True,  # return the document AFTER the update
    )

    # Currently blocked?
    blocked_until = record.get("blocked_until")
    if blocked_until:
        # MongoDB stores as naive UTC; normalise to aware for comparison
        if blocked_until.tzinfo is None:
            blocked_until = blocked_until.replace(tzinfo=timezone.utc)
        if blocked_until > now:
            return False, int(blocked_until.timestamp())

    # Window expired? Reset count and allow.
    window_start = record.get("window_start", now)
    if window_start.tzinfo is None:
        window_start = window_start.replace(tzinfo=timezone.utc)

    if (now - window_start).total_seconds() > WINDOW_HOURS * 3600:
        await col.update_one(
            {"user_id": user_id},
            {"$set": {"window_start": now, "count": 1, "blocked_until": None}},
        )
        return True, None

    # Over limit?
    if record["count"] > RATE_LIMIT:
        block_until = now + timedelta(hours=BLOCK_HOURS)
        await col.update_one(
            {"user_id": user_id},
            {"$set": {"blocked_until": block_until}},
        )
        return False, int(block_until.timestamp())

    return True, None
