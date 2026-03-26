# core/providers/anthropic.py
from typing import AsyncGenerator

from server.core.config import settings
from server.core.llm import LLMProvider



class AnthropicProvider(LLMProvider):
    """Anthropic provider using the Messages API."""

    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "anthropic"

    @property
    def default_model(self) -> str:
        return settings.ANTHROPIC_MODEL

    async def initialize(self) -> None:
        if self._client is None:
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("ANTHROPIC_API_KEY is not configured in .env")
            import anthropic
            self._client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def stream_text(
        self,
        model: str,
        system_prompt: str,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        async with self._client.messages.stream(
            model=model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages],
        ) as stream:
            async for text in stream.text_stream:
                yield text
