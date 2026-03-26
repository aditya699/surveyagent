# core/providers/__init__.py — register all built-in LLM providers
from server.core.llm import register_provider
from server.core.providers.openai import OpenAIProvider
from server.core.providers.anthropic import AnthropicProvider
from server.core.providers.gemini import GeminiProvider

register_provider("openai", OpenAIProvider)
register_provider("anthropic", AnthropicProvider)
register_provider("gemini", GeminiProvider)
