from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from server.auth.utils import get_current_user
from server.db.mongo import get_db, log_error
from server.core.logging_config import get_logger
from server.analytics.db import (
    get_overview_stats,
    get_survey_detail_stats,
    get_interview_list,
    get_interview_detail,
)
from server.analytics.schemas import (
    SurveyOverviewResponse,
    SurveyDetailResponse,
    SurveyDetailStats,
    InterviewListResponse,
    InterviewDetailResponse,
)

logger = get_logger(__name__)
router = APIRouter()


async def _verify_survey_ownership(survey_id: str, user_id: str) -> dict:
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


@router.get("/surveys", response_model=SurveyOverviewResponse)
async def analytics_overview(current_user: dict = Depends(get_current_user)):
    """Overview stats across all the admin's surveys."""
    try:
        stats = await get_overview_stats(current_user["user_id"])
        return SurveyOverviewResponse(
            message="Analytics overview retrieved",
            surveys=stats,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching analytics overview: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::analytics_overview", {"user_id": current_user["user_id"]})
        raise HTTPException(status_code=500, detail="Failed to fetch analytics overview")


@router.get("/surveys/{survey_id}", response_model=SurveyDetailResponse)
async def survey_analytics(survey_id: str, current_user: dict = Depends(get_current_user)):
    """Detailed stats for a single survey."""
    try:
        survey = await _verify_survey_ownership(survey_id, current_user["user_id"])
        questions = survey.get("questions", [])
        stats = await get_survey_detail_stats(survey_id, questions)
        return SurveyDetailResponse(
            message="Survey analytics retrieved",
            survey_id=survey_id,
            title=survey["title"],
            stats=SurveyDetailStats(**stats),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching survey analytics: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::survey_analytics", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to fetch survey analytics")


@router.get("/surveys/{survey_id}/interviews", response_model=InterviewListResponse)
async def survey_interviews(
    survey_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List interview sessions for a survey with pagination."""
    try:
        await _verify_survey_ownership(survey_id, current_user["user_id"])
        result = await get_interview_list(survey_id, page, page_size)
        return InterviewListResponse(
            message="Interview list retrieved",
            survey_id=survey_id,
            total=result["total"],
            page=page,
            page_size=page_size,
            interviews=result["interviews"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interview list: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::survey_interviews", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to fetch interview list")


@router.get("/interviews/{interview_id}", response_model=InterviewDetailResponse)
async def interview_detail(interview_id: str, current_user: dict = Depends(get_current_user)):
    """Full interview detail with conversation transcript."""
    try:
        interview = await get_interview_detail(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify ownership through the linked survey
        await _verify_survey_ownership(interview["survey_id"], current_user["user_id"])

        # Get survey title
        db = await get_db()
        survey = await db["surveys"].find_one(
            {"_id": ObjectId(interview["survey_id"])},
            {"title": 1},
        )
        survey_title = survey["title"] if survey else "Unknown Survey"

        return InterviewDetailResponse(
            message="Interview detail retrieved",
            id=interview["id"],
            survey_id=interview["survey_id"],
            survey_title=survey_title,
            respondent=interview["respondent"],
            conversation=interview["conversation"],
            status=interview["status"],
            questions_covered=interview["questions_covered"],
            started_at=interview["started_at"],
            completed_at=interview["completed_at"],
            duration_seconds=interview["duration_seconds"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interview detail: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::interview_detail", {"interview_id": interview_id})
        raise HTTPException(status_code=500, detail="Failed to fetch interview detail")
