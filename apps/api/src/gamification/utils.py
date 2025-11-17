from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.gamification.models import UserStats

__all__ = [
    "apply_xp",
    "calculate_level_from_xp",
    "get_or_create_user_stats",
    "update_streak",
    "xp_to_next_level",
]


async def get_or_create_user_stats(
    session: AsyncSession,
    user_id: UUID,
    *,
    for_update: bool = False,
) -> UserStats:
    stmt: Select[tuple[UserStats]] = select(UserStats).where(
        UserStats.user_id == user_id
    )
    if for_update:
        stmt = stmt.with_for_update()

    stats = await session.scalar(stmt)
    if stats is None:
        stats = UserStats(user_id=user_id)
        session.add(stats)
        await session.flush()

    return stats


def xp_to_next_level(level: int) -> int:
    return max(level, 1) * 100


def _xp_to_reach_level(level: int) -> int:
    if level <= 1:
        return 0
    return 50 * level * (level - 1)


def calculate_level_from_xp(xp_total: int) -> int:
    level = 1
    while xp_total >= _xp_to_reach_level(level + 1):
        level += 1
    return level


def apply_xp(stats: UserStats, earned_xp: int) -> None:
    stats.xp_total = max(0, stats.xp_total + max(earned_xp, 0))
    stats.level = calculate_level_from_xp(stats.xp_total)


def update_streak(stats: UserStats, activity_date: date) -> None:
    last_date = stats.last_active_date
    if last_date is None:
        stats.current_streak_days = 1
    else:
        delta = (activity_date - last_date).days
        if delta == 1:
            stats.current_streak_days += 1
        elif delta > 1:
            stats.current_streak_days = 1
        # delta == 0 keeps streak unchanged

    stats.last_active_date = activity_date
