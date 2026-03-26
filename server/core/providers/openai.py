# core/providers/openai.py
from typing import AsyncGenerator

from openai import AsyncOpenAI
from server.core.config import settings
from server.core.llm import LLMProvider


class OpenAIProvider(LLMProvider):
    """OpenAI provider using the Responses API."""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def name(self) -> str:
        return "openai"

    @property
    def default_model(self) -> str:
        return settings.OPENAI_MODEL

    async def initialize(self) -> None:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def stream_text(
        self,
        model: str,
        system_prompt: str,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        # Prepend system prompt as "developer" role (OpenAI Responses API convention)
        input_messages = [{"role": "developer", "content": system_prompt}]
        for msg in messages:
            input_messages.append({"role": msg["role"], "content": msg["content"]})

        stream = await self._client.responses.create(
            model=model,
            input=input_messages,
            stream=True,
        )

        async for event in stream:
            if hasattr(event, "type") and event.type == "response.output_text.delta":
                yield event.delta
