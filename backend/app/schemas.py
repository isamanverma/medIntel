"""
Pydantic schemas for request/response validation.

Kept in a single file while the schema count is small.
Split into sub-modules (schemas/auth.py, schemas/users.py, …) when this grows.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import UserRole


# ──────────────────────────────────────────────────────────────────
#  Auth – Signup
# ──────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole


class SignupResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    auth_provider: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Auth – Login (credentials)
# ──────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    image: Optional[str] = None
    auth_provider: str

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Auth – Google / OAuth
# ──────────────────────────────────────────────────────────────────

class GoogleOAuthRequest(BaseModel):
    """
    Payload the frontend sends after Google signs the user in.
    NextAuth gives us these fields from the Google profile.
    """
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=255)
    image: Optional[str] = None
    role: UserRole = UserRole.PATIENT  # default for new Google users


class GoogleOAuthResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    image: Optional[str] = None
    auth_provider: str
    is_new_user: bool  # lets the frontend know if this was a fresh signup

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  User – Generic read
# ──────────────────────────────────────────────────────────────────

class UserRead(BaseModel):
    """Public-safe representation of a user row."""
    id: uuid.UUID
    name: str
    email: str
    role: UserRole
    image: Optional[str] = None
    auth_provider: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Shared / utility
# ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Generic envelope for simple messages / errors."""
    message: str


class ErrorResponse(BaseModel):
    detail: str
