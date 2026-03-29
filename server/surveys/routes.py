# surveys/routes.py
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db, log_error
from server.auth.utils import get_current_user
from server.surveys.schemas import (
    SurveyCreate,
    SurveyUpdate,
    SurveyResponse,
    SurveyListResponse,
    SurveySingleResponse,
    SurveyDeleteResponse,
)
from server.surveys.utils import (
    generate_survey_token,
    survey_doc_to_response,
    check_survey_access,
    build_visibility_query,
)
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


@router.post("", response_model=SurveySingleResponse)
async def create_survey(
    survey_data: SurveyCreate,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """Create a new survey in draft status."""
    try:
        user_id = current_user["user_id"]
        org_id = current_user.get("org_id")
        logger.info(f"Survey creation attempt by user_id: {user_id}")

        # Validate visibility
        if survey_data.visibility not in ("private", "team", "org"):
            raise HTTPException(status_code=400, detail="Visibility must be private, team, or org")

        if survey_data.visibility == "team" and not survey_data.team_ids:
            raise HTTPException(status_code=400, detail="Team visibility requires at least one team")

        db = await get_db()
        surveys_collection = db["surveys"]

        # Convert team_ids to ObjectIds
        team_oids = []
        if survey_data.team_ids:
            for tid in survey_data.team_ids:
                try:
                    team_oids.append(ObjectId(tid))
                except Exception:
                    raise HTTPException(status_code=400, detail=f"Invalid team ID: {tid}")

            # Validate teams belong to user's org
            if org_id:
                valid_count = await db["teams"].count_documents(
                    {"_id": {"$in": team_oids}, "org_id": ObjectId(org_id)}
                )
                if valid_count != len(team_oids):
                    raise HTTPException(status_code=400, detail="One or more team IDs are invalid")

        now = datetime.utcnow()
        doc = {
            "title": survey_data.title.strip(),
            "description": survey_data.description.strip(),
            "goal": survey_data.goal.strip(),
            "context": survey_data.context.strip(),
            "questions": [q.model_dump() for q in survey_data.questions],
            "estimated_duration": survey_data.estimated_duration,
            "welcome_message": survey_data.welcome_message,
            "personality_tone": survey_data.personality_tone,
            "webhook_url": survey_data.webhook_url,
            "notify_on_completion": survey_data.notify_on_completion,
            "llm_provider": survey_data.llm_provider,
            "llm_model": survey_data.llm_model,
            "analytics_instructions": survey_data.analytics_instructions,
            "visibility": survey_data.visibility,
            "team_ids": team_oids,
            "org_id": ObjectId(org_id) if org_id else None,
            "status": "draft",
            "token": None,
            "created_by": ObjectId(user_id),
            "created_at": now,
            "updated_at": now,
        }

        result = await surveys_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

        logger.info(f"Survey created - id: {result.inserted_id}, visibility: {survey_data.visibility}")

        return SurveySingleResponse(
            message="Survey created successfully",
            survey=survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Survey creation error - {str(e)}", exc_info=True)
        await log_error(e, "create_survey", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to create survey")


@router.get("", response_model=SurveyListResponse)
async def get_surveys(
    current_user: dict = Depends(get_current_user),
) -> SurveyListResponse:
    """Return all surveys visible to the current user based on visibility rules."""
    try:
        user_id = current_user["user_id"]
        logger.info(f"Fetching surveys for user_id: {user_id}")

        db = await get_db()
        surveys_collection = db["surveys"]

        query = await build_visibility_query(current_user)
        cursor = surveys_collection.find(query).sort("created_at", -1)

        # Collect creator IDs to batch-fetch names
        docs = []
        creator_ids = set()
        async for doc in cursor:
            docs.append(doc)
            creator_ids.add(doc["created_by"])

        # Fetch creator names
        creator_map = {}
        if creator_ids:
            creators = await db["admins"].find(
                {"_id": {"$in": list(creator_ids)}}, {"name": 1, "email": 1}
            ).to_list(None)
            creator_map = {c["_id"]: c["name"] for c in creators}
            creator_email_map = {c["_id"]: c["email"] for c in creators}

        surveys = []
        for doc in docs:
            doc["created_by_name"] = creator_map.get(doc["created_by"])
            doc["created_by_email"] = creator_email_map.get(doc["created_by"])
            surveys.append(survey_doc_to_response(doc))

        logger.info(f"Returned {len(surveys)} surveys for user_id: {user_id}")

        return SurveyListResponse(
            message="Surveys retrieved successfully",
            count=len(surveys),
            surveys=surveys,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get surveys error - {str(e)}", exc_info=True)
        await log_error(e, "get_surveys", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to retrieve surveys")


@router.get("/{survey_id}", response_model=SurveySingleResponse)
async def get_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """Return a single survey if the user has access."""
    try:
        user_id = current_user["user_id"]
        logger.info(f"Fetching survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()
        doc = await db["surveys"].find_one({"_id": survey_oid})

        if not doc:
            raise HTTPException(status_code=404, detail="Survey not found")

        has_access = await check_survey_access(doc, current_user)
        if not has_access:
            raise HTTPException(status_code=404, detail="Survey not found")

        # Add creator name and email
        creator = await db["admins"].find_one({"_id": doc["created_by"]}, {"name": 1, "email": 1})
        doc["created_by_name"] = creator["name"] if creator else None
        doc["created_by_email"] = creator["email"] if creator else None

        return SurveySingleResponse(
            message="Survey retrieved successfully",
            survey=survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get survey error - {str(e)}", exc_info=True)
        await log_error(e, "get_survey", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to retrieve survey")


@router.put("/{survey_id}", response_model=SurveySingleResponse)
async def update_survey(
    survey_id: str,
    survey_data: SurveyUpdate,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """Update a survey. Creator or Owner/Admin can update."""
    try:
        user_id = current_user["user_id"]
        role = current_user.get("role", "member")
        org_id = current_user.get("org_id")
        logger.info(f"Updating survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        update_data = {}
        for field, value in survey_data.model_dump(exclude_unset=True).items():
            if field == "team_ids" and value is not None:
                update_data["team_ids"] = [ObjectId(tid) for tid in value]
            elif isinstance(value, str):
                update_data[field] = value.strip()
            else:
                update_data[field] = value

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.utcnow()

        # Creator can always update; Owner/Admin can update any org survey
        query = {"_id": survey_oid}
        if role in ("owner", "admin") and org_id:
            query["$or"] = [
                {"created_by": ObjectId(user_id)},
                {"org_id": ObjectId(org_id)},
            ]
        else:
            query["created_by"] = ObjectId(user_id)

        db = await get_db()
        result = await db["surveys"].update_one(
            query,
            {"$set": update_data},
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Survey not found")

        doc = await db["surveys"].find_one({"_id": survey_oid})
        logger.info(f"Survey updated - id: {survey_id}")

        return SurveySingleResponse(
            message="Survey updated successfully",
            survey=survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update survey error - {str(e)}", exc_info=True)
        await log_error(e, "update_survey", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to update survey")


@router.delete("/{survey_id}", response_model=SurveyDeleteResponse)
async def delete_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveyDeleteResponse:
    """Delete a survey. Creator or Owner/Admin can delete."""
    try:
        user_id = current_user["user_id"]
        role = current_user.get("role", "member")
        org_id = current_user.get("org_id")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()

        # Creator can always delete; Owner/Admin can delete any org survey
        query = {"_id": survey_oid}
        if role in ("owner", "admin") and org_id:
            query["$or"] = [
                {"created_by": ObjectId(user_id)},
                {"org_id": ObjectId(org_id)},
            ]
        else:
            query["created_by"] = ObjectId(user_id)

        result = await db["surveys"].delete_one(query)

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Survey not found")

        logger.info(f"Survey deleted - id: {survey_id}")

        return SurveyDeleteResponse(message="Survey deleted successfully", id=survey_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete survey error - {str(e)}", exc_info=True)
        await log_error(e, "delete_survey", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to delete survey")


@router.post("/{survey_id}/publish", response_model=SurveySingleResponse)
async def publish_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """Publish a survey. Creator or Owner/Admin can publish."""
    try:
        user_id = current_user["user_id"]
        role = current_user.get("role", "member")
        org_id = current_user.get("org_id")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        # Creator can always publish; Owner/Admin can publish any org survey
        query = {"_id": survey_oid}
        if role in ("owner", "admin") and org_id:
            query["$or"] = [
                {"created_by": ObjectId(user_id)},
                {"org_id": ObjectId(org_id)},
            ]
        else:
            query["created_by"] = ObjectId(user_id)

        db = await get_db()
        doc = await db["surveys"].find_one(query)

        if not doc:
            raise HTTPException(status_code=404, detail="Survey not found")

        if doc["status"] == "published":
            raise HTTPException(status_code=400, detail="Survey is already published")

        token = generate_survey_token()
        await db["surveys"].update_one(
            {"_id": survey_oid},
            {"$set": {"status": "published", "token": token, "updated_at": datetime.utcnow()}},
        )

        doc = await db["surveys"].find_one({"_id": survey_oid})
        logger.info(f"Survey published - id: {survey_id}, token: {token}")

        return SurveySingleResponse(
            message="Survey published successfully",
            survey=survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish survey error - {str(e)}", exc_info=True)
        await log_error(e, "publish_survey", {"survey_id": survey_id})
        raise HTTPException(status_code=500, detail="Failed to publish survey")
