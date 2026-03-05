"""
Async database engine, session factory, and FastAPI dependency.

This is the single source of truth for all database connectivity.
Import `get_session` in your route/dependency signatures to obtain
an `AsyncSession` scoped to the request lifecycle.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from app.core.config import settings

# ──────────────────────────────────────────────────────────────────
#  Engine
# ──────────────────────────────────────────────────────────────────

async_engine: AsyncEngine = create_async_engine(
    settings.async_database_url,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    future=True,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    # Disable asyncpg's prepared-statement caching so that connections
    # work correctly through pgbouncer / Supabase's connection pooler,
    # which operates in "transaction" pool mode.
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)

# ──────────────────────────────────────────────────────────────────
#  Session factory
# ──────────────────────────────────────────────────────────────────

async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ──────────────────────────────────────────────────────────────────
#  FastAPI dependency
# ──────────────────────────────────────────────────────────────────

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async DB session scoped to a single request.

    Usage in a route:
        async def my_route(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with async_session_factory() as session:
        yield session


# ──────────────────────────────────────────────────────────────────
#  Bootstrap helper
# ──────────────────────────────────────────────────────────────────

async def init_db() -> None:
    """
    Create all tables registered in SQLModel.metadata.

    Useful for first-run / testing scenarios where Alembic hasn't
    been executed yet.  In production, prefer Alembic migrations.
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
