from __future__ import annotations

from fastapi import APIRouter, Depends

from src.auth.dependencies import CurrentUser
from src.gamification.schemas import ProgressSummary, UserStatsPublic
from src.gamification.services import (
    GamificationService,
    get_gamification_service,
)

router = APIRouter(prefix="/me", tags=["gamification"])


@router.get("/stats", response_model=UserStatsPublic)
async def get_stats(
    current_user: CurrentUser,
    service: GamificationService = Depends(get_gamification_service),
) -> UserStatsPublic:
    return await service.get_user_stats(current_user.id)


@router.get("/progress/summary", response_model=ProgressSummary)
async def get_progress_summary(
    current_user: CurrentUser,
    service: GamificationService = Depends(get_gamification_service),
) -> ProgressSummary:
    return await service.get_progress_summary(current_user.id)
