# teams/routes.py
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db, log_error
from server.auth.utils import get_current_user
from server.orgs.utils import require_role
from server.teams.schemas import (
    TeamCreate,
    TeamUpdate,
    TeamListResponse,
    TeamResponse,
    AddMemberRequest,
)
from server.teams.db import (
    create_team,
    get_teams_for_org,
    get_team,
    add_team_member,
    remove_team_member,
    delete_team,
)
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("/", response_model=TeamResponse)
async def create_team_endpoint(
    data: TeamCreate,
    current_user: dict = Depends(get_current_user),
) -> TeamResponse:
    """Create a new team. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="No organization found")

        try:
            team_doc = await create_team(str(org_id), data.name, data.parent_team_id, current_user["user_id"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        return TeamResponse(
            id=str(team_doc["_id"]),
            org_id=str(team_doc["org_id"]),
            name=team_doc["name"],
            parent_team_id=str(team_doc["parent_team_id"]) if team_doc.get("parent_team_id") else None,
            members=[],
            sub_teams=[],
            created_at=team_doc["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create team error - {str(e)}", exc_info=True)
        await log_error(e, "create_team_endpoint", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to create team")


@router.get("/", response_model=TeamListResponse)
async def list_teams(current_user: dict = Depends(get_current_user)) -> TeamListResponse:
    """List all teams in the org (nested structure)."""
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="No organization found")

        teams = await get_teams_for_org(str(org_id))

        return TeamListResponse(
            message="Teams retrieved successfully",
            teams=teams,
            count=len(teams),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List teams error - {str(e)}", exc_info=True)
        await log_error(e, "list_teams", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to list teams")


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_detail(
    team_id: str,
    current_user: dict = Depends(get_current_user),
) -> TeamResponse:
    """Get a single team's details."""
    try:
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="No organization found")

        team = await get_team(team_id, str(org_id))
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # Populate members
        db = await get_db()
        members = []
        for mid in team.get("members", []):
            m = await db["admins"].find_one({"_id": mid}, {"name": 1, "email": 1})
            if m:
                members.append({"user_id": str(m["_id"]), "name": m["name"], "email": m["email"]})

        # Get sub-teams
        sub_teams_raw = await db["teams"].find(
            {"parent_team_id": team["_id"], "org_id": ObjectId(org_id)}
        ).to_list(None)

        sub_teams = []
        for st in sub_teams_raw:
            st_members = []
            for mid in st.get("members", []):
                m = await db["admins"].find_one({"_id": mid}, {"name": 1, "email": 1})
                if m:
                    st_members.append({"user_id": str(m["_id"]), "name": m["name"], "email": m["email"]})
            sub_teams.append(TeamResponse(
                id=str(st["_id"]),
                org_id=str(st["org_id"]),
                name=st["name"],
                parent_team_id=str(st["parent_team_id"]) if st.get("parent_team_id") else None,
                members=st_members,
                sub_teams=[],
                created_at=st["created_at"],
            ))

        return TeamResponse(
            id=str(team["_id"]),
            org_id=str(team["org_id"]),
            name=team["name"],
            parent_team_id=str(team["parent_team_id"]) if team.get("parent_team_id") else None,
            members=members,
            sub_teams=sub_teams,
            created_at=team["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get team error - {str(e)}", exc_info=True)
        await log_error(e, "get_team_detail", {"team_id": team_id})
        raise HTTPException(status_code=500, detail="Failed to get team")


@router.put("/{team_id}")
async def update_team_endpoint(
    team_id: str,
    data: TeamUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update a team name. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])
        org_id = current_user.get("org_id")

        db = await get_db()
        update = {"updated_at": datetime.utcnow()}
        if data.name:
            update["name"] = data.name.strip()

        result = await db["teams"].update_one(
            {"_id": ObjectId(team_id), "org_id": ObjectId(org_id)},
            {"$set": update},
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Team not found")

        return {"message": "Team updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update team error - {str(e)}", exc_info=True)
        await log_error(e, "update_team_endpoint", {"team_id": team_id})
        raise HTTPException(status_code=500, detail="Failed to update team")


@router.delete("/{team_id}")
async def delete_team_endpoint(
    team_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a team and its sub-teams. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])
        org_id = current_user.get("org_id")

        deleted = await delete_team(team_id, str(org_id))
        if not deleted:
            raise HTTPException(status_code=404, detail="Team not found")

        return {"message": "Team deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete team error - {str(e)}", exc_info=True)
        await log_error(e, "delete_team_endpoint", {"team_id": team_id})
        raise HTTPException(status_code=500, detail="Failed to delete team")


@router.post("/{team_id}/members")
async def add_member_to_team(
    team_id: str,
    data: AddMemberRequest,
    current_user: dict = Depends(get_current_user),
):
    """Add a member to a team. Any org member can add members."""
    try:
        org_id = current_user.get("org_id")

        added = await add_team_member(team_id, data.user_id, str(org_id))
        if not added:
            raise HTTPException(status_code=400, detail="Could not add member. Ensure they belong to the organization.")

        return {"message": "Member added to team"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add team member error - {str(e)}", exc_info=True)
        await log_error(e, "add_member_to_team", {"team_id": team_id})
        raise HTTPException(status_code=500, detail="Failed to add member")


@router.delete("/{team_id}/members/{user_id}")
async def remove_member_from_team(
    team_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a member from a team. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])

        removed = await remove_team_member(team_id, user_id)
        if not removed:
            raise HTTPException(status_code=404, detail="Member not found in team")

        return {"message": "Member removed from team"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Remove team member error - {str(e)}", exc_info=True)
        await log_error(e, "remove_member_from_team", {"team_id": team_id})
        raise HTTPException(status_code=500, detail="Failed to remove member")
