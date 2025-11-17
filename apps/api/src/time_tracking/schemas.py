from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

__all__ = [
    "ManualTimeEntryRequest",
    "StartTimeEntryRequest",
    "TimeEntryPublic",
    "TimeEntrySummaryItem",
]


class StartTimeEntryRequest(BaseModel):
    node_id: UUID


class ManualTimeEntryRequest(BaseModel):
    node_id: UUID
    started_at: datetime
    ended_at: datetime

    @property
    def duration_minutes(self) -> float:
        delta = self.ended_at - self.started_at
        return delta.total_seconds() / 60


class TimeEntryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    node_id: UUID
    started_at: datetime
    ended_at: datetime | None = None
    duration_min: int | None = None


class TimeEntrySummaryItem(BaseModel):
    node_id: UUID
    day: date
    total_minutes: int
