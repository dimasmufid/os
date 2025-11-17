from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Computed, DateTime, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.auth.models import User
    from src.nodes.models import Node

__all__ = ["TimeEntry"]


class TimeEntry(Base):
    __tablename__ = "time_entry"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    node_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("node.id", ondelete="CASCADE"),
        nullable=False,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_min: Mapped[int | None] = mapped_column(
        Integer,
        Computed(
            "(EXTRACT(EPOCH FROM (ended_at - started_at)) / 60)::int",
            persisted=True,
        ),
    )

    user: Mapped["User"] = relationship(lazy="joined")
    node: Mapped["Node"] = relationship()

    __table_args__ = (
        Index("idx_time_entry_user", "user_id"),
        Index("idx_time_entry_node", "node_id"),
        Index(
            "idx_time_entry_date",
            func.date_trunc("day", started_at),
        ),
    )
