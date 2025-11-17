from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from uuid import UUID

from fastapi import Depends
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.badges.models import Badge, UserBadge
from src.database import get_async_session

__all__ = [
    "BadgeService",
    "BadgeCategory",
    "get_badge_service",
]


class BadgeCategory(str, Enum):
    STREAK = "streak"
    COMPLETION = "completion"
    TIME = "time"


@dataclass(frozen=True)
class BadgeRule:
    slug: str
    name: str
    description: str
    category: BadgeCategory
    threshold: int
    icon: str | None = None
    base_xp: int = 50


BADGE_RULES: list[BadgeRule] = [
    BadgeRule(
        slug="streak_3",
        name="Spark Starter",
        description="Maintain a 3-day streak.",
        category=BadgeCategory.STREAK,
        threshold=3,
    ),
    BadgeRule(
        slug="streak_7",
        name="Momentum Maker",
        description="Stay consistent for 7 consecutive days.",
        category=BadgeCategory.STREAK,
        threshold=7,
        base_xp=100,
    ),
    BadgeRule(
        slug="streak_30",
        name="Unbreakable",
        description="Reach a 30-day streak.",
        category=BadgeCategory.STREAK,
        threshold=30,
        base_xp=200,
    ),
    BadgeRule(
        slug="completion_10",
        name="Task Tinkerer",
        description="Complete 10 nodes.",
        category=BadgeCategory.COMPLETION,
        threshold=10,
    ),
    BadgeRule(
        slug="completion_50",
        name="Task Master",
        description="Complete 50 nodes.",
        category=BadgeCategory.COMPLETION,
        threshold=50,
        base_xp=150,
    ),
    BadgeRule(
        slug="time_100",
        name="Centurion",
        description="Log 100 minutes of focus time.",
        category=BadgeCategory.TIME,
        threshold=100,
    ),
    BadgeRule(
        slug="time_1000",
        name="Timekeeper",
        description="Accumulate 1,000 minutes of focus time.",
        category=BadgeCategory.TIME,
        threshold=1000,
        base_xp=200,
    ),
]


class BadgeService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self._seeded = False

    async def list_badges(self) -> list[Badge]:
        await self._ensure_seeded()
        stmt: Select[tuple[Badge]] = select(Badge).order_by(Badge.name)
        badges = await self.session.scalars(stmt)
        return list(badges)

    async def list_user_badges(self, user_id: UUID) -> list[UserBadge]:
        await self._ensure_seeded()
        stmt: Select[tuple[UserBadge]] = (
            select(UserBadge)
            .join(Badge)
            .where(UserBadge.user_id == user_id)
            .order_by(UserBadge.awarded_at.desc())
        )
        badges = await self.session.scalars(stmt)
        return list(badges)

    async def evaluate_badges(
        self,
        user_id: UUID,
        *,
        streak_days: int | None = None,
        completion_count: int | None = None,
        time_minutes: int | None = None,
    ) -> list[UserBadge]:
        await self._ensure_seeded()
        awarded: list[UserBadge] = []
        for rule in BADGE_RULES:
            if rule.category is BadgeCategory.STREAK and streak_days is not None:
                if streak_days >= rule.threshold:
                    badge = await self._award_if_needed(user_id, rule)
                    if badge:
                        awarded.append(badge)
            elif (
                rule.category is BadgeCategory.COMPLETION
                and completion_count is not None
            ):
                if completion_count >= rule.threshold:
                    badge = await self._award_if_needed(user_id, rule)
                    if badge:
                        awarded.append(badge)
            elif rule.category is BadgeCategory.TIME and time_minutes is not None:
                if time_minutes >= rule.threshold:
                    badge = await self._award_if_needed(user_id, rule)
                    if badge:
                        awarded.append(badge)
        return awarded

    async def _award_if_needed(
        self,
        user_id: UUID,
        rule: BadgeRule,
    ) -> UserBadge | None:
        badge = await self._get_badge_by_slug(rule)
        stmt = select(UserBadge).where(
            UserBadge.user_id == user_id,
            UserBadge.badge_id == badge.id,
        )
        exists = await self.session.scalar(stmt)
        if exists:
            return None
        award = UserBadge(user_id=user_id, badge_id=badge.id)
        self.session.add(award)
        await self.session.flush()
        await self.session.refresh(award)
        return award

    async def _get_badge_by_slug(self, rule: BadgeRule) -> Badge:
        stmt = select(Badge).where(Badge.slug == rule.slug)
        badge = await self.session.scalar(stmt)
        if badge is None:
            badge = Badge(
                slug=rule.slug,
                name=rule.name,
                description=rule.description,
                icon=rule.icon,
                base_xp=rule.base_xp,
            )
            self.session.add(badge)
            await self.session.flush()
        return badge

    async def _ensure_seeded(self) -> None:
        if self._seeded:
            return
        existing = {
            slug
            for slug in await self.session.scalars(select(Badge.slug))
            if slug is not None
        }
        added = False
        for rule in BADGE_RULES:
            if rule.slug not in existing:
                badge = Badge(
                    slug=rule.slug,
                    name=rule.name,
                    description=rule.description,
                    icon=rule.icon,
                    base_xp=rule.base_xp,
                )
                self.session.add(badge)
                added = True
        if added:
            await self.session.flush()
        self._seeded = True


def get_badge_service(
    session: AsyncSession = Depends(get_async_session),
) -> BadgeService:
    return BadgeService(session)
