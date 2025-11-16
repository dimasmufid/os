from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_config
from src.auth.routers.frontend import router as frontend_router
from src.auth.schemas import RefreshResponse, UserCreate, UserRead, UserUpdate
from src.auth.security.jwt import get_jwt_strategy
from src.auth.security.refresh import (
    RefreshTokenNotFound,
    RefreshTokenService,
)
from src.auth.services.users import auth_backend, fastapi_users
from src.database import get_async_session

router = APIRouter()

router.include_router(
    fastapi_users.get_auth_router(auth_backend, requires_verification=False),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_reset_password_router(),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_verify_router(UserRead),
    tags=["auth"],
)
router.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["auth"],
)
router.include_router(frontend_router)


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    tags=["auth"],
    name="auth:refresh",
)
async def refresh_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_async_session),
) -> RefreshResponse:
    refresh_cookie = request.cookies.get(auth_config.refresh_cookie_name)
    if not refresh_cookie:
        authorization = request.headers.get("authorization")
        if authorization and authorization.lower().startswith("bearer "):
            refresh_cookie = authorization.split(" ", 1)[1].strip()

    if not refresh_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
        )

    refresh_service = RefreshTokenService(session)
    try:
        refresh_session = await refresh_service.get_active_session(refresh_cookie)
    except RefreshTokenNotFound as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        ) from exc

    new_session, new_refresh_token = await refresh_service.rotate_session(
        refresh_session
    )

    jwt_strategy = get_jwt_strategy()
    access_token = await jwt_strategy.write_token(refresh_session.user)
    await session.commit()

    response.set_cookie(
        key=auth_config.refresh_cookie_name,
        value=new_refresh_token,
        max_age=auth_config.refresh_cookie_max_age,
        httponly=True,
        secure=auth_config.cookie_secure,
        samesite=auth_config.cookie_samesite,
        domain=auth_config.cookie_domain,
        path="/",
    )
    response.set_cookie(
        key=auth_config.access_cookie_name,
        value=access_token,
        max_age=auth_config.access_cookie_max_age,
        httponly=True,
        secure=auth_config.cookie_secure,
        samesite=auth_config.cookie_samesite,
        domain=auth_config.cookie_domain,
        path="/",
    )

    refresh_ttl = int((new_session.expires_at - datetime.now(UTC)).total_seconds())
    if refresh_ttl <= 0:
        refresh_ttl = auth_config.refresh_cookie_max_age

    return RefreshResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=auth_config.access_cookie_max_age,
        refresh_expires_in=refresh_ttl,
        refresh_expires_at=new_session.expires_at,
    )
