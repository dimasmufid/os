from __future__ import annotations

from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_async_session
from src.docs.models import Doc
from src.docs.schemas import DocCreate, DocUpdate
from src.exceptions import BadRequest, NotFound
from src.nodes.models import Node
from src.tracks.models import Track

__all__ = [
    "DocService",
    "get_doc_service",
]


class DocService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_docs(
        self,
        user_id: UUID,
        *,
        track_id: UUID | None = None,
        node_id: UUID | None = None,
    ) -> list[Doc]:
        stmt: Select[tuple[Doc]] = select(Doc).where(Doc.user_id == user_id)
        if track_id:
            stmt = stmt.where(Doc.track_id == track_id)
        if node_id:
            stmt = stmt.where(Doc.node_id == node_id)
        stmt = stmt.order_by(Doc.created_at.desc())
        docs = await self.session.scalars(stmt)
        return list(docs)

    async def create_doc(self, user_id: UUID, payload: DocCreate) -> Doc:
        await self._validate_links(user_id, payload.track_id, payload.node_id)
        doc = Doc(
            user_id=user_id,
            title=payload.title,
            content_md=payload.content_md,
            track_id=payload.track_id,
            node_id=payload.node_id,
        )
        async with self.session.begin():
            self.session.add(doc)
        return doc

    async def get_doc(self, user_id: UUID, doc_id: UUID) -> Doc:
        stmt: Select[tuple[Doc]] = select(Doc).where(
            Doc.id == doc_id,
            Doc.user_id == user_id,
        )
        doc = await self.session.scalar(stmt)
        if doc is None:
            raise NotFound(detail="Doc not found")
        return doc

    async def update_doc(
        self,
        user_id: UUID,
        doc_id: UUID,
        payload: DocUpdate,
    ) -> Doc:
        doc = await self.get_doc(user_id, doc_id)
        if payload.title is not None:
            doc.title = payload.title
        if payload.content_md is not None:
            doc.content_md = payload.content_md
        if payload.track_id is not None or payload.node_id is not None:
            new_track_id = (
                payload.track_id if payload.track_id is not None else doc.track_id
            )
            new_node_id = (
                payload.node_id if payload.node_id is not None else doc.node_id
            )
            if new_track_id is None and new_node_id is None:
                raise BadRequest(detail="Doc must remain linked to a resource")
            await self._validate_links(user_id, new_track_id, new_node_id)
            doc.track_id = new_track_id
            doc.node_id = new_node_id

        async with self.session.begin():
            self.session.add(doc)
        return doc

    async def delete_doc(self, user_id: UUID, doc_id: UUID) -> None:
        doc = await self.get_doc(user_id, doc_id)
        async with self.session.begin():
            await self.session.delete(doc)

    async def _validate_links(
        self,
        user_id: UUID,
        track_id: UUID | None,
        node_id: UUID | None,
    ) -> None:
        if not track_id and not node_id:
            raise BadRequest(detail="Doc must be linked to a track or node")

        if track_id:
            track_stmt = select(Track.id).where(
                Track.id == track_id,
                Track.user_id == user_id,
            )
            track_exists = await self.session.scalar(track_stmt)
            if track_exists is None:
                raise NotFound(detail="Track not found")

        if node_id:
            node_stmt = (
                select(Node.id)
                .join(Track, Track.id == Node.track_id)
                .where(Node.id == node_id, Track.user_id == user_id)
            )
            node_exists = await self.session.scalar(node_stmt)
            if node_exists is None:
                raise NotFound(detail="Node not found")


def get_doc_service(
    session: AsyncSession = Depends(get_async_session),
) -> DocService:
    return DocService(session)
