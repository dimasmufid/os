from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.auth.models import User

__all__ = ["UserStats"]


class UserStats(Base):
    __tablename__ = "user_stats"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    xp_total: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    current_streak_days: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    last_active_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    user: Mapped["User"] = relationship(lazy="joined")
