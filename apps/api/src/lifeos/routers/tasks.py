from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import CurrentUser
from src.database import get_async_session
from src.lifeos.models import TaskTemplate
from src.lifeos.schemas import (
    TaskTemplateCreate,
    TaskTemplateSchema,
    TaskTemplateUpdate,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskTemplateSchema], name="tasks:list")
async def list_tasks(
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> list[TaskTemplateSchema]:
    stmt = (
        select(TaskTemplate)
        .where(TaskTemplate.user_id == user.id)
        .order_by(TaskTemplate.created_at.asc())
    )
    result = await session.scalars(stmt)
    return list(result)


@router.post("", response_model=TaskTemplateSchema, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskTemplateCreate,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> TaskTemplate:
    task = TaskTemplate(
        user_id=user.id,
        name=payload.name,
        category=payload.category,
        default_duration=payload.default_duration,
        room=payload.room,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskTemplateSchema)
async def update_task(
    task_id: UUID,
    payload: TaskTemplateUpdate,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> TaskTemplate:
    stmt = select(TaskTemplate).where(
        TaskTemplate.id == task_id,
        TaskTemplate.user_id == user.id,
    )
    task = await session.scalar(stmt)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    if payload.name is not None:
        task.name = payload.name
    if payload.category is not None:
        task.category = payload.category
    if payload.default_duration is not None:
        task.default_duration = payload.default_duration
    if payload.room is not None:
        task.room = payload.room

    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def delete_task(
    task_id: UUID,
    user: CurrentUser,
    session: AsyncSession = Depends(get_async_session),
) -> None:
    stmt = select(TaskTemplate).where(
        TaskTemplate.id == task_id,
        TaskTemplate.user_id == user.id,
    )
    task = await session.scalar(stmt)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found.",
        )

    await session.delete(task)
    await session.commit()
