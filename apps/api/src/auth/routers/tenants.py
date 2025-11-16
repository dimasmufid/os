from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import ROLE_PRIORITY, resolve_tenant
from src.auth.models import UserTenantRole
from src.auth.schemas import TenantCreate, TenantRead, TenantUpdate
from src.auth.services.tenants import TenantService
from src.auth.services.users import current_active_user
from src.database import get_async_session

router = APIRouter(tags=["tenants"])


@router.post("/", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    payload: TenantCreate,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> TenantRead:
    service = TenantService(session)
    tenant = await service.create_tenant(user, payload)
    membership = await resolve_tenant(
        tenant_id=tenant.id,
        user=user,
        session=session,
    )
    return TenantRead(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        business_image=tenant.business_image,
        created_at=tenant.created_at,
        is_default=membership.membership.is_default,
        role=membership.membership.role,
    )


@router.get("/", response_model=list[TenantRead])
async def list_tenants(
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[TenantRead]:
    service = TenantService(session)
    return await service.list_for_user(user)


@router.patch("/{tenant_id}", response_model=TenantRead)
async def update_tenant(
    tenant_id: UUID,
    payload: TenantUpdate,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> TenantRead:
    context = await resolve_tenant(
        tenant_id=tenant_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient tenant role.",
        )

    service = TenantService(session)
    updated = await service.update_tenant(context.tenant, payload)
    return TenantRead(
        id=updated.id,
        name=updated.name,
        slug=updated.slug,
        business_image=updated.business_image,
        created_at=updated.created_at,
        is_default=context.membership.is_default,
        role=context.membership.role,
    )


@router.get("/{tenant_id}", response_model=TenantRead)
async def get_tenant(
    tenant_id: UUID,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> TenantRead:
    context = await resolve_tenant(
        tenant_id=tenant_id,
        user=user,
        session=session,
    )
    return TenantRead(
        id=context.tenant.id,
        name=context.tenant.name,
        slug=context.tenant.slug,
        business_image=context.tenant.business_image,
        created_at=context.tenant.created_at,
        is_default=context.membership.is_default,
        role=context.membership.role,
    )


@router.post(
    "/{tenant_id}/make-default",
    status_code=status.HTTP_200_OK,
)
async def make_default(
    tenant_id: UUID,
    user=Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> dict[str, str]:
    context = await resolve_tenant(
        tenant_id=tenant_id,
        user=user,
        session=session,
    )
    if ROLE_PRIORITY[context.membership.role] < ROLE_PRIORITY[UserTenantRole.MEMBER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient tenant role.",
        )

    service = TenantService(session)
    await service.make_default(user.id, tenant_id)
    return {"status": "default_updated"}
