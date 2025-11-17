from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.badges.services import BadgeService
from src.database import get_async_session
from src.exceptions import BadRequest, Conflict, NotFound
from src.nodes.models import Node
from src.time_tracking.models import TimeEntry
from src.time_tracking.schemas import ManualTimeEntryRequest
from src.tracks.models import Track

__all__ = [
    "TimeTrackingService",
    "get_time_tracking_service",
]


class TimeTrackingService:
    def __init__(
        self,
        session: AsyncSession,
        badge_service: BadgeService | None = None,
    ):
        self.session = session
        self.badge_service = badge_service

    async def start_entry(self, user_id: UUID, node_id: UUID) -> TimeEntry:
        await self._ensure_node_owned(user_id, node_id)
        active_entry = await self._get_active_entry(user_id)
        if active_entry:
            raise Conflict(detail="An active timer already exists")
        entry = TimeEntry(
            user_id=user_id,
            node_id=node_id,
            started_at=datetime.now(UTC),
        )
        async with self.session.begin():
            self.session.add(entry)
        await self.session.refresh(entry)
        return entry

    async def stop_entry(self, user_id: UUID, entry_id: UUID) -> TimeEntry:
        entry = await self._get_entry(user_id, entry_id)
        if entry.ended_at is not None:
            raise BadRequest(detail="Timer already stopped")
        entry.ended_at = datetime.now(UTC)
        async with self.session.begin():
            self.session.add(entry)
            await self.session.flush()
            await self._evaluate_time_badges(user_id)
        await self.session.refresh(entry)
        return entry

    async def create_manual_entry(
        self,
        user_id: UUID,
        payload: ManualTimeEntryRequest,
    ) -> TimeEntry:
        await self._ensure_node_owned(user_id, payload.node_id)
        if payload.ended_at <= payload.started_at:
            raise BadRequest(detail="ended_at must be after started_at")
        entry = TimeEntry(
            user_id=user_id,
            node_id=payload.node_id,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
        )
        async with self.session.begin():
            self.session.add(entry)
            await self.session.flush()
            await self._evaluate_time_badges(user_id)
        await self.session.refresh(entry)
        return entry

    async def list_entries(
        self,
        user_id: UUID,
        *,
        node_id: UUID | None = None,
        limit: int = 50,
    ) -> list[TimeEntry]:
        stmt: Select[tuple[TimeEntry]] = select(TimeEntry).where(
            TimeEntry.user_id == user_id
        )
        if node_id:
            stmt = stmt.where(TimeEntry.node_id == node_id)
        stmt = stmt.order_by(TimeEntry.started_at.desc()).limit(limit)
        entries = await self.session.scalars(stmt)
        return list(entries)

    async def summary(
        self,
        user_id: UUID,
        days: int = 14,
    ) -> list[tuple[UUID, date, int]]:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        stmt = (
            select(
                TimeEntry.node_id,
                func.date_trunc("day", TimeEntry.started_at).label("day"),
                func.coalesce(func.sum(TimeEntry.duration_min), 0).label("minutes"),
            )
            .where(
                TimeEntry.user_id == user_id,
                TimeEntry.started_at >= cutoff,
                TimeEntry.duration_min.is_not(None),
            )
            .group_by(TimeEntry.node_id, "day")
            .order_by(func.date_trunc("day", TimeEntry.started_at).desc())
        )
        rows = await self.session.execute(stmt)
        return [
            (row.node_id, row.day.date(), int(row.minutes)) for row in rows
        ]

    async def total_logged_minutes(self, user_id: UUID) -> int:
        stmt = select(func.coalesce(func.sum(TimeEntry.duration_min), 0)).where(
            TimeEntry.user_id == user_id,
            TimeEntry.duration_min.is_not(None),
        )
        total = await self.session.scalar(stmt)
        return int(total or 0)

    async def _ensure_node_owned(self, user_id: UUID, node_id: UUID) -> None:
        stmt = (
            select(Node.id)
            .join(Track, Track.id == Node.track_id)
            .where(Node.id == node_id, Track.user_id == user_id)
        )
        exists = await self.session.scalar(stmt)
        if exists is None:
            raise NotFound(detail="Node not found")

    async def _get_entry(self, user_id: UUID, entry_id: UUID) -> TimeEntry:
        stmt = select(TimeEntry).where(
            TimeEntry.id == entry_id,
            TimeEntry.user_id == user_id,
        )
        entry = await self.session.scalar(stmt)
        if entry is None:
            raise NotFound(detail="Time entry not found")
        return entry

    async def _get_active_entry(self, user_id: UUID) -> TimeEntry | None:
        stmt = (
            select(TimeEntry)
            .where(TimeEntry.user_id == user_id, TimeEntry.ended_at.is_(None))
            .order_by(TimeEntry.started_at.desc())
            .limit(1)
        )
        return await self.session.scalar(stmt)

    async def _evaluate_time_badges(self, user_id: UUID) -> None:
        if not self.badge_service:
            return
        total_minutes = await self.total_logged_minutes(user_id)
        await self.badge_service.evaluate_badges(
            user_id,
            time_minutes=total_minutes,
        )


def get_time_tracking_service(
    session: AsyncSession = Depends(get_async_session),
) -> TimeTrackingService:
    badge_service = BadgeService(session)
    return TimeTrackingService(session, badge_service)
