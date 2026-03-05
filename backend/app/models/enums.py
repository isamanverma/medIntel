import enum


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class MappingStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class AppointmentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TreatmentPlanStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"


class AIAnalysisStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AdherenceStatus(str, enum.Enum):
    TAKEN = "TAKEN"
    MISSED = "MISSED"
    LATE = "LATE"


class AgentSource(str, enum.Enum):
    REPORT_ANALYSIS = "REPORT_ANALYSIS"
    ADHERENCE = "ADHERENCE"
    RISK_DETECTION = "RISK_DETECTION"
    TRIAGE = "TRIAGE"


class SeverityLevel(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
