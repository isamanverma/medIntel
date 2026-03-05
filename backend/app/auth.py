"""
Backward-compatibility shim.

The auth router now lives in ``app.api.v1.auth``.  This module
re-exports it so that any existing code importing from ``app.auth``
continues to work without changes.
"""

from app.api.v1.auth import router  # noqa: F401

__all__ = ["router"]
