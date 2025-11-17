from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.auth.models import User

__all__ = ["Badge", "UserBadge"]


class Badge(Base):
    __tablename__ = "badge"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    slug: Mapped[str] = mapped_column(String(length=255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(length=255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_xp: Mapped[int] = mapped_column(Integer, nullable=False, server_default="50")

    awarded: Mapped[list["UserBadge"]] = relationship(
        back_populates="badge", cascade="all, delete-orphan", passive_deletes=True
    )


class UserBadge(Base):
    __tablename__ = "user_badge"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    badge_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("badge.id", ondelete="CASCADE"),
        primary_key=True,
    )
    awarded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(lazy="joined")
    badge: Mapped["Badge"] = relationship(back_populates="awarded")
