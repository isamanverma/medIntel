import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Column, DateTime, Float, String, Text, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile


class PatientMetricEntry(SQLModel, table=True):
    __tablename__ = "patient_metric_entries"

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
    metric_type: str = Field(
        sa_column=Column(String(50), nullable=False, index=True),
    )
    value: str = Field(
        sa_column=Column(String(64), nullable=False),
    )
    unit: str = Field(
        sa_column=Column(String(20), nullable=False),
    )
    numeric_value: Optional[float] = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    notes: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )
    recorded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            index=True,
            server_default=text("now()"),
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

    patient: Optional["PatientProfile"] = Relationship(back_populates="metric_entries")
