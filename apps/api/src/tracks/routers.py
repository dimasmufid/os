from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status

from src.auth.dependencies import CurrentUser
from src.tracks.schemas import (
    TrackCreate,
    TrackListItem,
    TrackReorderRequest,
    TrackStats,
    TrackUpdate,
)
from src.tracks.services import TrackService, get_track_service

router = APIRouter(prefix="/tracks", tags=["tracks"])


@router.get("", response_model=list[TrackListItem])
async def list_tracks(
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> list[TrackListItem]:
    aggregates = await service.list_tracks(current_user.id)
    response: list[TrackListItem] = []
    for aggregate in aggregates:
        track = aggregate.track
        response.append(
            TrackListItem(
                id=track.id,
                name=track.name,
                color=track.color,
                icon=track.icon,
                position=track.position,
                created_at=track.created_at,
                updated_at=track.updated_at,
                stats=TrackStats(
                    node_count=aggregate.node_count,
                    completion_count=aggregate.completion_count,
                ),
            )
        )
    return response


@router.post(
    "",
    response_model=TrackListItem,
    status_code=status.HTTP_201_CREATED,
)
async def create_track(
    payload: TrackCreate,
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> TrackListItem:
    track = await service.create_track(current_user.id, payload)
    return TrackListItem(
        id=track.id,
        name=track.name,
        color=track.color,
        icon=track.icon,
        position=track.position,
        created_at=track.created_at,
        updated_at=track.updated_at,
        stats=TrackStats(node_count=0, completion_count=0),
    )


@router.get("/{track_id}", response_model=TrackListItem)
async def get_track(
    track_id: UUID,
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> TrackListItem:
    aggregate = await service.get_track_with_stats(current_user.id, track_id)
    track = aggregate.track
    return TrackListItem(
        id=track.id,
        name=track.name,
        color=track.color,
        icon=track.icon,
        position=track.position,
        created_at=track.created_at,
        updated_at=track.updated_at,
        stats=TrackStats(
            node_count=aggregate.node_count,
            completion_count=aggregate.completion_count,
        ),
    )


@router.patch("/{track_id}", response_model=TrackListItem)
async def update_track(
    track_id: UUID,
    payload: TrackUpdate,
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> TrackListItem:
    track = await service.update_track(current_user.id, track_id, payload)
    aggregate = await service.get_track_with_stats(current_user.id, track_id)
    return TrackListItem(
        id=track.id,
        name=track.name,
        color=track.color,
        icon=track.icon,
        position=track.position,
        created_at=track.created_at,
        updated_at=track.updated_at,
        stats=TrackStats(
            node_count=aggregate.node_count,
            completion_count=aggregate.completion_count,
        ),
    )


@router.delete("/{track_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_track(
    track_id: UUID,
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> None:
    await service.delete_track(current_user.id, track_id)


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_tracks(
    payload: TrackReorderRequest,
    current_user: CurrentUser,
    service: TrackService = Depends(get_track_service),
) -> None:
    await service.reorder_tracks(current_user.id, payload.items)
