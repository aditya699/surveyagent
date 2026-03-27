# auth/routes.py
import uuid
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from server.db.mongo import get_db, log_error
from server.auth.schemas import (
    AdminInDB,
    TokenResponse,
    AdminUpdateResponse,
    AdminProfile,
    OTPVerifyRequest,
    OTPResendRequest,
    InviteRegisterRequest,
    InviteRequest,
    InviteInfoResponse,
)
from server.auth.utils import (
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    hash_password,
    verify_password,
    generate_otp,
)
from server.orgs.db import create_org
from server.orgs.utils import require_role
from server.email.service import send_otp_email, send_invite_email
from server.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()


def _build_token_data(user_id: str, admin: dict, version: int) -> dict:
    """Build JWT access token payload from admin doc."""
    return {
        "user_id": user_id,
        "email": admin["email"],
        "name": admin["name"],
        "org_name": admin.get("org_name", ""),
        "is_active": admin.get("is_active", True),
        "token_version": version,
    }


def _build_refresh_data(user_id: str, email: str, version: int) -> dict:
    """Build JWT refresh token payload."""
    return {
        "user_id": user_id,
        "email": email,
        "token_version": version,
    }


async def _generate_and_send_otp(db, user_id: str, email: str, user_name: str):
    """Generate OTP, store it, and send email."""
    # Delete any existing OTPs for this user
    await db["otp_codes"].delete_many({"user_id": ObjectId(user_id)})

    code = generate_otp()
    now = datetime.utcnow()
    await db["otp_codes"].insert_one({
        "user_id": ObjectId(user_id),
        "email": email,
        "code": code,
        "created_at": now,
        "expires_at": now + timedelta(minutes=10),
    })

    try:
        await send_otp_email(email, code, user_name)
    except Exception as e:
        logger.warning(f"Failed to send OTP email to {email}: {e}")


@router.post("/register", response_model=TokenResponse)
async def register_admin(
    request: Request,
    name: str = Form(..., description="Admin's full name"),
    email: str = Form(..., description="Admin's email address"),
    password: str = Form(..., description="Account password", min_length=6),
    org_name: str = Form(..., description="Organization name"),
) -> TokenResponse:
    """Register a new admin, create their org, send OTP for email verification."""
    try:
        logger.info(f"Registration attempt for admin - email: {email}, name: {name}")

        db = await get_db()
        admins_collection = db["admins"]

        # Check if admin already exists
        existing_admin = await admins_collection.find_one({"email": email.lower().strip()})
        if existing_admin:
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        hashed_password = hash_password(password)
        now = datetime.utcnow()
        clean_email = email.lower().strip()
        clean_name = name.strip()
        clean_org = org_name.strip()

        # Create admin with email_verified=False
        admin_data = AdminInDB(
            name=clean_name,
            email=clean_email,
            password=hashed_password,
            org_name=clean_org,
            role="owner",
            email_verified=False,
            created_at=now,
            updated_at=now,
            is_active=True,
            token_version=1,
            last_login=now,
        )

        result = await admins_collection.insert_one(admin_data.dict())
        user_id = str(result.inserted_id)

        # Create org
        org_doc = await create_org(clean_org, user_id)
        org_id = str(org_doc["_id"])

        # Update admin with org_id
        await admins_collection.update_one(
            {"_id": result.inserted_id},
            {"$set": {"org_id": ObjectId(org_id)}},
        )

        # Generate and send OTP
        await _generate_and_send_otp(db, user_id, clean_email, clean_name)

        # Create tokens (user will need to verify email before accessing protected routes)
        token_data = _build_token_data(user_id, admin_data.dict(), 1)
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data=_build_refresh_data(user_id, clean_email, 1))

        logger.info(f"Admin registered - user_id: {user_id}, email: {email}, org_id: {org_id}")

        return TokenResponse(
            message="Admin registered successfully. Please verify your email.",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,
            email_verified=False,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error for email: {email} - {str(e)}", exc_info=True)
        await log_error(e, "register_admin", {"email": email, "name": name})
        raise HTTPException(status_code=500, detail="Failed to register admin")


@router.post("/login", response_model=TokenResponse)
async def login_admin(
    request: Request,
    email: str = Form(..., description="Registered email address"),
    password: str = Form(..., description="Account password"),
) -> TokenResponse:
    """Authenticate admin and return JWT tokens. If email not verified, send OTP and return 403."""
    try:
        logger.info(f"Login attempt for email: {email}")

        db = await get_db()
        admins_collection = db["admins"]
        clean_email = email.lower().strip()

        admin = await admins_collection.find_one({"email": clean_email})
        if not admin:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not admin["is_active"]:
            raise HTTPException(status_code=403, detail="Account deactivated")

        if not verify_password(password, admin["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = str(admin["_id"])
        current_version = admin.get("token_version", 1)

        # Backward compatibility: set token_version if missing
        if "token_version" not in admin:
            await admins_collection.update_one(
                {"_id": admin["_id"]}, {"$set": {"token_version": 1}}
            )
            current_version = 1

        # Check email verification
        if not admin.get("email_verified", True):
            # Send fresh OTP and return 403
            await _generate_and_send_otp(db, user_id, clean_email, admin["name"])
            raise HTTPException(
                status_code=403,
                detail="email_not_verified",
                headers={"X-Email": clean_email},
            )

        # Update last login
        await admins_collection.update_one(
            {"_id": admin["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
        )

        token_data = _build_token_data(user_id, admin, current_version)
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data=_build_refresh_data(user_id, clean_email, current_version))

        logger.info(f"Login successful for user_id: {user_id}")

        return TokenResponse(
            message="Login successful",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,
            email_verified=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error for email: {email} - {str(e)}", exc_info=True)
        await log_error(e, "login_admin", {"email": email})
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: OTPVerifyRequest) -> TokenResponse:
    """Verify OTP code and activate the user's email."""
    try:
        logger.info(f"OTP verification attempt for email: {data.email}")

        db = await get_db()
        clean_email = data.email.lower().strip()

        # Find valid OTP
        otp_doc = await db["otp_codes"].find_one({
            "email": clean_email,
            "code": data.code,
            "expires_at": {"$gt": datetime.utcnow()},
        })

        if not otp_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP code")

        # Mark email as verified
        admin = await db["admins"].find_one_and_update(
            {"_id": otp_doc["user_id"]},
            {"$set": {"email_verified": True, "updated_at": datetime.utcnow()}},
            return_document=True,
        )

        if not admin:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete used OTP
        await db["otp_codes"].delete_many({"user_id": otp_doc["user_id"]})

        # Generate fresh tokens
        user_id = str(admin["_id"])
        version = admin.get("token_version", 1)
        token_data = _build_token_data(user_id, admin, version)
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data=_build_refresh_data(user_id, admin["email"], version))

        logger.info(f"OTP verified for user_id: {user_id}")

        return TokenResponse(
            message="Email verified successfully",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,
            email_verified=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verify error - {str(e)}", exc_info=True)
        await log_error(e, "verify_otp", {"email": data.email})
        raise HTTPException(status_code=500, detail="OTP verification failed")


@router.post("/resend-otp")
async def resend_otp(data: OTPResendRequest):
    """Resend OTP code. Rate limited to 3 per 10 minutes."""
    try:
        db = await get_db()
        clean_email = data.email.lower().strip()

        admin = await db["admins"].find_one({"email": clean_email})
        if not admin:
            # Don't reveal whether email exists
            return {"message": "If the email is registered, a new code has been sent."}

        if admin.get("email_verified", True):
            return {"message": "Email is already verified."}

        # Rate limit: count OTPs in last 10 minutes
        ten_min_ago = datetime.utcnow() - timedelta(minutes=10)
        recent_count = await db["otp_codes"].count_documents({
            "user_id": admin["_id"],
            "created_at": {"$gt": ten_min_ago},
        })

        if recent_count >= 3:
            raise HTTPException(status_code=429, detail="Too many OTP requests. Try again later.")

        await _generate_and_send_otp(db, str(admin["_id"]), clean_email, admin["name"])

        return {"message": "Verification code sent."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend OTP error - {str(e)}", exc_info=True)
        await log_error(e, "resend_otp", {"email": data.email})
        raise HTTPException(status_code=500, detail="Failed to resend OTP")


@router.get("/invite/{token}", response_model=InviteInfoResponse)
async def get_invite_info(token: str) -> InviteInfoResponse:
    """Get invite details for the accept page."""
    try:
        db = await get_db()
        invite = await db["invites"].find_one({"token": token})

        if not invite:
            raise HTTPException(status_code=404, detail="Invite not found")

        if invite["status"] != "pending":
            raise HTTPException(status_code=400, detail=f"Invite has been {invite['status']}")

        if invite["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invite has expired")

        org = await db["orgs"].find_one({"_id": invite["org_id"]})
        org_name = org["name"] if org else "Unknown"

        return InviteInfoResponse(
            org_name=org_name,
            email=invite["email"],
            status=invite["status"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get invite info error - {str(e)}", exc_info=True)
        await log_error(e, "get_invite_info", {"token": token})
        raise HTTPException(status_code=500, detail="Failed to get invite info")


@router.post("/register-invite", response_model=TokenResponse)
async def register_via_invite(data: InviteRegisterRequest) -> TokenResponse:
    """Register a new user via an invite link. Email is pre-verified."""
    try:
        db = await get_db()

        # Validate invite
        invite = await db["invites"].find_one({"token": data.invite_token, "status": "pending"})
        if not invite:
            raise HTTPException(status_code=400, detail="Invalid or already used invite")

        if invite["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Invite has expired")

        # Check email not already registered
        existing = await db["admins"].find_one({"email": invite["email"]})
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        # Create admin
        now = datetime.utcnow()
        hashed_password = hash_password(data.password)

        org = await db["orgs"].find_one({"_id": invite["org_id"]})
        org_name = org["name"] if org else ""

        admin_doc = {
            "name": data.name.strip(),
            "email": invite["email"],
            "password": hashed_password,
            "org_name": org_name,
            "org_id": invite["org_id"],
            "role": invite["role"],
            "email_verified": True,  # Invite implies email ownership
            "created_at": now,
            "updated_at": now,
            "is_active": True,
            "token_version": 1,
            "last_login": now,
        }

        result = await db["admins"].insert_one(admin_doc)
        user_id = str(result.inserted_id)

        # Mark invite as accepted
        await db["invites"].update_one(
            {"_id": invite["_id"]},
            {"$set": {"status": "accepted"}},
        )

        # Generate tokens
        token_data = _build_token_data(user_id, admin_doc, 1)
        access_token = await create_access_token(data=token_data)
        refresh_token = await create_refresh_token(data=_build_refresh_data(user_id, invite["email"], 1))

        logger.info(f"Invite registration - user_id: {user_id}, org: {org_name}")

        return TokenResponse(
            message="Registration successful",
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,
            email_verified=True,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invite registration error - {str(e)}", exc_info=True)
        await log_error(e, "register_via_invite", {"token": data.invite_token})
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/invite")
async def send_invite(
    data: InviteRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send an invite email to join the org. Owner/Admin only."""
    try:
        require_role(current_user, ["owner", "admin"])
        org_id = current_user.get("org_id")
        if not org_id:
            raise HTTPException(status_code=400, detail="No organization found")

        if data.role not in ("admin", "member"):
            raise HTTPException(status_code=400, detail="Role must be 'admin' or 'member'")

        db = await get_db()
        clean_email = data.email.lower().strip()

        # Check if email already in org
        existing = await db["admins"].find_one({"email": clean_email, "org_id": ObjectId(org_id)})
        if existing:
            raise HTTPException(status_code=400, detail="User is already in your organization")

        # Check for pending invite
        pending = await db["invites"].find_one({
            "email": clean_email,
            "org_id": ObjectId(org_id),
            "status": "pending",
            "expires_at": {"$gt": datetime.utcnow()},
        })
        if pending:
            raise HTTPException(status_code=400, detail="A pending invite already exists for this email")

        # Create invite
        now = datetime.utcnow()
        invite_token = str(uuid.uuid4())

        await db["invites"].insert_one({
            "org_id": ObjectId(org_id),
            "email": clean_email,
            "role": data.role,
            "token": invite_token,
            "invited_by": ObjectId(current_user["user_id"]),
            "status": "pending",
            "created_at": now,
            "expires_at": now + timedelta(days=7),
        })

        # Get org name for email
        org = await db["orgs"].find_one({"_id": ObjectId(org_id)})
        org_name = org["name"] if org else "your organization"

        try:
            await send_invite_email(clean_email, invite_token, org_name, current_user["name"])
        except Exception as e:
            logger.warning(f"Failed to send invite email to {clean_email}: {e}")

        logger.info(f"Invite sent to {clean_email} for org {org_name}")

        return {"message": f"Invite sent to {clean_email}", "invite_token": invite_token}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send invite error - {str(e)}", exc_info=True)
        await log_error(e, "send_invite", {"email": data.email})
        raise HTTPException(status_code=500, detail="Failed to send invite")


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    request: Request,
    refresh_token: str = Form(..., description="Refresh token"),
) -> TokenResponse:
    """Refresh tokens with version increment."""
    try:
        logger.info("Token refresh attempt")

        payload = await verify_token(refresh_token, expected_type="refresh")
        user_id_str = payload.get("user_id")

        try:
            user_object_id = ObjectId(user_id_str)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid user ID in refresh token")

        db = await get_db()
        admins_collection = db["admins"]

        admin_before = await admins_collection.find_one({"_id": user_object_id, "is_active": True})
        if not admin_before:
            raise HTTPException(status_code=401, detail="User not found or account deactivated")

        # Increment token version
        await admins_collection.update_one(
            {"_id": user_object_id, "is_active": True},
            {"$inc": {"token_version": 1}},
        )

        admin = await admins_collection.find_one({"_id": user_object_id}, {"password": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="User not found after version update")

        user_id = str(admin["_id"])
        new_version = admin["token_version"]

        token_data = _build_token_data(user_id, admin, new_version)
        new_access_token = await create_access_token(data=token_data)
        new_refresh_token = await create_refresh_token(data=_build_refresh_data(user_id, admin["email"], new_version))

        logger.info(f"Token refreshed for user_id: {user_id}, new_version: {new_version}")

        return TokenResponse(
            message="Tokens refreshed successfully",
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            user_id=user_id,
            expires_in=1 * 24 * 60 * 60,
            email_verified=admin.get("email_verified", True),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error - {str(e)}", exc_info=True)
        await log_error(e, "refresh_tokens", {"error_type": type(e).__name__})
        raise HTTPException(status_code=401, detail="Token refresh failed")


@router.put("/update-profile", response_model=AdminUpdateResponse)
async def update_admin_profile(
    name: Optional[str] = Form(None, description="Admin's full name"),
    org_name: Optional[str] = Form(None, description="Organization name"),
    current_user: dict = Depends(get_current_user),
) -> AdminUpdateResponse:
    """Update admin profile (name only — org_name changes go through org settings)."""
    try:
        logger.info(f"Profile update for user_id: {current_user.get('user_id')}")

        db = await get_db()
        admins_collection = db["admins"]

        update_data = {}
        updated_fields = []

        field_mapping = {"name": name, "org_name": org_name}

        for field_name, field_value in field_mapping.items():
            if field_value is not None and field_value.strip():
                update_data[field_name] = field_value.strip()
                updated_fields.append(field_name)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")

        update_data["updated_at"] = datetime.utcnow()

        user_id = ObjectId(current_user["user_id"])
        result = await admins_collection.update_one({"_id": user_id}, {"$set": update_data})

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        updated_admin = await admins_collection.find_one({"_id": user_id}, {"password": 0})
        updated_admin["_id"] = str(updated_admin["_id"])
        updated_admin["user_id"] = str(updated_admin["_id"])
        if updated_admin.get("org_id"):
            updated_admin["org_id"] = str(updated_admin["org_id"])

        return AdminUpdateResponse(
            message="Profile updated successfully",
            user=AdminProfile(**updated_admin),
            updated_fields=updated_fields,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error - {str(e)}", exc_info=True)
        await log_error(e, "update_admin_profile", {"user_id": current_user.get("user_id")})
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/me")
async def get_current_admin_info(current_user: dict = Depends(get_current_user)):
    """Get current admin information."""
    return {"message": "Admin information retrieved successfully", "user": current_user}
