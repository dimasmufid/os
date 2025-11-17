from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status

from src.auth.dependencies import CurrentUser
from src.nodes.schemas import (
    HabitSchedulePayload,
    HabitScheduleResponse,
    NodeCreate,
    NodePublic,
    NodeReorderItem,
    NodeUpdate,
)
from src.nodes.services import NodeService, get_node_service

router = APIRouter(tags=["nodes"])


@router.get("/tracks/{track_id}/nodes", response_model=list[NodePublic])
async def list_nodes(
    track_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> list[NodePublic]:
    nodes = await service.list_nodes(current_user.id, track_id)
    return [NodePublic.model_validate(node) for node in nodes]


@router.post(
    "/tracks/{track_id}/nodes",
    response_model=NodePublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_node(
    track_id: UUID,
    payload: NodeCreate,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> NodePublic:
    node = await service.create_node(current_user.id, track_id, payload)
    return NodePublic.model_validate(node)


@router.get("/nodes/{node_id}", response_model=NodePublic)
async def get_node(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> NodePublic:
    node = await service.get_node(current_user.id, node_id)
    return NodePublic.model_validate(node)


@router.patch("/nodes/{node_id}", response_model=NodePublic)
async def update_node(
    node_id: UUID,
    payload: NodeUpdate,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> NodePublic:
    node = await service.update_node(current_user.id, node_id, payload)
    return NodePublic.model_validate(node)


@router.delete("/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> None:
    await service.delete_node(current_user.id, node_id)


@router.post("/nodes/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_nodes(
    payload: list[NodeReorderItem],
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> None:
    await service.reorder_nodes(current_user.id, payload)


@router.post("/nodes/{node_id}/lock", response_model=NodePublic)
async def lock_node(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> NodePublic:
    node = await service.set_lock_state(current_user.id, node_id, True)
    return NodePublic.model_validate(node)


@router.post("/nodes/{node_id}/unlock", response_model=NodePublic)
async def unlock_node(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> NodePublic:
    node = await service.set_lock_state(current_user.id, node_id, False)
    return NodePublic.model_validate(node)


@router.put("/nodes/{node_id}/habit-schedule", response_model=HabitScheduleResponse)
async def upsert_habit_schedule(
    node_id: UUID,
    payload: HabitSchedulePayload,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> HabitScheduleResponse:
    schedule = await service.upsert_habit_schedule(current_user.id, node_id, payload)
    return HabitScheduleResponse.model_validate(schedule)


@router.get("/nodes/{node_id}/habit-schedule", response_model=HabitScheduleResponse)
async def get_habit_schedule(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> HabitScheduleResponse:
    schedule = await service.get_habit_schedule(current_user.id, node_id)
    return HabitScheduleResponse.model_validate(schedule)


@router.delete(
    "/nodes/{node_id}/habit-schedule",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_habit_schedule(
    node_id: UUID,
    current_user: CurrentUser,
    service: NodeService = Depends(get_node_service),
) -> None:
    await service.delete_habit_schedule(current_user.id, node_id)
