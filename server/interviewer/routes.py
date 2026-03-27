"""
Interview routes — start sessions, send messages, admin test mode.
All interview endpoints are mounted at /api/v1/interview.
"""

import json
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from server.auth.utils import get_current_user
from server.core.logging_config import get_logger
from server.db.mongo import get_db, log_error
from server.interviewer.db import (
    add_message,
    create_interview,
    get_interview,
)
from server.interviewer.engine import run_interview_turn
from server.interviewer.schemas import (
    RespondentDetails,
    StartInterviewRequest,
    SendMessageRequest,
)
from server.interviewer.utils import build_welcome, calc_remaining_minutes, process_stream_result, sanitize_user_input

logger = get_logger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# GET /{survey_token}/info — Public, no auth
# ---------------------------------------------------------------------------

@router.get("/{survey_token}/info")
async def get_survey_info(survey_token: str):
    """
    Return basic survey info for the respondent landing page.
    No auth required. Only returns public-safe fields.
    """
    try:
        db = await get_db()
        survey = await db["surveys"].find_one({
            "token": survey_token,
            "status": "published",
        })
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found or not published")

        return {
            "title": survey.get("title", ""),
            "description": survey.get("description", ""),
            "estimated_duration": survey.get("estimated_duration", 5),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get survey info error: {e}", exc_info=True)
        await log_error(e, "interviewer/routes.py::get_survey_info")
        raise HTTPException(status_code=500, detail="Failed to get survey info")


# ---------------------------------------------------------------------------
# POST /start/{survey_token} — Public, no auth
# ---------------------------------------------------------------------------

@router.post("/start/{survey_token}")
async def start_interview(
    survey_token: str,
    body: StartInterviewRequest,
):
    """
    Start a new interview session for a published survey.
    Returns the welcome message and session ID.
    """
    try:
        db = await get_db()

        # Look up published survey by token
        survey = await db["surveys"].find_one({
            "token": survey_token,
            "status": "published",
        })
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found or not published")

        survey_id = str(survey["_id"])

        # Create interview session
        respondent_dict = body.respondent.model_dump() if body.respondent else None
        interview = await create_interview(
            survey_id=survey_id,
            respondent=respondent_dict,
            is_test_run=False,
        )

        # Build and save welcome message
        welcome = build_welcome(survey)
        await add_message(interview.id, "assistant", welcome)

        logger.info(f"Interview started - session: {interview.id}, survey: {survey_id}")

        return {
            "session_id": interview.id,
            "welcome_message": welcome,
            "survey_title": survey.get("title", ""),
            "estimated_duration": survey.get("estimated_duration", 5),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Start interview error: {e}", exc_info=True)
        await log_error(e, "interviewer/routes.py::start_interview")
        raise HTTPException(status_code=500, detail="Failed to start interview")


# ---------------------------------------------------------------------------
# POST /{session_id}/message — Public, no auth
# ---------------------------------------------------------------------------

@router.post("/{session_id}/message")
async def send_message(
    session_id: str,
    body: SendMessageRequest,
):
    """
    Send a respondent message and stream the interviewer's response via SSE.
    After streaming completes, the final SSE event contains the clean text
    and updated questions_covered for the client to use.
    """
    try:
        # Validate session ID format
        try:
            ObjectId(session_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid session ID format")

        # Get interview session
        interview = await get_interview(session_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview session not found")

        if interview.status != "in_progress":
            raise HTTPException(status_code=400, detail="Interview session is no longer active")

        # Sanitize user input to prevent tag injection
        safe_message = sanitize_user_input(body.message)

        # Save user message
        await add_message(session_id, "user", safe_message)

        # Fetch survey for config
        db = await get_db()
        survey = await db["surveys"].find_one({"_id": ObjectId(interview.survey_id)})
        if not survey:
            raise HTTPException(status_code=404, detail="Associated survey not found")

        # Calculate remaining time
        remaining = calc_remaining_minutes(
            interview.started_at,
            survey.get("estimated_duration", 5),
        )

        # Build conversation history (include the user message we just saved)
        conversation = [
            {"role": msg.role, "content": msg.content}
            for msg in interview.conversation
        ]
        conversation.append({"role": "user", "content": safe_message})

        personality = survey.get("personality_tone", "friendly")
        num_questions = len(survey.get("questions", []))

        async def event_stream():
            clean_text = ""
            questions_covered = []
            abuse_detected = False

            async for chunk in run_interview_turn(
                survey=survey,
                conversation=conversation,
                remaining_minutes=remaining,
                personality_tone=personality,
            ):
                yield chunk

                # Parse the final done event
                if chunk.startswith("data: "):
                    try:
                        payload = json.loads(chunk[6:].strip())
                        if payload.get("done"):
                            clean_text = payload.get("clean_text", "")
                            questions_covered = payload.get("questions_covered", [])
                            abuse_detected = payload.get("abuse_detected", False)
                    except (json.JSONDecodeError, ValueError):
                        pass

            # Delegate post-stream logic to utils
            final_event = await process_stream_result(
                session_id=session_id,
                clean_text=clean_text,
                questions_covered=questions_covered,
                abuse_detected=abuse_detected,
                num_questions=num_questions,
                remaining=remaining,
            )
            if final_event:
                yield final_event

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send message error - session: {session_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::send_message",
            additional_info={"session_id": session_id},
        )
        raise HTTPException(status_code=500, detail="Failed to process message")


# ---------------------------------------------------------------------------
# POST /test/{survey_id} — Bearer auth (admin test mode)
# ---------------------------------------------------------------------------

@router.post("/test/{survey_id}")
async def test_interview(
    survey_id: str,
    body: StartInterviewRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a test interview session for the admin.
    Works like /start but uses survey_id directly (no token needed),
    so admins can test draft surveys before publishing.
    """
    try:
        user_id = current_user["user_id"]

        # Validate survey ID format
        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()

        # Fetch survey with visibility-based access check
        from server.surveys.utils import check_survey_access
        survey = await db["surveys"].find_one({"_id": survey_oid})
        if not survey:
            raise HTTPException(status_code=404, detail="Survey not found")
        has_access = await check_survey_access(survey, current_user)
        if not has_access:
            raise HTTPException(status_code=404, detail="Survey not found")

        # Create test session
        respondent_dict = body.respondent.model_dump() if body.respondent else None
        interview = await create_interview(
            survey_id=survey_id,
            respondent=respondent_dict,
            is_test_run=True,
        )

        # Build and save welcome message
        welcome = build_welcome(survey)
        await add_message(interview.id, "assistant", welcome)

        logger.info(f"Test interview started - session: {interview.id}, survey: {survey_id}, admin: {user_id}")

        return {
            "session_id": interview.id,
            "welcome_message": welcome,
            "survey_title": survey.get("title", ""),
            "estimated_duration": survey.get("estimated_duration", 5),
            "survey_status": survey.get("status", "draft"),
            "survey_token": survey.get("token"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Test interview error - survey: {survey_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::test_interview",
            additional_info={"survey_id": survey_id, "user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to start test interview")
