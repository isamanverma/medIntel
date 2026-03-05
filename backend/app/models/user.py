"""
User models — SQLModel Inheritance Pattern.

Hierarchy:
  UserBase        → shared fields (email, full_name, role)
  UserCreate      → extends UserBase with a raw `password` for signup requests
  User(table=True)→ extends UserBase with `id`, `hashed_password`, DB columns
  UserPublic      → extends UserBase as the safe response model (no passwords)

The table model retains all existing relationships and SA column definitions
so that Alembic migrations and the rest of the codebase remain compatible.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from pydantic import EmailStr, Field as PydanticField
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, DateTime, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import UserRole

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile
    from app.models.report import MedicalReport


# ──────────────────────────────────────────────────────────────────
#  Base — shared fields used by every variant
# ──────────────────────────────────────────────────────────────────

class UserBase(SQLModel):
    """Fields common to creation, reading, and the DB row."""

    email: str = Field(
        ...,
        max_length=320,
        description="User email address (unique identifier for auth).",
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Full display name.",
    )
    role: UserRole = Field(
        description="Access-control role: PATIENT | DOCTOR | ADMIN.",
    )


# ──────────────────────────────────────────────────────────────────
#  Create — inbound signup payload (raw password, never stored)
# ──────────────────────────────────────────────────────────────────

class UserCreate(UserBase):
    """
    Schema used for the signup request body.

    Contains the raw plain-text password which will be hashed in the
    service layer before it reaches the database.
    """

    email: EmailStr = PydanticField(  # type: ignore[assignment]
        ...,
        description="Must be a valid email address.",
    )
    password: str = PydanticField(
        ...,
        min_length=6,
        max_length=128,
        description="Plain-text password (hashed before storage).",
    )


# ──────────────────────────────────────────────────────────────────
#  Table — the actual database row
# ──────────────────────────────────────────────────────────────────

class User(UserBase, table=True):
    """Persisted user record in the `users` table."""

    __tablename__ = "users"

    # ── Primary key ────────────────────────────────────────────────
    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )

    # ── Override base `email` / `name` with SA column config ───────
    email: str = Field(  # type: ignore[assignment]
        sa_column=Column(String(320), unique=True, index=True, nullable=False),
    )
    name: str = Field(  # type: ignore[assignment]
        sa_column=Column(String(255), nullable=False),
    )

    # ── Hashed password (None for OAuth-only accounts) ─────────────
    hashed_password: Optional[str] = Field(
        default=None,
        sa_column=Column("password_hash", String, nullable=True),
        description="bcrypt hash — never expose in responses.",
    )

    # ── Profile / OAuth metadata ───────────────────────────────────
    image: Optional[str] = Field(
        default=None,
        sa_column=Column(String(1024), nullable=True),
    )
    auth_provider: str = Field(
        default="credentials",
        sa_column=Column(
            String(50),
            nullable=False,
            server_default=text("'credentials'"),
        ),
    )

    # ── Role (with SA enum constraint) ─────────────────────────────
    role: UserRole = Field(  # type: ignore[assignment]
        sa_column=Column(
            SAEnum(UserRole, name="userrole", create_constraint=True),
            nullable=False,
        ),
    )

    # ── Flags / timestamps ─────────────────────────────────────────
    is_active: bool = Field(
        default=True,
        sa_column=Column(Boolean, nullable=False, server_default=text("true")),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
            onupdate=lambda: datetime.now(timezone.utc),
        ),
    )

    # ── Relationships ──────────────────────────────────────────────
    patient_profile: Optional["PatientProfile"] = Relationship(
        back_populates="user",
    )
    doctor_profile: Optional["DoctorProfile"] = Relationship(
        back_populates="user",
    )
    uploaded_reports: list["MedicalReport"] = Relationship(
        back_populates="uploader",
    )


# ──────────────────────────────────────────────────────────────────
#  Public — safe response model (no password, no internal flags)
# ──────────────────────────────────────────────────────────────────

class UserPublic(UserBase):
    """
    The outbound schema returned by signup / profile endpoints.

    Deliberately excludes `hashed_password`, `is_active`, and other
    internal fields.  Includes `id` so the frontend can reference
    the user, plus `auth_provider` and timestamps for display.
    """

    id: uuid.UUID
    image: Optional[str] = None
    auth_provider: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Login-specific response (includes token)
# ──────────────────────────────────────────────────────────────────

class TokenResponse(SQLModel):
    """Returned by login / signup when a JWT is issued."""

    access_token: str
    token_type: str = "bearer"
    user: UserPublic
