"""
Author - Aditya Bhatt

NOTE:
# SurveyAgent Auth Schemas
# Admin user model for the AI survey platform.
# Follows the same schema patterns as the reference codebase:
# - Field(..., description=) for all fields
# - Deep Technical Context docstrings
# - Pydantic BaseModel with explicit validation
"""

# auth/schemas.py
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional, List


class AdminInDB(BaseModel):
    """
    Deep Technical Context:
    - Schema for admin data stored in MongoDB 'admins' collection
    - Password field stores bcrypt hash, never plaintext
    - token_version is incremented on each refresh to invalidate old JWT tokens
    - This represents the actual document structure in MongoDB
    """
    name: str = Field(..., description="Admin's full name")
    email: str = Field(..., description="Admin's email address (unique login identifier)")
    password: str = Field(..., description="Hashed password (bcrypt)")
    org_name: str = Field(..., description="Organization name")
    org_id: Optional[str] = Field(None, description="Organization ID (ObjectId string)")
    role: str = Field("owner", description="User role: owner, admin, or member")
    email_verified: bool = Field(False, description="Whether email has been verified via OTP")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_active: bool = Field(True, description="Account active status")
    token_version: int = Field(
        default=1,
        description="Current token version - incremented on each refresh to invalidate old tokens",
        ge=1
    )
    last_login: datetime = Field(..., description="Last login timestamp")


class TokenResponse(BaseModel):
    """
    Deep Technical Context:
    - Schema for JWT token response from login/register/refresh endpoints
    - Follows OAuth2 standard token response format
    """
    message: str = Field(..., description="Response message")
    access_token: str = Field(..., description="JWT access token for API authentication")
    refresh_token: str = Field(..., description="JWT refresh token for obtaining new access tokens")
    token_type: str = Field("bearer", description="Token type (always bearer for JWT)")
    user_id: str = Field(..., description="Unique admin identifier")
    expires_in: int = Field(..., description="Access token expiration time in seconds")
    email_verified: bool = Field(True, description="Whether user's email is verified")


class TokenRefreshRequest(BaseModel):
    """
    Deep Technical Context:
    - Used for the /refresh endpoint
    - Validates refresh token format before processing
    - Enables secure token rotation without re-login
    """
    refresh_token: str = Field(..., description="Valid refresh token", min_length=10)


class LoginRequest(BaseModel):
    """
    Deep Technical Context:
    - Alternative to Form(...) parameters for JSON-based login
    - Provides better validation and documentation
    - Can be used for both form and JSON login endpoints
    """
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password", min_length=6)


class AdminProfile(BaseModel):
    """
    Deep Technical Context:
    - Schema for admin profile information returned by /me endpoint
    - Excludes sensitive information (password, token_version)
    """
    user_id: str = Field(..., description="Unique admin identifier")
    name: str = Field(..., description="Admin's full name")
    email: str = Field(..., description="Admin's email address")
    org_name: str = Field(..., description="Organization name")
    org_id: Optional[str] = Field(None, description="Organization ID")
    role: str = Field("owner", description="User role")
    email_verified: bool = Field(True, description="Whether email is verified")
    is_active: bool = Field(..., description="Account active status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: datetime = Field(..., description="Last login timestamp")


class ErrorResponse(BaseModel):
    """
    Deep Technical Context:
    - Standardizes error responses across all endpoints
    - Provides consistent error handling for JWT-related errors
    - Helps with API documentation and client implementation
    """
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Specific error code for client handling")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class AdminUpdateResponse(BaseModel):
    """
    Deep Technical Context:
    - Returns updated admin information after profile update
    - Confirms which fields were actually updated
    - Maintains consistent response format
    """
    message: str = Field(..., description="Update status message")
    user: AdminProfile = Field(..., description="Updated admin profile")
    updated_fields: List[str] = Field(..., description="List of fields that were updated")


class OTPVerifyRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    code: str = Field(..., description="6-digit OTP code", min_length=6, max_length=6)


class OTPResendRequest(BaseModel):
    email: str = Field(..., description="User's email address")


class InviteRegisterRequest(BaseModel):
    invite_token: str = Field(..., description="Invite token from URL")
    name: str = Field(..., description="Full name", min_length=1)
    password: str = Field(..., description="Account password", min_length=6)


class InviteRequest(BaseModel):
    email: str = Field(..., description="Email to invite")
    role: str = Field("member", description="Role to assign (admin or member)")


class InviteInfoResponse(BaseModel):
    org_name: str = Field(..., description="Organization name")
    email: str = Field(..., description="Invited email")
    status: str = Field(..., description="Invite status")
