# core/llm.py
from abc import ABC, abstractmethod
from typing import AsyncGenerator

from openai import AsyncOpenAI
from server.core.config import settings
from server.db.mongo import log_error


# ---------------------------------------------------------------------------
# Abstract Base Class — implement this to add a new LLM provider
# ---------------------------------------------------------------------------

class LLMProvider(ABC):
    """Abstract base for all LLM providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier: 'openai', 'anthropic', 'gemini'."""

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model name for this provider."""

    @abstractmethod
    async def initialize(self) -> None:
        """Lazily initialize the underlying SDK client."""

    @abstractmethod
    async def stream_text(
        self,
        model: str,
        system_prompt: str,
        messages: list[dict],
    ) -> AsyncGenerator[str, None]:
        """
        Yield raw text deltas from the LLM.

        Args:
            model: Model name (e.g. 'gpt-5.4-mini', 'claude-sonnet-4-6').
            system_prompt: The system / developer prompt.
            messages: Conversation history as [{"role": "user"|"assistant", "content": "..."}].

        Yields:
            str: Text delta chunks.
        """


# ---------------------------------------------------------------------------
# Provider Registry + Factory
# ---------------------------------------------------------------------------

PROVIDER_REGISTRY: dict[str, type[LLMProvider]] = {}
_provider_instances: dict[str, LLMProvider] = {}


def register_provider(name: str, cls: type[LLMProvider]) -> None:
    """Register an LLM provider class by name."""
    PROVIDER_REGISTRY[name] = cls


async def get_provider(provider_name: str = "openai") -> LLMProvider:
    """Get or lazily initialize a singleton provider instance."""
    if provider_name not in _provider_instances:
        cls = PROVIDER_REGISTRY.get(provider_name)
        if not cls:
            raise ValueError(f"Unknown LLM provider: '{provider_name}'. Available: {list(PROVIDER_REGISTRY.keys())}")
        instance = cls()
        await instance.initialize()
        _provider_instances[provider_name] = instance
    return _provider_instances[provider_name]


# ---------------------------------------------------------------------------
# Legacy helper — kept for TTS endpoint (OpenAI-only)
# ---------------------------------------------------------------------------

_openai_client: AsyncOpenAI | None = None


async def get_openai_client() -> AsyncOpenAI:
    """Get or initialize the raw AsyncOpenAI client (used for TTS only)."""
    global _openai_client
    try:
        if _openai_client is None:
            _openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return _openai_client
    except Exception as e:
        await log_error(e, "core/llm.py", "get_openai_client")
        raise e
