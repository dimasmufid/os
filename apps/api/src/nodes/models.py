from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
)
from sqlalchemy import (
    Enum as SQLEnum,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.tracks.models import Track

__all__ = [
    "HabitFrequency",
    "HabitSchedule",
    "Node",
    "NodeType",
]


class NodeType(str, Enum):
    TASK = "TASK"
    HABIT = "HABIT"
    FOCUS_SESSION = "FOCUS_SESSION"
    MILESTONE = "MILESTONE"


class HabitFrequency(str, Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"


class Node(Base):
    __tablename__ = "node"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    track_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("track.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[NodeType] = mapped_column(
        SQLEnum(NodeType, name="node_type"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_xp: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="10",
    )
    is_locked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default="false",
    )
    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=True,
    )

    track: Mapped["Track"] = relationship(back_populates="nodes")
    habit_schedule: Mapped[Optional["HabitSchedule"]] = relationship(
        back_populates="node",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("idx_node_track", "track_id"),
        Index("idx_node_type", "type"),
    )


class HabitSchedule(Base):
    __tablename__ = "habit_schedule"

    node_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("node.id", ondelete="CASCADE"),
        primary_key=True,
    )
    frequency: Mapped[HabitFrequency] = mapped_column(
        SQLEnum(HabitFrequency, name="habit_frequency"), nullable=False
    )
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    node: Mapped["Node"] = relationship(back_populates="habit_schedule")
