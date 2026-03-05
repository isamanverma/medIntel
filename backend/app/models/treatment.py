import uuid
from datetime import date, datetime, timezone
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SAEnum, DateTime, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import TreatmentPlanStatus

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile
    from app.models.adherence import AdherenceLog


class TreatmentPlan(SQLModel, table=True):
    __tablename__ = "treatment_plans"

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
    title: str = Field(max_length=255)
    start_date: date
    end_date: Optional[date] = Field(default=None)
    status: TreatmentPlanStatus = Field(
        sa_column=Column(
            SAEnum(TreatmentPlanStatus, name="treatmentplanstatus", create_constraint=True),
            nullable=False,
            server_default=TreatmentPlanStatus.ACTIVE.value,
        ),
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
    patient: Optional["PatientProfile"] = Relationship(back_populates="treatment_plans")
    doctor: Optional["DoctorProfile"] = Relationship(back_populates="treatment_plans")
    medications: List["Medication"] = Relationship(back_populates="treatment_plan")


class Medication(SQLModel, table=True):
    __tablename__ = "medications"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    treatment_plan_id: uuid.UUID = Field(
        foreign_key="treatment_plans.id",
        nullable=False,
        index=True,
    )
    drug_name: str = Field(max_length=255)
    dosage_instructions: str = Field(max_length=255)  # e.g. "500mg"
    frequency: str = Field(max_length=128)  # e.g. "Twice a day"

    # ── Relationships ──────────────────────────────────────────────
    treatment_plan: Optional["TreatmentPlan"] = Relationship(back_populates="medications")
    adherence_logs: List["AdherenceLog"] = Relationship(back_populates="medication")
