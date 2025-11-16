from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.lifeos.models import HeroProfile, WorldState


async def ensure_hero_profile(
    session: AsyncSession,
    user_id: UUID,
) -> HeroProfile:
    stmt = (
        select(HeroProfile)
        .options(
            selectinload(HeroProfile.equipped_hat),
            selectinload(HeroProfile.equipped_outfit),
            selectinload(HeroProfile.equipped_accessory),
        )
        .where(HeroProfile.user_id == user_id)
    )
    hero = await session.scalar(stmt)
    if hero:
        return hero

    hero = HeroProfile(user_id=user_id)
    session.add(hero)
    await session.flush()
    await session.refresh(hero)
    return hero


async def ensure_world_state(
    session: AsyncSession,
    user_id: UUID,
) -> WorldState:
    stmt = select(WorldState).where(WorldState.user_id == user_id)
    world_state = await session.scalar(stmt)
    if world_state:
        return world_state

    world_state = WorldState(user_id=user_id)
    session.add(world_state)
    await session.flush()
    await session.refresh(world_state)
    return world_state
