from __future__ import annotations

import hashlib
import secrets

_REFRESH_TOKEN_BYTES = 48


def generate_refresh_token() -> str:
    """Generate a cryptographically strong opaque refresh token."""
    return secrets.token_urlsafe(_REFRESH_TOKEN_BYTES)


def hash_token(raw_token: str) -> str:
    """Hash refresh tokens before persisting them."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
