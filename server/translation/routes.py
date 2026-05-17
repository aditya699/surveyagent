"""
Realtime translation routes — ephemeral token minting for the
hidden /realtime_translation demo. Mounted at /api/v1/translation.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from server.auth.utils import get_current_user
from server.core.config import settings
from server.core.logging_config import get_logger
from server.db.mongo import log_error

logger = get_logger(__name__)
router = APIRouter()


class TranslationTokenRequest(BaseModel):
    target_language: str = Field(..., min_length=1, max_length=64)


@router.post("/token")
async def get_translation_token(
    body: TranslationTokenRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Mint an ephemeral OpenAI Realtime Translation token for a WebRTC session.
    Auth-gated (any logged-in user). Returns only the client_secret value.
    """
    try:
        session_config = {
            "session": {
                "model": "gpt-realtime-translate",
                "audio": {
                    "output": {"language": body.target_language},
                },
            }
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/realtime/translations/client_secrets",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=session_config,
            )
            if resp.status_code != 200:
                logger.error(
                    f"OpenAI translation client_secrets error: {resp.status_code} {resp.text}"
                )
                raise HTTPException(
                    status_code=502, detail="Failed to create translation session"
                )

            data = resp.json()

        return {
            "client_secret": data["value"],
            "expires_at": data.get("expires_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Translation token error: {e}", exc_info=True)
        await log_error(
            e, "translation/routes.py::get_translation_token",
            additional_info={"target_language": body.target_language},
        )
        raise HTTPException(status_code=500, detail="Failed to create translation token")
