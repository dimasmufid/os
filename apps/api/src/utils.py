import logging
import random
import re
import string
import unicodedata
from typing import Callable, Mapping
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import Tenant
from src.config import settings

logger = logging.getLogger(__name__)

ALPHA_NUM = string.ascii_letters + string.digits


def generate_random_alphanum(length: int = 20) -> str:
    return "".join(random.choices(ALPHA_NUM, k=length))


def slugify(value: str, *, default: str = "organization") -> str:
    """
    Generate a URL-safe slug from the provided value.

    Falls back to ``default`` if the normalized string is empty.
    """
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value).strip("-").lower()
    return slug or default


async def generate_unique_slug(
    session: AsyncSession,
    base_value: str,
    *,
    slugifier: Callable[[str], str] = slugify,
) -> str:
    """
    Produce a unique slug for the tenant table based on ``base_value``.

    Appends a numeric suffix when necessary.
    """
    base_slug = slugifier(base_value)
    candidate = base_slug
    suffix = 1

    while True:
        result = await session.execute(
            select(Tenant.id).where(Tenant.slug == candidate)
        )
        if result.scalar_one_or_none() is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1


def _normalize_path(path: str) -> str:
    return path if path.startswith("/") else f"/{path}"


def build_absolute_url(
    base_url: str | None,
    path: str,
    query: Mapping[str, str] | None = None,
) -> str:
    if not base_url:
        raise ValueError("Base URL is not configured.")

    normalized_base = base_url.rstrip("/")
    url = f"{normalized_base}{_normalize_path(path)}"
    if query:
        url = f"{url}?{urlencode(query)}"
    return url


def build_frontend_url(path: str, query: Mapping[str, str] | None = None) -> str:
    base = settings.FRONTEND_BASE_URL or settings.APP_BASE_URL
    if base is None:
        raise ValueError("FRONTEND_BASE_URL is not configured.")
    return build_absolute_url(str(base), path, query)


def build_app_url(path: str, query: Mapping[str, str] | None = None) -> str:
    if settings.APP_BASE_URL is None:
        raise ValueError("APP_BASE_URL is not configured.")
    return build_absolute_url(str(settings.APP_BASE_URL), path, query)
