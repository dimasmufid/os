"""Pydantic schemas for the LifeOS domain."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

from src.lifeos.models import (
    CosmeticRarity,
    CosmeticSlot,
    RoomName,
    SessionStatus,
)

SESSION_DURATIONS = (25, 50, 90)


class CosmeticItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slot: CosmeticSlot
    rarity: CosmeticRarity
    sprite_key: str
    description: str | None = None


class HeroProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    level: int
    exp: int
    gold: int
    equipped_hat: CosmeticItemSchema | None = None
    equipped_outfit: CosmeticItemSchema | None = None
    equipped_accessory: CosmeticItemSchema | None = None

    @computed_field  # type: ignore[misc]
    @property
    def exp_to_next(self) -> int:
        return self.level * 100


class WorldStateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    study_room_level: int
    build_room_level: int
    training_room_level: int
    plaza_level: int
    total_sessions_success: int
    day_streak: int
    longest_streak: int
    last_session_date: date | None = None


class ProfileResponse(BaseModel):
    hero: HeroProfileSchema
    world: WorldStateSchema


class TaskTemplateBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    default_duration: int = Field(default=25, gt=0)
    room: RoomName = RoomName.STUDY


class TaskTemplateCreate(TaskTemplateBase):
    pass


class TaskTemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    category: str | None = Field(default=None, max_length=80)
    default_duration: int | None = Field(default=None, gt=0)
    room: RoomName | None = None


class TaskTemplateSchema(TaskTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class SessionStartRequest(BaseModel):
    task_template_id: UUID | None = None
    duration_minutes: int = Field(gt=0)
    room: RoomName

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, value: int) -> int:
        if value not in SESSION_DURATIONS:
            raise ValueError(
                "Duration must be one of 25, 50, or 90 minutes.",
            )
        return value


class SessionStartResponse(BaseModel):
    session_id: UUID
    expected_end_time: datetime
    status: SessionStatus


class SessionCompleteRequest(BaseModel):
    session_id: UUID


class FocusSessionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    task_template_id: UUID | None = None
    room: RoomName
    duration_minutes: int
    status: SessionStatus
    expected_end_time: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    created_at: datetime
    reward_exp: int | None = None
    reward_gold: int | None = None


class RewardSummary(BaseModel):
    exp_reward: int
    gold_reward: int
    level_ups: int
    unlocked_layers: list[str]
    dropped_item: CosmeticItemSchema | None = None


class SessionCompleteResponse(BaseModel):
    reward: RewardSummary
    hero: HeroProfileSchema
    world: WorldStateSchema
    session: FocusSessionSchema


class SessionHistoryResponse(BaseModel):
    sessions: list[FocusSessionSchema]


class InventoryItemSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    item: CosmeticItemSchema
    equipped: bool = False
    created_at: datetime


class InventoryResponse(BaseModel):
    items: list[InventoryItemSchema]


class InventoryEquipRequest(BaseModel):
    item_id: UUID


class WorldUpgradeRequest(BaseModel):
    target: Literal["study", "build", "training", "plaza"]
    level: int = Field(ge=1, le=3)


class WorldStateResponse(BaseModel):
    world: WorldStateSchema
