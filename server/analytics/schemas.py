from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SurveyOverviewItem(BaseModel):
    survey_id: str = Field(..., description="Survey ID")
    title: str = Field(..., description="Survey title")
    status: str = Field(..., description="Survey status (draft/published)")
    total_interviews: int = Field(0, description="Total interview sessions")
    completed: int = Field(0, description="Completed interviews")
    abandoned: int = Field(0, description="Abandoned interviews")
    in_progress: int = Field(0, description="In-progress interviews")
    completion_rate: float = Field(0.0, description="Completion rate (0-100)")
    avg_duration_seconds: Optional[float] = Field(None, description="Average duration in seconds for completed interviews")


class SurveyOverviewResponse(BaseModel):
    message: str = Field(..., description="Response message")
    surveys: List[SurveyOverviewItem] = Field(..., description="Survey overview stats")


class QuestionFrequency(BaseModel):
    question_index: int = Field(..., description="1-based question index")
    question_text: str = Field(..., description="Question text")
    times_covered: int = Field(0, description="Times this question was covered")
    coverage_rate: float = Field(0.0, description="Coverage rate (0-100)")


class SurveyDetailStats(BaseModel):
    total_interviews: int = Field(0)
    completed: int = Field(0)
    abandoned: int = Field(0)
    in_progress: int = Field(0)
    completion_rate: float = Field(0.0)
    avg_duration_seconds: Optional[float] = Field(None)
    avg_questions_covered: float = Field(0.0)
    question_frequencies: List[QuestionFrequency] = Field(default_factory=list)


class SurveyDetailResponse(BaseModel):
    message: str = Field(..., description="Response message")
    survey_id: str = Field(..., description="Survey ID")
    title: str = Field(..., description="Survey title")
    stats: SurveyDetailStats = Field(..., description="Detailed stats")


class InterviewListItem(BaseModel):
    id: str = Field(..., description="Interview session ID")
    respondent_name: Optional[str] = Field(None, description="Respondent name if provided")
    respondent_email: Optional[str] = Field(None, description="Respondent email if provided")
    status: str = Field(..., description="Interview status")
    duration_seconds: Optional[float] = Field(None, description="Duration in seconds")
    questions_covered_count: int = Field(0, description="Number of questions covered")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")


class InterviewListResponse(BaseModel):
    message: str = Field(..., description="Response message")
    survey_id: str = Field(..., description="Survey ID")
    total: int = Field(..., description="Total interview count")
    page: int = Field(..., description="Current page")
    page_size: int = Field(..., description="Page size")
    interviews: List[InterviewListItem] = Field(..., description="Interview list")


class MessageItem(BaseModel):
    role: str = Field(..., description="Message role (assistant/user)")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = Field(None, description="Message timestamp")


class InterviewDetailResponse(BaseModel):
    message: str = Field(..., description="Response message")
    id: str = Field(..., description="Interview session ID")
    survey_id: str = Field(..., description="Survey ID")
    survey_title: str = Field(..., description="Survey title")
    respondent: Dict[str, Any] = Field(default_factory=dict, description="Respondent details")
    conversation: List[MessageItem] = Field(default_factory=list, description="Full conversation")
    status: str = Field(..., description="Interview status")
    questions_covered: List[int] = Field(default_factory=list, description="Covered question indices")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    duration_seconds: Optional[float] = Field(None, description="Duration in seconds")
    analysis: Optional[Dict[str, Any]] = Field(None, description="Cached AI analysis")
