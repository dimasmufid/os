from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.nodes.models import HabitFrequency, NodeType

__all__ = [
    "HabitSchedulePayload",
    "HabitScheduleResponse",
    "NodeCreate",
    "NodePublic",
    "NodeReorderItem",
    "NodeUpdate",
]


class HabitSchedulePayload(BaseModel):
    frequency: HabitFrequency
    days_of_week: list[int] | None = None
    days_of_month: list[int] | None = None

    @model_validator(mode="after")
    def validate_fields(self) -> "HabitSchedulePayload":
        if self.frequency == HabitFrequency.WEEKLY:
            if not self.days_of_week:
                raise ValueError("days_of_week is required for weekly habits")
            for day in self.days_of_week:
                if day < 0 or day > 6:
                    raise ValueError("days_of_week must be between 0 and 6")
        elif self.frequency == HabitFrequency.MONTHLY:
            if not self.days_of_month:
                raise ValueError("days_of_month is required for monthly habits")
            for day in self.days_of_month:
                if day < 1 or day > 31:
                    raise ValueError("days_of_month must be between 1 and 31")
        else:
            self.days_of_week = None
            self.days_of_month = None

        return self

    def to_meta(self) -> dict[str, Any] | None:
        meta: dict[str, Any] = {}
        if self.days_of_week:
            meta["days_of_week"] = self.days_of_week
        if self.days_of_month:
            meta["days_of_month"] = self.days_of_month
        return meta or None


class HabitScheduleResponse(HabitSchedulePayload):
    model_config = ConfigDict(from_attributes=True)

    node_id: UUID


class NodeBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: str | None = None
    type: NodeType
    base_xp: int = Field(default=10, ge=0)
    position: int | None = Field(default=None, ge=0)
    is_locked: bool = False


class NodeCreate(NodeBase):
    habit_schedule: HabitSchedulePayload | None = None


class NodeUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    type: NodeType | None = None
    base_xp: int | None = Field(default=None, ge=0)
    position: int | None = Field(default=None, ge=0)
    is_locked: bool | None = None
    habit_schedule: HabitSchedulePayload | None = None


class NodePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    track_id: UUID
    title: str
    description: str | None
    type: NodeType
    base_xp: int
    is_locked: bool
    position: int
    habit_schedule: HabitScheduleResponse | None = None
    created_at: datetime
    updated_at: datetime | None = None


class NodeReorderItem(BaseModel):
    node_id: UUID
    position: int = Field(..., ge=0)
