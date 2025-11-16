from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.dependencies import CurrentUser
from src.database import get_async_session
from src.lifeos.models import CosmeticSlot, InventoryItem
from src.lifeos.schemas import (
    HeroProfileSchema,
    InventoryEquipRequest,
    InventoryItemSchema,
    InventoryResponse,
)
from src.lifeos.services.profile import ensure_hero_profile

router = APIRouter(prefix="/inventory", tags=["inventory"])

EQUIP_FIELDS = {
    CosmeticSlot.HAT: "equipped_hat_id",
    CosmeticSlot.OUTFIT: "equipped_outfit_id",
    CosmeticSlot.ACCESSORY: "equipped_accessory_id",
}


@router.get("", response_model=InventoryResponse)
async def list_inventory(
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> InventoryResponse:
    stmt = (
        select(InventoryItem)
        .options(selectinload(InventoryItem.item))
        .where(InventoryItem.user_id == user.id)
        .order_by(InventoryItem.created_at.asc())
    )
    result = await session.scalars(stmt)
    records = list(result)

    hero = await ensure_hero_profile(session, user.id)
    equipped_ids = {
        hero.equipped_hat_id,
        hero.equipped_outfit_id,
        hero.equipped_accessory_id,
    }
    items = [
        InventoryItemSchema(
            id=record.id,
            item=record.item,
            equipped=record.item_id in equipped_ids,
            created_at=record.created_at,
        )
        for record in records
        if record.item is not None
    ]
    await session.commit()
    return InventoryResponse(items=items)


@router.post("/equip", response_model=HeroProfileSchema)
async def equip_item(
    payload: InventoryEquipRequest,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> HeroProfileSchema:
    hero = await ensure_hero_profile(session, user.id)
    stmt = (
        select(InventoryItem)
        .options(selectinload(InventoryItem.item))
        .where(
            InventoryItem.id == payload.item_id,
            InventoryItem.user_id == user.id,
        )
    )
    record = await session.scalar(stmt)
    if not record or record.item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found in inventory.",
        )

    target_slot = EQUIP_FIELDS.get(record.item.slot)
    if not target_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported cosmetic slot.",
        )

    currently_equipped = getattr(hero, target_slot)
    if currently_equipped == record.item_id:
        setattr(hero, target_slot, None)
    else:
        setattr(hero, target_slot, record.item_id)

    session.add(hero)
    await session.commit()
    hero = await ensure_hero_profile(session, user.id)
    return hero
