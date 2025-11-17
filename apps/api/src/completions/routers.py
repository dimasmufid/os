from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.auth.dependencies import CurrentUser
from src.completions.schemas import CompletionCreate, NodeCompletionPublic
from src.completions.services import CompletionService, get_completion_service

router = APIRouter(tags=["completions"])


@router.post(
    "/nodes/{node_id}/complete",
    response_model=NodeCompletionPublic,
    status_code=status.HTTP_201_CREATED,
)
async def complete_node(
    node_id: UUID,
    payload: CompletionCreate,
    current_user: CurrentUser,
    service: CompletionService = Depends(get_completion_service),
) -> NodeCompletionPublic:
    completion = await service.complete_node(current_user.id, node_id, payload)
    return NodeCompletionPublic.model_validate(completion)


@router.get("/completions", response_model=list[NodeCompletionPublic])
async def list_completions(
    current_user: CurrentUser,
    service: CompletionService = Depends(get_completion_service),
    node_id: UUID | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[NodeCompletionPublic]:
    completions = await service.list_completions(
        current_user.id,
        node_id=node_id,
        limit=limit,
    )
    return [NodeCompletionPublic.model_validate(item) for item in completions]
