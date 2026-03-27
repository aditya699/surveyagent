# teams/db.py
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db
from server.core.logging_config import get_logger

logger = get_logger(__name__)


async def create_team(org_id: str, name: str, parent_team_id: str | None, created_by: str) -> dict:
    """Create a new team. Validates sub-team depth (max 1 level)."""
    db = await get_db()
    org_oid = ObjectId(org_id)

    if parent_team_id:
        parent = await db["teams"].find_one({"_id": ObjectId(parent_team_id), "org_id": org_oid})
        if not parent:
            raise ValueError("Parent team not found")
        if parent.get("parent_team_id"):
            raise ValueError("Sub-teams cannot have sub-teams (max depth is 1)")

    now = datetime.utcnow()
    doc = {
        "org_id": org_oid,
        "name": name.strip(),
        "parent_team_id": ObjectId(parent_team_id) if parent_team_id else None,
        "members": [],
        "created_by": ObjectId(created_by),
        "created_at": now,
        "updated_at": now,
    }
    result = await db["teams"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def get_teams_for_org(org_id: str) -> list[dict]:
    """Get all teams for an org, with member info populated."""
    db = await get_db()
    org_oid = ObjectId(org_id)

    teams = await db["teams"].find({"org_id": org_oid}).sort("name", 1).to_list(None)

    # Collect all member IDs
    all_member_ids = set()
    for t in teams:
        all_member_ids.update(t.get("members", []))

    # Fetch member info
    member_map = {}
    if all_member_ids:
        members = await db["admins"].find(
            {"_id": {"$in": list(all_member_ids)}},
            {"name": 1, "email": 1},
        ).to_list(None)
        for m in members:
            member_map[m["_id"]] = {"user_id": str(m["_id"]), "name": m["name"], "email": m["email"]}

    # Build response with nesting
    team_map = {}
    for t in teams:
        members_list = [member_map[mid] for mid in t.get("members", []) if mid in member_map]
        team_map[t["_id"]] = {
            "id": str(t["_id"]),
            "org_id": str(t["org_id"]),
            "name": t["name"],
            "parent_team_id": str(t["parent_team_id"]) if t.get("parent_team_id") else None,
            "members": members_list,
            "sub_teams": [],
            "created_at": t["created_at"],
        }

    # Nest sub-teams under parents
    top_level = []
    for tid, team_data in team_map.items():
        if team_data["parent_team_id"]:
            parent_oid = ObjectId(team_data["parent_team_id"])
            if parent_oid in team_map:
                team_map[parent_oid]["sub_teams"].append(team_data)
        else:
            top_level.append(team_data)

    return top_level


async def get_team(team_id: str, org_id: str) -> dict | None:
    """Get a single team by ID."""
    db = await get_db()
    return await db["teams"].find_one({"_id": ObjectId(team_id), "org_id": ObjectId(org_id)})


async def add_team_member(team_id: str, user_id: str, org_id: str) -> bool:
    """Add a member to a team. Validates user belongs to org."""
    db = await get_db()

    # Validate user is in the org
    user = await db["admins"].find_one({"_id": ObjectId(user_id), "org_id": ObjectId(org_id)})
    if not user:
        return False

    result = await db["teams"].update_one(
        {"_id": ObjectId(team_id), "org_id": ObjectId(org_id)},
        {"$addToSet": {"members": ObjectId(user_id)}, "$set": {"updated_at": datetime.utcnow()}},
    )
    return result.modified_count > 0 or result.matched_count > 0


async def remove_team_member(team_id: str, user_id: str) -> bool:
    """Remove a member from a team."""
    db = await get_db()
    result = await db["teams"].update_one(
        {"_id": ObjectId(team_id)},
        {"$pull": {"members": ObjectId(user_id)}, "$set": {"updated_at": datetime.utcnow()}},
    )
    return result.modified_count > 0


async def delete_team(team_id: str, org_id: str) -> bool:
    """Delete a team and its sub-teams. Remove from survey team_ids."""
    db = await get_db()
    team_oid = ObjectId(team_id)
    org_oid = ObjectId(org_id)

    # Find sub-teams
    sub_teams = await db["teams"].find({"parent_team_id": team_oid, "org_id": org_oid}).to_list(None)
    sub_team_ids = [st["_id"] for st in sub_teams]

    all_ids = [team_oid] + sub_team_ids

    # Remove from surveys
    await db["surveys"].update_many(
        {"org_id": org_oid, "team_ids": {"$in": all_ids}},
        {"$pull": {"team_ids": {"$in": all_ids}}},
    )

    # Delete teams
    result = await db["teams"].delete_many({"_id": {"$in": all_ids}, "org_id": org_oid})
    return result.deleted_count > 0


async def get_user_team_ids(user_id: str, org_id: str) -> list:
    """
    Get all team ObjectIds that grant survey visibility to this user.
    If user is in Sub-Team A1 (child of Team A), they also get Team A access.
    """
    db = await get_db()
    user_oid = ObjectId(user_id)
    org_oid = ObjectId(org_id)

    user_teams = await db["teams"].find(
        {"org_id": org_oid, "members": user_oid}
    ).to_list(None)

    team_ids = set()
    for team in user_teams:
        team_ids.add(team["_id"])
        if team.get("parent_team_id"):
            team_ids.add(team["parent_team_id"])

    return list(team_ids)
