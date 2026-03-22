# surveys/utils.py
import uuid

from server.surveys.schemas import SurveyResponse


def survey_doc_to_response(doc: dict) -> SurveyResponse:
    """Convert a MongoDB survey document to a SurveyResponse."""
    return SurveyResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        goal=doc.get("goal", ""),
        context=doc.get("context", ""),
        questions=doc.get("questions", []),
        estimated_duration=doc.get("estimated_duration", 5),
        welcome_message=doc.get("welcome_message"),
        personality_tone=doc.get("personality_tone", "friendly"),
        status=doc["status"],
        token=doc.get("token"),
        created_by=str(doc["created_by"]),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def generate_survey_token() -> str:
    """
    Deep Technical Context:
    - Generates a unique token for a published survey using uuid4
    - This token is used as the public-facing identifier for survey respondents
    - Stored in the survey document's 'token' field on publish

    Returns:
        str: A unique UUID4 string
    """
    return str(uuid.uuid4())
