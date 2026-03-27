# teams/schemas.py
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class TeamMemberSummary(BaseModel):
    user_id: str = Field(..., description="Member user ID")
    name: str = Field(..., description="Member name")
    email: str = Field(..., description="Member email")


class TeamCreate(BaseModel):
    name: str = Field(..., description="Team name", min_length=1, max_length=200)
    parent_team_id: Optional[str] = Field(None, description="Parent team ID for sub-teams")


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, description="New team name", min_length=1, max_length=200)


class TeamResponse(BaseModel):
    id: str = Field(..., description="Team ID")
    org_id: str = Field(..., description="Organization ID")
    name: str = Field(..., description="Team name")
    parent_team_id: Optional[str] = Field(None, description="Parent team ID")
    members: List[TeamMemberSummary] = Field(default_factory=list, description="Team members")
    sub_teams: List["TeamResponse"] = Field(default_factory=list, description="Sub-teams")
    created_at: datetime = Field(..., description="Creation timestamp")


class TeamListResponse(BaseModel):
    message: str = Field(..., description="Response message")
    teams: List[TeamResponse] = Field(..., description="List of teams")
    count: int = Field(..., description="Total team count")


class AddMemberRequest(BaseModel):
    user_id: str = Field(..., description="User ID to add")
