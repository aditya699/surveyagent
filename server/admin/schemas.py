from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class UsageTotals(BaseModel):
    users: int
    verified_users: int
    orgs: int
    teams: int
    surveys: int
    surveys_published: int
    surveys_draft: int
    interviews: int
    interviews_completed: int
    interviews_in_progress: int
    interviews_abandoned: int
    interviews_test: int
    feedback: int
    errors: int
    completion_rate: float


class GrowthBucket(BaseModel):
    last_24h: int
    last_7d: int
    last_30d: int


class Growth(BaseModel):
    users: GrowthBucket
    surveys: GrowthBucket
    interviews: GrowthBucket
    feedback: GrowthBucket


class TimeseriesPoint(BaseModel):
    date: str
    count: int


class TopUser(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    org_name: Optional[str] = None
    surveys_created: int
    interviews_received: int
    created_at: Optional[datetime] = None


class TopSurvey(BaseModel):
    survey_id: str
    title: str
    status: str
    creator_email: Optional[str] = None
    total_interviews: int
    completed: int


class LLMProviderUsage(BaseModel):
    provider: str
    surveys: int


class UsageResponse(BaseModel):
    message: str = "Admin usage retrieved"
    generated_at: datetime
    totals: UsageTotals
    growth: Growth
    timeseries: dict[str, list[TimeseriesPoint]]  # keys: users, surveys, interviews
    top_users: list[TopUser]
    top_surveys: list[TopSurvey]
    llm_usage: list[LLMProviderUsage]


class FeedbackItem(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    rating: Optional[int] = None
    message: str
    created_at: datetime


class FeedbackListResponse(BaseModel):
    message: str = "Feedback retrieved"
    total: int
    items: list[FeedbackItem]


class ErrorItem(BaseModel):
    id: str
    error_type: str
    error_message: str
    location: str
    additional_info: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class ErrorListResponse(BaseModel):
    message: str = "Errors retrieved"
    total: int
    items: list[ErrorItem]


class UserListItem(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    org_name: Optional[str] = None
    role: str
    email_verified: bool
    is_active: bool
    surveys_created: int
    surveys_counter: int
    interviews_received: int
    interviews_completed: int
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class UserListResponse(BaseModel):
    message: str = "Users retrieved"
    total: int
    page: int
    page_size: int
    users: list[UserListItem]


class UserSurveySummary(BaseModel):
    survey_id: str
    title: str
    status: str
    visibility: Optional[str] = None
    created_at: Optional[datetime] = None
    total_interviews: int
    completed: int
    abandoned: int
    in_progress: int


class UserRecentInterview(BaseModel):
    id: str
    survey_id: str
    survey_title: str
    respondent_name: Optional[str] = None
    respondent_email: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None


class UserProfile(BaseModel):
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    org_name: Optional[str] = None
    org_id: Optional[str] = None
    role: str
    email_verified: bool
    is_active: bool
    surveys_counter: int
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class UserTotals(BaseModel):
    surveys: int
    surveys_published: int
    interviews: int
    completed: int
    completion_rate: float


class UserDetailResponse(BaseModel):
    message: str = "User detail retrieved"
    user: UserProfile
    totals: UserTotals
    surveys: list[UserSurveySummary]
    recent_interviews: list[UserRecentInterview]
