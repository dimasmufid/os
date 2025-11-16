from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi_users import exceptions as fastapi_users_exceptions
from fastapi_users.authentication import Strategy
from fastapi_users.manager import BaseUserManager
from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_config
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.schemas import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordCheckRequest,
    ForgotPasswordCheckResponse,
    GoogleAuthRequest,
    MessageResponse,
    SigninRequest,
    SignupRequest,
    UpdateProfileRequest,
    UserCreate,
    UserPublic,
)
from src.auth.security.refresh import RefreshTokenService
from src.auth.services.users import (
    UserManager,
    auth_backend,
    current_active_user,
    get_user_manager,
)
from src.config import settings
from src.database import get_async_session

router = APIRouter(tags=["auth-app"])
logger = logging.getLogger(__name__)


def _serialize_user(user: User) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        profile_picture=user.profile_picture,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def _build_auth_response(
    *,
    user: User,
    request: Request,
    user_manager: BaseUserManager[User, UUID],
    strategy: Strategy[User, UUID],
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    issued_at = datetime.now(UTC)
    access_token = await strategy.write_token(user)
    user_public = _serialize_user(user)

    refresh_token = getattr(request.state, "refresh_token", None)
    refresh_expires_at = getattr(request.state, "refresh_expires_at", None)
    refresh_expires_in: int | None = None
    if isinstance(refresh_expires_at, datetime):
        delta_seconds = int((refresh_expires_at - issued_at).total_seconds())
        if delta_seconds > 0:
            refresh_expires_in = delta_seconds
    if refresh_expires_in is None:
        refresh_expires_in = auth_config.refresh_cookie_max_age
    response = JSONResponse(
        status_code=status_code,
        content=AuthResponse(
            user=user_public,
            token_type="bearer",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=auth_config.access_cookie_max_age,
            expires_at=issued_at + auth_config.access_token_ttl,
            refresh_expires_in=refresh_expires_in,
            refresh_expires_at=refresh_expires_at
            or issued_at + auth_config.refresh_token_ttl,
        ).model_dump(mode="json"),
    )

    auth_backend.transport._set_login_cookie(response, access_token)  # type: ignore[attr-defined] # noqa: SLF001
    await user_manager.on_after_login(user, request, response)
    return response


@router.get("/profile", response_model=UserPublic, name="auth:profile")
async def get_profile(user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return user


@router.patch("/profile", response_model=UserPublic, name="auth:update_profile")
async def update_profile(
    payload: UpdateProfileRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> UserPublic:
    if payload.full_name is not None:
        normalized = payload.full_name.strip()
        user.full_name = normalized or None

    if payload.profile_picture is not None:
        picture = payload.profile_picture.strip()
        user.profile_picture = picture or None

    session.add(user)
    await session.commit()
    await session.refresh(user)
    return _serialize_user(user)


@router.post(
    "/password/forgot/check",
    response_model=ForgotPasswordCheckResponse,
    name="auth:forgot_password_check",
)
async def check_forgot_password_email(
    payload: ForgotPasswordCheckRequest,
    session: AsyncSession = Depends(get_async_session),
) -> ForgotPasswordCheckResponse:
    normalized_email = payload.email.strip().lower()
    result = await session.execute(
        select(User.id).where(func.lower(User.email) == normalized_email)
    )
    exists = result.scalar_one_or_none() is not None
    message = (
        "Silahkan periksa email Anda untuk instruksi reset password."
        if exists
        else "Email tidak terdaftar."
    )
    return ForgotPasswordCheckResponse(exists=exists, message=message)


@router.post(
    "/password/change",
    response_model=MessageResponse,
    name="auth:change_password",
)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
) -> JSONResponse:
    valid, new_hash = user_manager.password_helper.verify_and_update(
        payload.current_password,
        user.hashed_password,
    )
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password.",
        )
    if new_hash:
        user.hashed_password = new_hash

    await user_manager.validate_password(payload.new_password, user)
    user.hashed_password = user_manager.password_helper.hash(payload.new_password)

    session.add(user)

    refresh_service = RefreshTokenService(session)
    await refresh_service.revoke_all(user.id)
    await session.commit()

    response_body = MessageResponse(message="Password updated successfully.")
    response = JSONResponse(content=response_body.model_dump())
    auth_backend.transport._set_logout_cookie(response)  # type: ignore[attr-defined] # noqa: SLF001
    response.delete_cookie(
        key=auth_config.refresh_cookie_name,
        domain=auth_config.cookie_domain,
        path="/",
    )
    return response


@router.post(
    "/google",
    response_model=AuthResponse,
    name="auth:signin_google",
)
async def signin_with_google(
    payload: GoogleAuthRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    logger.info(
        "Google sign-in attempt from origin=%s",
        request.headers.get("origin"),
    )
    if not settings.OAUTH_GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured.",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.OAUTH_GOOGLE_CLIENT_ID,
        )
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        logger.exception("Failed to verify Google credential")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google credential.",
        ) from exc

    email: str | None = id_info.get("email")
    if not email:
        logger.warning("Google credential missing email address")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account does not provide an email address.",
        )

    account_id: str | None = id_info.get("sub")
    if not account_id:
        logger.warning("Google credential missing subject identifier")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google credential is missing a subject identifier.",
        )

    raw_email_verified = id_info.get("email_verified", False)
    email_verified = (
        raw_email_verified
        if isinstance(raw_email_verified, bool)
        else str(raw_email_verified).lower() == "true"
    )
    display_name = (
        id_info.get("name")
        or id_info.get("given_name")
        or id_info.get("family_name")
        or None
    )
    picture = id_info.get("picture")

    logger.info(
        "Google credential verified email=%s sub=%s verified=%s",
        email,
        account_id,
        email_verified,
    )

    user_pre_exists = True
    user: User
    try:
        user = await user_manager.get_by_email(email)
    except fastapi_users_exceptions.UserNotExists:
        user_pre_exists = False
        password = user_manager.password_helper.generate()
        user_create = UserCreate(
            email=email,
            password=password,
            full_name=display_name,
            profile_picture=picture,
        )
        user = await user_manager.create(
            user_create,
            safe=True,
            request=request,
        )
        logger.info(
            "Created new user %s from Google credential",
            user.id,
        )

    should_commit = False
    if email_verified and not user.is_verified:
        user.is_verified = True
        should_commit = True
    if display_name and user.full_name != display_name:
        user.full_name = display_name
        should_commit = True
    if picture and user.profile_picture != picture:
        user.profile_picture = picture
        should_commit = True

    if should_commit:
        session.add(user)
        await session.commit()
        await session.refresh(user)
        logger.debug("Updated profile details from Google for user=%s", user.id)

    if not user_pre_exists:
        logger.info("Google sign-in created user=%s", user.id)

    await session.refresh(user)
    logger.info("Google sign-in succeeded for user=%s", user.id)

    return await _build_auth_response(
        user=user,
        request=request,
        user_manager=user_manager,
        strategy=strategy,
    )


@router.post(
    "/signin",
    response_model=AuthResponse,
    name="auth:signin",
)
async def signin(
    payload: SigninRequest,
    request: Request,
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    credentials = OAuth2PasswordRequestForm(
        username=payload.email,
        password=payload.password,
        scope="",
    )
    user = await user_manager.authenticate(credentials)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or password.",
        )

    return await _build_auth_response(
        user=user,
        request=request,
        user_manager=user_manager,
        strategy=strategy,
    )


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    name="auth:signup",
)
async def signup(
    payload: SignupRequest,
    request: Request,
    session: AsyncSession = Depends(get_async_session),
    user_manager: UserManager = Depends(get_user_manager),
    strategy: Strategy[User, UUID] = Depends(auth_backend.get_strategy),
) -> JSONResponse:
    profile_picture = (
        payload.profile_picture.strip() if payload.profile_picture else None
    )
    user_create = UserCreate(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        profile_picture=profile_picture,
    )

    try:
        user = await user_manager.create(user_create, safe=True, request=request)
    except fastapi_users_exceptions.UserAlreadyExists as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        ) from exc
    except fastapi_users_exceptions.InvalidPasswordException as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.reason,
        ) from exc

    if payload.is_verified is not None:
        user.is_verified = payload.is_verified
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return await _build_auth_response(
        user=user,
        request=request,
        user_manager=user_manager,
        strategy=strategy,
        status_code=status.HTTP_201_CREATED,
    )
