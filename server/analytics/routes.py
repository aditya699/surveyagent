import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from bson import ObjectId
from server.auth.utils import get_current_user
from server.db.mongo import get_db, log_error
from server.core.config import settings
from server.core.llm import get_provider
from server.core.logging_config import get_logger
from server.analytics.db import (
    get_overview_stats,
    get_survey_detail_stats,
    get_interview_list,
    get_interview_detail,
    get_all_interviews_for_export,
    save_analysis,
    get_completed_interviews_for_analysis,
    save_survey_analysis,
)
from server.analytics.schemas import (
    SurveyOverviewResponse,
    SurveyDetailResponse,
    SurveyDetailStats,
    InterviewListResponse,
    InterviewDetailResponse,
    InterviewExportResponse,
)
from server.analytics.prompts import (
    ANALYSIS_SYSTEM_PROMPT,
    build_analysis_prompt,
    SURVEY_ANALYSIS_SYSTEM_PROMPT,
    build_survey_analysis_prompt,
)
from server.analytics.utils import verify_survey_access

logger = get_logger(__name__)
router = APIRouter()


@router.get("/surveys", response_model=SurveyOverviewResponse)
async def analytics_overview(current_user: dict = Depends(get_current_user)):
    """Overview stats across all the admin's surveys."""
    try:
        stats = await get_overview_stats(current_user)
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
        survey = await verify_survey_access(survey_id, current_user)
        questions = survey.get("questions", [])
        stats = await get_survey_detail_stats(survey_id, questions)
        return SurveyDetailResponse(
            message="Survey analytics retrieved",
            survey_id=survey_id,
            title=survey["title"],
            stats=SurveyDetailStats(**stats),
            analysis=survey.get("analysis"),
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
        await verify_survey_access(survey_id, current_user)
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


@router.get("/surveys/{survey_id}/interviews/export", response_model=InterviewExportResponse)
async def export_survey_interviews(survey_id: str, current_user: dict = Depends(get_current_user)):
    """Export all interview sessions for a survey (no pagination)."""
    try:
        survey = await verify_survey_access(survey_id, current_user)
        interviews = await get_all_interviews_for_export(survey_id)
        return InterviewExportResponse(
            message="Interview export retrieved",
            survey_id=survey_id,
            title=survey["title"],
            interviews=interviews,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting interviews: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::export_survey_interviews", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to export interviews")


@router.get("/interviews/{interview_id}", response_model=InterviewDetailResponse)
async def interview_detail(interview_id: str, current_user: dict = Depends(get_current_user)):
    """Full interview detail with conversation transcript."""
    try:
        interview = await get_interview_detail(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify ownership through the linked survey
        await verify_survey_access(interview["survey_id"], current_user)

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
            analysis=interview.get("analysis"),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching interview detail: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::interview_detail", {"interview_id": interview_id})
        raise HTTPException(status_code=500, detail="Failed to fetch interview detail")


@router.post("/interviews/{interview_id}/analyze")
async def analyze_interview(interview_id: str, current_user: dict = Depends(get_current_user)):
    """
    Stream AI analysis of an interview transcript via SSE.

    Each token is sent as: data: {"token": "..."}\n\n
    Final event: data: [DONE]\n\n
    The completed analysis JSON is cached in the interview document.
    """
    try:
        interview = await get_interview_detail(interview_id)
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")

        # Verify ownership through the linked survey
        survey = await verify_survey_access(interview["survey_id"], current_user)

        if not interview.get("conversation"):
            raise HTTPException(status_code=400, detail="Interview has no conversation to analyze")

        user_prompt = build_analysis_prompt(
            survey=survey,
            conversation=interview["conversation"],
            respondent=interview.get("respondent"),
            questions_covered=interview.get("questions_covered"),
            analytics_instructions=survey.get("analytics_instructions"),
        )

        provider_name = survey.get("llm_provider") or "openai"
        provider = await get_provider(provider_name)
        model = survey.get("llm_model") or provider.default_model

        async def event_stream():
            result_buffer = ""
            try:
                async for delta in provider.stream_text(
                    model=model,
                    system_prompt=ANALYSIS_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                ):
                    result_buffer += delta
                    yield f"data: {json.dumps({'token': delta})}\n\n"

                # Parse and cache the analysis
                try:
                    # Strip any accidental markdown fencing
                    clean = result_buffer.strip()
                    if clean.startswith("```"):
                        clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    clean = clean.strip()

                    analysis = json.loads(clean)
                    await save_analysis(interview_id, analysis)
                except (json.JSONDecodeError, Exception) as parse_err:
                    logger.warning(f"Failed to parse analysis JSON: {parse_err}")

                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"AI interview analysis failed: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting interview analysis: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::analyze_interview", {"interview_id": interview_id})
        raise HTTPException(status_code=500, detail="Failed to start interview analysis")


@router.post("/surveys/{survey_id}/analyze")
async def analyze_survey(survey_id: str, current_user: dict = Depends(get_current_user)):
    """
    Stream aggregate AI analysis of all completed interviews for a survey via SSE.

    Each token is sent as: data: {"token": "..."}\n\n
    Final event: data: [DONE]\n\n
    The completed analysis JSON is cached in the survey document.
    """
    try:
        survey = await verify_survey_access(survey_id, current_user)

        interviews = await get_completed_interviews_for_analysis(survey_id)
        if not interviews:
            raise HTTPException(status_code=400, detail="No completed interviews to analyze")

        # Separate into analyzed (have cached analysis) and raw
        analyzed = [iv for iv in interviews if iv.get("analysis")]
        raw = [iv for iv in interviews if not iv.get("analysis")]

        user_prompt = build_survey_analysis_prompt(
            survey=survey,
            analyzed_interviews=analyzed,
            raw_interviews=raw,
            analytics_instructions=survey.get("analytics_instructions"),
        )

        provider_name = survey.get("llm_provider") or "openai"
        provider = await get_provider(provider_name)
        model = survey.get("llm_model") or provider.default_model

        async def event_stream():
            result_buffer = ""
            try:
                async for delta in provider.stream_text(
                    model=model,
                    system_prompt=SURVEY_ANALYSIS_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_prompt}],
                ):
                    result_buffer += delta
                    yield f"data: {json.dumps({'token': delta})}\n\n"

                # Parse and cache the analysis
                try:
                    clean = result_buffer.strip()
                    if clean.startswith("```"):
                        clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
                    if clean.endswith("```"):
                        clean = clean[:-3]
                    clean = clean.strip()

                    analysis = json.loads(clean)
                    await save_survey_analysis(survey_id, analysis)
                except (json.JSONDecodeError, Exception) as parse_err:
                    logger.warning(f"Failed to parse survey analysis JSON: {parse_err}")

                yield "data: [DONE]\n\n"

            except Exception as e:
                logger.error(f"AI survey analysis failed: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting survey analysis: {e}", exc_info=True)
        await log_error(e, "analytics/routes.py::analyze_survey", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to start survey analysis")
