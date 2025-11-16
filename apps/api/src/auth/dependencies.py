from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from src.auth.models import User
from src.auth.schemas import UserPublic
from src.auth.services.users import current_active_user


async def get_current_user(user: User = Depends(current_active_user)) -> UserPublic:
    return UserPublic(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        profile_picture=user.profile_picture,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


CurrentUser = Annotated[UserPublic, Depends(get_current_user)]


__all__ = [
    "CurrentUser",
    "get_current_user",
]
