from __future__ import annotations

from fastapi import APIRouter, Depends

from src.auth.dependencies import CurrentUser
from src.badges.schemas import BadgePublic, UserBadgePublic
from src.badges.services import BadgeService, get_badge_service

router = APIRouter(tags=["badges"])


@router.get("/badges", response_model=list[BadgePublic])
async def list_badges(
    service: BadgeService = Depends(get_badge_service),
) -> list[BadgePublic]:
    badges = await service.list_badges()
    return [BadgePublic.model_validate(badge) for badge in badges]


@router.get("/me/badges", response_model=list[UserBadgePublic])
async def list_user_badges(
    current_user: CurrentUser,
    service: BadgeService = Depends(get_badge_service),
) -> list[UserBadgePublic]:
    badges = await service.list_user_badges(current_user.id)
    return [UserBadgePublic.model_validate(badge) for badge in badges]
