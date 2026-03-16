# auth/routes.py
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from typing import Optional
from datetime import datetime
from bson import ObjectId
from server.db.mongo import get_db, log_error
from server.auth.schemas import AdminInDB, TokenResponse, AdminUpdateResponse, AdminProfile
from server.auth.utils import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    hash_password,
    verify_password,
)
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


# Admin can register here
@router.post("/register", response_model=TokenResponse)
async def register_admin(
    request: Request,
    name: str = Form(..., description="Admin's full name"),
    email: str = Form(..., description="Admin's email address"),
    password: str = Form(..., description="Account password", min_length=6),
    org_name: str = Form(..., description="Organization name"),
) -> TokenResponse:
    """
    Deep Technical Context:
    - Register a new admin user and return JWT tokens with version support
    - New admins start with token_version = 1
    - JWT tokens include embedded token_version
    - Enables future token invalidation on refresh
    - Email is case-insensitive and used as the unique login identifier

    Returns:
        TokenResponse: JWT access token, refresh token, and admin info
    """
    try:
        logger.info(f"Registration attempt for admin - email: {email}, name: {name}")

        # Get database connection
        db = await get_db()
        admins_collection = db["admins"]

        # Check if admin already exists (by email, case-insensitive)
        existing_admin = await admins_collection.find_one({"email": email.lower().strip()})
        if existing_admin:
            logger.error(f"Registration failed - Admin already exists with email: {email}")
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists"
            )

        # Hash the password
        hashed_password = hash_password(password)

        # Create admin document with token_version
        now = datetime.utcnow()

        admin_data = AdminInDB(
            name=name.strip(),
            email=email.lower().strip(),
            password=hashed_password,
            org_name=org_name.strip(),
            created_at=now,
            updated_at=now,
            is_active=True,
            token_version=1,  # Start with version 1
            last_login=now,
        )

        # Insert into database
        result = await admins_collection.insert_one(admin_data.dict())
        user_id = str(result.inserted_id)

        # Create JWT token payload with token_version
        token_data = {
            "user_id": user_id,
            "email": email.lower().strip(),
            "name": name.strip(),
            "org_name": org_name.strip(),
            "is_active": True,
            "token_version": 1
        }

        # Generate JWT tokens
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data={
            "user_id": user_id,
            "email": email.lower().strip(),
            "token_version": 1
        })

        logger.info(f"Admin registered successfully - user_id: {user_id}, email: {email}")

        return TokenResponse(
            message="Admin registered successfully",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,  # 1 day in seconds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error for email: {email} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="register_admin",
            additional_info={"email": email, "name": name}
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to register admin"
        )


# Admin can login here
@router.post("/login", response_model=TokenResponse)
async def login_admin(
    request: Request,
    email: str = Form(..., description="Registered email address"),
    password: str = Form(..., description="Account password"),
) -> TokenResponse:
    """
    Deep Technical Context:
    - Authenticate admin and return JWT tokens with version support
    - Gets current token_version from database
    - Embeds version in both access and refresh tokens
    - Enables token invalidation security
    - Updates last_login timestamp on successful authentication

    Returns:
        TokenResponse: JWT access token, refresh token, and admin info
    """
    try:
        logger.info(f"Login attempt for email: {email}")

        # Get database connection
        db = await get_db()
        admins_collection = db["admins"]

        # Find admin by email
        admin = await admins_collection.find_one({"email": email.lower().strip()})
        if not admin:
            logger.error(f"Login failed - Admin not found for email: {email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not admin["is_active"]:
            logger.error(f"Login failed - Account deactivated for email: {email}")
            raise HTTPException(
                status_code=403,
                detail="Account deactivated"
            )

        # Verify password
        if not verify_password(password, admin["password"]):
            logger.error(f"Login failed - Invalid password for email: {email}")
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        # Get current token version (with backward compatibility)
        user_id = str(admin["_id"])
        current_version = admin.get("token_version", 1)

        # If admin doesn't have token_version field (old data), set it to 1
        if "token_version" not in admin:
            await admins_collection.update_one(
                {"_id": admin["_id"]},
                {"$set": {"token_version": 1}}
            )
            current_version = 1

        # Update last login time
        await admins_collection.update_one(
            {"_id": admin["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )

        # Create JWT token payload with token_version
        token_data = {
            "user_id": user_id,
            "email": admin["email"],
            "name": admin["name"],
            "org_name": admin["org_name"],
            "is_active": admin["is_active"],
            "token_version": current_version
        }

        # Generate JWT tokens
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data={
            "user_id": user_id,
            "email": admin["email"],
            "token_version": current_version
        })

        logger.info(f"Login successful for user_id: {user_id}, email: {email}")

        return TokenResponse(
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,  # 1 day in seconds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for email: {email} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="login_admin",
            additional_info={"email": email}
        )
        raise HTTPException(
            status_code=500,
            detail="Login failed"
        )


# Frontend can use this to refresh the token and get new tokens (both access and refresh)
@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    refresh_token: str = Form(..., description="Refresh token"),
) -> TokenResponse:
    """
    Deep Technical Context:
    - Generate new access token using refresh token and INVALIDATE old tokens
    - Verifies old refresh token version against database
    - Increments user's token_version in database (INVALIDATES old tokens)
    - Generates new tokens with updated version
    - Old tokens become automatically invalid due to version mismatch
    - This implements secure token rotation without blacklisting

    Returns:
        TokenResponse: New access token and refresh token with updated version
    """
    try:
        logger.info("Token refresh attempt")

        # Step 1: Verify refresh token (includes version validation)
        payload = await verify_token(refresh_token, expected_type="refresh")

        user_id_str = payload.get("user_id")
        email = payload.get("email")

        # Step 2: Convert string to ObjectId for database operations
        try:
            user_object_id = ObjectId(user_id_str)
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid user ID in refresh token"
            )

        # Get database connection
        db = await get_db()
        admins_collection = db["admins"]

        # Step 3: Verify admin exists and is active
        admin_before_update = await admins_collection.find_one(
            {"_id": user_object_id, "is_active": True}
        )

        if not admin_before_update:
            raise HTTPException(
                status_code=401,
                detail="User not found or account deactivated"
            )

        # Step 4: INCREMENT token version in database (this invalidates ALL old tokens)
        await admins_collection.update_one(
            {"_id": user_object_id, "is_active": True},
            {"$inc": {"token_version": 1}}
        )

        # Step 5: Get updated admin data with new version
        admin = await admins_collection.find_one(
            {"_id": user_object_id},
            {"password": 0}  # Exclude password
        )

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="User not found after version update"
            )

        # Step 6: Create new token payload with UPDATED version
        user_id = str(admin["_id"])
        new_version = admin["token_version"]  # This is now old_version + 1

        token_data = {
            "user_id": user_id,
            "email": admin["email"],
            "name": admin["name"],
            "org_name": admin["org_name"],
            "is_active": admin["is_active"],
            "token_version": new_version
        }

        # Step 7: Generate fresh tokens with new version
        new_access_token = await create_access_token(data=token_data)
        new_refresh_token = await create_refresh_token(data={
            "user_id": user_id,
            "email": admin["email"],
            "token_version": new_version
        })

        logger.info(f"Token refreshed successfully for user_id: {user_id}, email: {email}, new_version: {new_version}")

        return TokenResponse(
            message="Tokens refreshed successfully - old tokens invalidated",
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,  # 1 day in seconds
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="refresh_tokens",
            additional_info={
                "refresh_token": refresh_token[:20] if refresh_token else None,
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(
            status_code=401,
            detail="Token refresh failed"
        )


# Admin can update their profile here
@router.put("/update-profile", response_model=AdminUpdateResponse)
async def update_admin_profile(
    name: Optional[str] = Form(None, description="Admin's full name"),
    org_name: Optional[str] = Form(None, description="Organization name"),
    current_user: dict = Depends(get_current_user),
) -> AdminUpdateResponse:
    """
    Deep Technical Context:
    - Update admin profile information
    - Uses token version validation automatically through get_current_user
    - Only non-None, non-empty form fields are applied
    - Updates the updated_at timestamp

    Returns:
        AdminUpdateResponse: Updated admin info and list of changed fields
    """
    try:
        logger.info(f"Profile update attempt for user_id: {current_user.get('user_id')}")

        # Get database connection
        db = await get_db()
        admins_collection = db["admins"]

        # Build update data from provided fields
        update_data = {}
        updated_fields = []

        # Check each field and add to update if provided
        field_mapping = {
            "name": name,
            "org_name": org_name,
        }

        for field_name, field_value in field_mapping.items():
            if field_value is not None and field_value.strip():
                update_data[field_name] = field_value.strip()
                updated_fields.append(field_name)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No fields to update"
            )

        # Add updated timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Perform database update
        user_id = ObjectId(current_user["user_id"])

        result = await admins_collection.update_one(
            {"_id": user_id},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

        # Fetch updated admin data
        updated_admin = await admins_collection.find_one(
            {"_id": user_id},
            {"password": 0}  # Exclude password
        )

        # Convert ObjectId for response
        updated_admin["_id"] = str(updated_admin["_id"])
        updated_admin["user_id"] = str(updated_admin["_id"])

        logger.info(f"Profile updated successfully for user_id: {current_user.get('user_id')}, fields: {updated_fields}")

        return AdminUpdateResponse(
            message="Profile updated successfully",
            user=AdminProfile(**updated_admin),
            updated_fields=updated_fields,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error for user_id: {current_user.get('user_id')} - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="update_admin_profile",
            additional_info={
                "user_id": current_user.get("user_id"),
                "updated_fields": updated_fields
            }
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update profile"
        )


# Admin can get their profile here
@router.get("/me")
async def get_current_admin_info(
    current_user: dict = Depends(get_current_user),
):
    """
    Deep Technical Context:
    - Get current admin information from JWT token
    - Automatically validates token version through get_current_user
    - Uses the enhanced JWT authentication middleware
    - Returns comprehensive admin information

    Returns:
        Dict: Current admin information
    """
    logger.info(f"Admin info retrieved for user_id: {current_user.get('user_id')}")
    return {
        "message": "Admin information retrieved successfully",
        "user": current_user
    }
