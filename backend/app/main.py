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

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.engine import init_db
from app.api.auth import router as auth_router
from app.api.profiles import router as profiles_router
from app.api.appointments import router as appointments_router
from app.api.mappings import router as mappings_router
from app.api.treatments import router as treatments_router
from app.api.reports import router as reports_router
from app.api.adherence import router as adherence_router


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
    version="0.1.0",
    lifespan=lifespan,
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ──────────────────────────────────────────────────────────────────
#  Health check
# ──────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["infra"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "medintel-api"}
