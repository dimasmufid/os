from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import Tenant, User, UserTenant, UserTenantRole
from src.auth.schemas import (
    OrganizationMembershipPublic,
    OrganizationPublic,
    UserPublic,
)
from src.auth.services.users import current_active_user
from src.database import get_async_session

logger = logging.getLogger(__name__)


@dataclass
class TenantContext:
    tenant: Tenant
    membership: UserTenant


ROLE_PRIORITY: dict[UserTenantRole, int] = {
    UserTenantRole.MEMBER: 1,
    UserTenantRole.ADMIN: 2,
    UserTenantRole.OWNER: 3,
}


async def get_current_user(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> UserPublic:
    statement = (
        select(UserTenant, Tenant)
        .join(Tenant, Tenant.id == UserTenant.tenant_id)
        .where(UserTenant.user_id == user.id)
        .order_by(UserTenant.created_at.asc())
    )
    result = await session.execute(statement)
    rows = result.all()

    memberships: list[OrganizationMembershipPublic] = []
    active_org_id: UUID | None = None

    for membership, tenant in rows:
        organization = OrganizationPublic(
            id=tenant.id,
            name=tenant.name,
            slug=tenant.slug,
            business_image=tenant.business_image,
            created_at=tenant.created_at,
            updated_at=tenant.created_at,
        )
        memberships.append(
            OrganizationMembershipPublic(
                organization=organization,
                role=membership.role,
                is_default=membership.is_default,
            )
        )
        if membership.is_default and active_org_id is None:
            active_org_id = tenant.id

    if active_org_id is None and memberships:
        active_org_id = memberships[0].organization.id

    user_public = UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        profile_picture=user.profile_picture,
        created_at=user.created_at,
        updated_at=user.updated_at,
        memberships=memberships,
        active_organization_id=active_org_id,
    )
    return user_public


async def resolve_tenant(
    *,
    tenant_id: UUID | None,
    user: User,
    session: AsyncSession,
) -> TenantContext:
    statement = (
        select(Tenant, UserTenant)
        .join(UserTenant, UserTenant.tenant_id == Tenant.id)
        .where(UserTenant.user_id == user.id)
    )
    if tenant_id:
        statement = statement.where(Tenant.id == tenant_id)

    result = await session.execute(statement)
    rows = result.all()
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access denied",
        )

    if tenant_id:
        tenant, membership = rows[0]
        return TenantContext(tenant=tenant, membership=membership)

    if len(rows) == 1:
        tenant, membership = rows[0]
        return TenantContext(tenant=tenant, membership=membership)

    default = next((row for row in rows if row[1].is_default), None)
    if default:
        tenant, membership = default
        return TenantContext(tenant=tenant, membership=membership)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Tenant context is ambiguous. Provide X-Tenant-Id header.",
    )


async def current_tenant(
    request: Request,
    tenant_header: str | None = Header(default=None, alias="X-Tenant-Id"),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> TenantContext:
    tenant_id: UUID | None = None
    if tenant_header:
        try:
            tenant_id = UUID(tenant_header)
        except ValueError as exc:  # pragma: no cover - defensive
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid tenant id",
            ) from exc

    return await resolve_tenant(tenant_id=tenant_id, user=user, session=session)


def require_role(min_role: UserTenantRole):
    async def dependency(
        context: TenantContext = Depends(current_tenant),
    ) -> TenantContext:
        current_priority = ROLE_PRIORITY[context.membership.role]
        required_priority = ROLE_PRIORITY[min_role]
        if current_priority < required_priority:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient tenant role",
            )
        return context

    return dependency


CurrentUser = Annotated[UserPublic, Depends(get_current_user)]


__all__ = [
    "TenantContext",
    "current_tenant",
    "resolve_tenant",
    "ROLE_PRIORITY",
    "require_role",
    "get_current_user",
    "CurrentUser",
]
