"""
AI routes for SurveyAgent.
Provides streaming question generation and field enhancement via pluggable LLM providers.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from server.auth.utils import get_current_user
from server.core.config import settings
from server.core.llm import get_openai_client, get_provider
from server.core.logging_config import get_logger
from server.ai.prompts import SYSTEM_PROMPT, build_user_prompt, ENHANCE_SYSTEM_PROMPT, build_enhance_prompt
from server.ai.schemas import GenerateQuestionsRequest, EnhanceFieldRequest, SynthesizeSpeechRequest

logger = get_logger(__name__)
router = APIRouter()


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

    provider = await get_provider(request.llm_provider or "openai")
    model = request.llm_model or provider.default_model

    async def event_stream():
        try:
            # Buffer tokens and emit a complete question each time we hit a newline
            buffer = ""
            question_count = 0

            async for delta in provider.stream_text(
                model=model,
                system_prompt=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ):
                buffer += delta

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


@router.post("/enhance-field")
async def enhance_field(
    request: EnhanceFieldRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Stream AI-enhanced content for a single survey field via SSE.

    Each token is sent as: data: {"token": "..."}\n\n
    Final event: data: [DONE]\n\n
    """
    user_prompt = build_enhance_prompt(
        field_name=request.field_name,
        current_value=request.current_value,
        title=request.title,
        description=request.description,
        goal=request.goal,
        context=request.context,
    )

    provider = await get_provider(request.llm_provider or "openai")
    model = request.llm_model or provider.default_model

    async def event_stream():
        try:
            async for delta in provider.stream_text(
                model=model,
                system_prompt=ENHANCE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ):
                yield f"data: {json.dumps({'token': delta})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"AI field enhancement failed: {e}", exc_info=True)
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


@router.post("/synthesize-speech")
async def synthesize_speech(
    request: SynthesizeSpeechRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Convert text to speech using OpenAI TTS API.
    Returns audio/mpeg stream.
    """
    client = await get_openai_client()

    async def audio_stream():
        try:
            async with client.audio.speech.with_streaming_response.create(
                model="gpt-4o-mini-tts",
                voice=request.voice,
                input=request.text,
                instructions="Read this summary in a clear, professional tone.",
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
