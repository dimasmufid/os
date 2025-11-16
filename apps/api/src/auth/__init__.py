from __future__ import annotations

from src.auth.routers.auth import router as auth_router
from src.auth.routers.oauth_google import router as oauth_google_router

__all__ = [
    "auth_router",
    "oauth_google_router",
]
