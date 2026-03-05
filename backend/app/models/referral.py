"""
Referral model — tracks doctor-to-doctor referrals for patients.

A referring doctor can send a patient referral to another doctor,
who can then accept or decline it.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, text

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile


class Referral(SQLModel, table=True):
    __tablename__ = "referrals"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

    referring_doctor_id: uuid.UUID = Field(
        foreign_key="doctor_profiles.id",
        nullable=False,
        index=True,
    )
    referred_doctor_id: uuid.UUID = Field(
        foreign_key="doctor_profiles.id",
        nullable=False,
        index=True,
    )
    patient_id: uuid.UUID = Field(
        foreign_key="patient_profiles.id",
        nullable=False,
        index=True,
    )

    reason: str = Field(max_length=500)
    notes: Optional[str] = Field(default=None, max_length=1000)
    status: str = Field(default="PENDING", max_length=20)  # PENDING, ACCEPTED, DECLINED

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
    referring_doctor: Optional["DoctorProfile"] = Relationship(
        back_populates="referrals_sent",
        sa_relationship_kwargs={"foreign_keys": "[Referral.referring_doctor_id]"},
    )
    referred_doctor: Optional["DoctorProfile"] = Relationship(
        back_populates="referrals_received",
        sa_relationship_kwargs={"foreign_keys": "[Referral.referred_doctor_id]"},
    )
    patient: Optional["PatientProfile"] = Relationship(back_populates="referrals")
