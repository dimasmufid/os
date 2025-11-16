from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from fastapi_users.authentication import CookieTransport

from src.config import settings


def _determine_cookie_secure() -> bool:
    """
    Respect explicit AUTH_COOKIE_SECURE overrides. Otherwise, default to
    secure cookies only when the environment is not running in debug mode
    so local HTTP development can rely on cookie-based sessions.
    """
    if "AUTH_COOKIE_SECURE" in settings.model_fields_set:
        return settings.AUTH_COOKIE_SECURE
    return not settings.ENVIRONMENT.is_debug


@dataclass(frozen=True)
class AuthConfig:
    access_token_ttl: timedelta
    refresh_token_ttl: timedelta
    jwt_secret: str
    cookie_domain: str | None
    cookie_secure: bool
    cookie_samesite: str
    access_cookie_name: str
    refresh_cookie_name: str

    @property
    def access_cookie_max_age(self) -> int:
        return int(self.access_token_ttl.total_seconds())

    @property
    def refresh_cookie_max_age(self) -> int:
        return int(self.refresh_token_ttl.total_seconds())

    def create_cookie_transport(self) -> CookieTransport:
        return CookieTransport(
            cookie_name=self.access_cookie_name,
            cookie_max_age=self.access_cookie_max_age,
            cookie_domain=self.cookie_domain,
            cookie_secure=self.cookie_secure,
            cookie_httponly=True,
            cookie_samesite=self.cookie_samesite,
        )


auth_config = AuthConfig(
    access_token_ttl=timedelta(minutes=settings.AUTH_ACCESS_TOKEN_TTL_MIN),
    refresh_token_ttl=timedelta(days=settings.AUTH_REFRESH_TTL_DAYS),
    jwt_secret=settings.AUTH_JWT_SECRET,
    cookie_domain=settings.AUTH_COOKIE_DOMAIN,
    cookie_secure=_determine_cookie_secure(),
    cookie_samesite=settings.AUTH_COOKIE_SAMESITE,
    access_cookie_name=settings.AUTH_COOKIE_ACCESS_NAME,
    refresh_cookie_name=settings.AUTH_COOKIE_REFRESH_NAME,
)
