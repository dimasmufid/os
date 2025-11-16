from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import ROLE_PRIORITY, resolve_tenant
from src.auth.models import Invitation, UserTenantRole
from src.auth.schemas import (
    InvitationCreate,
    InvitationRead,
)
from src.auth.services.invitations import InvitationService
from src.auth.services.users import current_active_user
from src.database import get_async_session

router = APIRouter(tags=["invitations"])


def _serialize_invitation(invitation: Invitation) -> InvitationRead:
    return InvitationRead(
        id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        tenant_id=invitation.tenant_id,
        token=invitation.token,
        status=invitation.status,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


@router.post("/", response_model=InvitationRead, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    payload: InvitationCreate,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> InvitationRead:
    context = await resolve_tenant(
        tenant_id=payload.tenant_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient tenant role.",
        )

    service = InvitationService(session)
    invitation = await service.create_invitation(inviter=user, payload=payload)
    return _serialize_invitation(invitation)


@router.get("/", response_model=list[InvitationRead])
async def list_invitations(
    tenant_id: UUID = Query(...),
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[InvitationRead]:
    await resolve_tenant(tenant_id=tenant_id, user=user, session=session)
    service = InvitationService(session)
    invitations = await service.list_invitations_for_tenant(tenant_id)
    return [_serialize_invitation(invitation) for invitation in invitations]


@router.post("/{token}/accept", response_model=InvitationRead)
async def accept_invitation(
    token: str,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> InvitationRead:
    service = InvitationService(session)
    invitation = await service.accept_invitation(token=token, user=user)
    return _serialize_invitation(invitation)


@router.post("/{token}/revoke", response_model=InvitationRead)
async def revoke_invitation(
    token: str,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> InvitationRead:
    service = InvitationService(session)
    invitation = await service.get_invitation_from_token(token)
    context = await resolve_tenant(
        tenant_id=invitation.tenant_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient tenant role.",
        )

    invitation = await service.revoke_invitation(invitation)
    return _serialize_invitation(invitation)
