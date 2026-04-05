"""
Interview routes — start sessions, send messages, admin test mode.
All interview endpoints are mounted at /api/v1/interview.
"""

import json
import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse

from server.core.config import settings

from server.auth.utils import get_current_user
from server.core.logging_config import get_logger
from server.core.llm import get_openai_client
from server.db.mongo import get_db, log_error
from server.interviewer.db import (
    add_message,
    create_interview,
    get_interview,
    update_questions_covered,
)
from server.interviewer.engine import run_interview_turn, run_question_test_turn
from server.interviewer.schemas import (
    RespondentDetails,
    StartInterviewRequest,
    SendMessageRequest,
    TestQuestionRequest,
    RealtimeTurnRequest,
)
from server.interviewer.prompts import PERSONALITY_VOICE_MAP, build_interviewer_prompt
from server.interviewer.utils import build_welcome, calc_remaining_minutes, process_stream_result, process_turn_result, sanitize_user_input
from server.ai.schemas import SynthesizeSpeechRequest

logger = get_logger(__name__)
router = APIRouter()


async def _get_active_interview(session_id: str):
    """Validate session_id format, fetch interview, and check it's in_progress."""
    try:
        ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID format")

    interview = await get_interview(session_id)
    if not interview:
        raise HTTPException(status_code=404, detail="Interview session not found")

    if interview.status != "in_progress":
        raise HTTPException(status_code=400, detail="Interview session is no longer active")

    return interview


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
        interview = await _get_active_interview(session_id)

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


# ---------------------------------------------------------------------------
# POST /test-question — Bearer auth (per-question test, stateless)
# ---------------------------------------------------------------------------

@router.post("/test-question")
async def test_question(
    body: TestQuestionRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Test a single question with a lightweight chatbot. Completely stateless —
    no interview session created, no DB reads or writes.
    Conversation history is sent by the client each turn.
    """
    try:
        # Sanitize user messages in the conversation history
        for msg in body.conversation:
            if msg.get("role") == "user":
                msg["content"] = sanitize_user_input(msg.get("content", ""))

        async def event_stream():
            async for chunk in run_question_test_turn(
                question_text=body.question_text,
                conversation=body.conversation,
                ai_instructions=body.ai_instructions,
                personality_tone=body.personality_tone,
                survey_title=body.survey_title,
                survey_goal=body.survey_goal,
                survey_context=body.survey_context,
                llm_provider=body.llm_provider,
                llm_model=body.llm_model,
            ):
                yield chunk

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
        logger.error(f"Test question error: {e}", exc_info=True)
        await log_error(e, "interviewer/routes.py::test_question")
        raise HTTPException(status_code=500, detail="Failed to test question")


# ---------------------------------------------------------------------------
# POST /{session_id}/transcribe — Public, session-gated
# ---------------------------------------------------------------------------

@router.post("/{session_id}/transcribe")
async def transcribe_audio(
    session_id: str,
    audio: UploadFile = File(...),
):
    """
    Transcribe audio using OpenAI Whisper API.
    Public endpoint, validated by active session_id.
    """
    try:
        await _get_active_interview(session_id)

        client = await get_openai_client()
        audio_bytes = await audio.read()

        # Map content type to a file extension Whisper accepts
        ext_map = {
            "audio/webm": "webm",
            "audio/webm;codecs=opus": "webm",
            "audio/mp4": "mp4",
            "audio/mpeg": "mp3",
            "audio/ogg": "ogg",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
            "audio/flac": "flac",
        }
        content_type = (audio.content_type or "audio/webm").split(";")[0].strip()
        ext = ext_map.get(content_type, ext_map.get(audio.content_type or "", "webm"))
        filename = f"audio.{ext}"

        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=(filename, audio_bytes),
        )

        return {"text": transcript.text}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcribe error - session: {session_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::transcribe_audio",
            additional_info={"session_id": session_id},
        )
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")


# ---------------------------------------------------------------------------
# POST /{session_id}/synthesize — Public, session-gated
# ---------------------------------------------------------------------------

@router.post("/{session_id}/synthesize")
async def synthesize_interview_speech(
    session_id: str,
    request: SynthesizeSpeechRequest,
):
    """
    Convert text to speech for an active interview session.
    Public endpoint, validated by active session_id.
    """
    try:
        await _get_active_interview(session_id)

        client = await get_openai_client()

        async def audio_stream():
            try:
                async with client.audio.speech.with_streaming_response.create(
                    model="gpt-4o-mini-tts",
                    voice=request.voice,
                    input=request.text,
                    instructions="Speak naturally and conversationally.",
                ) as response:
                    async for chunk in response.iter_bytes(1024):
                        yield chunk
            except Exception as e:
                logger.error(f"TTS synthesis failed: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Speech synthesis failed")

        return StreamingResponse(
            audio_stream(),
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "no-cache",
                "Content-Type": "audio/mpeg",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Synthesize error - session: {session_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::synthesize_interview_speech",
            additional_info={"session_id": session_id},
        )
        raise HTTPException(status_code=500, detail="Failed to synthesize speech")


# ---------------------------------------------------------------------------
# POST /{session_id}/realtime-token — Public, session-gated
# ---------------------------------------------------------------------------

REALTIME_TOOLS = [
    {
        "type": "function",
        "name": "update_coverage",
        "description": "Call this after each response to report which survey questions have been sufficiently covered so far.",
        "parameters": {
            "type": "object",
            "properties": {
                "questions_covered": {
                    "type": "array",
                    "items": {"type": "integer"},
                    "description": "1-based indices of all survey questions sufficiently answered so far",
                }
            },
            "required": ["questions_covered"],
        },
    },
    {
        "type": "function",
        "name": "report_abuse",
        "description": "Call this if the respondent is persistently abusive after being warned once.",
        "parameters": {
            "type": "object",
            "properties": {},
        },
    },
]


@router.post("/{session_id}/realtime-token")
async def get_realtime_token(session_id: str):
    """
    Mint an ephemeral OpenAI Realtime API token for a WebRTC session.
    Public endpoint, validated by active session_id.
    Returns the client_secret, voice, and conversation history.
    """
    try:
        interview = await _get_active_interview(session_id)

        db = await get_db()
        survey = await db["surveys"].find_one({"_id": ObjectId(interview.survey_id)})
        if not survey:
            raise HTTPException(status_code=404, detail="Associated survey not found")

        remaining = calc_remaining_minutes(
            interview.started_at,
            survey.get("estimated_duration", 5),
        )
        personality = survey.get("personality_tone", "friendly")
        voice = PERSONALITY_VOICE_MAP.get(personality, "coral")

        # Build the system prompt with realtime-mode tool instructions
        instructions = build_interviewer_prompt(
            survey_title=survey.get("title", ""),
            survey_goal=survey.get("goal", ""),
            survey_context=survey.get("context", ""),
            questions=survey.get("questions", []),
            remaining_minutes=remaining,
            personality_tone=personality,
            realtime_mode=True,
        )

        # Build conversation history for context injection
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in interview.conversation
        ]

        # Request ephemeral key from OpenAI Realtime sessions endpoint
        session_config = {
            "model": "gpt-4o-realtime-preview",
            "voice": voice,
            "instructions": instructions,
            "tools": REALTIME_TOOLS,
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {"type": "server_vad"},
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=session_config,
            )
            if resp.status_code != 200:
                logger.error(f"OpenAI Realtime sessions error: {resp.status_code} {resp.text}")
                raise HTTPException(status_code=502, detail="Failed to create realtime session")

            data = resp.json()

        return {
            "client_secret": data["client_secret"]["value"],
            "voice": voice,
            "conversation_history": conversation_history,
            "expires_at": data["client_secret"].get("expires_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Realtime token error - session: {session_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::get_realtime_token",
            additional_info={"session_id": session_id},
        )
        raise HTTPException(status_code=500, detail="Failed to create realtime token")


# ---------------------------------------------------------------------------
# POST /{session_id}/realtime-turn — Public, session-gated
# ---------------------------------------------------------------------------

@router.post("/{session_id}/realtime-turn")
async def save_realtime_turn(session_id: str, body: RealtimeTurnRequest):
    """
    Save a single conversation turn from a Realtime API WebRTC session.
    Handles coverage updates, completion detection, and abuse handling.
    """
    try:
        interview = await _get_active_interview(session_id)

        # Sanitize user content
        content = sanitize_user_input(body.content) if body.role == "user" else body.content

        # Save the message
        await add_message(session_id, body.role, content)

        # For assistant turns, handle coverage and completion
        result = None
        if body.role == "assistant":
            questions_covered = body.questions_covered or []

            db = await get_db()
            survey = await db["surveys"].find_one({"_id": ObjectId(interview.survey_id)})
            num_questions = len(survey.get("questions", [])) if survey else 0
            remaining = calc_remaining_minutes(
                interview.started_at,
                survey.get("estimated_duration", 5) if survey else 5,
            )

            # process_turn_result handles coverage update, completion,
            # abuse, webhooks, and emails. Pass clean_text="" since the
            # message was already saved above.
            result = await process_turn_result(
                session_id=session_id,
                clean_text="",
                questions_covered=questions_covered,
                abuse_detected=body.abuse_detected,
                num_questions=num_questions,
                remaining=remaining,
            )

        return {
            "status": "saved",
            "completed": result is not None and result.get("type") == "complete",
            "terminated": result is not None and result.get("type") == "terminated",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Realtime turn error - session: {session_id}: {e}", exc_info=True)
        await log_error(
            e, "interviewer/routes.py::save_realtime_turn",
            additional_info={"session_id": session_id},
        )
        raise HTTPException(status_code=500, detail="Failed to save realtime turn")
