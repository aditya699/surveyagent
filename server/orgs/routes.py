# orgs/routes.py
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db, log_error
from server.auth.utils import get_current_user
from server.orgs.schemas import (
    OrgSingleResponse,
    OrgUpdateRequest,
    OrgMemberListResponse,
    TransferOwnershipRequest,
    UpdateMemberRoleRequest,
)
from server.orgs.db import (
    get_org_by_id,
    org_doc_to_response,
    get_org_members,
    update_member_role,
    remove_member,
    transfer_ownership,
)
from server.orgs.utils import require_role, generate_slug
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.get("/", response_model=OrgSingleResponse)
async def get_org(current_user: dict = Depends(get_current_user)) -> OrgSingleResponse:
    """Get the current user's organization."""
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=404, detail="No organization found")

        org = await get_org_by_id(str(org_id))
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")

        return OrgSingleResponse(
            message="Organization retrieved successfully",
            org=org_doc_to_response(org),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get org error - {str(e)}", exc_info=True)
        await log_error(e, "get_org", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to retrieve organization")


@router.put("/", response_model=OrgSingleResponse)
async def update_org(
    data: OrgUpdateRequest,
    current_user: dict = Depends(get_current_user),
) -> OrgSingleResponse:
    """Update organization name. Owner only."""
    try:
        require_role(current_user, ["owner"])
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=404, detail="No organization found")

        db = await get_db()
        update_data = {"updated_at": datetime.utcnow()}

        if data.name:
            update_data["name"] = data.name.strip()
            update_data["slug"] = generate_slug(data.name)
            # Also update org_name on all org members
            await db["admins"].update_many(
                {"org_id": ObjectId(org_id)},
                {"$set": {"org_name": data.name.strip()}},
            )

        await db["orgs"].update_one({"_id": ObjectId(org_id)}, {"$set": update_data})
        org = await get_org_by_id(str(org_id))

        return OrgSingleResponse(
            message="Organization updated successfully",
            org=org_doc_to_response(org),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update org error - {str(e)}", exc_info=True)
        await log_error(e, "update_org", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to update organization")


@router.get("/members", response_model=OrgMemberListResponse)
async def list_members(current_user: dict = Depends(get_current_user)) -> OrgMemberListResponse:
    """List all members of the current org."""
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=404, detail="No organization found")

        members = await get_org_members(str(org_id))

        return OrgMemberListResponse(
            message="Members retrieved successfully",
            members=members,
            count=len(members),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List members error - {str(e)}", exc_info=True)
        await log_error(e, "list_members", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to list members")


@router.put("/members/{user_id}/role")
async def change_member_role(
    user_id: str,
    data: UpdateMemberRoleRequest,
    current_user: dict = Depends(get_current_user),
):
    """Change a member's role. Owner only."""
    try:
        require_role(current_user, ["owner"])
        org_id = current_user.get("org_id")

        if data.role not in ("admin", "member"):
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

        if user_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot change your own role")

        updated = await update_member_role(user_id, str(org_id), data.role)
        if not updated:
            raise HTTPException(status_code=404, detail="Member not found in organization")

        return {"message": f"Role updated to {data.role}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change role error - {str(e)}", exc_info=True)
        await log_error(e, "change_member_role", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to change role")


@router.delete("/members/{user_id}")
async def remove_org_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a member from the org. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])
        org_id = current_user.get("org_id")

        if user_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot remove yourself")

        # Admins cannot remove other admins or the owner
        if current_user.get("role") == "admin":
            db = await get_db()
            target = await db["admins"].find_one(
                {"_id": ObjectId(user_id), "org_id": ObjectId(org_id)}
            )
            if target and target.get("role") in ("admin", "owner"):
                raise HTTPException(status_code=403, detail="Admins cannot remove other admins or the owner")

        removed = await remove_member(user_id, str(org_id))
        if not removed:
            raise HTTPException(status_code=404, detail="Member not found in organization")

        return {"message": "Member removed from organization"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove member error - {str(e)}", exc_info=True)
        await log_error(e, "remove_org_member", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to remove member")


@router.post("/transfer-ownership")
async def transfer_org_ownership(
    data: TransferOwnershipRequest,
    current_user: dict = Depends(get_current_user),
):
    """Transfer org ownership to another member. Owner only."""
    try:
        require_role(current_user, ["owner"])
        org_id = current_user.get("org_id")

        if data.new_owner_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot transfer ownership to yourself")

        transferred = await transfer_ownership(str(org_id), current_user["user_id"], data.new_owner_id)
        if not transferred:
            raise HTTPException(status_code=404, detail="Target user not found in organization")

        return {"message": "Ownership transferred successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transfer ownership error - {str(e)}", exc_info=True)
        await log_error(e, "transfer_org_ownership", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to transfer ownership")
