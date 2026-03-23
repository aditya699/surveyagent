"""
AI module Pydantic schemas.
"""

from pydantic import BaseModel, Field


class GenerateQuestionsRequest(BaseModel):
    num_questions: int = Field(default=5, ge=1, le=20)
    title: str = ""
    description: str = ""
    goal: str = ""
    context: str = ""
    additional_info: str = ""


class EnhanceFieldRequest(BaseModel):
    field_name: str = Field(..., pattern=r"^(title|description|goal|context|welcome_message)$")
    current_value: str = ""
    title: str = ""
    description: str = ""
    goal: str = ""
    context: str = ""
