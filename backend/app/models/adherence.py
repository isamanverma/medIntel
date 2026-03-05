import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SAEnum, DateTime, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import AdherenceStatus

if TYPE_CHECKING:
    from app.models.treatment import Medication
    from app.models.profiles import PatientProfile


class AdherenceLog(SQLModel, table=True):
    __tablename__ = "adherence_logs"

    id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            server_default=text("gen_random_uuid()"),
        ),
    )
    medication_id: uuid.UUID = Field(
        foreign_key="medications.id",
        nullable=False,
        index=True,
    )
    patient_id: uuid.UUID = Field(
        foreign_key="patient_profiles.id",
        nullable=False,
        index=True,
    )
    scheduled_for: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
        ),
    )
    status: AdherenceStatus = Field(
        sa_column=Column(
            SAEnum(AdherenceStatus, name="adherencestatus", create_constraint=True),
            nullable=False,
        ),
    )
    logged_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )

    # ── Relationships ──────────────────────────────────────────────
    medication: Optional["Medication"] = Relationship(back_populates="adherence_logs")
    patient: Optional["PatientProfile"] = Relationship(back_populates="adherence_logs")
