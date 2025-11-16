from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi_users import FastAPIUsers
from fastapi_users.authentication import AuthenticationBackend, BearerTransport
from fastapi_users.manager import BaseUserManager, UUIDIDMixin
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_config
from src.auth.models import User
from src.auth.schemas import UserCreate, UserRead, UserUpdate
from src.auth.security.jwt import get_jwt_strategy
from src.auth.security.refresh import (
    RefreshTokenNotFound,
    RefreshTokenService,
)
from src.auth.security.transports import get_cookie_transport
from src.database import get_async_session
from src.mailer import send_password_reset_email, send_verification_email
from src.utils import build_app_url, build_frontend_url

logger = logging.getLogger(__name__)


class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    reset_password_token_secret = auth_config.jwt_secret
    verification_token_secret = auth_config.jwt_secret

    def __init__(
        self,
        user_db: SQLAlchemyUserDatabase[User, UUID],
        session: AsyncSession,
    ):
        super().__init__(user_db)
        self.session = session

    async def on_after_register(
        self, user: User, request: Optional[Request] = None
    ) -> None:
        logger.info("User %s has registered", user.id)

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ) -> None:
        logger.info("Password reset requested for %s", user.id)
        try:
            reset_url = build_frontend_url("reset-password", {"token": token})
        except ValueError as exc:  # pragma: no cover - configuration issue
            logger.error("Skipping password reset email for %s: %s", user.id, exc)
            return

        await send_password_reset_email(
            to_email=user.email,
            reset_url=reset_url,
            full_name=user.full_name,
        )
        logger.info("Password reset email dispatched for %s", user.id)

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ) -> None:
        logger.info("Verification requested for %s", user.id)
        try:
            verify_url = build_app_url("api/v1/auth/verify", {"token": token})
        except ValueError:
            try:
                verify_url = build_frontend_url("api/v1/auth/verify", {"token": token})
            except ValueError as exc:  # pragma: no cover - configuration issue
                logger.error("Skipping verification email for %s: %s", user.id, exc)
                return

        await send_verification_email(
            to_email=user.email,
            verify_url=verify_url,
            full_name=user.full_name,
        )
        logger.info("Verification email dispatched for %s", user.id)

    async def on_after_login(
        self,
        user: User,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
    ) -> None:
        if not request or not response:
            return

        await self.session.refresh(user, attribute_names=["tenants"])
        refresh_service = RefreshTokenService(self.session)
        default_membership = next(
            (membership for membership in user.tenants if membership.is_default),
            user.tenants[0] if user.tenants else None,
        )
        refresh_session, refresh_token = await refresh_service.create_session(
            user=user,
            default_tenant_id=(
                default_membership.tenant_id if default_membership else None
            ),
            user_agent=request.headers.get("user-agent"),
            ip_address=request.client.host if request.client else None,
        )
        await self.session.commit()

        response.set_cookie(
            key=auth_config.refresh_cookie_name,
            value=refresh_token,
            max_age=auth_config.refresh_cookie_max_age,
            httponly=True,
            secure=auth_config.cookie_secure,
            samesite=auth_config.cookie_samesite,
            domain=auth_config.cookie_domain,
            path="/",
        )

        request.state.refresh_token = refresh_token  # type: ignore[attr-defined]
        request.state.refresh_expires_at = refresh_session.expires_at  # type: ignore[attr-defined]
        logger.info(
            "Refresh session %s issued for user %s",
            refresh_session.id,
            user.id,
        )

    async def on_after_logout(
        self,
        user: User,
        request: Optional[Request] = None,
        response: Optional[Response] = None,
    ) -> None:
        if not request or not response:
            return

        refresh_token = request.cookies.get(auth_config.refresh_cookie_name)
        if refresh_token:
            refresh_service = RefreshTokenService(self.session)
            try:
                session_obj = await refresh_service.get_active_session(refresh_token)
            except RefreshTokenNotFound:
                session_obj = None
            if session_obj:
                await refresh_service.revoke_session(session_obj)
                await self.session.commit()

        response.delete_cookie(
            key=auth_config.refresh_cookie_name,
            domain=auth_config.cookie_domain,
            path="/",
        )
        response.delete_cookie(
            key=auth_config.access_cookie_name,
            domain=auth_config.cookie_domain,
            path="/",
        )


async def get_user_manager(
    session: AsyncSession = Depends(get_async_session),
) -> AsyncGenerator[UserManager, None]:
    user_db = SQLAlchemyUserDatabase(session, User)
    yield UserManager(user_db, session)


jwt_strategy = get_jwt_strategy()
cookie_transport = get_cookie_transport()
bearer_transport = BearerTransport(tokenUrl="api/v1/auth/signin")
auth_backend = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=lambda: jwt_strategy,
)
bearer_backend = AuthenticationBackend(
    name="bearer",
    transport=bearer_transport,
    get_strategy=lambda: jwt_strategy,
)

fastapi_users = FastAPIUsers[User, UUID](
    get_user_manager,
    [auth_backend, bearer_backend],
)

_current_user_dependency = fastapi_users.current_user(
    optional=True,
    active=False,
    verified=False,
)


async def current_active_user(
    user: User | None = Depends(_current_user_dependency),
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )
    return user


__all__ = [
    "UserCreate",
    "UserManager",
    "UserRead",
    "UserUpdate",
    "auth_backend",
    "bearer_backend",
    "bearer_transport",
    "cookie_transport",
    "current_active_user",
    "fastapi_users",
    "get_user_manager",
]
