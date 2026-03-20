"""
AI routes for SurveyAgent.
Provides streaming question generation using OpenAI Responses API with GPT-5.4-mini.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from server.auth.utils import get_current_user
from server.core.config import settings
from server.core.llm import get_openai_client
from server.core.logging_config import get_logger
from server.ai.prompts import SYSTEM_PROMPT, build_user_prompt

logger = get_logger(__name__)
router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = Field(default=5, ge=1, le=20)
    title: str = ""
    description: str = ""
    goal: str = ""
    context: str = ""
    additional_info: str = ""


@router.post("/generate-questions")
async def generate_questions(
    request: GenerateQuestionsRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Stream AI-generated survey questions via Server-Sent Events (SSE).

    Uses OpenAI Responses API with GPT-5.4-mini.
    Each complete question is sent as: data: {"question": "..."}\n\n
    Final event: data: [DONE]\n\n
    """
    user_prompt = build_user_prompt(
        num_questions=request.num_questions,
        title=request.title,
        description=request.description,
        goal=request.goal,
        context=request.context,
        additional_info=request.additional_info,
    )

    client = await get_openai_client()

    async def event_stream():
        try:
            stream = await client.responses.create(
                model=settings.OPENAI_MODEL,
                input=[
                    {"role": "developer", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                stream=True,
            )

            # Buffer tokens and emit a complete question each time we hit a newline
            buffer = ""
            question_count = 0

            async for event in stream:
                if hasattr(event, "type") and event.type == "response.output_text.delta":
                    buffer += event.delta

                    # Check if we have one or more complete lines
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()
                        if line and question_count < request.num_questions:
                            question_count += 1
                            yield f"data: {json.dumps({'question': line})}\n\n"

            # Flush any remaining content in the buffer (last question may not end with \n)
            remaining = buffer.strip()
            if remaining and question_count < request.num_questions:
                yield f"data: {json.dumps({'question': remaining})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"AI question generation failed: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
