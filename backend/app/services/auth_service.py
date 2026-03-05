"""
Auth service layer — business logic for user creation, authentication, and
JWT token management.

This is the single source of truth for all password and token operations.
FastAPI routes call into these functions; they never touch the DB or hash
passwords directly.

Dependencies:
  - bcrypt           → password hashing / verification
  - python-jose[cryptography] → JWT encode / decode
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User, UserCreate, UserPublic, TokenResponse
from app.models.enums import UserRole


# ──────────────────────────────────────────────────────────────────
#  Password hashing (bcrypt)
# ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    """Return a bcrypt hash of the plain-text password."""
    return bcrypt.hashpw(
        plain.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Check a plain-text password against its bcrypt hash."""
    return bcrypt.checkpw(
        plain.encode("utf-8"), hashed.encode("utf-8")
    )


# ──────────────────────────────────────────────────────────────────
#  JWT token utilities
# ──────────────────────────────────────────────────────────────────

def create_access_token(
    user_id: uuid.UUID,
    role: UserRole,
    email: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Encode a JWT with the user's id, role, and email as claims.

    The token is signed with the app-wide secret and expires after
    `ACCESS_TOKEN_EXPIRE_MINUTES` (configurable via env).
    """
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload: dict = {
        "sub": str(user_id),
        "email": email,
        "role": role.value,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT.

    Returns the payload dict on success.

    Raises:
        InvalidTokenError: if the token is expired, malformed, or
                           the signature doesn't match.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError as exc:
        raise InvalidTokenError(str(exc)) from exc


# ──────────────────────────────────────────────────────────────────
#  Lookups
# ──────────────────────────────────────────────────────────────────

async def get_user_by_email(
    session: AsyncSession, email: str
) -> Optional[User]:
    """Return a user row by email, or None."""
    stmt = select(User).where(User.email == email)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_user_by_id(
    session: AsyncSession, user_id: uuid.UUID
) -> Optional[User]:
    """Return a user row by primary key, or None."""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


# ──────────────────────────────────────────────────────────────────
#  Custom exceptions
# ──────────────────────────────────────────────────────────────────

class EmailAlreadyExistsError(Exception):
    """Raised when a signup is attempted with a duplicate email."""


class InvalidCredentialsError(Exception):
    """Raised when email / password verification fails."""


class InvalidTokenError(Exception):
    """Raised when a JWT cannot be decoded or has expired."""


# ──────────────────────────────────────────────────────────────────
#  Signup
# ──────────────────────────────────────────────────────────────────

async def create_user(
    session: AsyncSession,
    *,
    data: UserCreate,
) -> TokenResponse:
    """
    Register a new user with email + password credentials.

    Steps:
      1. Check for duplicate email.
      2. Hash the plain-text password.
      3. Persist the User row.
      4. Issue a JWT access token.
      5. Return a TokenResponse (token + UserPublic).

    Raises:
        EmailAlreadyExistsError: if the email is already taken.
    """
    existing = await get_user_by_email(session, data.email)
    if existing is not None:
        raise EmailAlreadyExistsError(
            f"A user with email '{data.email}' already exists"
        )

    user = User(
        id=uuid.uuid4(),
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role,
        auth_provider="credentials",
    )

    session.add(user)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise EmailAlreadyExistsError(
            f"A user with email '{data.email}' already exists"
        )
    await session.refresh(user)

    token = create_access_token(
        user_id=user.id,
        role=user.role,
        email=user.email,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


# ──────────────────────────────────────────────────────────────────
#  Login (credentials)
# ──────────────────────────────────────────────────────────────────

async def verify_credentials(
    session: AsyncSession,
    *,
    email: str,
    password: str,
) -> TokenResponse:
    """
    Verify email + password and return a JWT + user profile.

    Raises:
        InvalidCredentialsError: if the email is unknown, the account is
            OAuth-only, or the password is wrong.
    """
    user = await get_user_by_email(session, email)

    if user is None:
        raise InvalidCredentialsError("Invalid email or password")

    if user.hashed_password is None:
        raise InvalidCredentialsError(
            "This account uses Google sign-in. Please log in with Google."
        )

    if not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Invalid email or password")

    if not user.is_active:
        raise InvalidCredentialsError("This account has been deactivated")

    token = create_access_token(
        user_id=user.id,
        role=user.role,
        email=user.email,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserPublic.model_validate(user),
    )


# ──────────────────────────────────────────────────────────────────
#  Token → User (for protected endpoints)
# ──────────────────────────────────────────────────────────────────

async def get_current_user(
    session: AsyncSession,
    token: str,
) -> User:
    """
    Decode a JWT and return the corresponding User row.

    Raises:
        InvalidTokenError: if the token is invalid or expired.
        InvalidCredentialsError: if the user no longer exists or is inactive.
    """
    payload = decode_access_token(token)

    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise InvalidTokenError("Token payload missing 'sub' claim")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError as exc:
        raise InvalidTokenError(f"Invalid user ID in token: {user_id_str}") from exc

    user = await get_user_by_id(session, user_id)

    if user is None:
        raise InvalidCredentialsError("User not found")

    if not user.is_active:
        raise InvalidCredentialsError("This account has been deactivated")

    return user
