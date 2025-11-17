from __future__ import annotations

from typing import Sequence
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_async_session
from src.exceptions import BadRequest, NotFound
from src.nodes.models import HabitSchedule, Node, NodeType
from src.nodes.schemas import (
    HabitSchedulePayload,
    NodeCreate,
    NodeReorderItem,
    NodeUpdate,
)
from src.tracks.models import Track

__all__ = [
    "NodeService",
    "get_node_service",
]


class NodeService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_nodes(self, user_id: UUID, track_id: UUID) -> list[Node]:
        await self._ensure_track_owned(user_id, track_id)
        stmt: Select[tuple[Node]] = (
            select(Node)
            .where(Node.track_id == track_id)
            .order_by(Node.position, Node.created_at)
        )
        nodes = await self.session.scalars(stmt)
        return list(nodes)

    async def create_node(
        self,
        user_id: UUID,
        track_id: UUID,
        payload: NodeCreate,
    ) -> Node:
        await self._ensure_track_owned(user_id, track_id)
        if payload.type == NodeType.HABIT and payload.habit_schedule is None:
            raise BadRequest(detail="Habit nodes require a schedule")

        default_position = await self._next_position(track_id)
        position = (
            payload.position if payload.position is not None else default_position
        )
        node = Node(
            track_id=track_id,
            title=payload.title,
            description=payload.description,
            type=payload.type,
            base_xp=payload.base_xp,
            position=position,
            is_locked=payload.is_locked,
        )
        async with self.session.begin():
            self.session.add(node)
        if payload.type == NodeType.HABIT and payload.habit_schedule is not None:
            await self._upsert_schedule(node, payload.habit_schedule)
        await self.session.refresh(node)
        return node

    async def get_node(self, user_id: UUID, node_id: UUID) -> Node:
        stmt: Select[tuple[Node]] = (
            select(Node)
            .join(Track, Track.id == Node.track_id)
            .where(Node.id == node_id, Track.user_id == user_id)
        )
        node = await self.session.scalar(stmt)
        if node is None:
            raise NotFound(detail="Node not found")
        return node

    async def update_node(
        self,
        user_id: UUID,
        node_id: UUID,
        payload: NodeUpdate,
    ) -> Node:
        node = await self.get_node(user_id, node_id)
        original_type = node.type
        if payload.title is not None:
            node.title = payload.title
        if payload.description is not None:
            node.description = payload.description
        if payload.base_xp is not None:
            node.base_xp = payload.base_xp
        if payload.position is not None:
            node.position = payload.position
        if payload.is_locked is not None:
            node.is_locked = payload.is_locked
        if payload.type is not None:
            node.type = payload.type

        async with self.session.begin():
            self.session.add(node)

        if original_type == NodeType.HABIT and node.type != NodeType.HABIT:
            await self._remove_schedule(node)
        elif node.type == NodeType.HABIT and payload.habit_schedule is not None:
            await self._upsert_schedule(node, payload.habit_schedule)

        await self.session.refresh(node)
        return node

    async def delete_node(self, user_id: UUID, node_id: UUID) -> None:
        node = await self.get_node(user_id, node_id)
        async with self.session.begin():
            await self.session.delete(node)

    async def reorder_nodes(
        self,
        user_id: UUID,
        updates: Sequence[NodeReorderItem],
    ) -> None:
        if not updates:
            return

        node_ids = [item.node_id for item in updates]
        stmt = (
            select(Node)
            .join(Track, Track.id == Node.track_id)
            .where(Node.id.in_(node_ids), Track.user_id == user_id)
        )
        nodes = {node.id: node for node in await self.session.scalars(stmt)}
        if len(nodes) != len(set(node_ids)):
            raise NotFound(detail="One or more nodes were not found")

        for item in updates:
            nodes[item.node_id].position = item.position

        async with self.session.begin():
            for node in nodes.values():
                self.session.add(node)

    async def set_lock_state(
        self,
        user_id: UUID,
        node_id: UUID,
        locked: bool,
    ) -> Node:
        node = await self.get_node(user_id, node_id)
        node.is_locked = locked
        async with self.session.begin():
            self.session.add(node)
        return node

    async def get_habit_schedule(self, user_id: UUID, node_id: UUID) -> HabitSchedule:
        node = await self.get_node(user_id, node_id)
        if node.type != NodeType.HABIT:
            raise BadRequest(detail="Node is not configured as a habit")
        if node.habit_schedule is None:
            raise NotFound(detail="Habit schedule not set")
        return node.habit_schedule

    async def upsert_habit_schedule(
        self,
        user_id: UUID,
        node_id: UUID,
        payload: HabitSchedulePayload,
    ) -> HabitSchedule:
        node = await self.get_node(user_id, node_id)
        if node.type != NodeType.HABIT:
            raise BadRequest(detail="Node is not configured as a habit")
        schedule = await self._upsert_schedule(node, payload)
        await self.session.refresh(schedule)
        return schedule

    async def delete_habit_schedule(self, user_id: UUID, node_id: UUID) -> None:
        node = await self.get_node(user_id, node_id)
        if node.habit_schedule is None:
            return
        await self._remove_schedule(node)

    async def _ensure_track_owned(self, user_id: UUID, track_id: UUID) -> None:
        stmt = select(Track.id).where(Track.id == track_id, Track.user_id == user_id)
        exists = await self.session.scalar(stmt)
        if exists is None:
            raise NotFound(detail="Track not found")

    async def _next_position(self, track_id: UUID) -> int:
        stmt = select(func.max(Node.position)).where(Node.track_id == track_id)
        current = await self.session.scalar(stmt)
        return (current or 0) + 1

    async def _upsert_schedule(
        self,
        node: Node,
        payload: HabitSchedulePayload,
    ) -> HabitSchedule:
        meta = payload.to_meta()
        if node.habit_schedule is None:
            schedule = HabitSchedule(
                node_id=node.id,
                frequency=payload.frequency,
                meta=meta,
            )
            async with self.session.begin():
                self.session.add(schedule)
            node.habit_schedule = schedule
            return schedule

        schedule = node.habit_schedule
        schedule.frequency = payload.frequency
        schedule.meta = meta
        async with self.session.begin():
            self.session.add(schedule)
        return schedule

    async def _remove_schedule(self, node: Node) -> None:
        if node.habit_schedule is None:
            return
        async with self.session.begin():
            await self.session.delete(node.habit_schedule)
        node.habit_schedule = None


def get_node_service(
    session: AsyncSession = Depends(get_async_session),
) -> NodeService:
    return NodeService(session)
