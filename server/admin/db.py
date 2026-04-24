from datetime import datetime, timedelta
from bson import ObjectId
from server.db.mongo import get_db


async def gather_usage() -> dict:
    """Aggregate platform-wide usage metrics. Single call — returns everything the
    admin dashboard needs except feedback and error logs (those are paginated separately)."""
    db = await get_db()
    now = datetime.utcnow()
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)
    cutoff_30d = now - timedelta(days=30)
    bucket_start = (now - timedelta(days=29)).replace(hour=0, minute=0, second=0, microsecond=0)

    # --- Totals ---
    users_total = await db["admins"].count_documents({})
    users_verified = await db["admins"].count_documents({"email_verified": True})
    orgs_total = await db["orgs"].count_documents({})
    teams_total = await db["teams"].count_documents({})

    surveys_total = await db["surveys"].count_documents({})
    surveys_published = await db["surveys"].count_documents({"status": "published"})
    surveys_draft = await db["surveys"].count_documents({"status": "draft"})

    # Interview counts (real + test separately)
    interviews_real = await db["interviews"].count_documents({"is_test_run": False})
    interviews_test = await db["interviews"].count_documents({"is_test_run": True})
    interviews_completed = await db["interviews"].count_documents({"is_test_run": False, "status": "completed"})
    interviews_in_progress = await db["interviews"].count_documents({"is_test_run": False, "status": "in_progress"})
    interviews_abandoned = await db["interviews"].count_documents({"is_test_run": False, "status": "abandoned"})

    feedback_total = await db["feedback"].count_documents({})
    errors_total = await db["error_logs"].count_documents({})

    completion_rate = round((interviews_completed / interviews_real * 100), 1) if interviews_real else 0.0

    # --- Growth buckets (users, surveys, interviews, feedback) ---
    async def bucket(coll: str, match_base: dict | None = None) -> dict:
        base = match_base or {}
        return {
            "last_24h": await db[coll].count_documents({**base, "created_at": {"$gte": cutoff_24h}}),
            "last_7d": await db[coll].count_documents({**base, "created_at": {"$gte": cutoff_7d}}),
            "last_30d": await db[coll].count_documents({**base, "created_at": {"$gte": cutoff_30d}}),
        }

    async def bucket_interviews() -> dict:
        base = {"is_test_run": False}
        return {
            "last_24h": await db["interviews"].count_documents({**base, "started_at": {"$gte": cutoff_24h}}),
            "last_7d": await db["interviews"].count_documents({**base, "started_at": {"$gte": cutoff_7d}}),
            "last_30d": await db["interviews"].count_documents({**base, "started_at": {"$gte": cutoff_30d}}),
        }

    growth = {
        "users": await bucket("admins"),
        "surveys": await bucket("surveys"),
        "interviews": await bucket_interviews(),
        "feedback": await bucket("feedback"),
    }

    # --- 30-day daily timeseries ---
    async def timeseries(coll: str, date_field: str, match_base: dict | None = None) -> list[dict]:
        base = match_base or {}
        pipeline = [
            {"$match": {**base, date_field: {"$gte": bucket_start}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": f"${date_field}"}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        rows = await db[coll].aggregate(pipeline).to_list(None)
        by_date = {r["_id"]: r["count"] for r in rows}
        # Fill gaps with 0
        out = []
        for i in range(30):
            day = (bucket_start + timedelta(days=i)).strftime("%Y-%m-%d")
            out.append({"date": day, "count": by_date.get(day, 0)})
        return out

    timeseries_data = {
        "users": await timeseries("admins", "created_at"),
        "surveys": await timeseries("surveys", "created_at"),
        "interviews": await timeseries("interviews", "started_at", {"is_test_run": False}),
    }

    # --- Top users (by interviews received on their surveys) ---
    top_users_pipeline = [
        {"$match": {"is_test_run": False}},
        {"$group": {"_id": "$survey_id", "total": {"$sum": 1}, "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}}}},
        {
            "$lookup": {
                "from": "surveys",
                "localField": "_id",
                "foreignField": "_id",
                "as": "survey",
            }
        },
        {"$unwind": "$survey"},
        {
            "$group": {
                "_id": "$survey.created_by",
                "interviews_received": {"$sum": "$total"},
            }
        },
        {"$sort": {"interviews_received": -1}},
        {"$limit": 10},
    ]
    top_by_interviews = await db["interviews"].aggregate(top_users_pipeline).to_list(None)

    top_user_ids = [row["_id"] for row in top_by_interviews if row.get("_id")]
    admin_docs = []
    if top_user_ids:
        admin_docs = await db["admins"].find(
            {"_id": {"$in": top_user_ids}},
            {"name": 1, "email": 1, "org_name": 1, "surveys_created": 1, "created_at": 1},
        ).to_list(None)
    admin_map = {str(a["_id"]): a for a in admin_docs}

    top_users = []
    for row in top_by_interviews:
        uid = row.get("_id")
        if not uid:
            continue
        admin = admin_map.get(str(uid), {})
        top_users.append(
            {
                "user_id": str(uid),
                "name": admin.get("name"),
                "email": admin.get("email"),
                "org_name": admin.get("org_name"),
                "surveys_created": admin.get("surveys_created", 0),
                "interviews_received": row["interviews_received"],
                "created_at": admin.get("created_at"),
            }
        )

    # --- Top surveys (by interview count) ---
    top_surveys_pipeline = [
        {"$match": {"is_test_run": False}},
        {
            "$group": {
                "_id": "$survey_id",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            }
        },
        {"$sort": {"total": -1}},
        {"$limit": 10},
        {
            "$lookup": {
                "from": "surveys",
                "localField": "_id",
                "foreignField": "_id",
                "as": "survey",
            }
        },
        {"$unwind": "$survey"},
        {
            "$lookup": {
                "from": "admins",
                "localField": "survey.created_by",
                "foreignField": "_id",
                "as": "creator",
            }
        },
    ]
    top_survey_rows = await db["interviews"].aggregate(top_surveys_pipeline).to_list(None)
    top_surveys = []
    for row in top_survey_rows:
        s = row["survey"]
        creator = (row.get("creator") or [{}])[0]
        top_surveys.append(
            {
                "survey_id": str(s["_id"]),
                "title": s.get("title", "Untitled"),
                "status": s.get("status", "draft"),
                "creator_email": creator.get("email"),
                "total_interviews": row["total"],
                "completed": row["completed"],
            }
        )

    # --- LLM usage distribution by survey ---
    llm_pipeline = [
        {
            "$group": {
                "_id": {"$ifNull": ["$llm_provider", "openai"]},
                "surveys": {"$sum": 1},
            }
        },
        {"$sort": {"surveys": -1}},
    ]
    llm_rows = await db["surveys"].aggregate(llm_pipeline).to_list(None)
    llm_usage = [{"provider": r["_id"], "surveys": r["surveys"]} for r in llm_rows]

    return {
        "generated_at": now,
        "totals": {
            "users": users_total,
            "verified_users": users_verified,
            "orgs": orgs_total,
            "teams": teams_total,
            "surveys": surveys_total,
            "surveys_published": surveys_published,
            "surveys_draft": surveys_draft,
            "interviews": interviews_real,
            "interviews_completed": interviews_completed,
            "interviews_in_progress": interviews_in_progress,
            "interviews_abandoned": interviews_abandoned,
            "interviews_test": interviews_test,
            "feedback": feedback_total,
            "errors": errors_total,
            "completion_rate": completion_rate,
        },
        "growth": growth,
        "timeseries": timeseries_data,
        "top_users": top_users,
        "top_surveys": top_surveys,
        "llm_usage": llm_usage,
    }


async def list_users(page: int = 1, page_size: int = 50, search: str | None = None) -> dict:
    """Paginated list of all platform users, enriched with survey + interview counts."""
    db = await get_db()

    query: dict = {}
    if search:
        query["$or"] = [
            {"email": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}},
            {"org_name": {"$regex": search, "$options": "i"}},
        ]

    total = await db["admins"].count_documents(query)
    skip = (page - 1) * page_size

    docs = await db["admins"].find(
        query,
        {
            "name": 1,
            "email": 1,
            "org_name": 1,
            "org_id": 1,
            "role": 1,
            "email_verified": 1,
            "is_active": 1,
            "surveys_created": 1,
            "created_at": 1,
            "last_login": 1,
        },
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(None)

    user_ids = [d["_id"] for d in docs]
    if not user_ids:
        return {"total": total, "page": page, "page_size": page_size, "users": []}

    # Count surveys actually present per user (not just the counter)
    survey_counts_pipeline = [
        {"$match": {"created_by": {"$in": user_ids}}},
        {"$group": {"_id": "$created_by", "count": {"$sum": 1}}},
    ]
    survey_count_map = {
        r["_id"]: r["count"] for r in await db["surveys"].aggregate(survey_counts_pipeline).to_list(None)
    }

    # Interviews received on surveys created by each user
    interviews_pipeline = [
        {"$match": {"is_test_run": False}},
        {
            "$lookup": {
                "from": "surveys",
                "localField": "survey_id",
                "foreignField": "_id",
                "as": "survey",
            }
        },
        {"$unwind": "$survey"},
        {"$match": {"survey.created_by": {"$in": user_ids}}},
        {
            "$group": {
                "_id": "$survey.created_by",
                "total": {"$sum": 1},
                "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            }
        },
    ]
    iv_rows = await db["interviews"].aggregate(interviews_pipeline).to_list(None)
    iv_map = {r["_id"]: r for r in iv_rows}

    users = []
    for d in docs:
        uid = d["_id"]
        iv = iv_map.get(uid, {})
        users.append(
            {
                "user_id": str(uid),
                "name": d.get("name"),
                "email": d.get("email"),
                "org_name": d.get("org_name"),
                "role": d.get("role", "owner"),
                "email_verified": d.get("email_verified", False),
                "is_active": d.get("is_active", True),
                "surveys_created": survey_count_map.get(uid, 0),
                "surveys_counter": d.get("surveys_created", 0),
                "interviews_received": iv.get("total", 0),
                "interviews_completed": iv.get("completed", 0),
                "created_at": d.get("created_at"),
                "last_login": d.get("last_login"),
            }
        )

    return {"total": total, "page": page, "page_size": page_size, "users": users}


async def get_user_detail(user_id: str) -> dict | None:
    """Detailed view of a single user: profile + their surveys + recent interview activity."""
    db = await get_db()
    try:
        uid = ObjectId(user_id)
    except Exception:
        return None

    admin = await db["admins"].find_one({"_id": uid}, {"password": 0})
    if not admin:
        return None

    surveys = await db["surveys"].find(
        {"created_by": uid},
        {
            "title": 1,
            "status": 1,
            "visibility": 1,
            "created_at": 1,
            "updated_at": 1,
        },
    ).sort("created_at", -1).to_list(None)

    survey_ids = [s["_id"] for s in surveys]

    # Per-survey interview stats
    interview_stats = {}
    if survey_ids:
        pipeline = [
            {"$match": {"survey_id": {"$in": survey_ids}, "is_test_run": False}},
            {
                "$group": {
                    "_id": "$survey_id",
                    "total": {"$sum": 1},
                    "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                    "abandoned": {"$sum": {"$cond": [{"$eq": ["$status", "abandoned"]}, 1, 0]}},
                    "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}},
                }
            },
        ]
        rows = await db["interviews"].aggregate(pipeline).to_list(None)
        interview_stats = {r["_id"]: r for r in rows}

    survey_list = []
    total_interviews = 0
    total_completed = 0
    for s in surveys:
        stats = interview_stats.get(s["_id"], {})
        total_interviews += stats.get("total", 0)
        total_completed += stats.get("completed", 0)
        survey_list.append(
            {
                "survey_id": str(s["_id"]),
                "title": s.get("title", "Untitled"),
                "status": s.get("status", "draft"),
                "visibility": s.get("visibility", "private"),
                "created_at": s.get("created_at"),
                "total_interviews": stats.get("total", 0),
                "completed": stats.get("completed", 0),
                "abandoned": stats.get("abandoned", 0),
                "in_progress": stats.get("in_progress", 0),
            }
        )

    # Recent interviews on any of their surveys
    recent_interviews = []
    if survey_ids:
        iv_docs = await db["interviews"].find(
            {"survey_id": {"$in": survey_ids}, "is_test_run": False},
            {
                "survey_id": 1,
                "respondent": 1,
                "status": 1,
                "started_at": 1,
                "completed_at": 1,
            },
        ).sort("started_at", -1).limit(20).to_list(None)
        survey_title_map = {s["_id"]: s.get("title", "Untitled") for s in surveys}
        for d in iv_docs:
            respondent = d.get("respondent") or {}
            duration = None
            if d.get("completed_at") and d.get("started_at"):
                duration = round((d["completed_at"] - d["started_at"]).total_seconds(), 1)
            recent_interviews.append(
                {
                    "id": str(d["_id"]),
                    "survey_id": str(d["survey_id"]),
                    "survey_title": survey_title_map.get(d["survey_id"], "Unknown"),
                    "respondent_name": respondent.get("name"),
                    "respondent_email": respondent.get("email"),
                    "status": d.get("status", "in_progress"),
                    "started_at": d.get("started_at"),
                    "completed_at": d.get("completed_at"),
                    "duration_seconds": duration,
                }
            )

    return {
        "user": {
            "user_id": str(admin["_id"]),
            "name": admin.get("name"),
            "email": admin.get("email"),
            "org_name": admin.get("org_name"),
            "org_id": str(admin["org_id"]) if admin.get("org_id") else None,
            "role": admin.get("role", "owner"),
            "email_verified": admin.get("email_verified", False),
            "is_active": admin.get("is_active", True),
            "surveys_counter": admin.get("surveys_created", 0),
            "created_at": admin.get("created_at"),
            "last_login": admin.get("last_login"),
        },
        "totals": {
            "surveys": len(surveys),
            "surveys_published": sum(1 for s in surveys if s.get("status") == "published"),
            "interviews": total_interviews,
            "completed": total_completed,
            "completion_rate": round((total_completed / total_interviews * 100), 1) if total_interviews else 0.0,
        },
        "surveys": survey_list,
        "recent_interviews": recent_interviews,
    }


async def list_feedback(limit: int = 50) -> dict:
    db = await get_db()
    total = await db["feedback"].count_documents({})
    docs = await db["feedback"].find({}).sort("created_at", -1).limit(limit).to_list(None)
    items = [
        {
            "id": str(d["_id"]),
            "name": d.get("name"),
            "email": d.get("email"),
            "rating": d.get("rating"),
            "message": d.get("message", ""),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]
    return {"total": total, "items": items}


async def list_errors(limit: int = 50) -> dict:
    db = await get_db()
    total = await db["error_logs"].count_documents({})
    docs = await db["error_logs"].find({}).sort("timestamp", -1).limit(limit).to_list(None)
    items = [
        {
            "id": str(d["_id"]),
            "error_type": d.get("error_type", "Unknown"),
            "error_message": d.get("error_message", ""),
            "location": d.get("location", ""),
            "additional_info": d.get("additional_info") or {},
            "timestamp": d.get("timestamp"),
        }
        for d in docs
    ]
    return {"total": total, "items": items}
