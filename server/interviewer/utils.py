"""
Interviewer utility functions — welcome message builder, time calculator,
input sanitization, and post-stream processing.
"""

import re
from datetime import datetime
from typing import Optional

from bson import ObjectId

from server.core.logging_config import get_logger
from server.db.mongo import get_db
from server.interviewer.db import add_message, update_questions_covered, update_status

logger = get_logger(__name__)

_TAG_RE = re.compile(r'\[(COVERED|ABUSE)\s*:.*?\]', re.IGNORECASE)


def sanitize_user_input(text: str) -> str:
    """Strip [COVERED:...] and [ABUSE:...] tags to prevent tag injection."""
    return _TAG_RE.sub('', text).strip()


DEFAULT_WELCOME = "Hi! Thanks for taking the time. This survey is about {title}. I'll ask you some questions one at a time — just reply naturally."


def build_welcome(survey: dict) -> str:
    """Return the admin's custom welcome message or the default template."""
    custom = survey.get("welcome_message")
    if custom and custom.strip():
        return custom.strip()
    return DEFAULT_WELCOME.format(title=survey.get("title", "Survey"))


def calc_remaining_minutes(started_at: datetime, estimated_duration: int) -> int:
    """Calculate remaining interview minutes."""
    elapsed = (datetime.utcnow() - started_at).total_seconds() / 60
    return max(0, int(estimated_duration - elapsed))


async def process_stream_result(
    session_id: str,
    clean_text: str,
    questions_covered: list[int],
    abuse_detected: bool,
    num_questions: int,
    remaining: int,
) -> Optional[str]:
    """
    Post-stream processing: save assistant message, update coverage,
    handle abuse/completion. Returns an optional final SSE event string.
    """
    if clean_text:
        await add_message(session_id, "assistant", clean_text)
    if questions_covered:
        await update_questions_covered(session_id, questions_covered)

    if abuse_detected:
        await update_status(session_id, "abandoned")
        db = await get_db()
        await db["interviews"].update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"abandoned_reason": "abuse_detected"}},
        )
        logger.info(f"Interview terminated for abuse - session: {session_id}")
        return 'data: {"type": "terminated", "reason": "abuse"}\n\n'

    should_complete = (
        (num_questions > 0 and len(questions_covered) >= num_questions)
        or remaining <= 0
    )
    if should_complete:
        await update_status(session_id, "completed")
        return 'data: {"type": "complete"}\n\n'

    return None
