from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from src.auth.services.oauth import get_google_client
from src.auth.services.users import auth_backend, fastapi_users
from src.config import settings


def get_router() -> APIRouter:
    router = APIRouter()
    client = get_google_client()
    if not client or not settings.OAUTH_GOOGLE_REDIRECT_URI:
        message = "Google OAuth is not configured."

        @router.get("/authorize", include_in_schema=False)
        async def google_authorize_unavailable():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=message,
            )

        @router.get("/callback", include_in_schema=False)
        async def google_callback_unavailable():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=message,
            )

        return router

    oauth_router = fastapi_users.get_oauth_router(
        client,
        auth_backend,
        settings.OAUTH_GOOGLE_REDIRECT_URI,
        associate_by_email=True,
    )
    router.include_router(oauth_router, tags=["auth:google"])
    return router


router = get_router()

__all__ = ["router"]
