from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class UserContext(BaseModel):
    name: Optional[str] = None
    org_name: Optional[str] = None
    current_page: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    context: Optional[UserContext] = None      # injected into system prompt (stable)
    page_context: Optional[str] = None         # injected into user message (live page data)
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
