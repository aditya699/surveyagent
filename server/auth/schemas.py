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
    - No file upload fields or IP tracking (simplified from reference)
    """
    name: str = Field(..., description="Admin's full name")
    email: str = Field(..., description="Admin's email address (unique login identifier)")
    password: str = Field(..., description="Hashed password (bcrypt)")
    org_name: str = Field(..., description="Organization name")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    is_active: bool = Field(True, description="Account active status")
    # This will be used to invalidate old tokens
    token_version: int = Field(
        default=1,
        description="Current token version - incremented on each refresh to invalidate old tokens",
        ge=1  # Must be at least 1
    )
    last_login: datetime = Field(..., description="Last login timestamp")


class TokenResponse(BaseModel):
    """
    Deep Technical Context:
    - Schema for JWT token response from login/register/refresh endpoints
    - Follows OAuth2 standard token response format
    - access_token: Short-lived JWT for API authentication (1 day)
    - refresh_token: Long-lived JWT for obtaining new access tokens (14 days)
    - token_type: Always "bearer" for JWT tokens
    - expires_in: Access token expiration in seconds
    """
    message: str = Field(..., description="Response message")
    access_token: str = Field(..., description="JWT access token for API authentication")
    refresh_token: str = Field(..., description="JWT refresh token for obtaining new access tokens")
    token_type: str = Field("bearer", description="Token type (always bearer for JWT)")
    user_id: str = Field(..., description="Unique admin identifier")
    expires_in: int = Field(..., description="Access token expiration time in seconds")


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
    - Shows what information is available from the authenticated user
    """
    user_id: str = Field(..., description="Unique admin identifier")
    name: str = Field(..., description="Admin's full name")
    email: str = Field(..., description="Admin's email address")
    org_name: str = Field(..., description="Organization name")
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
