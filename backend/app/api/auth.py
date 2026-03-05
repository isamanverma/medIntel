"""
Auth routes — thin HTTP layer over the auth service.

All business logic (hashing, JWT generation, DB queries) lives in
`app.services.auth_service`.  These endpoints handle only request
parsing, error mapping, and response shaping.

Endpoints:
  POST /signup  → register a new user, return JWT + UserPublic
  POST /login   → verify credentials, return JWT + UserPublic
  GET  /me      → return the current user from a valid JWT
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.models.user import UserCreate, UserPublic, TokenResponse
from app.services.auth_service import (
    create_user,
    verify_credentials,
    get_current_user,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ──────────────────────────────────────────────────────────────────
#  Schemas (request-only; responses use the model-layer types)
# ──────────────────────────────────────────────────────────────────

from pydantic import BaseModel, EmailStr, Field as PydanticField


class LoginRequest(BaseModel):
    """Inbound payload for the login endpoint."""

    email: EmailStr
    password: str = PydanticField(..., min_length=1)


class ErrorResponse(BaseModel):
    """Standard error envelope."""

    detail: str


# ──────────────────────────────────────────────────────────────────
#  POST /auth/signup
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        409: {"model": ErrorResponse, "description": "Email already taken"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def signup(
    body: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """
    Register a new user with email + password credentials.

    Returns a JWT access token alongside the public user profile.
    The frontend BFF proxy is expected to extract the token and set
    it as an HttpOnly cookie before forwarding the UserPublic payload
    to the browser.
    """
    try:
        result = await create_user(session, data=body)
    except EmailAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )

    return result


# ──────────────────────────────────────────────────────────────────
#  POST /auth/login
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Bad credentials"},
    },
)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    """
    Verify email + password and return a JWT access token + user profile.

    The frontend BFF proxy extracts the token, stores it in an HttpOnly
    cookie, and returns only the public user data to the browser.
    """
    try:
        result = await verify_credentials(
            session,
            email=body.email,
            password=body.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )

    return result


# ──────────────────────────────────────────────────────────────────
#  GET /auth/me
# ──────────────────────────────────────────────────────────────────

def _extract_bearer_token(request: Request) -> str:
    """
    Pull the Bearer token from the Authorization header or from
    the `access_token` cookie (set by the Next.js BFF proxy).

    Raises HTTPException 401 if neither source provides a token.
    """
    # 1. Try Authorization header first
    auth_header: str | None = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.removeprefix("Bearer ").strip()

    # 2. Fall back to HttpOnly cookie
    cookie_token: str | None = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.get(
    "/me",
    response_model=UserPublic,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid or expired token"},
    },
)
async def me(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> UserPublic:
    """
    Return the authenticated user's public profile.

    Accepts the JWT via:
      - `Authorization: Bearer <token>` header, OR
      - `access_token` HttpOnly cookie (set by the Next.js BFF).
    """
    token = _extract_bearer_token(request)

    try:
        user = await get_current_user(session, token)
    except (InvalidTokenError, InvalidCredentialsError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserPublic.model_validate(user)
