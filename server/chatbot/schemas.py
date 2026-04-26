from pydantic import BaseModel, Field
from typing import Optional, Annotated

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_ITEMS  = 40


class ChatMessage(BaseModel):
    role:    Annotated[str, Field(max_length=20)]
    content: Annotated[str, Field(max_length=MAX_MESSAGE_LENGTH)]


class UserContext(BaseModel):
    name:         Optional[str] = None
    org_name:     Optional[str] = None
    current_page: Optional[str] = None


class ChatRequest(BaseModel):
    message:      Annotated[str, Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)]
    history:      list[ChatMessage] = Field(default_factory=list, max_length=MAX_HISTORY_ITEMS)
    context:      Optional[UserContext] = None   # injected into system prompt (stable)
    page_context: Optional[Annotated[str, Field(max_length=2000)]] = None  # injected into user message (live page data)
    llm_provider: Optional[str] = None
    llm_model:    Optional[str] = None
