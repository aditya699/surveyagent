# orgs/db.py
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db
from server.orgs.utils import generate_slug
from server.core.logging_config import get_logger

logger = get_logger(__name__)


async def create_org(name: str, owner_id: str) -> dict:
    """Create a new org and return the doc."""
    db = await get_db()
    slug = generate_slug(name)

    # Ensure slug uniqueness
    existing = await db["orgs"].find_one({"slug": slug})
    counter = 1
    base_slug = slug
    while existing:
        slug = f"{base_slug}-{counter}"
        existing = await db["orgs"].find_one({"slug": slug})
        counter += 1

    now = datetime.utcnow()
    doc = {
        "name": name.strip(),
        "slug": slug,
        "owner_id": ObjectId(owner_id),
        "created_at": now,
        "updated_at": now,
    }
    result = await db["orgs"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def org_doc_to_response(doc: dict) -> dict:
    """Convert an org MongoDB doc to a response dict."""
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "slug": doc["slug"],
        "owner_id": str(doc["owner_id"]),
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
    }


async def get_org_by_id(org_id: str) -> dict | None:
    """Fetch an org by ID."""
    db = await get_db()
    try:
        return await db["orgs"].find_one({"_id": ObjectId(org_id)})
    except Exception:
        return None


async def get_org_members(org_id: str) -> list[dict]:
    """Fetch all members of an org."""
    db = await get_db()
    cursor = db["admins"].find(
        {"org_id": ObjectId(org_id)},
        {"password": 0, "token_version": 0},
    ).sort("created_at", 1)

    members = []
    async for doc in cursor:
        members.append({
            "user_id": str(doc["_id"]),
            "name": doc["name"],
            "email": doc["email"],
            "role": doc.get("role", "member"),
            "created_at": doc["created_at"],
        })
    return members


async def update_member_role(user_id: str, org_id: str, new_role: str) -> bool:
    """Update a member's role. Returns True if updated."""
    db = await get_db()
    result = await db["admins"].update_one(
        {"_id": ObjectId(user_id), "org_id": ObjectId(org_id)},
        {"$set": {"role": new_role, "updated_at": datetime.utcnow()}},
    )
    return result.modified_count > 0


async def remove_member(user_id: str, org_id: str) -> bool:
    """Remove a member from the org (set org_id to None, remove from all teams)."""
    db = await get_db()

    # Remove from all teams in this org
    await db["teams"].update_many(
        {"org_id": ObjectId(org_id)},
        {"$pull": {"members": ObjectId(user_id)}},
    )

    # Clear org_id and role
    result = await db["admins"].update_one(
        {"_id": ObjectId(user_id), "org_id": ObjectId(org_id)},
        {"$set": {"org_id": None, "role": "member", "updated_at": datetime.utcnow()}},
    )
    return result.modified_count > 0


async def transfer_ownership(org_id: str, old_owner_id: str, new_owner_id: str) -> bool:
    """Transfer org ownership atomically."""
    db = await get_db()
    now = datetime.utcnow()

    # Verify new owner is in the org
    new_owner = await db["admins"].find_one(
        {"_id": ObjectId(new_owner_id), "org_id": ObjectId(org_id)}
    )
    if not new_owner:
        return False

    # Update roles
    await db["admins"].update_one(
        {"_id": ObjectId(old_owner_id)},
        {"$set": {"role": "admin", "updated_at": now}},
    )
    await db["admins"].update_one(
        {"_id": ObjectId(new_owner_id)},
        {"$set": {"role": "owner", "updated_at": now}},
    )
    await db["orgs"].update_one(
        {"_id": ObjectId(org_id)},
        {"$set": {"owner_id": ObjectId(new_owner_id), "updated_at": now}},
    )
    return True
