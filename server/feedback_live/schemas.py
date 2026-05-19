"""
Schemas for the live feedback dashboard demo.
"""

from pydantic import BaseModel, Field


class ExtractRequest(BaseModel):
    transcript: str = Field(..., min_length=1, max_length=200_000)


class InsightItem(BaseModel):
    title: str
    detail: str


class QuoteItem(BaseModel):
    text: str


class ExtractResponse(BaseModel):
    overall_score: int | None = None
    sentiment: str | None = None
    summary: str = ""
    key_themes: list[str] = []
    strengths: list[InsightItem] = []
    concerns: list[InsightItem] = []
    improvements: list[InsightItem] = []
    quotes: list[QuoteItem] = []
