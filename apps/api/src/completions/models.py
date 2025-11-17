from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Integer, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.auth.models import User
    from src.nodes.models import Node

__all__ = ["CompletionSource", "NodeCompletion"]


class CompletionSource(str, Enum):
    MANUAL = "MANUAL"
    SESSION = "SESSION"


class NodeCompletion(Base):
    __tablename__ = "node_completion"

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
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    source: Mapped[CompletionSource] = mapped_column(
        SQLEnum(CompletionSource, name="completion_source"),
        nullable=False,
    )
    earned_xp: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped["User"] = relationship(lazy="joined")
    node: Mapped["Node"] = relationship()

    __table_args__ = (
        Index("idx_completion_user", "user_id"),
        Index("idx_completion_node", "node_id"),
    )
