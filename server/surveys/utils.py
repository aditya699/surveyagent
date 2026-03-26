# surveys/utils.py
import uuid

from server.surveys.schemas import SurveyResponse


def normalize_questions(raw: list) -> list[dict]:
    """Convert legacy string questions to QuestionItem dicts for backward compat."""
    result = []
    for q in raw:
        if isinstance(q, str):
            result.append({"text": q, "ai_instructions": None})
        elif isinstance(q, dict):
            result.append(q)
        else:
            result.append({"text": str(q), "ai_instructions": None})
    return result


def survey_doc_to_response(doc: dict) -> SurveyResponse:
    """Convert a MongoDB survey document to a SurveyResponse."""
    return SurveyResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        goal=doc.get("goal", ""),
        context=doc.get("context", ""),
        questions=normalize_questions(doc.get("questions", [])),
        estimated_duration=doc.get("estimated_duration", 5),
        welcome_message=doc.get("welcome_message"),
        personality_tone=doc.get("personality_tone", "friendly"),
        webhook_url=doc.get("webhook_url"),
        llm_provider=doc.get("llm_provider"),
        llm_model=doc.get("llm_model"),
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
