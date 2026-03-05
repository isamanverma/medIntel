import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SAEnum, DateTime, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import AppointmentStatus

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile


class Appointment(SQLModel, table=True):
    __tablename__ = "appointments"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    patient_id: uuid.UUID = Field(
        foreign_key="patient_profiles.id",
        nullable=False,
        index=True,
    )
    doctor_id: uuid.UUID = Field(
        foreign_key="doctor_profiles.id",
        nullable=False,
        index=True,
    )
    scheduled_time: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
        ),
    )
    status: AppointmentStatus = Field(
        sa_column=Column(
            SAEnum(AppointmentStatus, name="appointmentstatus", create_constraint=True),
            nullable=False,
            server_default=AppointmentStatus.PENDING.value,
        ),
    )
    meeting_notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
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
        ),
    )

    # ── Relationships ──────────────────────────────────────────────
    patient: Optional["PatientProfile"] = Relationship(back_populates="appointments")
    doctor: Optional["DoctorProfile"] = Relationship(back_populates="appointments")
