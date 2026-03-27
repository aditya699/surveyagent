# auth/utils.py
import random
import string
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import HTTPException, Header, Request
from jose import JWTError, jwt
from bson import ObjectId
from bcrypt._bcrypt import hashpw, checkpw, gensalt
from server.db.mongo import log_error, get_db
from server.core.config import settings
from server.core.logging_config import get_logger

logger = get_logger(__name__)


def generate_otp() -> str:
    """Generate a 6-digit numeric OTP code."""
    return "".join(random.choices(string.digits, k=6))


# Password hashing helpers (using bcrypt directly — passlib is incompatible with bcrypt 4.1+)
def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return hashpw(password.encode("utf-8"), gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# JWT Token Management - With Token Versioning
async def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Deep Technical Context:
    - Creates a JWT access token with embedded user data and token version
    - Token includes type="access" to distinguish from refresh tokens
    - exp/iat stored as Unix timestamps for cross-platform compatibility
    - token_version enables server-side revocation by version mismatch check

    Args:
        data: Claims to embed in the token (user_id, email, token_version, etc.)
        expires_delta: Custom expiration time (defaults to JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    Returns:
        str: Signed JWT token with embedded token_version
    """
    to_encode = data.copy()

    # Ensure user_id is string, not ObjectId
    if "user_id" in to_encode and isinstance(to_encode["user_id"], ObjectId):
        to_encode["user_id"] = str(to_encode["user_id"])

    # Ensure token_version is included
    if "token_version" not in to_encode:
        to_encode["token_version"] = 1

    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    # Add standard JWT claims with proper timestamps
    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(datetime.utcnow().timestamp()),
        "type": "access"
    })

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


async def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Deep Technical Context:
    - Creates a JWT refresh token for obtaining new access tokens
    - Includes token_version for invalidation support
    - Longer-lived than access tokens (14 days vs 1 day)
    - Contains minimal payload: user_id, email, token_version

    Args:
        data: User data including user_id, email, and token_version

    Returns:
        str: Signed JWT refresh token with embedded token_version
    """
    to_encode = {
        "user_id": str(data.get("user_id")),
        "email": data.get("email"),
        "token_version": data.get("token_version", 1),
        "type": "refresh"
    }

    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_REFRESH_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(datetime.utcnow().timestamp()),
    })

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


async def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Deep Technical Context:
    - Verifies and decodes a JWT token
    - Validates token type matches expected_type ("access" or "refresh")
    - Checks token_version against database to detect revoked tokens
    - This is the core security gate: version mismatch = token revoked

    Args:
        token: The JWT token to verify
        expected_type: Expected token type ("access" or "refresh")

    Returns:
        Dict[str, Any]: Decoded token payload

    Raises:
        HTTPException: If token is invalid, expired, wrong type, or version mismatch
    """
    try:
        # Step 1: Basic JWT verification
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])

        # Step 2: Validate token type
        token_type = payload.get("type")
        if token_type != expected_type:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token type. Expected {expected_type}, got {token_type}"
            )

        # Step 3: Extract user identifier
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Token missing user identifier"
            )

        # Step 4: Token version validation
        token_version = payload.get("token_version", 1)

        # Convert user_id to ObjectId for database query
        try:
            user_object_id = ObjectId(user_id)
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid user ID format in token"
            )

        # Step 5: Check current token version in database
        db = await get_db()
        admins_collection = db["admins"]

        admin = await admins_collection.find_one(
            {"_id": user_object_id, "is_active": True},
            {"token_version": 1}  # Only fetch token_version for performance
        )

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="User not found or account deactivated"
            )

        # Step 6: Compare token version with database version
        current_version = admin.get("token_version", 1)

        if token_version != current_version:
            logger.error(f"Token version mismatch for user_id: {user_id} - token_version: {token_version}, current_version: {current_version}")
            raise HTTPException(
                status_code=401,
                detail=f"Token has been revoked (version mismatch: token={token_version}, current={current_version})"
            )

        return payload

    except JWTError as e:
        # Specific JWT error handling
        error_msg = str(e)
        if "expired" in error_msg.lower():
            logger.error(f"Token expired - {error_msg}")
            raise HTTPException(
                status_code=401,
                detail="Token has expired"
            )
        elif "signature" in error_msg.lower():
            logger.error(f"Invalid token signature - {error_msg}")
            raise HTTPException(
                status_code=401,
                detail="Invalid token signature"
            )
        else:
            logger.error(f"Invalid token - {error_msg}")
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {error_msg}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification failed - {str(e)}", exc_info=True)
        await log_error(
            error=e,
            location="verify_token",
            additional_info={
                "token_type": expected_type,
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(
            status_code=401,
            detail="Token verification failed"
        )


async def get_current_user(authorization: str = Header(None)) -> Dict[str, Any]:
    """
    Deep Technical Context:
    - JWT-based authentication middleware / FastAPI dependency
    - Extracts Bearer token from Authorization header
    - Validates token_version automatically through verify_token
    - Fetches full user document from MongoDB (excluding password)
    - Used via Depends(get_current_user) in protected route handlers

    Args:
        authorization: Authorization header containing "Bearer <jwt_token>"

    Returns:
        Dict[str, Any]: Current admin user information
    """
    try:
        # Validate Authorization header format
        if not authorization:
            raise HTTPException(
                status_code=401,
                detail="Authorization header missing"
            )

        if not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization format. Use 'Bearer <token>'"
            )

        # Extract and verify the JWT token (includes version checking)
        token = authorization.replace("Bearer ", "")
        payload = await verify_token(token, expected_type="access")

        # Extract user information from JWT payload
        user_id_str = payload.get("user_id")

        # Convert string back to ObjectId for database query
        try:
            user_object_id = ObjectId(user_id_str)
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid user ID format in token"
            )

        # Get full admin data (token version already validated in verify_token)
        db = await get_db()
        admins_collection = db["admins"]

        admin = await admins_collection.find_one(
            {"_id": user_object_id, "is_active": True},
            {"password": 0}  # Exclude password from response
        )

        if not admin:
            raise HTTPException(
                status_code=401,
                detail="User not found or account deactivated"
            )

        # Enforce email verification for all protected routes
        if not admin.get("email_verified", True):
            raise HTTPException(
                status_code=403,
                detail="email_not_verified"
            )

        # Convert ObjectId to string for JSON serialization
        admin["_id"] = str(admin["_id"])
        admin["user_id"] = str(admin["_id"])

        # Convert org_id ObjectId to string if present
        if admin.get("org_id"):
            admin["org_id"] = str(admin["org_id"])

        # Ensure role and email_verified are present
        admin.setdefault("role", "owner")
        admin.setdefault("email_verified", True)

        # Enrich with JWT claims
        admin.update({
            "jwt_issued_at": datetime.fromtimestamp(payload.get("iat", 0)),
            "jwt_expires_at": datetime.fromtimestamp(payload.get("exp", 0)),
            "jwt_token_version": payload.get("token_version", 1)
        })

        return admin

    except HTTPException:
        raise
    except Exception as e:
        await log_error(
            error=e,
            location="get_current_user",
            additional_info={
                "authorization_header": authorization[:20] if authorization else None,
                "error_type": type(e).__name__
            }
        )
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )
