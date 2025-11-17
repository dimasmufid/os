from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.completions.models import NodeCompletion
from src.database import get_async_session
from src.exceptions import NotFound
from src.nodes.models import Node
from src.tracks.models import Track
from src.tracks.schemas import TrackCreate, TrackReorderItem, TrackUpdate

__all__ = [
    "TrackAggregate",
    "TrackService",
    "get_track_service",
]


@dataclass(slots=True)
class TrackAggregate:
    track: Track
    node_count: int
    completion_count: int


class TrackService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_tracks(self, user_id: UUID) -> list[TrackAggregate]:
        stmt: Select[tuple[Track, int, int]] = (
            select(
                Track,
                func.count(func.distinct(Node.id)).label("node_count"),
                func.count(NodeCompletion.id).label("completion_count"),
            )
            .outerjoin(Node, Node.track_id == Track.id)
            .outerjoin(
                NodeCompletion,
                (NodeCompletion.node_id == Node.id)
                & (NodeCompletion.user_id == user_id),
            )
            .where(Track.user_id == user_id)
            .group_by(Track.id)
            .order_by(Track.position, Track.created_at)
        )
        rows = await self.session.execute(stmt)
        aggregates: list[TrackAggregate] = []
        for row in rows:
            aggregates.append(
                TrackAggregate(
                    track=row.Track,
                    node_count=int(row.node_count or 0),
                    completion_count=int(row.completion_count or 0),
                )
            )
        return aggregates

    async def create_track(self, user_id: UUID, payload: TrackCreate) -> Track:
        next_position = await self._next_position(user_id)
        track = Track(
            user_id=user_id,
            name=payload.name,
            color=payload.color,
            icon=payload.icon,
            position=next_position,
        )
        async with self.session.begin():
            self.session.add(track)
        return track

    async def get_track(self, user_id: UUID, track_id: UUID) -> Track:
        stmt: Select[tuple[Track]] = select(Track).where(
            Track.id == track_id,
            Track.user_id == user_id,
        )
        track = await self.session.scalar(stmt)
        if track is None:
            raise NotFound(detail="Track not found")
        return track

    async def get_track_with_stats(
        self,
        user_id: UUID,
        track_id: UUID,
    ) -> TrackAggregate:
        stmt: Select[tuple[Track, int, int]] = (
            select(
                Track,
                func.count(func.distinct(Node.id)).label("node_count"),
                func.count(NodeCompletion.id).label("completion_count"),
            )
            .outerjoin(Node, Node.track_id == Track.id)
            .outerjoin(
                NodeCompletion,
                (NodeCompletion.node_id == Node.id)
                & (NodeCompletion.user_id == user_id),
            )
            .where(Track.id == track_id, Track.user_id == user_id)
            .group_by(Track.id)
        )
        row = await self.session.execute(stmt)
        record = row.first()
        if record is None:
            raise NotFound(detail="Track not found")
        return TrackAggregate(
            track=record.Track,
            node_count=int(record.node_count or 0),
            completion_count=int(record.completion_count or 0),
        )

    async def update_track(
        self,
        user_id: UUID,
        track_id: UUID,
        payload: TrackUpdate,
    ) -> Track:
        track = await self.get_track(user_id, track_id)
        if payload.name is not None:
            track.name = payload.name
        if payload.color is not None:
            track.color = payload.color
        if payload.icon is not None:
            track.icon = payload.icon
        if payload.position is not None:
            track.position = payload.position
        async with self.session.begin():
            self.session.add(track)
        return track

    async def delete_track(self, user_id: UUID, track_id: UUID) -> None:
        track = await self.get_track(user_id, track_id)
        async with self.session.begin():
            await self.session.delete(track)

    async def reorder_tracks(
        self,
        user_id: UUID,
        updates: Sequence[TrackReorderItem],
    ) -> None:
        if not updates:
            return

        track_ids = [item.track_id for item in updates]
        stmt = select(Track).where(Track.user_id == user_id, Track.id.in_(track_ids))
        rows = await self.session.scalars(stmt)
        tracks = {track.id: track for track in rows}
        if len(tracks) != len(set(track_ids)):
            raise NotFound(detail="One or more tracks not found")

        for item in updates:
            tracks[item.track_id].position = item.position

        async with self.session.begin():
            for track in tracks.values():
                self.session.add(track)

    async def _next_position(self, user_id: UUID) -> int:
        stmt = select(func.max(Track.position)).where(Track.user_id == user_id)
        current = await self.session.scalar(stmt)
        return (current or 0) + 1


def get_track_service(
    session: AsyncSession = Depends(get_async_session),
) -> TrackService:
    return TrackService(session)
