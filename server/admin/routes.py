from fastapi import APIRouter, Depends, HTTPException, Query
from server.core.logging_config import get_logger
from server.db.mongo import log_error
from server.admin.utils import require_platform_admin
from server.admin.db import gather_usage, list_feedback, list_errors, list_users, get_user_detail
from server.admin.schemas import (
    UsageResponse,
    FeedbackListResponse,
    ErrorListResponse,
    UserListResponse,
    UserDetailResponse,
)

logger = get_logger(__name__)
router = APIRouter()


@router.get("/usage", response_model=UsageResponse)
async def usage(current_user: dict = Depends(require_platform_admin)):
    """Platform-wide usage metrics. Gated by PLATFORM_ADMIN_EMAILS."""
    try:
        data = await gather_usage()
        return UsageResponse(message="Admin usage retrieved", **data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error gathering admin usage: {e}", exc_info=True)
        await log_error(e, "admin/routes.py::usage", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to fetch admin usage")


@router.get("/feedback", response_model=FeedbackListResponse)
async def feedback(
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_platform_admin),
):
    try:
        data = await list_feedback(limit=limit)
        return FeedbackListResponse(message="Feedback retrieved", **data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin feedback: {e}", exc_info=True)
        await log_error(e, "admin/routes.py::feedback", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")


@router.get("/users", response_model=UserListResponse)
async def users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None),
    current_user: dict = Depends(require_platform_admin),
):
    try:
        data = await list_users(page=page, page_size=page_size, search=search)
        return UserListResponse(message="Users retrieved", **data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin users: {e}", exc_info=True)
        await log_error(e, "admin/routes.py::users", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to fetch users")


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def user_detail(
    user_id: str,
    current_user: dict = Depends(require_platform_admin),
):
    try:
        data = await get_user_detail(user_id)
        if not data:
            raise HTTPException(status_code=404, detail="User not found")
        return UserDetailResponse(message="User detail retrieved", **data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user detail: {e}", exc_info=True)
        await log_error(e, "admin/routes.py::user_detail", {"target_user_id": user_id})
        raise HTTPException(status_code=500, detail="Failed to fetch user detail")


@router.get("/errors", response_model=ErrorListResponse)
async def errors(
    limit: int = Query(50, ge=1, le=500),
    current_user: dict = Depends(require_platform_admin),
):
    """Recent error_logs entries. Hidden by default in the UI — fetched on demand."""
    try:
        data = await list_errors(limit=limit)
        return ErrorListResponse(message="Errors retrieved", **data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching admin errors: {e}", exc_info=True)
        await log_error(e, "admin/routes.py::errors", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to fetch errors")
