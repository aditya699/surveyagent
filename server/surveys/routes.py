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
from server.surveys.utils import generate_survey_token
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


def _survey_doc_to_response(doc: dict) -> SurveyResponse:
    """Convert a MongoDB survey document to a SurveyResponse."""
    return SurveyResponse(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        goal=doc.get("goal", ""),
        context=doc.get("context", ""),
        questions=doc.get("questions", []),
        estimated_duration=doc.get("estimated_duration", 5),
        welcome_message=doc.get("welcome_message"),
        personality_tone=doc.get("personality_tone", "friendly"),
        status=doc["status"],
        token=doc.get("token"),
        created_by=str(doc["created_by"]),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("/", response_model=SurveySingleResponse)
async def create_survey(
    survey_data: SurveyCreate,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """
    Deep Technical Context:
    - Creates a new survey in draft status
    - created_by is set from the authenticated admin's user_id
    - Token is null until published
    - Accepts JSON body (not form data)
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Survey creation attempt by user_id: {user_id}")

        db = await get_db()
        surveys_collection = db["surveys"]

        now = datetime.utcnow()
        doc = {
            "title": survey_data.title.strip(),
            "description": survey_data.description.strip(),
            "goal": survey_data.goal.strip(),
            "context": survey_data.context.strip(),
            "questions": survey_data.questions,
            "estimated_duration": survey_data.estimated_duration,
            "welcome_message": survey_data.welcome_message,
            "personality_tone": survey_data.personality_tone,
            "status": "draft",
            "token": None,
            "created_by": ObjectId(user_id),
            "created_at": now,
            "updated_at": now,
        }

        result = await surveys_collection.insert_one(doc)
        doc["_id"] = result.inserted_id

        logger.info(f"Survey created - id: {result.inserted_id}, user_id: {user_id}")

        return SurveySingleResponse(
            message="Survey created successfully",
            survey=_survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Survey creation error - user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="create_survey",
            additional_info={"user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to create survey")


@router.get("/", response_model=SurveyListResponse)
async def get_surveys(
    current_user: dict = Depends(get_current_user),
) -> SurveyListResponse:
    """
    Deep Technical Context:
    - Returns all surveys owned by the current admin
    - Filters by created_by to enforce ownership isolation
    - Sorted by created_at descending (newest first)
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Fetching surveys for user_id: {user_id}")

        db = await get_db()
        surveys_collection = db["surveys"]

        cursor = surveys_collection.find(
            {"created_by": ObjectId(user_id)}
        ).sort("created_at", -1)

        surveys = []
        async for doc in cursor:
            surveys.append(_survey_doc_to_response(doc))

        logger.info(f"Returned {len(surveys)} surveys for user_id: {user_id}")

        return SurveyListResponse(
            message="Surveys retrieved successfully",
            count=len(surveys),
            surveys=surveys,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get surveys error - user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="get_surveys",
            additional_info={"user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve surveys")


@router.get("/{survey_id}", response_model=SurveySingleResponse)
async def get_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """
    Deep Technical Context:
    - Returns a single survey by ID
    - Validates ObjectId format and ownership (created_by must match current user)
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Fetching survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()
        surveys_collection = db["surveys"]

        doc = await surveys_collection.find_one(
            {"_id": survey_oid, "created_by": ObjectId(user_id)}
        )

        if not doc:
            raise HTTPException(status_code=404, detail="Survey not found")

        return SurveySingleResponse(
            message="Survey retrieved successfully",
            survey=_survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get survey error - survey_id: {survey_id}, user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="get_survey",
            additional_info={"survey_id": survey_id, "user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to retrieve survey")


@router.put("/{survey_id}", response_model=SurveySingleResponse)
async def update_survey(
    survey_id: str,
    survey_data: SurveyUpdate,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """
    Deep Technical Context:
    - Updates survey fields that are provided (partial update)
    - Only the owning admin can update their survey
    - Cannot change status via this endpoint (use publish endpoint)
    - Updates the updated_at timestamp
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Updating survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        # Build update dict from provided fields only
        update_data = {}
        for field, value in survey_data.model_dump(exclude_unset=True).items():
            if isinstance(value, str):
                update_data[field] = value.strip()
            else:
                update_data[field] = value

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.utcnow()

        db = await get_db()
        surveys_collection = db["surveys"]

        result = await surveys_collection.update_one(
            {"_id": survey_oid, "created_by": ObjectId(user_id)},
            {"$set": update_data},
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Survey not found")

        # Fetch updated document
        doc = await surveys_collection.find_one({"_id": survey_oid})

        logger.info(f"Survey updated - id: {survey_id}, fields: {list(update_data.keys())}")

        return SurveySingleResponse(
            message="Survey updated successfully",
            survey=_survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update survey error - survey_id: {survey_id}, user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="update_survey",
            additional_info={"survey_id": survey_id, "user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to update survey")


@router.delete("/{survey_id}", response_model=SurveyDeleteResponse)
async def delete_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveyDeleteResponse:
    """
    Deep Technical Context:
    - Permanently deletes a survey by ID
    - Only the owning admin can delete their survey
    - Returns 404 if survey doesn't exist or doesn't belong to the user
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Deleting survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()
        surveys_collection = db["surveys"]

        result = await surveys_collection.delete_one(
            {"_id": survey_oid, "created_by": ObjectId(user_id)}
        )

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Survey not found")

        logger.info(f"Survey deleted - id: {survey_id}, user_id: {user_id}")

        return SurveyDeleteResponse(
            message="Survey deleted successfully",
            id=survey_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete survey error - survey_id: {survey_id}, user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="delete_survey",
            additional_info={"survey_id": survey_id, "user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to delete survey")


@router.post("/{survey_id}/publish", response_model=SurveySingleResponse)
async def publish_survey(
    survey_id: str,
    current_user: dict = Depends(get_current_user),
) -> SurveySingleResponse:
    """
    Deep Technical Context:
    - Sets survey status to "published" and generates a unique token via uuid4
    - Only the owning admin can publish their survey
    - If already published, returns 400
    - Token is used as the public-facing survey link identifier
    """
    try:
        user_id = current_user["user_id"]
        logger.info(f"Publishing survey {survey_id} for user_id: {user_id}")

        try:
            survey_oid = ObjectId(survey_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid survey ID format")

        db = await get_db()
        surveys_collection = db["surveys"]

        # Fetch survey to check current status
        doc = await surveys_collection.find_one(
            {"_id": survey_oid, "created_by": ObjectId(user_id)}
        )

        if not doc:
            raise HTTPException(status_code=404, detail="Survey not found")

        if doc["status"] == "published":
            raise HTTPException(status_code=400, detail="Survey is already published")

        # Generate token and publish
        token = generate_survey_token()

        await surveys_collection.update_one(
            {"_id": survey_oid},
            {"$set": {
                "status": "published",
                "token": token,
                "updated_at": datetime.utcnow(),
            }},
        )

        # Fetch updated document
        doc = await surveys_collection.find_one({"_id": survey_oid})

        logger.info(f"Survey published - id: {survey_id}, token: {token}")

        return SurveySingleResponse(
            message="Survey published successfully",
            survey=_survey_doc_to_response(doc),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Publish survey error - survey_id: {survey_id}, user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="publish_survey",
            additional_info={"survey_id": survey_id, "user_id": current_user.get("user_id")},
        )
        raise HTTPException(status_code=500, detail="Failed to publish survey")
