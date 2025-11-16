from __future__ import annotations

from uuid import UUID

from sqlalchemy import insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.auth.models import Tenant, User, UserTenant, UserTenantRole
from src.auth.schemas import TenantCreate, TenantRead, TenantUpdate
from src.expenses.constants import DEFAULT_EXPENSE_TYPE_NAMES
from src.expenses.models import expense_types


class TenantService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_tenant(self, user: User, payload: TenantCreate) -> Tenant:
        normalized_image = None
        if payload.business_image:
            normalized_image = payload.business_image.strip() or None

        tenant = Tenant(
            name=payload.name,
            slug=payload.slug,
            business_image=normalized_image,
        )
        self.session.add(tenant)
        await self.session.flush()

        await self._seed_default_expense_types(tenant.id)

        should_set_default = await self._has_default_membership(user.id) is False

        membership = UserTenant(
            user_id=user.id,
            tenant_id=tenant.id,
            role=UserTenantRole.OWNER,
            is_default=should_set_default,
        )
        self.session.add(membership)
        await self.session.commit()
        await self.session.refresh(tenant)
        return tenant

    async def list_for_user(self, user: User) -> list[TenantRead]:
        statement = (
            select(Tenant, UserTenant)
            .join(UserTenant, UserTenant.tenant_id == Tenant.id)
            .where(UserTenant.user_id == user.id)
            .options(joinedload(Tenant.members))
        )
        result = await self.session.execute(statement)
        tenants: list[TenantRead] = []
        for tenant, membership in result.all():
            tenants.append(
                TenantRead(
                    id=tenant.id,
                    name=tenant.name,
                    slug=tenant.slug,
                    business_image=tenant.business_image,
                    created_at=tenant.created_at,
                    is_default=membership.is_default,
                    role=membership.role,
                )
            )
        return tenants

    async def update_tenant(
        self,
        tenant: Tenant,
        payload: TenantUpdate,
    ) -> Tenant:
        if payload.name is not None:
            tenant.name = payload.name
        if payload.slug is not None:
            tenant.slug = payload.slug
        if payload.business_image is not None:
            normalized_image = payload.business_image.strip()
            tenant.business_image = normalized_image or None
        self.session.add(tenant)
        await self.session.commit()
        await self.session.refresh(tenant)
        return tenant

    async def make_default(self, user_id: UUID, tenant_id: UUID) -> None:
        await self.session.execute(
            update(UserTenant)
            .where(UserTenant.user_id == user_id)
            .values(is_default=False)
        )
        await self.session.execute(
            update(UserTenant)
            .where(
                UserTenant.user_id == user_id,
                UserTenant.tenant_id == tenant_id,
            )
            .values(is_default=True)
        )
        await self.session.commit()

    async def _has_default_membership(self, user_id: UUID) -> bool:
        statement = select(UserTenant).where(
            UserTenant.user_id == user_id, UserTenant.is_default.is_(True)
        )
        result = await self.session.execute(statement)
        return result.scalars().first() is not None

    async def _seed_default_expense_types(self, tenant_id: UUID) -> None:
        if not DEFAULT_EXPENSE_TYPE_NAMES:
            return
        payloads = [
            {"tenant_id": tenant_id, "name": name}
            for name in DEFAULT_EXPENSE_TYPE_NAMES
        ]
        await self.session.execute(insert(expense_types), payloads)
