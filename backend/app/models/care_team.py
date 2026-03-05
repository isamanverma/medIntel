"""
Care Team models — multi-doctor collaboration on a single patient.

A care team groups multiple doctors working together on a patient's case.
Each member has a role: PRIMARY, CONSULTANT, or SPECIALIST.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, text

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile


class CareTeam(SQLModel, table=True):
    __tablename__ = "care_teams"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    patient_id: uuid.UUID = Field(
        foreign_key="patient_profiles.id",
        nullable=False,
        index=True,
    )
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)

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
        ),
    )

    # ── Relationships ─────────────────────────────────────────────
    patient: Optional["PatientProfile"] = Relationship(back_populates="care_teams")
    members: List["CareTeamMember"] = Relationship(back_populates="care_team")


class CareTeamMember(SQLModel, table=True):
    __tablename__ = "care_team_members"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    care_team_id: uuid.UUID = Field(
        foreign_key="care_teams.id",
        nullable=False,
        index=True,
    )
    doctor_id: uuid.UUID = Field(
        foreign_key="doctor_profiles.id",
        nullable=False,
        index=True,
    )
    role: str = Field(max_length=20, default="CONSULTANT")  # PRIMARY, CONSULTANT, SPECIALIST

    joined_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )

    # ── Relationships ─────────────────────────────────────────────
    care_team: Optional["CareTeam"] = Relationship(back_populates="members")
    doctor: Optional["DoctorProfile"] = Relationship(back_populates="care_team_memberships")
