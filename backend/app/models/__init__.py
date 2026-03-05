"""
Import every model so that SQLModel.metadata is fully populated
when Alembic (or any other tool) inspects it.
"""

from app.models.enums import (  # noqa: F401
    UserRole,
    MappingStatus,
    AppointmentStatus,
    TreatmentPlanStatus,
    AIAnalysisStatus,
    AdherenceStatus,
    AgentSource,
    SeverityLevel,
)

from app.models.user import User  # noqa: F401
from app.models.profiles import PatientProfile, DoctorProfile  # noqa: F401
from app.models.mapping import PatientDoctorMapping  # noqa: F401
from app.models.appointment import Appointment  # noqa: F401
from app.models.treatment import TreatmentPlan, Medication  # noqa: F401
from app.models.report import MedicalReport  # noqa: F401
from app.models.adherence import AdherenceLog  # noqa: F401
from app.models.insight import AgentInsight  # noqa: F401

__all__ = [
    # Enums
    "UserRole",
    "MappingStatus",
    "AppointmentStatus",
    "TreatmentPlanStatus",
    "AIAnalysisStatus",
    "AdherenceStatus",
    "AgentSource",
    "SeverityLevel",
    # IAM
    "User",
    # Profiles & Relationships
    "PatientProfile",
    "DoctorProfile",
    "PatientDoctorMapping",
    # Clinical Data
    "Appointment",
    "TreatmentPlan",
    "Medication",
    "MedicalReport",
    # Patient Engagement & Agent Outputs
    "AdherenceLog",
    "AgentInsight",
]
