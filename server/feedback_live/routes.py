"""
Live feedback dashboard demo routes — hidden /realtime_feedback page.

Two endpoints:
- POST /token   — mints an ephemeral OpenAI Realtime token configured for
                  transcription-only (server VAD detects turns; no audio
                  response from the model).
- POST /extract — given the running transcript, returns a structured
                  dashboard JSON (sentiment, strengths, concerns, etc).

Both are Bearer-auth gated. Nothing is persisted.
"""

import json

import httpx
from fastapi import APIRouter, Depends, HTTPException

from server.auth.utils import get_current_user
from server.core.config import settings
from server.core.llm import get_provider
from server.core.logging_config import get_logger
from server.db.mongo import log_error
from server.feedback_live.prompts import (
    EXTRACTION_SYSTEM_PROMPT,
    build_extraction_prompt,
)
from server.feedback_live.schemas import ExtractRequest, ExtractResponse

logger = get_logger(__name__)
router = APIRouter()


@router.post("/token")
async def get_feedback_live_token(current_user: dict = Depends(get_current_user)):
    """
    Mint an ephemeral OpenAI Realtime token for transcription-only mode.

    Uses gpt-realtime-2 on the GA endpoint with `create_response: false` so
    server VAD just emits input transcriptions without triggering audio
    responses from the model. No tools, no instructions, no output voice.
    """
    try:
        session_config = {
            "session": {
                "type": "realtime",
                "model": "gpt-realtime-2",
                "audio": {
                    "input": {
                        "transcription": {"model": "whisper-1"},
                        "turn_detection": {
                            "type": "server_vad",
                            "create_response": False,
                        },
                    },
                },
            }
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/client_secrets",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=session_config,
            )
            if resp.status_code != 200:
                logger.error(
                    f"OpenAI feedback-live client_secrets error: {resp.status_code} {resp.text}"
                )
                raise HTTPException(
                    status_code=502, detail="Failed to create transcription session"
                )

            data = resp.json()

        return {
            "client_secret": data["value"],
            "expires_at": data.get("expires_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback-live token error: {e}", exc_info=True)
        await log_error(e, "feedback_live/routes.py::get_feedback_live_token")
        raise HTTPException(
            status_code=500, detail="Failed to create transcription token"
        )


@router.post("/extract", response_model=ExtractResponse)
async def extract_feedback_dashboard(
    body: ExtractRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Given the running transcript, return a structured insights snapshot.
    """
    try:
        provider = await get_provider("openai")
        model = provider.default_model
        user_prompt = build_extraction_prompt(body.transcript)

        buffer = ""
        async for delta in provider.stream_text(
            model=model,
            system_prompt=EXTRACTION_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        ):
            buffer += delta

        # Strip any accidental markdown fencing the model may emit.
        clean = buffer.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        clean = clean.strip()

        try:
            data = json.loads(clean)
        except json.JSONDecodeError:
            logger.warning(
                f"Feedback-live extraction returned non-JSON: {clean[:200]!r}"
            )
            return ExtractResponse()

        return ExtractResponse(**data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback-live extraction error: {e}", exc_info=True)
        await log_error(
            e,
            "feedback_live/routes.py::extract_feedback_dashboard",
            additional_info={"transcript_chars": len(body.transcript)},
        )
        raise HTTPException(status_code=500, detail="Failed to extract dashboard")
