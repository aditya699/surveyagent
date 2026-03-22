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
