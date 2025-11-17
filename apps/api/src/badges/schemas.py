from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

__all__ = [
    "BadgePublic",
    "UserBadgePublic",
]


class BadgePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    name: str
    description: str | None = None
    icon: str | None = None
    base_xp: int


class UserBadgePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    badge: BadgePublic
    awarded_at: datetime
