from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.completions.models import NodeCompletion
from src.database import get_async_session
from src.gamification.schemas import ProgressSummary, UserStatsPublic
from src.gamification.utils import (
    get_or_create_user_stats,
    xp_to_next_level,
)
from src.time_tracking.models import TimeEntry

__all__ = [
    "GamificationService",
    "get_gamification_service",
]


class GamificationService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_stats(self, user_id: UUID) -> UserStatsPublic:
        stats = await get_or_create_user_stats(self.session, user_id)
        xp_floor = self._xp_floor(stats.level)
        xp_progress = stats.xp_total - xp_floor
        xp_to_next = xp_to_next_level(stats.level)
        xp_remaining = max(xp_to_next - xp_progress, 0)
        return UserStatsPublic(
            level=stats.level,
            xp_total=stats.xp_total,
            xp_to_next=xp_to_next,
            xp_progress=max(xp_progress, 0),
            xp_remaining=xp_remaining,
            current_streak_days=stats.current_streak_days,
            last_active_date=stats.last_active_date,
        )

    async def get_progress_summary(self, user_id: UUID) -> ProgressSummary:
        stats = await get_or_create_user_stats(self.session, user_id)
        xp_to_next = xp_to_next_level(stats.level)
        total_time_minutes = await self._total_minutes(user_id)
        total_completions = await self._completion_count(user_id)
        today_completions = await self._completion_count(
            user_id,
            on_date=datetime.now(UTC).date(),
        )
        return ProgressSummary(
            level=stats.level,
            xp_total=stats.xp_total,
            xp_to_next=xp_to_next,
            current_streak_days=stats.current_streak_days,
            total_time_minutes=total_time_minutes,
            total_completions=total_completions,
            today_completions=today_completions,
        )

    async def _total_minutes(self, user_id: UUID) -> int:
        stmt = select(func.coalesce(func.sum(TimeEntry.duration_min), 0)).where(
            TimeEntry.user_id == user_id,
            TimeEntry.duration_min.is_not(None),
        )
        total = await self.session.scalar(stmt)
        return int(total or 0)

    async def _completion_count(
        self,
        user_id: UUID,
        on_date: date | None = None,
    ) -> int:
        stmt = select(func.count(NodeCompletion.id)).where(
            NodeCompletion.user_id == user_id
        )
        if on_date:
            start_dt = datetime.combine(on_date, datetime.min.time(), tzinfo=UTC)
            end_dt = datetime.combine(on_date, datetime.max.time(), tzinfo=UTC)
            stmt = stmt.where(
                NodeCompletion.completed_at >= start_dt,
                NodeCompletion.completed_at <= end_dt,
            )
        count = await self.session.scalar(stmt)
        return int(count or 0)

    def _xp_floor(self, level: int) -> int:
        if level <= 1:
            return 0
        return 50 * level * (level - 1)


def get_gamification_service(
    session: AsyncSession = Depends(get_async_session),
) -> GamificationService:
        return GamificationService(session)
