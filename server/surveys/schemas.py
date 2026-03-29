# surveys/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class QuestionItem(BaseModel):
    """A single survey question with optional AI interviewer instructions."""
    text: str = Field(..., description="The question text", min_length=1)
    ai_instructions: Optional[str] = Field(None, description="Optional instructions for the AI interviewer on how to handle this question")


class SurveyCreate(BaseModel):
    """
    Deep Technical Context:
    - Schema for creating a new survey via POST /
    - All fields are required except description, goal, context, and questions
    - questions defaults to empty list; admin adds them later or at creation
    - status always starts as "draft" (set server-side, not by client)
    """
    title: str = Field(..., description="Survey title", min_length=1, max_length=200)
    description: str = Field("", description="Survey description")
    goal: str = Field("", description="Survey goal / objective")
    context: str = Field("", description="Context or background for the survey")
    questions: List[QuestionItem] = Field(default_factory=list, description="List of survey questions")
    estimated_duration: int = Field(5, description="Estimated interview duration in minutes", ge=1, le=60)
    welcome_message: Optional[str] = Field(None, description="Custom welcome message for respondents", max_length=1000)
    personality_tone: str = Field("friendly", description="Interviewer tone: professional, friendly, casual, or fun")
    webhook_url: Optional[str] = Field(None, description="Webhook URL to POST interview results on completion", max_length=2000)
    notify_on_completion: bool = Field(False, description="Email the survey creator when an interview is completed")
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name (e.g. gpt-5.4-mini, claude-sonnet-4-6, gemini-3.1-pro-preview)")
    analytics_instructions: Optional[str] = Field(None, description="Custom instructions for AI analytics", max_length=2000)
    visibility: str = Field("private", description="Survey visibility: private, team, or org")
    team_ids: List[str] = Field(default_factory=list, description="Team IDs for team visibility")


class SurveyUpdate(BaseModel):
    """
    Deep Technical Context:
    - Schema for updating an existing survey via PUT /{id}
    - All fields are optional; only provided fields are updated
    - Cannot update status here — use POST /{id}/publish instead
    - Cannot update created_by, created_at, or token
    """
    title: Optional[str] = Field(None, description="Survey title", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="Survey description")
    goal: Optional[str] = Field(None, description="Survey goal / objective")
    context: Optional[str] = Field(None, description="Context or background for the survey")
    questions: Optional[List[QuestionItem]] = Field(None, description="List of survey questions")
    estimated_duration: Optional[int] = Field(None, description="Estimated interview duration in minutes", ge=1, le=60)
    welcome_message: Optional[str] = Field(None, description="Custom welcome message for respondents", max_length=1000)
    personality_tone: Optional[str] = Field(None, description="Interviewer tone: professional, friendly, casual, or fun")
    webhook_url: Optional[str] = Field(None, description="Webhook URL to POST interview results on completion", max_length=2000)
    notify_on_completion: Optional[bool] = Field(None, description="Email the survey creator when an interview is completed")
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name (e.g. gpt-5.4-mini, claude-sonnet-4-6, gemini-3.1-pro-preview)")
    analytics_instructions: Optional[str] = Field(None, description="Custom instructions for AI analytics", max_length=2000)
    visibility: Optional[str] = Field(None, description="Survey visibility: private, team, or org")
    team_ids: Optional[List[str]] = Field(None, description="Team IDs for team visibility")


class SurveyInDB(BaseModel):
    """
    Deep Technical Context:
    - Represents the full survey document as stored in MongoDB 'surveys' collection
    - created_by is the ObjectId of the admin who created the survey
    - token is null until the survey is published
    - status is either "draft" or "published"
    """
    title: str = Field(..., description="Survey title")
    description: str = Field("", description="Survey description")
    goal: str = Field("", description="Survey goal / objective")
    context: str = Field("", description="Context or background for the survey")
    questions: List[QuestionItem] = Field(default_factory=list, description="List of survey questions")
    estimated_duration: int = Field(5, description="Estimated interview duration in minutes")
    welcome_message: Optional[str] = Field(None, description="Custom welcome message for respondents")
    personality_tone: str = Field("friendly", description="Interviewer tone: professional, friendly, casual, or fun")
    webhook_url: Optional[str] = Field(None, description="Webhook URL to POST interview results on completion")
    notify_on_completion: bool = Field(False, description="Email the survey creator when an interview is completed")
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name (e.g. gpt-5.4-mini, claude-sonnet-4-6, gemini-3.1-pro-preview)")
    analytics_instructions: Optional[str] = Field(None, description="Custom instructions for AI analytics")
    status: str = Field("draft", description="Survey status: draft or published")
    token: Optional[str] = Field(None, description="Unique public token, generated on publish")
    created_by: str = Field(..., description="Admin ObjectId who created the survey")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class SurveyResponse(BaseModel):
    """
    Deep Technical Context:
    - Schema for returning a single survey to the client
    - _id is converted to string id for JSON serialization
    - created_by is also a string ObjectId
    """
    id: str = Field(..., description="Survey ID")
    title: str = Field(..., description="Survey title")
    description: str = Field("", description="Survey description")
    goal: str = Field("", description="Survey goal / objective")
    context: str = Field("", description="Context or background for the survey")
    questions: List[QuestionItem] = Field(default_factory=list, description="List of survey questions")
    estimated_duration: int = Field(5, description="Estimated interview duration in minutes")
    welcome_message: Optional[str] = Field(None, description="Custom welcome message for respondents")
    personality_tone: str = Field("friendly", description="Interviewer tone: professional, friendly, casual, or fun")
    webhook_url: Optional[str] = Field(None, description="Webhook URL to POST interview results on completion")
    notify_on_completion: bool = Field(False, description="Email the survey creator when an interview is completed")
    llm_provider: Optional[str] = Field(None, description="LLM provider: openai, anthropic, or gemini")
    llm_model: Optional[str] = Field(None, description="Model name (e.g. gpt-5.4-mini, claude-sonnet-4-6, gemini-3.1-pro-preview)")
    analytics_instructions: Optional[str] = Field(None, description="Custom instructions for AI analytics")
    status: str = Field(..., description="Survey status: draft or published")
    token: Optional[str] = Field(None, description="Unique public token")
    created_by: str = Field(..., description="Admin ID who created the survey")
    created_by_name: Optional[str] = Field(None, description="Creator's name (for shared surveys)")
    created_by_email: Optional[str] = Field(None, description="Creator's email (for shared surveys)")
    org_id: Optional[str] = Field(None, description="Organization ID")
    visibility: str = Field("private", description="Survey visibility: private, team, or org")
    team_ids: List[str] = Field(default_factory=list, description="Team IDs for team visibility")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class SurveyListResponse(BaseModel):
    """
    Deep Technical Context:
    - Wraps a list of surveys for the GET / endpoint
    - Includes count for client convenience
    """
    message: str = Field(..., description="Response message")
    count: int = Field(..., description="Number of surveys returned")
    surveys: List[SurveyResponse] = Field(..., description="List of surveys")


class SurveySingleResponse(BaseModel):
    """
    Deep Technical Context:
    - Wraps a single survey for GET /{id}, POST /, PUT /{id}, POST /{id}/publish
    """
    message: str = Field(..., description="Response message")
    survey: SurveyResponse = Field(..., description="Survey data")


class SurveyDeleteResponse(BaseModel):
    """
    Deep Technical Context:
    - Response for DELETE /{id}
    """
    message: str = Field(..., description="Deletion confirmation message")
    id: str = Field(..., description="Deleted survey ID")
