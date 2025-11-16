from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.lifeos.models import (
    CosmeticItem,
    HeroProfile,
    InventoryItem,
    WorldState,
)

XP_PER_MINUTE = 2
GOLD_PER_MINUTE = 1
COSMETIC_DROP_CHANCE = 0.10
WORLD_UPGRADE_THRESHOLDS: dict[str, int] = {
    "study_room_level": 5,
    "build_room_level": 15,
    "plaza_level": 30,
}


@dataclass(slots=True)
class RewardComputation:
    exp_reward: int
    gold_reward: int
    level_ups: int
    dropped_item: CosmeticItem | None
    unlocked_layers: Sequence[str]


class RewardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def apply_success(
        self,
        *,
        hero: HeroProfile,
        world_state: WorldState,
        duration_minutes: int,
        user_id: UUID,
    ) -> RewardComputation:
        exp_reward = duration_minutes * XP_PER_MINUTE
        gold_reward = duration_minutes * GOLD_PER_MINUTE

        hero.exp += exp_reward
        hero.gold += gold_reward
        level_ups = self._apply_leveling(hero)

        streak_layers = self._apply_world_progress(world_state)

        dropped_item = await self._maybe_drop_cosmetic(user_id)
        if dropped_item:
            inventory_entry = InventoryItem(
                user_id=user_id,
                item_id=dropped_item.id,
            )
            self.session.add(inventory_entry)

        self.session.add(hero)
        self.session.add(world_state)

        return RewardComputation(
            exp_reward=exp_reward,
            gold_reward=gold_reward,
            level_ups=level_ups,
            dropped_item=dropped_item,
            unlocked_layers=streak_layers,
        )

    def _apply_leveling(self, hero: HeroProfile) -> int:
        level_ups = 0
        while hero.exp >= hero.level * 100:
            hero.exp -= hero.level * 100
            hero.level += 1
            level_ups += 1
        return level_ups

    def _apply_world_progress(self, world_state: WorldState) -> list[str]:
        today = datetime.now(UTC).date()
        yesterday = today - timedelta(days=1)
        unlocked_layers: list[str] = []

        if world_state.day_streak == 0:
            world_state.day_streak = 1
        elif world_state.last_session_date == today:
            pass
        elif world_state.last_session_date == yesterday:
            world_state.day_streak += 1
        else:
            world_state.day_streak = 1

        world_state.last_session_date = today
        if world_state.day_streak > world_state.longest_streak:
            world_state.longest_streak = world_state.day_streak

        world_state.total_sessions_success += 1

        for attribute, threshold in WORLD_UPGRADE_THRESHOLDS.items():
            current_level = getattr(world_state, attribute)
            if (
                world_state.total_sessions_success >= threshold
                and current_level < 2
            ):
                setattr(world_state, attribute, 2)
                unlocked_layers.append(attribute)

        return unlocked_layers

    async def _maybe_drop_cosmetic(self, user_id: UUID) -> CosmeticItem | None:
        if random.random() > COSMETIC_DROP_CHANCE:
            return None

        owned_query = select(InventoryItem.item_id).where(
            InventoryItem.user_id == user_id
        )
        owned_result = await self.session.execute(owned_query)
        owned_item_ids = {row[0] for row in owned_result.all()}

        available_query = select(CosmeticItem)
        if owned_item_ids:
            available_query = available_query.where(
                ~CosmeticItem.id.in_(owned_item_ids)
            )

        result = await self.session.execute(available_query)
        available_items = result.scalars().all()
        if not available_items:
            return None

        return random.choice(available_items)
