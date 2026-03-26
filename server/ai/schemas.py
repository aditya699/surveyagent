"""
AI module Pydantic schemas.
"""

from pydantic import BaseModel, Field


from typing import Optional


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = Field(default=5, ge=1, le=20)
    title: str = ""
    description: str = ""
    goal: str = ""
    context: str = ""
    additional_info: str = ""
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name override")


class EnhanceFieldRequest(BaseModel):
    field_name: str = Field(..., pattern=r"^(title|description|goal|context|welcome_message)$")
    current_value: str = ""
    title: str = ""
    description: str = ""
    goal: str = ""
    context: str = ""
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name override")


class SynthesizeSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)
    voice: str = Field(default="coral")
