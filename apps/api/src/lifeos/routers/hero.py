from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentUser
from src.database import get_async_session
from src.lifeos.schemas import ProfileResponse
from src.lifeos.services.profile import ensure_hero_profile, ensure_world_state

router = APIRouter(tags=["hero"])


@router.get("/profile", response_model=ProfileResponse, name="hero:get_profile")
async def get_profile(
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> ProfileResponse:
    hero = await ensure_hero_profile(session, user.id)
    world = await ensure_world_state(session, user.id)
    await session.commit()
    return ProfileResponse(hero=hero, world=world)
