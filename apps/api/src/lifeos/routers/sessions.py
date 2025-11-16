from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.dependencies import CurrentUser
from src.database import get_async_session
from src.lifeos.models import FocusSession, SessionStatus, TaskTemplate
from src.lifeos.schemas import (
    FocusSessionSchema,
    RewardSummary,
    SessionCompleteRequest,
    SessionCompleteResponse,
    SessionHistoryResponse,
    SessionStartRequest,
    SessionStartResponse,
)
from src.lifeos.services.profile import ensure_hero_profile, ensure_world_state
from src.lifeos.services.reward import RewardService

router = APIRouter(prefix="/sessions", tags=["sessions"])

UNLOCK_LAYER_LABELS = {
    "study_room_level": "study",
    "build_room_level": "build",
    "plaza_level": "plaza",
}


async def _load_session_for_user(
    session_id: UUID,
    user_id: UUID,
    session: AsyncSession,
) -> FocusSession:
    stmt = (
        select(FocusSession)
        .options(
            selectinload(FocusSession.reward_cosmetic_item),
        )
        .where(
            FocusSession.id == session_id,
            FocusSession.user_id == user_id,
        )
    )
    focus_session = await session.scalar(stmt)
    if not focus_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    return focus_session


@router.post("/start", response_model=SessionStartResponse)
async def start_session(
    payload: SessionStartRequest,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> SessionStartResponse:
    pending_stmt = select(FocusSession.id).where(
        FocusSession.user_id == user.id,
        FocusSession.status == SessionStatus.PENDING,
    )
    existing = await session.scalar(pending_stmt)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active session.",
        )

    if payload.task_template_id:
        task_stmt = select(TaskTemplate.id).where(
            TaskTemplate.id == payload.task_template_id,
            TaskTemplate.user_id == user.id,
        )
        task_exists = await session.scalar(task_stmt)
        if not task_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task template not found.",
            )

    duration = payload.duration_minutes
    expected_end = datetime.now(UTC) + timedelta(minutes=duration)
    focus_session = FocusSession(
        user_id=user.id,
        task_template_id=payload.task_template_id,
        duration_minutes=duration,
        room=payload.room,
        expected_end_time=expected_end,
    )
    session.add(focus_session)
    await session.commit()
    await session.refresh(focus_session)
    return SessionStartResponse(
        session_id=focus_session.id,
        expected_end_time=focus_session.expected_end_time,
        status=focus_session.status,
    )


@router.post(
    "/complete",
    response_model=SessionCompleteResponse,
    name="sessions:complete",
)
async def complete_session(
    payload: SessionCompleteRequest,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> SessionCompleteResponse:
    focus_session = await _load_session_for_user(payload.session_id, user.id, session)
    if focus_session.status != SessionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already resolved.",
        )

    hero = await ensure_hero_profile(session, user.id)
    world_state = await ensure_world_state(session, user.id)
    reward_service = RewardService(session)
    reward = await reward_service.apply_success(
        hero=hero,
        world_state=world_state,
        duration_minutes=focus_session.duration_minutes,
        user_id=user.id,
    )

    focus_session.status = SessionStatus.SUCCESS
    focus_session.completed_at = datetime.now(UTC)
    focus_session.reward_exp = reward.exp_reward
    focus_session.reward_gold = reward.gold_reward
    if reward.dropped_item:
        focus_session.reward_cosmetic_item_id = reward.dropped_item.id

    await session.commit()
    await session.refresh(focus_session)
    hero = await ensure_hero_profile(session, user.id)
    world_state = await ensure_world_state(session, user.id)

    unlocked = [
        UNLOCK_LAYER_LABELS.get(layer, layer) for layer in reward.unlocked_layers
    ]
    reward_summary = RewardSummary(
        exp_reward=reward.exp_reward,
        gold_reward=reward.gold_reward,
        level_ups=reward.level_ups,
        dropped_item=reward.dropped_item,
        unlocked_layers=unlocked,
    )

    return SessionCompleteResponse(
        reward=reward_summary,
        hero=hero,
        world=world_state,
        session=focus_session,
    )


@router.post("/cancel", response_model=FocusSessionSchema)
async def cancel_session(
    payload: SessionCompleteRequest,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> FocusSessionSchema:
    focus_session = await _load_session_for_user(payload.session_id, user.id, session)
    if focus_session.status != SessionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already resolved.",
        )

    focus_session.status = SessionStatus.CANCELLED
    focus_session.cancelled_at = datetime.now(UTC)
    await session.commit()
    await session.refresh(focus_session)
    return focus_session


@router.get("/history", response_model=SessionHistoryResponse)
async def session_history(
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(20, ge=1, le=50),
) -> SessionHistoryResponse:
    stmt = (
        select(FocusSession)
        .options(selectinload(FocusSession.reward_cosmetic_item))
        .where(FocusSession.user_id == user.id)
        .order_by(FocusSession.created_at.desc())
        .limit(limit)
    )
    result = await session.scalars(stmt)
    return SessionHistoryResponse(sessions=list(result))
