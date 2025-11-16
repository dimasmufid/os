from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class RoomName(StrEnum):
    STUDY = "study"
    BUILD = "build"
    TRAINING = "training"


class SessionStatus(StrEnum):
    PENDING = "pending"
    SUCCESS = "success"
    CANCELLED = "cancelled"


class CosmeticSlot(StrEnum):
    HAT = "hat"
    OUTFIT = "outfit"
    ACCESSORY = "accessory"


class CosmeticRarity(StrEnum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class HeroProfile(TimestampMixin, Base):
    __tablename__ = "hero_profile"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), unique=True
    )
    level: Mapped[int] = mapped_column(Integer, default=1)
    exp: Mapped[int] = mapped_column(Integer, default=0)
    gold: Mapped[int] = mapped_column(Integer, default=0)

    equipped_hat_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cosmetic_item.id", ondelete="SET NULL"),
        nullable=True,
    )
    equipped_outfit_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cosmetic_item.id", ondelete="SET NULL"),
        nullable=True,
    )
    equipped_accessory_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cosmetic_item.id", ondelete="SET NULL"),
        nullable=True,
    )

    equipped_hat: Mapped["CosmeticItem | None"] = relationship(
        foreign_keys=[equipped_hat_id]
    )
    equipped_outfit: Mapped["CosmeticItem | None"] = relationship(
        foreign_keys=[equipped_outfit_id]
    )
    equipped_accessory: Mapped["CosmeticItem | None"] = relationship(
        foreign_keys=[equipped_accessory_id]
    )


class TaskTemplate(TimestampMixin, Base):
    __tablename__ = "task_template"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str | None] = mapped_column(String(80))
    default_duration: Mapped[int] = mapped_column(Integer, default=25)
    room: Mapped[RoomName] = mapped_column(
        Enum(RoomName, name="room_name"), default=RoomName.STUDY
    )

    __table_args__ = (
        CheckConstraint("default_duration > 0", name="duration_positive_check"),
    )


class CosmeticItem(TimestampMixin, Base):
    __tablename__ = "cosmetic_item"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(120))
    slot: Mapped[CosmeticSlot] = mapped_column(
        Enum(CosmeticSlot, name="cosmetic_slot")
    )
    rarity: Mapped[CosmeticRarity] = mapped_column(
        Enum(CosmeticRarity, name="cosmetic_rarity")
    )
    sprite_key: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
    )


class InventoryItem(TimestampMixin, Base):
    __tablename__ = "inventory_item"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
    )
    item_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cosmetic_item.id", ondelete="CASCADE"),
    )

    item: Mapped[CosmeticItem] = relationship(back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "item_id",
            name="inventory_item_user_item_key",
        ),
    )


class WorldState(TimestampMixin, Base):
    __tablename__ = "world_state"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        unique=True,
    )
    study_room_level: Mapped[int] = mapped_column(Integer, default=1)
    build_room_level: Mapped[int] = mapped_column(Integer, default=1)
    training_room_level: Mapped[int] = mapped_column(Integer, default=1)
    plaza_level: Mapped[int] = mapped_column(Integer, default=1)
    total_sessions_success: Mapped[int] = mapped_column(Integer, default=0)
    day_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_session_date: Mapped[Date | None] = mapped_column(Date, nullable=True)


class FocusSession(TimestampMixin, Base):
    __tablename__ = "focus_session"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user.id", ondelete="CASCADE"),
        index=True,
    )
    task_template_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("task_template.id", ondelete="SET NULL"),
        nullable=True,
    )
    room: Mapped[RoomName] = mapped_column(
        Enum(RoomName, name="session_room"),
        default=RoomName.STUDY,
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=25)
    expected_end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status"),
        default=SessionStatus.PENDING,
    )
    reward_exp: Mapped[int | None] = mapped_column(Integer)
    reward_gold: Mapped[int | None] = mapped_column(Integer)
    reward_cosmetic_item_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("cosmetic_item.id", ondelete="SET NULL"),
        nullable=True,
    )

    reward_cosmetic_item: Mapped[CosmeticItem | None] = relationship(
        foreign_keys=[reward_cosmetic_item_id]
    )

    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="session_duration_positive"),
    )
