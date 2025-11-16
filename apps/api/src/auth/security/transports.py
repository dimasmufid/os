from __future__ import annotations

from fastapi_users.authentication import CookieTransport

from src.auth.config import auth_config


def get_cookie_transport() -> CookieTransport:
    return auth_config.create_cookie_transport()
