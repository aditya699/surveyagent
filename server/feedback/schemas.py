from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class FeedbackCreate(BaseModel):
    name: Optional[str] = Field(None, max_length=200, description="Name of the person giving feedback")
    email: Optional[EmailStr] = Field(None, description="Email of the person giving feedback")
    message: str = Field(..., min_length=1, max_length=5000, description="Feedback message")
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1 to 5")


class FeedbackResponse(BaseModel):
    id: str = Field(..., description="Feedback ID")
    name: Optional[str] = Field(None, description="Name")
    email: Optional[str] = Field(None, description="Email")
    message: str = Field(..., description="Feedback message")
    rating: Optional[int] = Field(None, description="Rating")
    created_at: datetime = Field(..., description="Submission timestamp")


class FeedbackSingleResponse(BaseModel):
    message: str = Field(..., description="Response message")
    feedback: FeedbackResponse = Field(..., description="Submitted feedback")
