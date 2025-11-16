from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi_users import schemas as fastapi_users_schemas
from pydantic import BaseModel, EmailStr, Field


class UserRead(fastapi_users_schemas.BaseUser[UUID]):
    full_name: str | None = None
    profile_picture: str | None = None


class UserCreate(fastapi_users_schemas.BaseUserCreate):
    full_name: str | None = None
    profile_picture: str | None = None


class UserUpdate(fastapi_users_schemas.BaseUserUpdate):
    full_name: str | None = None
    profile_picture: str | None = None


class UserPublic(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str | None = None
    profile_picture: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


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
    profile_picture: str | None = None
    is_verified: bool | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    profile_picture: str | None = None


class AuthResponse(BaseModel):
    user: UserPublic
    token_type: str = "bearer"
    access_token: str | None = None
    refresh_token: str | None = None
    expires_in: int | None = None
    expires_at: datetime | None = None
    refresh_expires_in: int | None = None
    refresh_expires_at: datetime | None = None
