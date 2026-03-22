"""
Analytics utility functions.
"""

from bson import ObjectId
from fastapi import HTTPException
from server.db.mongo import get_db


async def verify_survey_ownership(survey_id: str, user_id: str) -> dict:
    """Verify that the survey belongs to the current user. Returns survey doc or raises 404."""
    db = await get_db()
    try:
        survey = await db["surveys"].find_one(
            {"_id": ObjectId(survey_id), "created_by": ObjectId(user_id)}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Survey not found")
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey
