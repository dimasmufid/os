from __future__ import annotations

from src.auth.routers.auth import router as auth_router
from src.auth.routers.invitations import router as invitations_router
from src.auth.routers.oauth_google import router as oauth_google_router
from src.auth.routers.tenants import router as tenants_router

__all__ = [
    "auth_router",
    "invitations_router",
    "oauth_google_router",
    "tenants_router",
]
