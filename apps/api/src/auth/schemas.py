from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi_users import schemas as fastapi_users_schemas
from pydantic import BaseModel, EmailStr, Field

from src.auth.models import InvitationStatus, UserTenantRole


class UserRead(fastapi_users_schemas.BaseUser[UUID]):
    full_name: str | None = None
    profile_picture: str | None = None


class UserCreate(fastapi_users_schemas.BaseUserCreate):
    full_name: str | None = None
    profile_picture: str | None = None


class UserUpdate(fastapi_users_schemas.BaseUserUpdate):
    full_name: str | None = None
    profile_picture: str | None = None


class TenantBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    business_image: str | None = None


class TenantCreate(TenantBase):
    pass


class TenantRead(TenantBase):
    id: UUID
    created_at: datetime
    is_default: bool | None = None
    role: UserTenantRole | None = None

    class Config:
        from_attributes = True


class OrganizationPublic(BaseModel):
    id: UUID
    name: str
    slug: str
    business_image: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class OrganizationMembershipPublic(BaseModel):
    organization: OrganizationPublic
    role: UserTenantRole
    is_default: bool


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    profile_picture: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    memberships: list[OrganizationMembershipPublic] = Field(default_factory=list)
    active_organization_id: UUID | None = None


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    business_image: str | None = Field(default=None)


class InvitationCreate(BaseModel):
    email: EmailStr
    tenant_id: UUID
    role: UserTenantRole = UserTenantRole.MEMBER


class InvitationRead(BaseModel):
    id: UUID
    email: EmailStr
    role: UserTenantRole
    tenant_id: UUID
    token: str
    status: InvitationStatus
    expires_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class InvitationAccept(BaseModel):
    token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int
    refresh_expires_at: datetime | None = None


class MessageResponse(BaseModel):
    message: str


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str
    invite_token: str | None = None
    organization_name: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ForgotPasswordCheckRequest(BaseModel):
    email: EmailStr


class ForgotPasswordCheckResponse(BaseModel):
    exists: bool
    message: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    organization_name: str | None = None
    invite_token: str | None = None
    profile_picture: str | None = None
    is_verified: bool | None = None


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class SwitchOrganizationRequest(BaseModel):
    organization_id: UUID


class OrganizationMemberUser(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    profile_picture: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class OrganizationMemberPublic(BaseModel):
    id: UUID
    role: UserTenantRole
    is_default: bool
    joined_at: datetime
    user: OrganizationMemberUser


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: UserTenantRole = UserTenantRole.MEMBER


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    profile_picture: str | None = None


class OrganizationInvitationPublic(BaseModel):
    id: UUID
    organization_id: UUID
    email: EmailStr
    role: UserTenantRole
    status: InvitationStatus
    token: str
    invited_at: datetime
    expires_at: datetime
    invited_by: UUID | None = None
    accepted_at: datetime | None = None


class InvitationLookup(OrganizationInvitationPublic):
    organization_name: str
    user_exists: bool


class AuthResponse(BaseModel):
    user: UserPublic
    token_type: str = "bearer"
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    expires_at: datetime | None = None
    refresh_expires_in: int | None = None
    refresh_expires_at: datetime | None = None


class SessionRead(BaseModel):
    id: UUID
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None
    user_agent: str | None
    ip: str | None

    class Config:
        from_attributes = True
