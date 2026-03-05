import uuid
from datetime import date
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.mapping import PatientDoctorMapping
    from app.models.appointment import Appointment
    from app.models.treatment import TreatmentPlan
    from app.models.report import MedicalReport
    from app.models.adherence import AdherenceLog
    from app.models.insight import AgentInsight


class PatientProfile(SQLModel, table=True):
    __tablename__ = "patient_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        unique=True,
        nullable=False,
        index=True,
    )
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    date_of_birth: date
    blood_group: str = Field(max_length=10)
    emergency_contact: str = Field(max_length=50)

    # ── Relationships ──────────────────────────────────────────────
    user: Optional["User"] = Relationship(back_populates="patient_profile")
    doctor_mappings: List["PatientDoctorMapping"] = Relationship(back_populates="patient")
    appointments: List["Appointment"] = Relationship(back_populates="patient")
    treatment_plans: List["TreatmentPlan"] = Relationship(back_populates="patient")
    medical_reports: List["MedicalReport"] = Relationship(back_populates="patient")
    adherence_logs: List["AdherenceLog"] = Relationship(back_populates="patient")
    agent_insights: List["AgentInsight"] = Relationship(back_populates="patient")


class DoctorProfile(SQLModel, table=True):
    __tablename__ = "doctor_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        unique=True,
        nullable=False,
        index=True,
    )
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    specialization: str = Field(max_length=200)
    license_number: str = Field(
        sa_column=Column(String(100), index=True, nullable=False),
    )

    # ── Relationships ──────────────────────────────────────────────
    user: Optional["User"] = Relationship(back_populates="doctor_profile")
    patient_mappings: List["PatientDoctorMapping"] = Relationship(back_populates="doctor")
    appointments: List["Appointment"] = Relationship(back_populates="doctor")
    treatment_plans: List["TreatmentPlan"] = Relationship(back_populates="doctor")
    agent_insights: List["AgentInsight"] = Relationship(back_populates="doctor")
