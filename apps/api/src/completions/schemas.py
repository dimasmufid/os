from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.completions.models import CompletionSource

__all__ = [
    "CompletionCreate",
    "NodeCompletionPublic",
]


class CompletionCreate(BaseModel):
    source: CompletionSource = CompletionSource.MANUAL
    completed_at: datetime | None = None


class NodeCompletionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    node_id: UUID
    completed_at: datetime
    source: CompletionSource
    earned_xp: int
