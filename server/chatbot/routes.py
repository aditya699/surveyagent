import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from server.auth.utils import get_current_user
from server.core.llm import get_provider
from server.core.logging_config import get_logger
from server.db.mongo import log_error
from server.chatbot.schemas import ChatRequest
from server.chatbot.prompts import build_chatbot_prompt, WINDOW_SIZE
from server.chatbot.rate_limit import check_and_increment

logger = get_logger(__name__)
router = APIRouter()


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    # Rate limit: 20 messages per hour, 2-hour block on breach
    allowed, retry_after = await check_and_increment(str(current_user["_id"]))
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail={"message": "Chat limit reached. You can send 20 messages per hour.", "retry_after": retry_after},
        )
    # Sliding window: cap history before passing to LLM
    windowed = request.history[-WINDOW_SIZE:]
    messages = [{"role": m.role, "content": m.content} for m in windowed]

    # User-message injection: prepend live page data so the AI answers about
    # what is actually on screen, not generic platform knowledge.
    if request.page_context:
        user_message = f"[Current page data]\n{request.page_context}\n\n{request.message}"
    else:
        user_message = request.message
    messages.append({"role": "user", "content": user_message})

    # System-prompt injection: stable identity context (name, org, page label)
    system_prompt = build_chatbot_prompt(request.context)

    try:
        provider = await get_provider(request.llm_provider or "openai")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Unknown LLM provider: {e}")

    model = request.llm_model or provider.default_model

    async def event_stream():
        try:
            async for delta in provider.stream_text(
                model=model,
                system_prompt=system_prompt,
                messages=messages,
            ):
                yield f"data: {json.dumps({'token': delta})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Chatbot stream failed: {e}", exc_info=True)
            await log_error("chatbot_stream", str(e))
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
