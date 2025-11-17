from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.auth.dependencies import CurrentUser
from src.time_tracking.schemas import (
    ManualTimeEntryRequest,
    StartTimeEntryRequest,
    TimeEntryPublic,
    TimeEntrySummaryItem,
)
from src.time_tracking.services import (
    TimeTrackingService,
    get_time_tracking_service,
)

router = APIRouter(prefix="/time-entries", tags=["time-tracking"])


@router.post(
    "/start",
    response_model=TimeEntryPublic,
    status_code=status.HTTP_201_CREATED,
)
async def start_time_entry(
    payload: StartTimeEntryRequest,
    current_user: CurrentUser,
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> TimeEntryPublic:
    entry = await service.start_entry(current_user.id, payload.node_id)
    return TimeEntryPublic.model_validate(entry)


@router.post("/{entry_id}/stop", response_model=TimeEntryPublic)
async def stop_time_entry(
    entry_id: UUID,
    current_user: CurrentUser,
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> TimeEntryPublic:
    entry = await service.stop_entry(current_user.id, entry_id)
    return TimeEntryPublic.model_validate(entry)


@router.post("", response_model=TimeEntryPublic, status_code=status.HTTP_201_CREATED)
async def create_manual_entry(
    payload: ManualTimeEntryRequest,
    current_user: CurrentUser,
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> TimeEntryPublic:
    entry = await service.create_manual_entry(current_user.id, payload)
    return TimeEntryPublic.model_validate(entry)


@router.get("", response_model=list[TimeEntryPublic])
async def list_entries(
    current_user: CurrentUser,
    service: TimeTrackingService = Depends(get_time_tracking_service),
    node_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[TimeEntryPublic]:
    entries = await service.list_entries(
        current_user.id,
        node_id=node_id,
        limit=limit,
    )
    return [TimeEntryPublic.model_validate(entry) for entry in entries]


@router.get("/summary", response_model=list[TimeEntrySummaryItem])
async def get_summary(
    current_user: CurrentUser,
    service: TimeTrackingService = Depends(get_time_tracking_service),
    days: int = Query(default=14, ge=1, le=90),
) -> list[TimeEntrySummaryItem]:
    rows = await service.summary(current_user.id, days=days)
    return [
        TimeEntrySummaryItem(node_id=node_id, day=day, total_minutes=minutes)
        for node_id, day, minutes in rows
    ]
