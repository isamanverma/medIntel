"""
Shared FastAPI dependencies for authentication and authorization.

Usage in routes:
    from app.deps import require_patient, require_doctor, require_admin

    @router.get("/my-data")
    async def my_data(user: User = Depends(require_patient)):
        ...
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.models.user import User
from app.models.enums import UserRole
from app.services.auth_service import (
    get_current_user as _get_current_user,
    InvalidTokenError,
    InvalidCredentialsError,
)


# ──────────────────────────────────────────────────────────────────
#  Token extraction helper
# ──────────────────────────────────────────────────────────────────

def _extract_token(request: Request) -> str:
    """
    Extract the JWT from the request.

    Checks (in order):
      1. Authorization: Bearer <token> header
      2. access_token cookie (set by the BFF proxy)

    Raises HTTPException 401 if neither is present.
    """
    # Try Authorization header first
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]

    # Fall back to cookie
    token = request.cookies.get("access_token")
    if token:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ──────────────────────────────────────────────────────────────────
#  Core dependency: get current user
# ──────────────────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> User:
    """
    FastAPI dependency that returns the authenticated User.

    Extracts the JWT from the request, decodes it, and fetches the
    user from the database.

    Raises:
        HTTPException 401: if the token is missing, invalid, or expired.
        HTTPException 401: if the user no longer exists or is inactive.
    """
    token = _extract_token(request)

    try:
        user = await _get_current_user(session, token)
    except InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return user


# ──────────────────────────────────────────────────────────────────
#  Role-checking dependencies
# ──────────────────────────────────────────────────────────────────

async def require_patient(
    user: User = Depends(get_current_user),
) -> User:
    """Only allow PATIENT role."""
    if user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Patient access required",
        )
    return user


async def require_doctor(
    user: User = Depends(get_current_user),
) -> User:
    """Only allow DOCTOR role."""
    if user.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Doctor access required",
        )
    return user


async def require_admin(
    user: User = Depends(get_current_user),
) -> User:
    """Only allow ADMIN role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
