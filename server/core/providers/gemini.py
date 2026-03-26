# core/providers/gemini.py
from typing import AsyncGenerator

from server.core.config import settings
from server.core.llm import LLMProvider


class GeminiProvider(LLMProvider):
    """Google Gemini provider using the GenAI SDK."""

    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "gemini"

    @property
    def default_model(self) -> str:
        return settings.GEMINI_MODEL

    async def initialize(self) -> None:
        if self._client is None:
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured in .env")
            from google import genai
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    async def stream_text(
        self,
        model: str,
        system_prompt: str,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        from google.genai import types

        # Convert messages to Gemini Content format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=msg["content"])],
            ))

        async for chunk in self._client.aio.models.generate_content_stream(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
            ),
        ):
            if chunk.text:
                yield chunk.text
