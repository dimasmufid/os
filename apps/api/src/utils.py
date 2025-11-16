import random
import string
from typing import Mapping
from urllib.parse import urlencode

from src.config import settings

ALPHA_NUM = string.ascii_letters + string.digits


def generate_random_alphanum(length: int = 20) -> str:
    return "".join(random.choices(ALPHA_NUM, k=length))


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
