from __future__ import annotations

from fastapi_users.authentication import JWTStrategy

from src.auth.config import auth_config


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=auth_config.jwt_secret,
        lifetime_seconds=int(auth_config.access_token_ttl.total_seconds()),
    )
