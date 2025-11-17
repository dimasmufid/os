from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

__all__ = [
    "DocCreate",
    "DocPublic",
    "DocUpdate",
]


class DocBase(BaseModel):
    title: str = Field(..., max_length=255)
    content_md: str
    track_id: UUID | None = None
    node_id: UUID | None = None

    @model_validator(mode="after")
    def validate_link(self) -> "DocBase":
        if not self.track_id and not self.node_id:
            raise ValueError("A document must be linked to a track or node")
        return self


class DocCreate(DocBase):
    pass


class DocUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    content_md: str | None = None
    track_id: UUID | None = None
    node_id: UUID | None = None

    @model_validator(mode="after")
    def validate_link(self) -> "DocUpdate":
        if self.track_id is None and self.node_id is None:
            return self
        return self


class DocPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    content_md: str
    track_id: UUID | None = None
    node_id: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None
