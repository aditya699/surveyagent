"""
Migration script: Add multi-tenant org support to existing data.

Run once BEFORE deploying the new code.
Usage: python -m scripts.migrate_multi_tenant
"""

import asyncio
import re
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Load settings
from server.core.config import settings


def generate_slug(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or "org"


async def migrate():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    print("Starting multi-tenant migration...")

    # 1. Create orgs for each existing admin
    admins = await db["admins"].find({}).to_list(None)
    print(f"Found {len(admins)} admins to migrate")

    slug_counter = {}

    for admin in admins:
        # Skip if already migrated
        if admin.get("org_id"):
            print(f"  Skipping {admin['email']} - already has org_id")
            continue

        org_name = admin.get("org_name", "My Organization")
        slug = generate_slug(org_name)

        # Ensure slug uniqueness
        if slug in slug_counter:
            slug_counter[slug] += 1
            slug = f"{slug}-{slug_counter[slug]}"
        else:
            # Check DB for existing slug
            existing = await db["orgs"].find_one({"slug": slug})
            if existing:
                slug_counter[slug] = 1
                slug = f"{slug}-1"
            else:
                slug_counter[slug] = 0

        now = datetime.utcnow()
        org_doc = {
            "name": org_name,
            "slug": slug,
            "owner_id": admin["_id"],
            "created_at": now,
            "updated_at": now,
        }

        result = await db["orgs"].insert_one(org_doc)
        org_id = result.inserted_id

        # Update admin with org fields
        await db["admins"].update_one(
            {"_id": admin["_id"]},
            {
                "$set": {
                    "org_id": org_id,
                    "role": "owner",
                    "email_verified": True,  # Existing users are considered verified
                }
            },
        )

        # Update all surveys owned by this admin
        await db["surveys"].update_many(
            {"created_by": admin["_id"]},
            {
                "$set": {
                    "org_id": org_id,
                    "visibility": "private",
                    "team_ids": [],
                }
            },
        )

        print(f"  Migrated {admin['email']} -> org '{org_name}' (slug: {slug})")

    # 2. Create indexes
    print("\nCreating indexes...")

    # Orgs
    await db["orgs"].create_index("slug", unique=True)
    print("  orgs.slug (unique)")

    # Teams
    await db["teams"].create_index("org_id")
    await db["teams"].create_index([("org_id", 1), ("name", 1)], unique=True)
    await db["teams"].create_index("members")
    print("  teams indexes created")

    # Invites
    await db["invites"].create_index("token", unique=True)
    await db["invites"].create_index([("email", 1), ("org_id", 1)])
    await db["invites"].create_index("expires_at", expireAfterSeconds=0)
    print("  invites indexes created (with TTL)")

    # OTP codes
    await db["otp_codes"].create_index("user_id")
    await db["otp_codes"].create_index("expires_at", expireAfterSeconds=0)
    print("  otp_codes indexes created (with TTL)")

    # Admins
    await db["admins"].create_index("org_id")
    print("  admins.org_id")

    # Surveys
    await db["surveys"].create_index([("org_id", 1), ("visibility", 1)])
    await db["surveys"].create_index("team_ids")
    print("  surveys indexes created")

    print("\nMigration complete!")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
