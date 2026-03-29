# surveys/utils.py
import uuid
from bson import ObjectId
from server.surveys.schemas import SurveyResponse
from server.teams.db import get_user_team_ids


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
        notify_on_completion=doc.get("notify_on_completion", False),
        llm_provider=doc.get("llm_provider"),
        llm_model=doc.get("llm_model"),
        analytics_instructions=doc.get("analytics_instructions"),
        status=doc["status"],
        token=doc.get("token"),
        created_by=str(doc["created_by"]),
        created_by_name=doc.get("created_by_name"),
        created_by_email=doc.get("created_by_email"),
        org_id=str(doc["org_id"]) if doc.get("org_id") else None,
        visibility=doc.get("visibility", "private"),
        team_ids=[str(tid) for tid in doc.get("team_ids", [])],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def generate_survey_token() -> str:
    """Generate a unique token for a published survey."""
    return str(uuid.uuid4())


async def check_survey_access(survey_doc: dict, current_user: dict) -> bool:
    """Check if user has access to a survey based on visibility rules."""
    user_id = current_user["user_id"]
    org_id = current_user.get("org_id")

    # Creator always has access
    if str(survey_doc["created_by"]) == user_id:
        return True

    survey_org_id = str(survey_doc.get("org_id", ""))
    if not org_id or survey_org_id != str(org_id):
        return False

    # Owner/Admin can see all surveys in their org
    role = current_user.get("role", "member")
    if role in ("owner", "admin"):
        return True

    visibility = survey_doc.get("visibility", "private")

    if visibility == "org":
        return True

    if visibility == "team":
        user_team_ids = await get_user_team_ids(user_id, str(org_id))
        survey_team_ids = set(survey_doc.get("team_ids", []))
        # Check intersection
        user_team_id_set = set(user_team_ids)
        return bool(user_team_id_set & survey_team_ids)

    # Private — only creator
    return False


async def build_visibility_query(current_user: dict) -> dict:
    """Build MongoDB query for surveys visible to the current user."""
    user_id = ObjectId(current_user["user_id"])
    org_id = current_user.get("org_id")

    if not org_id:
        return {"created_by": user_id}

    org_oid = ObjectId(org_id)
    user_team_ids = await get_user_team_ids(current_user["user_id"], str(org_id))

    # Owner/Admin can see all surveys in their org
    role = current_user.get("role", "member")
    if role in ("owner", "admin"):
        return {"$or": [
            {"created_by": user_id},
            {"org_id": org_oid},
        ]}

    conditions = [
        {"created_by": user_id},
        {"org_id": org_oid, "visibility": "org"},
    ]

    if user_team_ids:
        conditions.append({"org_id": org_oid, "visibility": "team", "team_ids": {"$in": user_team_ids}})

    return {"$or": conditions}
