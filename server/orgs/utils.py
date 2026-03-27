# orgs/utils.py
import re
from fastapi import HTTPException


def generate_slug(name: str) -> str:
    """Generate a URL-safe slug from an org name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or "org"


def require_role(current_user: dict, allowed_roles: list[str]):
    """Raise 403 if user's role is not in allowed_roles."""
    role = current_user.get("role", "member")
    if role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. Required role: {', '.join(allowed_roles)}"
        )
