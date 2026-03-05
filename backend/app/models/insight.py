import uuid
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Enum as SAEnum, DateTime, Text, Boolean, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.models.enums import AgentSource, SeverityLevel

if TYPE_CHECKING:
    from app.models.profiles import PatientProfile, DoctorProfile


class AgentInsight(SQLModel, table=True):
    __tablename__ = "agent_insights"

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
    doctor_id: Optional[uuid.UUID] = Field(
        default=None,
        foreign_key="doctor_profiles.id",
        nullable=True,
        index=True,
    )
    agent_source: AgentSource = Field(
        sa_column=Column(
            SAEnum(AgentSource, name="agentsource", create_constraint=True),
            nullable=False,
        ),
    )
    severity_level: SeverityLevel = Field(
        sa_column=Column(
            SAEnum(SeverityLevel, name="severitylevel", create_constraint=True),
            nullable=False,
        ),
    )
    insight_text: str = Field(
        sa_column=Column(Text, nullable=False),
    )
    is_acknowledged: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=text("false")),
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=text("now()"),
        ),
    )

    # ── Relationships ──────────────────────────────────────────────
    patient: Optional["PatientProfile"] = Relationship(back_populates="agent_insights")
    doctor: Optional["DoctorProfile"] = Relationship(back_populates="agent_insights")
