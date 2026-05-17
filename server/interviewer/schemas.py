# interviewer/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class RespondentDetails(BaseModel):
    """
    Deep Technical Context:
    - Embedded document within an interview session, not a standalone collection
    - All fields are optional — respondent may be fully anonymous
    - Collected via a simple form before the chat starts so admins can segment responses
    """
    name: Optional[str] = Field(None, description="Respondent's name", max_length=200)
    age: Optional[int] = Field(None, description="Respondent's age", ge=1, le=150)
    gender: Optional[str] = Field(None, description="Respondent's gender", max_length=50)
    occupation: Optional[str] = Field(None, description="Respondent's occupation", max_length=200)
    phone_number: Optional[str] = Field(None, description="Respondent's phone number", max_length=30)
    email: Optional[str] = Field(None, description="Respondent's email address", max_length=320)


class Message(BaseModel):
    """
    Deep Technical Context:
    - Single message in the interview conversation history
    - role is "assistant" (interviewer LLM) or "user" (respondent)
    - content stores text with coverage tag already stripped for assistant messages
    - timestamp records when the message was sent/received
    """
    role: str = Field(..., description="Message role: 'assistant' or 'user'")
    content: str = Field(..., description="Message text content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")


class StartInterviewRequest(BaseModel):
    """Request body for starting an interview session."""
    respondent: Optional[RespondentDetails] = None
    language: str = Field("English", description="Respondent's preferred interview language")


class SendMessageRequest(BaseModel):
    """Request body for sending a respondent message."""
    message: str = Field(..., description="Respondent's message", min_length=1, max_length=5000)


class TestQuestionRequest(BaseModel):
    """Request body for testing a single question via lightweight chatbot."""
    question_text: str = Field(..., description="The question text to test", min_length=1, max_length=5000)
    ai_instructions: Optional[str] = Field(None, description="AI instructions for this question", max_length=2000)
    personality_tone: str = Field("friendly", description="Interviewer personality tone")
    language: str = Field("English", description="Interview language")
    survey_title: Optional[str] = Field(None, max_length=500)
    survey_goal: Optional[str] = Field(None, max_length=2000)
    survey_context: Optional[str] = Field(None, max_length=5000)
    conversation: List[dict] = Field(default_factory=list, description="Chat history [{role, content}]")
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None


class RealtimeTurnRequest(BaseModel):
    """Request body for saving a single turn from a Realtime API session."""
    role: str = Field(..., pattern=r"^(user|assistant)$", description="Turn role")
    content: str = Field(..., min_length=1, max_length=10000, description="Transcript text")
    questions_covered: Optional[List[int]] = Field(None, description="1-based indices from update_coverage tool call")
    abuse_detected: bool = Field(False, description="True if report_abuse tool was called")


class InterviewCreate(BaseModel):
    """
    Deep Technical Context:
    - Schema for creating a new interview session via POST
    - survey_id is required — links to the published survey being taken
    - respondent is optional — can be fully anonymous
    - is_test_run marks admin test sessions (excluded from analytics)
    - status, timestamps, and conversation are set server-side
    """
    survey_id: str = Field(..., description="ID of the survey being taken", min_length=1)
    respondent: Optional[RespondentDetails] = Field(None, description="Optional respondent demographic info")
    is_test_run: bool = Field(False, description="Whether this is an admin test run")


class InterviewInDB(BaseModel):
    """
    Deep Technical Context:
    - Represents the full interview document as stored in MongoDB 'interviews' collection
    - survey_id stored as ObjectId in MongoDB, converted to string for Pydantic
    - conversation is an ordered list of Message objects (append-only during session)
    - questions_covered is parsed from the LLM's [COVERED: ...] tag after each assistant message
    - status transitions: in_progress -> completed | abandoned
    - started_at is set on creation; completed_at is set when status changes to completed/abandoned
    """
    survey_id: str = Field(..., description="Survey ObjectId this interview belongs to")
    respondent: Optional[RespondentDetails] = Field(None, description="Respondent demographic info")
    conversation: List[Message] = Field(default_factory=list, description="Ordered conversation history")
    status: str = Field("in_progress", description="Session status: in_progress, completed, or abandoned")
    is_test_run: bool = Field(False, description="Whether this is an admin test run")
    questions_covered: List[int] = Field(default_factory=list, description="1-based indices of covered questions")
    abandoned_reason: Optional[str] = Field(None, description="Reason for abandonment (e.g. 'abuse_detected', 'inactive_timeout')")
    started_at: datetime = Field(..., description="Session start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Session end timestamp")
    last_activity_at: datetime = Field(..., description="Last message or session creation timestamp")


class InterviewResponse(BaseModel):
    """
    Deep Technical Context:
    - Schema for returning a single interview to the client
    - _id converted to string id for JSON serialization
    - survey_id also a string
    """
    id: str = Field(..., description="Interview ID")
    survey_id: str = Field(..., description="Survey ID this interview belongs to")
    respondent: Optional[RespondentDetails] = Field(None, description="Respondent demographic info")
    conversation: List[Message] = Field(default_factory=list, description="Ordered conversation history")
    status: str = Field(..., description="Session status: in_progress, completed, or abandoned")
    is_test_run: bool = Field(False, description="Whether this is an admin test run")
    questions_covered: List[int] = Field(default_factory=list, description="1-based indices of covered questions")
    abandoned_reason: Optional[str] = Field(None, description="Reason for abandonment (e.g. 'abuse_detected', 'inactive_timeout')")
    started_at: datetime = Field(..., description="Session start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Session end timestamp")
    last_activity_at: Optional[datetime] = Field(None, description="Last message or session creation timestamp")


class InterviewSingleResponse(BaseModel):
    """
    Deep Technical Context:
    - Wraps a single interview for API responses
    """
    message: str = Field(..., description="Response message")
    interview: InterviewResponse = Field(..., description="Interview data")


class InterviewListResponse(BaseModel):
    """
    Deep Technical Context:
    - Wraps a list of interviews for GET endpoints
    - Includes count for client convenience
    """
    message: str = Field(..., description="Response message")
    count: int = Field(..., description="Number of interviews returned")
    interviews: List[InterviewResponse] = Field(..., description="List of interviews")
