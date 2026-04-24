from datetime import datetime, timedelta
from server.db.mongo import get_db

RATE_LIMIT = 20           # max messages per window
WINDOW_HOURS = 1          # rolling window length
BLOCK_HOURS = 2           # block duration after limit hit


async def check_and_increment(user_id: str) -> tuple[bool, int | None]:
    """
    Atomically check and increment the chatbot rate limit for a user.

    Returns:
        (allowed, retry_after)
        - allowed=True  → request may proceed; retry_after is None
        - allowed=False → request is blocked; retry_after is a Unix timestamp
    """
    db = await get_db()
    col = db.chatbot_rate_limits
    now = datetime.utcnow()

    record = await col.find_one({"user_id": user_id})

    if record is None:
        await col.insert_one({
            "user_id": user_id,
            "window_start": now,
            "count": 1,
            "blocked_until": None,
        })
        return True, None

    # Currently blocked?
    blocked_until = record.get("blocked_until")
    if blocked_until and blocked_until > now:
        return False, int(blocked_until.timestamp())

    # Window expired? Start fresh.
    window_age_secs = (now - record["window_start"]).total_seconds()
    if window_age_secs > WINDOW_HOURS * 3600:
        await col.update_one(
            {"user_id": user_id},
            {"$set": {"window_start": now, "count": 1, "blocked_until": None}},
        )
        return True, None

    # Within window — increment and check
    new_count = record["count"] + 1
    if new_count > RATE_LIMIT:
        block_until = now + timedelta(hours=BLOCK_HOURS)
        await col.update_one(
            {"user_id": user_id},
            {"$set": {"count": new_count, "blocked_until": block_until}},
        )
        return False, int(block_until.timestamp())

    await col.update_one({"user_id": user_id}, {"$set": {"count": new_count}})
    return True, None
