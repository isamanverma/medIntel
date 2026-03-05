import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SAEnum, DateTime, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import AIAnalysisStatus

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile
    from app.models.user import User


class MedicalReport(SQLModel, table=True):
    __tablename__ = "medical_reports"

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
    uploader_id: uuid.UUID = Field(
        foreign_key="users.id",
        nullable=False,
        index=True,
    )
    file_url: str = Field(
        sa_column=Column(String(1024), nullable=False),
    )
    report_type: str = Field(
        sa_column=Column(String(100), nullable=False),  # e.g. "Blood Work", "MRI"
    )
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )
    ai_analysis_status: AIAnalysisStatus = Field(
        sa_column=Column(
            SAEnum(AIAnalysisStatus, name="aianalysisstatus", create_constraint=True),
            nullable=False,
            server_default=AIAnalysisStatus.PENDING.value,
        ),
    )
    ai_summary: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # ── Relationships ──────────────────────────────────────────────
    patient: Optional["PatientProfile"] = Relationship(back_populates="medical_reports")
    uploader: Optional["User"] = Relationship(back_populates="uploaded_reports")
