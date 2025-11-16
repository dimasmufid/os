from __future__ import annotations

from datetime import UTC, datetime
from typing import Iterable
from uuid import UUID

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.config import auth_config
from src.auth.models import RefreshSession, User
from src.auth.security.hashing import generate_refresh_token, hash_token


class RefreshTokenError(Exception):
    """Base error for refresh token operations."""


class RefreshTokenNotFound(RefreshTokenError):
    """Raised when the refresh token cannot be located or is invalid."""


class RefreshTokenService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_session(
        self,
        *,
        user: User,
        default_tenant_id: UUID | None,
        user_agent: str | None,
        ip_address: str | None,
    ) -> tuple[RefreshSession, str]:
        raw_token = generate_refresh_token()
        expires_at = datetime.now(UTC) + auth_config.refresh_token_ttl

        refresh_session = RefreshSession(
            user=user,
            default_tenant_id=default_tenant_id,
            token_hash=hash_token(raw_token),
            user_agent=user_agent,
            ip=ip_address,
            expires_at=expires_at,
        )
        self.session.add(refresh_session)
        await self.session.flush()

        return refresh_session, raw_token

    async def get_active_session(self, raw_token: str) -> RefreshSession:
        hashed = hash_token(raw_token)
        statement = (
            select(RefreshSession)
            .options(selectinload(RefreshSession.user))
            .where(
                RefreshSession.token_hash == hashed,
                RefreshSession.revoked_at.is_(None),
                RefreshSession.expires_at > datetime.now(UTC),
            )
        )
        result = await self.session.execute(statement)
        refresh_session = result.scalars().first()
        if not refresh_session:
            raise RefreshTokenNotFound("Refresh session not found or expired.")
        return refresh_session

    async def rotate_session(
        self,
        refresh_session: RefreshSession,
    ) -> tuple[RefreshSession, str]:
        await self._revoke_session(refresh_session)
        # ensure changes visible before creating new session
        await self.session.flush()

        new_session, raw_token = await self.create_session(
            user=refresh_session.user,
            default_tenant_id=refresh_session.default_tenant_id,
            user_agent=refresh_session.user_agent,
            ip_address=refresh_session.ip,
        )
        new_session.rotated_from_id = refresh_session.id
        await self.session.flush()

        return new_session, raw_token

    async def _revoke_session(self, refresh_session: RefreshSession) -> None:
        refresh_session.revoked_at = datetime.now(UTC)
        self.session.add(refresh_session)

    async def revoke_session(self, refresh_session: RefreshSession) -> None:
        await self._revoke_session(refresh_session)
        await self.session.flush()

    async def revoke_all(
        self,
        user_id: UUID,
        *,
        exclude_session_ids: Iterable[UUID] | None = None,
    ) -> None:
        statement = (
            update(RefreshSession)
            .where(
                RefreshSession.user_id == user_id,
                RefreshSession.revoked_at.is_(None),
            )
            .values(revoked_at=datetime.now(UTC))
        )
        if exclude_session_ids:
            exclusions = tuple(exclude_session_ids)
            if exclusions:
                statement = statement.where(~RefreshSession.id.in_(exclusions))

        await self.session.execute(statement)

    async def delete_expired(self) -> None:
        statement = delete(RefreshSession).where(
            RefreshSession.expires_at <= datetime.now(UTC)
        )
        await self.session.execute(statement)
