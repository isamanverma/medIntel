"""
Shared pytest fixtures for MedIntel backend tests.

Design:
  - All test users are created via HTTP calls to the signup endpoint.
  - The async engine uses NullPool for tests to prevent event-loop-closed errors
    when asyncpg connections outlive the test function.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.enums import UserRole


# ── Patch engine to use NullPool BEFORE importing app ─────────────

import app.db.engine as engine_module

_test_engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    future=True,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# Replace the engine and session factory in the app module
engine_module.async_engine = _test_engine
engine_module.async_session_factory = async_sessionmaker(
    bind=_test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Now safe to import the app (will use our patched engine)
from app.main import app  # noqa: E402


# ── Types ─────────────────────────────────────────────────────────

@dataclass
class _TestUser:
    """Lightweight user representation for tests."""
    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    access_token: str


# Re-export for use in test files
TestUser = _TestUser


# ── HTTP client fixture ──────────────────────────────────────────

@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Provide an async HTTP test client bound to the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ── Helper: create test user via API ──────────────────────────────

@pytest_asyncio.fixture
async def make_user(client: AsyncClient):
    """
    Factory fixture that creates a user via the signup API.

    Returns a TestUser with id, email, role, and access_token.
    """
    async def _make_user(
        role: UserRole = UserRole.PATIENT,
        email: str | None = None,
        password: str = "TestPass123!",
        name: str | None = None,
    ) -> _TestUser:
        _email = email or f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        _name = name or f"Test {role.value.title()}"

        resp = await client.post("/api/auth/signup", json={
            "email": _email,
            "password": password,
            "name": _name,
            "role": role.value,
        })
        assert resp.status_code == 201, f"Signup failed: {resp.text}"
        data = resp.json()

        return _TestUser(
            id=uuid.UUID(data["user"]["id"]),
            email=data["user"]["email"],
            name=data["user"]["name"],
            role=UserRole(data["user"]["role"]),
            access_token=data["access_token"],
        )

    return _make_user


# ── Auth helpers ──────────────────────────────────────────────────

def auth_header(user: _TestUser) -> dict[str, str]:
    """Return an Authorization header dict for a test user."""
    return {"Authorization": f"Bearer {user.access_token}"}
