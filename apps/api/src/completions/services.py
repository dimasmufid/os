from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.badges.services import BadgeService
from src.completions.models import NodeCompletion
from src.completions.schemas import CompletionCreate
from src.database import get_async_session
from src.exceptions import BadRequest, NotFound
from src.gamification.utils import (
    apply_xp,
    get_or_create_user_stats,
    update_streak,
)
from src.nodes.models import Node
from src.tracks.models import Track

__all__ = [
    "CompletionService",
    "get_completion_service",
]


class CompletionService:
    def __init__(self, session: AsyncSession, badge_service: BadgeService):
        self.session = session
        self.badge_service = badge_service

    async def complete_node(
        self,
        user_id: UUID,
        node_id: UUID,
        payload: CompletionCreate,
    ) -> NodeCompletion:
        node = await self._get_user_node(user_id, node_id)
        if node.is_locked:
            raise BadRequest(detail="Node is locked")

        completed_at = payload.completed_at or datetime.now(UTC)
        if completed_at.tzinfo is None:
            completed_at = completed_at.replace(tzinfo=UTC)

        completion = NodeCompletion(
            user_id=user_id,
            node_id=node.id,
            completed_at=completed_at,
            source=payload.source,
            earned_xp=node.base_xp,
        )

        async with self.session.begin():
            self.session.add(completion)
            stats = await get_or_create_user_stats(
                self.session,
                user_id,
                for_update=True,
            )
            apply_xp(stats, completion.earned_xp)
            update_streak(stats, completed_at.date())
            await self.session.flush()
            completion_count = await self._completion_count(user_id)
            await self.badge_service.evaluate_badges(
                user_id,
                streak_days=stats.current_streak_days,
                completion_count=completion_count,
            )

        await self.session.refresh(completion)
        return completion

    async def list_completions(
        self,
        user_id: UUID,
        *,
        node_id: UUID | None = None,
        limit: int = 50,
    ) -> list[NodeCompletion]:
        stmt: Select[tuple[NodeCompletion]] = select(NodeCompletion).where(
            NodeCompletion.user_id == user_id
        )
        if node_id:
            stmt = stmt.where(NodeCompletion.node_id == node_id)
        stmt = stmt.order_by(NodeCompletion.completed_at.desc()).limit(limit)
        completions = await self.session.scalars(stmt)
        return list(completions)

    async def _get_user_node(self, user_id: UUID, node_id: UUID) -> Node:
        stmt = (
            select(Node)
            .join(Track, Track.id == Node.track_id)
            .where(Node.id == node_id, Track.user_id == user_id)
        )
        node = await self.session.scalar(stmt)
        if node is None:
            raise NotFound(detail="Node not found")
        return node

    async def _completion_count(self, user_id: UUID) -> int:
        stmt = select(func.count(NodeCompletion.id)).where(
            NodeCompletion.user_id == user_id
        )
        count = await self.session.scalar(stmt)
        return int(count or 0)


def get_completion_service(
    session: AsyncSession = Depends(get_async_session),
) -> CompletionService:
    badge_service = BadgeService(session)
    return CompletionService(session, badge_service)
