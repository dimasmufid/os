from __future__ import annotations

from httpx_oauth.clients.google import GoogleOAuth2

from src.config import settings

_GOOGLE_CLIENT: GoogleOAuth2 | None = None


def get_google_client() -> GoogleOAuth2 | None:
    global _GOOGLE_CLIENT
    if not settings.OAUTH_GOOGLE_CLIENT_ID or not settings.OAUTH_GOOGLE_CLIENT_SECRET:
        return None

    if _GOOGLE_CLIENT is None:
        _GOOGLE_CLIENT = GoogleOAuth2(
            client_id=settings.OAUTH_GOOGLE_CLIENT_ID,
            client_secret=settings.OAUTH_GOOGLE_CLIENT_SECRET,
        )
    return _GOOGLE_CLIENT
