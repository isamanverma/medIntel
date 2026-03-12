"""
MedIntel Backend — FastAPI application entry point.

Responsibilities:
  - CORS configuration (allows the Next.js frontend to call the API)
  - Lifespan hook for DB initialisation on startup
  - Health-check endpoint
  - Router mounting (v1 auth, plus future domain routers)
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.db.engine import init_db
from app.api.auth import router as auth_router
from app.api.profiles import router as profiles_router
from app.api.appointments import router as appointments_router
from app.api.mappings import router as mappings_router
from app.api.treatments import router as treatments_router
from app.api.reports import router as reports_router
from app.api.adherence import router as adherence_router
from app.api.admin import router as admin_router
from app.api.referrals import router as referrals_router
from app.api.care_teams import router as care_teams_router
from app.api.chat import router as chat_router
from app.api.video import router as video_router


# ──────────────────────────────────────────────────────────────────
#  Lifespan
# ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Run once on startup / shutdown."""
    await init_db()
    yield


# ──────────────────────────────────────────────────────────────────
#  App factory
# ──────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MedIntel API",
    description="AI-powered healthcare intelligence platform — backend services.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)


# ──────────────────────────────────────────────────────────────────
#  Rate Limiting (ISSUE-003)
# ──────────────────────────────────────────────────────────────────

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


# ──────────────────────────────────────────────────────────────────
#  CORS — allow the Next.js frontend (dev + prod origins)
#
#  allow_credentials=True is CRITICAL for the Hybrid BFF pattern:
#  the browser sends the HttpOnly cookie set by the Next.js proxy,
#  and FastAPI must accept it on cross-origin requests.
# ──────────────────────────────────────────────────────────────────

ALLOWED_ORIGINS: list[str] = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    settings.FRONTEND_URL,
]
# Deduplicate while preserving order
ALLOWED_ORIGINS = list(dict.fromkeys(ALLOWED_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────
#  CSRF Protection (ISSUE-016)
# ──────────────────────────────────────────────────────────────────

from app.middleware.csrf import CSRFMiddleware  # noqa: E402

app.add_middleware(CSRFMiddleware)


# ──────────────────────────────────────────────────────────────────
#  Routers
# ──────────────────────────────────────────────────────────────────

# Auth (signup, login, me)
app.include_router(auth_router, prefix="/api")

# Domain APIs
app.include_router(profiles_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(mappings_router, prefix="/api")
app.include_router(treatments_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(adherence_router, prefix="/api")
app.include_router(admin_router)  # already has /api/admin prefix
app.include_router(referrals_router, prefix="/api")
app.include_router(care_teams_router, prefix="/api")
app.include_router(video_router)  # has its own /api/video prefix
app.include_router(chat_router)   # prefix handles /api/chat internally


# ──────────────────────────────────────────────────────────────────
#  Health check
# ──────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["infra"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "medintel-api"}
