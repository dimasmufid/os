from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

__all__ = [
    "ProgressSummary",
    "UserStatsPublic",
]


class UserStatsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    level: int
    xp_total: int
    xp_to_next: int
    xp_progress: int
    xp_remaining: int
    current_streak_days: int
    last_active_date: date | None = None


class ProgressSummary(BaseModel):
    level: int
    xp_total: int
    xp_to_next: int
    current_streak_days: int
    total_time_minutes: int
    total_completions: int
    today_completions: int
