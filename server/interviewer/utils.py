"""
Interviewer utility functions — welcome message builder, time calculator,
input sanitization, post-stream processing, and webhook dispatch.
"""

import asyncio
import json
import re
from datetime import datetime
from typing import Optional

import httpx
from bson import ObjectId

from server.core.logging_config import get_logger
from server.db.mongo import get_db
from server.email.service import send_completion_email, send_creator_notification
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


async def process_turn_result(
    session_id: str,
    clean_text: str,
    questions_covered: list[int],
    abuse_detected: bool,
    num_questions: int,
    remaining: int,
) -> Optional[dict]:
    """
    Core post-turn processing: save assistant message, update coverage,
    handle abuse/completion. Returns a dict or None.

    Used by both the SSE streaming route and the realtime-turn REST endpoint.
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
        return {"type": "terminated", "reason": "abuse"}

    should_complete = (
        (num_questions > 0 and len(questions_covered) >= num_questions)
        or remaining <= 0
    )
    if should_complete:
        await update_status(session_id, "completed")
        asyncio.create_task(fire_webhook(session_id))
        asyncio.create_task(fire_completion_emails(session_id))
        return {"type": "complete"}

    return None


async def process_stream_result(
    session_id: str,
    clean_text: str,
    questions_covered: list[int],
    abuse_detected: bool,
    num_questions: int,
    remaining: int,
) -> Optional[str]:
    """
    Post-stream processing wrapper that returns an SSE event string.
    Delegates to process_turn_result() for the core logic.
    """
    result = await process_turn_result(
        session_id, clean_text, questions_covered,
        abuse_detected, num_questions, remaining,
    )
    if result is None:
        return None
    return f"data: {json.dumps(result)}\n\n"


async def fire_webhook(session_id: str) -> None:
    """Fire-and-forget POST to the survey's webhook_url on interview completion."""
    try:
        db = await get_db()
        interview = await db["interviews"].find_one({"_id": ObjectId(session_id)})
        if not interview:
            return

        if interview.get("is_test_run"):
            return

        survey = await db["surveys"].find_one({"_id": interview["survey_id"]})
        if not survey:
            return

        webhook_url = survey.get("webhook_url")
        if not webhook_url:
            return

        respondent = interview.get("respondent") or {}
        payload = {
            "event": "interview.completed",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "survey": {
                "id": str(survey["_id"]),
                "title": survey.get("title", ""),
            },
            "interview": {
                "id": session_id,
                "status": interview.get("status", "completed"),
                "is_test_run": False,
                "questions_covered": len(interview.get("questions_covered", [])),
                "total_questions": len(survey.get("questions", [])),
                "started_at": interview.get("started_at", "").isoformat() + "Z" if interview.get("started_at") else None,
                "completed_at": interview.get("completed_at", "").isoformat() + "Z" if interview.get("completed_at") else None,
            },
            "respondent": {
                "name": respondent.get("name"),
                "email": respondent.get("email"),
            },
        }

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            logger.info(f"Webhook fired - session: {session_id}, url: {webhook_url}, status: {resp.status_code}")

    except Exception as e:
        logger.warning(f"Webhook failed - session: {session_id}, error: {e}")


async def fire_completion_emails(session_id: str) -> None:
    """Fire-and-forget emails on interview completion."""
    try:
        db = await get_db()
        interview = await db["interviews"].find_one({"_id": ObjectId(session_id)})
        if not interview:
            return

        if interview.get("is_test_run"):
            return

        survey = await db["surveys"].find_one({"_id": interview["survey_id"]})
        if not survey:
            return

        respondent = interview.get("respondent") or {}
        respondent_email = respondent.get("email")
        respondent_name = respondent.get("name", "")
        survey_title = survey.get("title", "Survey")

        # 1. Send respondent thank-you email
        if respondent_email:
            try:
                await send_completion_email(respondent_email, respondent_name, survey_title)
                logger.info(f"Completion email sent - session: {session_id}, to: {respondent_email}")
            except Exception as e:
                logger.warning(f"Respondent email failed - session: {session_id}, error: {e}")

        # 2. Send creator notification email
        if survey.get("notify_on_completion"):
            try:
                creator = await db["admins"].find_one(
                    {"_id": survey["created_by"]}, {"email": 1, "name": 1}
                )
                if creator and creator.get("email"):
                    await send_creator_notification(
                        to_email=creator["email"],
                        creator_name=creator.get("name", ""),
                        survey_title=survey_title,
                        respondent_name=respondent_name or None,
                        respondent_email=respondent_email,
                        questions_covered=len(interview.get("questions_covered", [])),
                        total_questions=len(survey.get("questions", [])),
                    )
                    logger.info(f"Creator notification sent - session: {session_id}, to: {creator['email']}")
            except Exception as e:
                logger.warning(f"Creator notification failed - session: {session_id}, error: {e}")

    except Exception as e:
        logger.warning(f"Completion emails failed - session: {session_id}, error: {e}")
