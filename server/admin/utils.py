from fastapi import Depends, HTTPException
from server.auth.utils import get_current_user
from server.core.config import settings


async def require_platform_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Gate a route to platform admins only (emails in PLATFORM_ADMIN_EMAILS)."""
    if not settings.is_platform_admin(current_user.get("email")):
        raise HTTPException(status_code=403, detail="Platform admin access required")
    return current_user
