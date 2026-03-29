from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from server.db.mongo import get_db, log_error
from server.core.logging_config import get_logger
from server.feedback.schemas import FeedbackCreate, FeedbackResponse, FeedbackSingleResponse

logger = get_logger(__name__)

router = APIRouter()


@router.post("", response_model=FeedbackSingleResponse)
async def submit_feedback(payload: FeedbackCreate):
    try:
        db = await get_db()
        doc = {
            "name": payload.name,
            "email": payload.email,
            "message": payload.message,
            "rating": payload.rating,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.feedback.insert_one(doc)

        feedback = FeedbackResponse(
            id=str(result.inserted_id),
            name=doc["name"],
            email=doc["email"],
            message=doc["message"],
            rating=doc["rating"],
            created_at=doc["created_at"],
        )
        return FeedbackSingleResponse(message="Feedback submitted successfully", feedback=feedback)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Submit feedback error - {str(e)}", exc_info=True)
        await log_error(e, "submit_feedback", {})
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
