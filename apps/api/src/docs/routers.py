from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from src.auth.dependencies import CurrentUser
from src.docs.schemas import DocCreate, DocPublic, DocUpdate
from src.docs.services import DocService, get_doc_service

router = APIRouter(prefix="/docs", tags=["docs"])


@router.get("", response_model=list[DocPublic])
async def list_docs(
    current_user: CurrentUser,
    service: DocService = Depends(get_doc_service),
    track_id: UUID | None = Query(default=None),
    node_id: UUID | None = Query(default=None),
) -> list[DocPublic]:
    docs = await service.list_docs(
        current_user.id,
        track_id=track_id,
        node_id=node_id,
    )
    return [DocPublic.model_validate(doc) for doc in docs]


@router.post("", response_model=DocPublic, status_code=status.HTTP_201_CREATED)
async def create_doc(
    payload: DocCreate,
    current_user: CurrentUser,
    service: DocService = Depends(get_doc_service),
) -> DocPublic:
    doc = await service.create_doc(current_user.id, payload)
    return DocPublic.model_validate(doc)


@router.get("/{doc_id}", response_model=DocPublic)
async def get_doc(
    doc_id: UUID,
    current_user: CurrentUser,
    service: DocService = Depends(get_doc_service),
) -> DocPublic:
    doc = await service.get_doc(current_user.id, doc_id)
    return DocPublic.model_validate(doc)


@router.patch("/{doc_id}", response_model=DocPublic)
async def update_doc(
    doc_id: UUID,
    payload: DocUpdate,
    current_user: CurrentUser,
    service: DocService = Depends(get_doc_service),
) -> DocPublic:
    doc = await service.update_doc(current_user.id, doc_id, payload)
    return DocPublic.model_validate(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_doc(
    doc_id: UUID,
    current_user: CurrentUser,
    service: DocService = Depends(get_doc_service),
) -> None:
    await service.delete_doc(current_user.id, doc_id)
