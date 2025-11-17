from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "TrackCreate",
    "TrackListItem",
    "TrackReorderItem",
    "TrackReorderRequest",
    "TrackStats",
    "TrackUpdate",
]


class TrackBase(BaseModel):
    name: str = Field(..., max_length=255)
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=64)


class TrackCreate(TrackBase):
    pass


class TrackUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    color: str | None = Field(default=None, max_length=32)
    icon: str | None = Field(default=None, max_length=64)
    position: int | None = Field(default=None, ge=0)


class TrackStats(BaseModel):
    node_count: int = 0
    completion_count: int = 0


class TrackListItem(TrackBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    created_at: datetime
    updated_at: datetime | None = None
    stats: TrackStats


class TrackReorderItem(BaseModel):
    track_id: UUID
    position: int = Field(..., ge=0)


class TrackReorderRequest(BaseModel):
    items: list[TrackReorderItem]
