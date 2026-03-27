"""
Analytics utility functions.
"""

from bson import ObjectId
from fastapi import HTTPException
from server.db.mongo import get_db
from server.surveys.utils import check_survey_access


async def verify_survey_access(survey_id: str, current_user: dict) -> dict:
    """Verify that the user can access this survey based on visibility rules. Returns survey doc or raises 404."""
    db = await get_db()
    try:
        survey = await db["surveys"].find_one({"_id": ObjectId(survey_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="Survey not found")
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    has_access = await check_survey_access(survey, current_user)
    if not has_access:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey
