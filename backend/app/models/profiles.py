import uuid
from datetime import date
from typing import Optional, List, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, String, JSON, Text

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.mapping import PatientDoctorMapping
    from app.models.appointment import Appointment
    from app.models.treatment import TreatmentPlan
    from app.models.report import MedicalReport
    from app.models.adherence import AdherenceLog
    from app.models.insight import AgentInsight
    from app.models.referral import Referral
    from app.models.care_team import CareTeam, CareTeamMember


class PatientProfile(SQLModel, table=True):
    __tablename__ = "patient_profiles"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(
        foreign_key="users.id",
        unique=True,
        nullable=False,
        index=True,
    )

    # ── Core Identity ─────────────────────────────────────────────
    first_name: str = Field(max_length=100)
    last_name: str = Field(max_length=100)
    date_of_birth: date
    blood_group: str = Field(max_length=10)
    emergency_contact: str = Field(max_length=50)

    # ── Demographics ──────────────────────────────────────────────
    gender: Optional[str] = Field(default=None, max_length=20)
    phone: Optional[str] = Field(default=None, max_length=20)
    preferred_language: Optional[str] = Field(default=None, max_length=50)

    # ── Medical History (JSON arrays) ─────────────────────────────
    allergies: Optional[list] = Field(default=None, sa_column=Column(JSON, nullable=True))
    chronic_conditions: Optional[list] = Field(default=None, sa_column=Column(JSON, nullable=True))
    past_surgeries: Optional[str] = Field(default=None, max_length=500)

    # ── AI-Powered Condition Discovery ────────────────────────────
    condition_description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    condition_tags: Optional[list] = Field(
        default=None,
        sa_column=Column(JSON, nullable=True),
    )

    # ── Vitals ────────────────────────────────────────────────────
    height_cm: Optional[float] = Field(default=None)
    weight_kg: Optional[float] = Field(default=None)
    blood_pressure: Optional[str] = Field(default=None, max_length=20)

    # ── Insurance ─────────────────────────────────────────────────
    insurance_provider: Optional[str] = Field(default=None, max_length=200)
    insurance_policy_number: Optional[str] = Field(default=None, max_length=100)
    insurance_group_number: Optional[str] = Field(default=None, max_length=100)

    # ── Address ───────────────────────────────────────────────────
    address_street: Optional[str] = Field(default=None, max_length=255)
    address_city: Optional[str] = Field(default=None, max_length=100)
    address_state: Optional[str] = Field(default=None, max_length=100)
    address_zip: Optional[str] = Field(default=None, max_length=20)
    address_country: Optional[str] = Field(default=None, max_length=100)

    # ── Relationships ──────────────────────────────────────────────
    user: Optional["User"] = Relationship(back_populates="patient_profile")
    doctor_mappings: List["PatientDoctorMapping"] = Relationship(back_populates="patient")
    appointments: List["Appointment"] = Relationship(back_populates="patient")
    treatment_plans: List["TreatmentPlan"] = Relationship(back_populates="patient")
    medical_reports: List["MedicalReport"] = Relationship(back_populates="patient")
    adherence_logs: List["AdherenceLog"] = Relationship(back_populates="patient")
    agent_insights: List["AgentInsight"] = Relationship(back_populates="patient")
    referrals: List["Referral"] = Relationship(back_populates="patient")
    care_teams: List["CareTeam"] = Relationship(back_populates="patient")


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
    referrals_sent: List["Referral"] = Relationship(
        back_populates="referring_doctor",
        sa_relationship_kwargs={"foreign_keys": "[Referral.referring_doctor_id]"},
    )
    referrals_received: List["Referral"] = Relationship(
        back_populates="referred_doctor",
        sa_relationship_kwargs={"foreign_keys": "[Referral.referred_doctor_id]"},
    )
    care_team_memberships: List["CareTeamMember"] = Relationship(back_populates="doctor")
