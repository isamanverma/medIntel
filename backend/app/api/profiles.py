"""
Profile routes — CRUD endpoints for patient and doctor profiles.

Profiles are created after signup to capture role-specific data
(e.g. DOB, blood group for patients; specialization, license for doctors).
"""

from __future__ import annotations

import uuid
import re
from datetime import date, datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import require_patient, require_doctor, get_current_user
from app.models.user import User
from app.models.profiles import PatientProfile, DoctorProfile
from app.models.patient_metric import PatientMetricEntry
from app.services.gemini_service import get_gemini_service

router = APIRouter(prefix="/profiles", tags=["profiles"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class PatientProfileCreate(BaseModel):
    first_name: str = PydanticField(..., min_length=1, max_length=100)
    last_name: str = PydanticField(..., min_length=1, max_length=100)
    date_of_birth: date
    blood_group: str = PydanticField(..., max_length=10)
    emergency_contact: str = PydanticField(..., max_length=50)
    # ── Optional extended fields ──
    gender: Optional[str] = PydanticField(None, max_length=20)
    phone: Optional[str] = PydanticField(None, max_length=20)
    preferred_language: Optional[str] = PydanticField(None, max_length=50)
    allergies: Optional[list[str]] = None
    chronic_conditions: Optional[list[str]] = None
    past_surgeries: Optional[str] = PydanticField(None, max_length=500)
    # ── AI-Powered Condition Discovery ──
    condition_description: Optional[str] = None
    condition_tags: Optional[list[str]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = PydanticField(None, max_length=20)
    insurance_provider: Optional[str] = PydanticField(None, max_length=200)
    insurance_policy_number: Optional[str] = PydanticField(None, max_length=100)
    insurance_group_number: Optional[str] = PydanticField(None, max_length=100)
    address_street: Optional[str] = PydanticField(None, max_length=255)
    address_city: Optional[str] = PydanticField(None, max_length=100)
    address_state: Optional[str] = PydanticField(None, max_length=100)
    address_zip: Optional[str] = PydanticField(None, max_length=20)
    address_country: Optional[str] = PydanticField(None, max_length=100)


class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    last_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = PydanticField(None, max_length=10)
    emergency_contact: Optional[str] = PydanticField(None, max_length=50)
    gender: Optional[str] = PydanticField(None, max_length=20)
    phone: Optional[str] = PydanticField(None, max_length=20)
    preferred_language: Optional[str] = PydanticField(None, max_length=50)
    allergies: Optional[list[str]] = None
    chronic_conditions: Optional[list[str]] = None
    past_surgeries: Optional[str] = PydanticField(None, max_length=500)
    # ── AI-Powered Condition Discovery ──
    condition_description: Optional[str] = None
    condition_tags: Optional[list[str]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = PydanticField(None, max_length=20)
    insurance_provider: Optional[str] = PydanticField(None, max_length=200)
    insurance_policy_number: Optional[str] = PydanticField(None, max_length=100)
    insurance_group_number: Optional[str] = PydanticField(None, max_length=100)
    address_street: Optional[str] = PydanticField(None, max_length=255)
    address_city: Optional[str] = PydanticField(None, max_length=100)
    address_state: Optional[str] = PydanticField(None, max_length=100)
    address_zip: Optional[str] = PydanticField(None, max_length=20)
    address_country: Optional[str] = PydanticField(None, max_length=100)


class PatientProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date
    blood_group: str
    emergency_contact: str
    gender: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    allergies: Optional[list[str]] = None
    chronic_conditions: Optional[list[str]] = None
    past_surgeries: Optional[str] = None
    # ── AI-Powered Condition Discovery ──
    condition_description: Optional[str] = None
    condition_tags: Optional[list[str]] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    blood_pressure: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_group_number: Optional[str] = None
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_zip: Optional[str] = None
    address_country: Optional[str] = None

    model_config = {"from_attributes": True}


MetricType = Literal[
    "blood_pressure",
    "blood_sugar",
    "weight",
    "heart_rate",
    "temperature",
    "oxygen_saturation",
]


class PatientMetricEntryCreate(BaseModel):
    metric_type: MetricType
    value: str = PydanticField(..., min_length=1, max_length=64)
    recorded_at: Optional[datetime] = None
    notes: Optional[str] = PydanticField(None, max_length=500)


class PatientMetricEntryResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    metric_type: MetricType
    value: str
    unit: str
    numeric_value: Optional[float] = None
    notes: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateTagsRequest(BaseModel):
    description: str = PydanticField(..., min_length=10, max_length=2000)


class GenerateTagsResponse(BaseModel):
    tags: list[str]
    description: str


class DoctorProfileCreate(BaseModel):
    first_name: str = PydanticField(..., min_length=1, max_length=100)
    last_name: str = PydanticField(..., min_length=1, max_length=100)
    specialization: str = PydanticField(..., min_length=1, max_length=200)
    license_number: str = PydanticField(..., min_length=1, max_length=100)


class DoctorProfileUpdate(BaseModel):
    first_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    last_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    specialization: Optional[str] = PydanticField(None, min_length=1, max_length=200)
    license_number: Optional[str] = PydanticField(None, min_length=1, max_length=100)


class DoctorProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    specialization: str
    license_number: str

    model_config = {"from_attributes": True}


def _normalize_metric_value(metric_type: MetricType, value: str) -> tuple[str, Optional[float]]:
    raw = value.strip()
    if metric_type == "blood_pressure":
        if not re.fullmatch(r"\d{2,3}/\d{2,3}", raw):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Blood pressure must be in systolic/diastolic format (e.g. 120/80).",
            )
        systolic = float(raw.split("/", maxsplit=1)[0])
        return "mmHg", systolic

    try:
        numeric_value = float(raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{metric_type} must be a numeric value.",
        ) from exc

    if numeric_value <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"{metric_type} must be greater than zero.",
        )

    if metric_type == "blood_sugar":
        return "mg/dL", numeric_value
    if metric_type == "weight":
        return "kg", numeric_value
    if metric_type == "heart_rate":
        return "bpm", numeric_value
    if metric_type == "temperature":
        return "C", numeric_value
    if metric_type == "oxygen_saturation":
        if numeric_value > 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="oxygen_saturation cannot be greater than 100.",
            )
        return "%", numeric_value

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=f"Unsupported metric type: {metric_type}",
    )


# ──────────────────────────────────────────────────────────────────
#  Patient Profile Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/patient",
    response_model=PatientProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_patient_profile(
    body: PatientProfileCreate,
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> PatientProfileResponse:
    """Create a patient profile for the current user."""
    # Check if profile already exists
    existing = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Patient profile already exists",
        )

    profile = PatientProfile(
        user_id=user.id,
        **body.model_dump(),
    )
    session.add(profile)

    # Keep users.name in sync so the JWT / session reflects the real name
    user.name = f"{body.first_name} {body.last_name}"
    session.add(user)

    await session.commit()
    await session.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


@router.get("/patient/me", response_model=PatientProfileResponse)
async def get_my_patient_profile(
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> PatientProfileResponse:
    """Get the current patient's profile."""
    result = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please complete your profile first.",
        )
    return PatientProfileResponse.model_validate(profile)


@router.post("/patient/generate-tags", response_model=GenerateTagsResponse)
async def generate_condition_tags(
    body: GenerateTagsRequest,
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> GenerateTagsResponse:
    """Send a patient's condition description to Gemini and return extracted medical tags.

    This endpoint is intentionally separate from the profile save so the
    patient can preview tags before committing them to their profile.
    Does NOT persist anything — the client must call PUT /patient/me to save.

    Error codes:
      503  — GEMINI_API_KEY not configured in the environment.
      422  — Description is empty or too short.
      429  — All Gemini models are currently quota-exhausted (free-tier limit hit).
      502  — Unexpected upstream error from the Gemini API.
    """
    try:
        gemini = get_gemini_service()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )

    try:
        tags = await gemini.extract_tags(body.description)
    except ValueError as exc:
        # Empty / too-short description
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        )
    except RuntimeError as exc:
        error_msg = str(exc)
        # Surface quota exhaustion as 429 so the frontend can show a
        # user-friendly "try again later" message rather than a generic error.
        if "quota-exhausted" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "The AI tag generation service is temporarily unavailable "
                    "due to API quota limits. Please try again in a few minutes."
                ),
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI tag generation failed: {error_msg}",
        )

    return GenerateTagsResponse(tags=tags, description=body.description)


@router.put("/patient/me", response_model=PatientProfileResponse)
async def update_patient_profile(
    body: PatientProfileUpdate,
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> PatientProfileResponse:
    """Update the current patient's profile."""
    result = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    session.add(profile)

    # Keep users.name in sync whenever first or last name changes
    if "first_name" in update_data or "last_name" in update_data:
        new_first = update_data.get("first_name", profile.first_name)
        new_last = update_data.get("last_name", profile.last_name)
        user.name = f"{new_first} {new_last}"
        session.add(user)

    await session.commit()
    await session.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


@router.post(
    "/patient/metrics",
    response_model=PatientMetricEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_patient_metric_entry(
    body: PatientMetricEntryCreate,
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> PatientMetricEntryResponse:
    profile_result = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please complete your profile first.",
        )

    unit, numeric_value = _normalize_metric_value(body.metric_type, body.value)

    metric = PatientMetricEntry(
        patient_id=profile.id,
        metric_type=body.metric_type,
        value=body.value.strip(),
        unit=unit,
        numeric_value=numeric_value,
        notes=body.notes,
        recorded_at=body.recorded_at or datetime.now(timezone.utc),
    )
    session.add(metric)
    await session.commit()
    await session.refresh(metric)
    return PatientMetricEntryResponse.model_validate(metric)


@router.get("/patient/metrics", response_model=list[PatientMetricEntryResponse])
async def list_patient_metric_entries(
    metric_type: Optional[MetricType] = None,
    limit: int = 90,
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> list[PatientMetricEntryResponse]:
    if limit < 1 or limit > 365:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="limit must be between 1 and 365.",
        )

    profile_result = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    profile = profile_result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found. Please complete your profile first.",
        )

    query = select(PatientMetricEntry).where(PatientMetricEntry.patient_id == profile.id)
    if metric_type is not None:
        query = query.where(PatientMetricEntry.metric_type == metric_type)
    query = query.order_by(PatientMetricEntry.recorded_at.desc()).limit(limit)

    result = await session.execute(query)
    entries = result.scalars().all()
    return [PatientMetricEntryResponse.model_validate(entry) for entry in entries]


# ──────────────────────────────────────────────────────────────────
#  Doctor Profile Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "/doctor",
    response_model=DoctorProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_doctor_profile(
    body: DoctorProfileCreate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> DoctorProfileResponse:
    """Create a doctor profile for the current user."""
    existing = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor profile already exists",
        )

    profile = DoctorProfile(
        user_id=user.id,
        first_name=body.first_name,
        last_name=body.last_name,
        specialization=body.specialization,
        license_number=body.license_number,
    )
    session.add(profile)

    # Keep users.name in sync so the JWT / session reflects the real name
    user.name = f"{body.first_name} {body.last_name}"
    session.add(user)

    await session.commit()
    await session.refresh(profile)
    return DoctorProfileResponse.model_validate(profile)


@router.get("/doctor/me", response_model=DoctorProfileResponse)
async def get_my_doctor_profile(
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> DoctorProfileResponse:
    """Get the current doctor's profile."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Please complete your profile first.",
        )
    return DoctorProfileResponse.model_validate(profile)


@router.put("/doctor/me", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    body: DoctorProfileUpdate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> DoctorProfileResponse:
    """Update the current doctor's profile."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    session.add(profile)

    # Keep users.name in sync whenever first or last name changes
    if "first_name" in update_data or "last_name" in update_data:
        new_first = update_data.get("first_name", profile.first_name)
        new_last = update_data.get("last_name", profile.last_name)
        user.name = f"{new_first} {new_last}"
        session.add(user)

    await session.commit()
    await session.refresh(profile)
    return DoctorProfileResponse.model_validate(profile)
