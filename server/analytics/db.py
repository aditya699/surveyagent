from bson import ObjectId
from server.db.mongo import get_db
from server.core.logging_config import get_logger

logger = get_logger(__name__)


async def get_overview_stats(current_user: dict) -> list[dict]:
    """
    Aggregate interview stats grouped by survey for all surveys visible to user.
    Uses visibility-based query instead of simple created_by filter.
    Excludes test runs.
    """
    from server.surveys.utils import build_visibility_query

    db = await get_db()

    query = await build_visibility_query(current_user)
    surveys = await db["surveys"].find(
        query,
        {"title": 1, "status": 1},
    ).to_list(None)

    if not surveys:
        return []

    survey_ids = [s["_id"] for s in surveys]
    survey_map = {str(s["_id"]): s for s in surveys}

    # Aggregate interview stats per survey
    pipeline = [
        {"$match": {"survey_id": {"$in": survey_ids}, "is_test_run": False}},
        {
            "$group": {
                "_id": "$survey_id",
                "total": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                },
                "abandoned": {
                    "$sum": {"$cond": [{"$eq": ["$status", "abandoned"]}, 1, 0]}
                },
                "in_progress": {
                    "$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}
                },
                "avg_duration": {
                    "$avg": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$eq": ["$status", "completed"]},
                                    {"$ne": ["$completed_at", None]},
                                ]
                            },
                            {
                                "$divide": [
                                    {"$subtract": ["$completed_at", "$started_at"]},
                                    1000,
                                ]
                            },
                            None,
                        ]
                    }
                },
            }
        },
    ]

    stats = await db["interviews"].aggregate(pipeline).to_list(None)
    stats_map = {str(s["_id"]): s for s in stats}

    results = []
    for sid_str, survey_doc in survey_map.items():
        s = stats_map.get(sid_str, {})
        total = s.get("total", 0)
        completed = s.get("completed", 0)
        results.append(
            {
                "survey_id": sid_str,
                "title": survey_doc["title"],
                "status": survey_doc.get("status", "draft"),
                "total_interviews": total,
                "completed": completed,
                "abandoned": s.get("abandoned", 0),
                "in_progress": s.get("in_progress", 0),
                "completion_rate": round((completed / total * 100) if total > 0 else 0, 1),
                "avg_duration_seconds": round(s["avg_duration"], 1) if s.get("avg_duration") is not None else None,
            }
        )

    # Sort by total interviews descending
    results.sort(key=lambda x: x["total_interviews"], reverse=True)
    return results


def _question_text(q) -> str:
    """Extract question text from either a string or a QuestionItem dict."""
    if isinstance(q, str):
        return q
    if isinstance(q, dict):
        return q.get("text", "")
    return str(q)


async def get_survey_detail_stats(survey_id: str, questions: list) -> dict:
    """
    Detailed stats for a single survey including question coverage frequencies.
    Excludes test runs.
    """
    db = await get_db()
    survey_oid = ObjectId(survey_id)

    pipeline = [
        {"$match": {"survey_id": survey_oid, "is_test_run": False}},
        {
            "$group": {
                "_id": None,
                "total": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                },
                "abandoned": {
                    "$sum": {"$cond": [{"$eq": ["$status", "abandoned"]}, 1, 0]}
                },
                "in_progress": {
                    "$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}
                },
                "avg_duration": {
                    "$avg": {
                        "$cond": [
                            {
                                "$and": [
                                    {"$eq": ["$status", "completed"]},
                                    {"$ne": ["$completed_at", None]},
                                ]
                            },
                            {
                                "$divide": [
                                    {"$subtract": ["$completed_at", "$started_at"]},
                                    1000,
                                ]
                            },
                            None,
                        ]
                    }
                },
                "avg_questions_covered": {"$avg": {"$size": {"$ifNull": ["$questions_covered", []]}}},
                "all_covered": {"$push": "$questions_covered"},
            }
        },
    ]

    results = await db["interviews"].aggregate(pipeline).to_list(None)

    if not results:
        return {
            "total_interviews": 0,
            "completed": 0,
            "abandoned": 0,
            "in_progress": 0,
            "completion_rate": 0.0,
            "avg_duration_seconds": None,
            "avg_questions_covered": 0.0,
            "question_frequencies": [
                {
                    "question_index": i + 1,
                    "question_text": _question_text(q),
                    "times_covered": 0,
                    "coverage_rate": 0.0,
                }
                for i, q in enumerate(questions)
            ],
        }

    r = results[0]
    total = r["total"]
    completed = r["completed"]

    # Count frequency per question index
    freq = {}
    for covered_list in r.get("all_covered", []):
        if covered_list:
            for idx in covered_list:
                freq[idx] = freq.get(idx, 0) + 1

    question_frequencies = []
    for i, q in enumerate(questions):
        q_idx = i + 1  # 1-based
        times = freq.get(q_idx, 0)
        question_frequencies.append(
            {
                "question_index": q_idx,
                "question_text": _question_text(q),
                "times_covered": times,
                "coverage_rate": round((times / total * 100) if total > 0 else 0, 1),
            }
        )

    return {
        "total_interviews": total,
        "completed": completed,
        "abandoned": r["abandoned"],
        "in_progress": r["in_progress"],
        "completion_rate": round((completed / total * 100) if total > 0 else 0, 1),
        "avg_duration_seconds": round(r["avg_duration"], 1) if r.get("avg_duration") is not None else None,
        "avg_questions_covered": round(r.get("avg_questions_covered", 0), 1),
        "question_frequencies": question_frequencies,
    }


async def get_interview_list(survey_id: str, page: int = 1, page_size: int = 20) -> dict:
    """
    Paginated list of interviews for a survey. Excludes test runs.
    Returns dict with total count and interview list.
    """
    db = await get_db()
    survey_oid = ObjectId(survey_id)
    query = {"survey_id": survey_oid, "is_test_run": False}

    total = await db["interviews"].count_documents(query)
    skip = (page - 1) * page_size

    docs = await db["interviews"].find(query).sort("started_at", -1).skip(skip).limit(page_size).to_list(None)

    interviews = []
    for doc in docs:
        duration = None
        if doc.get("completed_at") and doc.get("started_at"):
            duration = round((doc["completed_at"] - doc["started_at"]).total_seconds(), 1)

        respondent = doc.get("respondent") or {}
        interviews.append(
            {
                "id": str(doc["_id"]),
                "respondent_name": respondent.get("name"),
                "respondent_email": respondent.get("email"),
                "status": doc.get("status", "in_progress"),
                "duration_seconds": duration,
                "questions_covered_count": len(doc.get("questions_covered", [])),
                "started_at": doc["started_at"],
                "completed_at": doc.get("completed_at"),
            }
        )

    return {"total": total, "interviews": interviews}


async def get_interview_detail(interview_id: str) -> dict | None:
    """
    Get full interview document by ID. Returns None if not found.
    """
    db = await get_db()
    try:
        doc = await db["interviews"].find_one({"_id": ObjectId(interview_id)})
    except Exception:
        return None

    if not doc:
        return None

    duration = None
    if doc.get("completed_at") and doc.get("started_at"):
        duration = round((doc["completed_at"] - doc["started_at"]).total_seconds(), 1)

    respondent = doc.get("respondent") or {}

    return {
        "id": str(doc["_id"]),
        "survey_id": str(doc["survey_id"]),
        "respondent": {
            "name": respondent.get("name"),
            "email": respondent.get("email"),
            "age": respondent.get("age"),
            "gender": respondent.get("gender"),
            "occupation": respondent.get("occupation"),
            "phone_number": respondent.get("phone_number"),
        },
        "conversation": [
            {
                "role": msg.get("role", ""),
                "content": msg.get("content", ""),
                "timestamp": msg.get("timestamp"),
            }
            for msg in doc.get("conversation", [])
        ],
        "status": doc.get("status", "in_progress"),
        "questions_covered": doc.get("questions_covered", []),
        "started_at": doc["started_at"],
        "completed_at": doc.get("completed_at"),
        "duration_seconds": duration,
        "analysis": doc.get("analysis"),
    }


async def save_analysis(interview_id: str, analysis: dict) -> None:
    """Save AI analysis to the interview document."""
    db = await get_db()
    await db["interviews"].update_one(
        {"_id": ObjectId(interview_id)},
        {"$set": {"analysis": analysis}},
    )


async def get_completed_interviews_for_analysis(survey_id: str) -> list[dict]:
    """
    Fetch all completed non-test interviews for a survey.
    Returns each with conversation, respondent, questions_covered, and cached analysis.
    """
    db = await get_db()
    docs = await db["interviews"].find(
        {
            "survey_id": ObjectId(survey_id),
            "status": "completed",
            "is_test_run": False,
        },
        {
            "conversation": 1,
            "respondent": 1,
            "questions_covered": 1,
            "analysis": 1,
            "started_at": 1,
            "completed_at": 1,
        },
    ).sort("started_at", 1).to_list(None)

    results = []
    for doc in docs:
        respondent = doc.get("respondent") or {}
        results.append(
            {
                "id": str(doc["_id"]),
                "respondent": {
                    "name": respondent.get("name"),
                    "email": respondent.get("email"),
                    "age": respondent.get("age"),
                    "gender": respondent.get("gender"),
                    "occupation": respondent.get("occupation"),
                },
                "conversation": [
                    {
                        "role": msg.get("role", ""),
                        "content": msg.get("content", ""),
                    }
                    for msg in doc.get("conversation", [])
                ],
                "questions_covered": doc.get("questions_covered", []),
                "analysis": doc.get("analysis"),
            }
        )

    return results


async def get_all_interviews_for_export(survey_id: str) -> list[dict]:
    """
    Fetch all non-test interviews for a survey with fields needed for CSV export.
    No pagination — returns all results.
    """
    db = await get_db()
    survey_oid = ObjectId(survey_id)

    docs = await db["interviews"].find(
        {"survey_id": survey_oid, "is_test_run": False},
        {
            "respondent": 1,
            "status": 1,
            "questions_covered": 1,
            "started_at": 1,
            "completed_at": 1,
        },
    ).sort("started_at", -1).to_list(None)

    results = []
    for doc in docs:
        respondent = doc.get("respondent") or {}
        duration = None
        if doc.get("completed_at") and doc.get("started_at"):
            duration = round((doc["completed_at"] - doc["started_at"]).total_seconds(), 1)

        results.append(
            {
                "respondent_name": respondent.get("name"),
                "respondent_email": respondent.get("email"),
                "status": doc.get("status", "in_progress"),
                "duration_seconds": duration,
                "questions_covered_count": len(doc.get("questions_covered", [])),
                "started_at": doc["started_at"],
                "completed_at": doc.get("completed_at"),
            }
        )

    return results


async def save_survey_analysis(survey_id: str, analysis: dict) -> None:
    """Save aggregate AI analysis to the survey document."""
    db = await get_db()
    await db["surveys"].update_one(
        {"_id": ObjectId(survey_id)},
        {"$set": {"analysis": analysis}},
    )
