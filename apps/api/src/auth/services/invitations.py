from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from itsdangerous import BadSignature, BadTimeSignature, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_config
from src.auth.models import Invitation, InvitationStatus, Tenant, User, UserTenant
from src.auth.schemas import InvitationCreate
from src.mailer import send_invitation_email
from src.utils import build_frontend_url

logger = logging.getLogger(__name__)

INVITATION_TTL_DAYS = 7


class InvitationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.serializer = URLSafeTimedSerializer(
            auth_config.jwt_secret,
            salt="tenant-invitation",
        )

    async def create_invitation(
        self,
        *,
        inviter: User,
        payload: InvitationCreate,
    ) -> Invitation:
        invitation_id = uuid4()
        token = self.serializer.dumps({"invitation_id": str(invitation_id)})
        invitation = Invitation(
            id=invitation_id,
            email=payload.email,
            tenant_id=payload.tenant_id,
            role=payload.role,
            token=token,
            invited_by_user_id=inviter.id,
            expires_at=datetime.now(UTC) + timedelta(days=INVITATION_TTL_DAYS),
        )
        self.session.add(invitation)
        await self.session.commit()
        await self.session.refresh(invitation)

        tenant = await self.session.get(Tenant, invitation.tenant_id)
        organization_name = (
            tenant.name if tenant else "your Entrefine Omnichannel workspace"
        )
        inviter_name = inviter.full_name or inviter.email
        try:
            invite_url = build_frontend_url(f"invite/{invitation.token}")
        except ValueError as exc:  # pragma: no cover - configuration issue
            logger.error("Failed to build invitation URL: %s", exc)
        else:
            await send_invitation_email(
                invitee_email=invitation.email,
                inviter_name=inviter_name,
                organization_name=organization_name,
                invite_url=invite_url,
            )
        return invitation

    async def list_invitations_for_tenant(self, tenant_id: UUID) -> list[Invitation]:
        statement = (
            select(Invitation)
            .where(Invitation.tenant_id == tenant_id)
            .order_by(Invitation.created_at.desc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def get_invitation_by_id(self, invitation_id: UUID) -> Invitation:
        statement = select(Invitation).where(Invitation.id == invitation_id)
        result = await self.session.execute(statement)
        invitation = result.scalars().first()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found.",
            )
        return invitation

    async def accept_invitation(self, *, token: str, user: User) -> Invitation:
        invitation = await self.get_invitation_from_token(token)
        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation is no longer active.",
            )
        if invitation.expires_at <= datetime.now(UTC):
            invitation.status = InvitationStatus.EXPIRED
            await self.session.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation has expired.",
            )

        membership_exists = await self.session.execute(
            select(UserTenant).where(
                UserTenant.user_id == user.id,
                UserTenant.tenant_id == invitation.tenant_id,
            )
        )
        if membership_exists.scalars().first() is None:
            membership = UserTenant(
                user_id=user.id,
                tenant_id=invitation.tenant_id,
                role=invitation.role,
                is_default=False,
            )
            self.session.add(membership)

        invitation.status = InvitationStatus.ACCEPTED
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation

    async def revoke_invitation(self, invitation: Invitation) -> Invitation:
        invitation.status = InvitationStatus.REVOKED
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation

    async def get_invitation_from_token(self, token: str) -> Invitation:
        try:
            data = self.serializer.loads(
                token,
                max_age=INVITATION_TTL_DAYS * 24 * 60 * 60,
            )
        except (BadSignature, BadTimeSignature) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid invitation token.",
            ) from exc

        invitation_id = UUID(data["invitation_id"])
        statement = select(Invitation).where(Invitation.id == invitation_id)
        result = await self.session.execute(statement)
        invitation = result.scalars().first()
        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found.",
            )
        return invitation
