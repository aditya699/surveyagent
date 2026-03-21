# interviewer/db.py
from datetime import datetime
from typing import Optional

from bson import ObjectId

from server.db.mongo import get_db
from server.core.logging_config import get_logger
from server.interviewer.schemas import InterviewResponse, Message, RespondentDetails

logger = get_logger(__name__)

COLLECTION = "interviews"


def _interview_doc_to_response(doc: dict) -> InterviewResponse:
    """Convert a MongoDB interview document to an InterviewResponse."""
    return InterviewResponse(
        id=str(doc["_id"]),
        survey_id=str(doc.get("survey_id", "")),
        respondent=doc.get("respondent"),
        conversation=[
            Message(
                role=msg["role"],
                content=msg["content"],
                timestamp=msg.get("timestamp", datetime.utcnow()),
            )
            for msg in doc.get("conversation", [])
        ],
        status=doc.get("status", "in_progress"),
        is_test_run=doc.get("is_test_run", False),
        questions_covered=doc.get("questions_covered", []),
        started_at=doc.get("started_at", datetime.utcnow()),
        completed_at=doc.get("completed_at"),
    )


async def create_interview(
    survey_id: str,
    respondent: Optional[dict] = None,
    is_test_run: bool = False,
) -> InterviewResponse:
    """Create a new interview session."""
    db = await get_db()
    now = datetime.utcnow()

    doc = {
        "survey_id": ObjectId(survey_id),
        "respondent": respondent,
        "conversation": [],
        "status": "in_progress",
        "is_test_run": is_test_run,
        "questions_covered": [],
        "started_at": now,
        "completed_at": None,
    }

    result = await db[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id

    logger.info(f"Interview created: {result.inserted_id} for survey {survey_id}")
    return _interview_doc_to_response(doc)


async def get_interview(interview_id: str) -> Optional[InterviewResponse]:
    """Get an interview session by ID. Returns None if not found."""
    db = await get_db()
    doc = await db[COLLECTION].find_one({"_id": ObjectId(interview_id)})
    if doc is None:
        return None
    return _interview_doc_to_response(doc)


async def add_message(
    interview_id: str,
    role: str,
    content: str,
) -> bool:
    """Append a message to the interview conversation. Returns True if successful."""
    db = await get_db()
    result = await db[COLLECTION].update_one(
        {"_id": ObjectId(interview_id)},
        {
            "$push": {
                "conversation": {
                    "role": role,
                    "content": content,
                    "timestamp": datetime.utcnow(),
                }
            }
        },
    )
    return result.modified_count > 0


async def update_status(
    interview_id: str,
    status: str,
) -> bool:
    """Update interview session status. Returns True if successful."""
    if status not in ("in_progress", "completed", "abandoned"):
        raise ValueError(f"Invalid status: {status}")

    db = await get_db()
    update = {"$set": {"status": status}}

    if status in ("completed", "abandoned"):
        update["$set"]["completed_at"] = datetime.utcnow()

    result = await db[COLLECTION].update_one(
        {"_id": ObjectId(interview_id)},
        update,
    )
    return result.modified_count > 0


async def update_questions_covered(
    interview_id: str,
    questions_covered: list[int],
) -> bool:
    """Replace the questions_covered list. Returns True if successful."""
    db = await get_db()
    result = await db[COLLECTION].update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": {"questions_covered": questions_covered}},
    )
    return result.modified_count > 0
