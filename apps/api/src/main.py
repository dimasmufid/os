from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from src.auth import auth_router, oauth_google_router
from src.badges import badges_router
from src.completions import completions_router
from src.config import app_configs, settings
from src.docs import docs_router
from src.gamification import gamification_router
from src.nodes import nodes_router
from src.time_tracking import time_tracking_router
from src.tracks import tracks_router


@asynccontextmanager
async def lifespan(_application: FastAPI) -> AsyncGenerator:
    # Startup
    yield
    # Shutdown


app = FastAPI(**app_configs, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGINS_REGEX,
    allow_credentials=True,
    allow_methods=("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"),
    allow_headers=settings.CORS_HEADERS,
)

if settings.ENVIRONMENT.is_deployed:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
    )


app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(oauth_google_router, prefix="/api/v1/oauth")
app.include_router(tracks_router, prefix="/api/v1")
app.include_router(nodes_router, prefix="/api/v1")
app.include_router(time_tracking_router, prefix="/api/v1")
app.include_router(completions_router, prefix="/api/v1")
app.include_router(gamification_router, prefix="/api/v1")
app.include_router(badges_router, prefix="/api/v1")
app.include_router(docs_router, prefix="/api/v1")


@app.get("/healthcheck", include_in_schema=False)
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
