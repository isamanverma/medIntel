"""
Backward-compatibility shim.

All database primitives now live in ``app.db.engine``.  This module
re-exports them so that existing callers (Alembic env.py, old route
files, tests, etc.) continue to work without changes.
"""

from app.db.engine import (  # noqa: F401
    async_engine,
    async_session_factory,
    get_session,
    init_db,
)

__all__ = [
    "async_engine",
    "async_session_factory",
    "get_session",
    "init_db",
]
