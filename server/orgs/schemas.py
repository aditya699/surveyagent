# orgs/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class OrgResponse(BaseModel):
    id: str = Field(..., description="Organization ID")
    name: str = Field(..., description="Organization name")
    slug: str = Field(..., description="URL-safe slug")
    owner_id: str = Field(..., description="Owner user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class OrgUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, description="New organization name", min_length=1, max_length=200)


class OrgMemberResponse(BaseModel):
    user_id: str = Field(..., description="Member user ID")
    name: str = Field(..., description="Member name")
    email: str = Field(..., description="Member email")
    role: str = Field(..., description="Member role (owner/admin/member)")
    created_at: datetime = Field(..., description="Join date")


class OrgMemberListResponse(BaseModel):
    message: str = Field(..., description="Response message")
    members: List[OrgMemberResponse] = Field(..., description="List of org members")
    count: int = Field(..., description="Total member count")


class OrgSingleResponse(BaseModel):
    message: str = Field(..., description="Response message")
    org: OrgResponse = Field(..., description="Organization data")


class TransferOwnershipRequest(BaseModel):
    new_owner_id: str = Field(..., description="User ID of the new owner")


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., description="New role (admin or member)")
