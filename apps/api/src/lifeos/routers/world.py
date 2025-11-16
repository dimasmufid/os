from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentUser
from src.database import get_async_session
from src.lifeos.schemas import WorldStateResponse, WorldUpgradeRequest
from src.lifeos.services.profile import ensure_world_state

router = APIRouter(prefix="/world", tags=["world"])

WORLD_ATTR_MAP = {
    "study": "study_room_level",
    "build": "build_room_level",
    "training": "training_room_level",
    "plaza": "plaza_level",
}


@router.get("", response_model=WorldStateResponse)
async def read_world_state(
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> WorldStateResponse:
    world = await ensure_world_state(session, user.id)
    await session.commit()
    return WorldStateResponse(world=world)


@router.post("/upgrade", response_model=WorldStateResponse)
async def upgrade_world(
    payload: WorldUpgradeRequest,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> WorldStateResponse:
    world = await ensure_world_state(session, user.id)
    attribute = WORLD_ATTR_MAP.get(payload.target)
    if not attribute:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid world target.",
        )

    current_level = getattr(world, attribute)
    if payload.level < current_level:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot downgrade world level.",
        )

    setattr(world, attribute, payload.level)
    session.add(world)
    await session.commit()
    await session.refresh(world)
    return WorldStateResponse(world=world)
