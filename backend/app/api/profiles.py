"""
Profile routes — CRUD endpoints for patient and doctor profiles.

Profiles are created after signup to capture role-specific data
(e.g. DOB, blood group for patients; specialization, license for doctors).
"""

from __future__ import annotations

import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import require_patient, require_doctor, get_current_user
from app.models.user import User
from app.models.profiles import PatientProfile, DoctorProfile

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


class PatientProfileUpdate(BaseModel):
    first_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    last_name: Optional[str] = PydanticField(None, min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = PydanticField(None, max_length=10)
    emergency_contact: Optional[str] = PydanticField(None, max_length=50)


class PatientProfileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    first_name: str
    last_name: str
    date_of_birth: date
    blood_group: str
    emergency_contact: str

    model_config = {"from_attributes": True}


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
        first_name=body.first_name,
        last_name=body.last_name,
        date_of_birth=body.date_of_birth,
        blood_group=body.blood_group,
        emergency_contact=body.emergency_contact,
    )
    session.add(profile)
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
    await session.commit()
    await session.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


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
    await session.commit()
    await session.refresh(profile)
    return DoctorProfileResponse.model_validate(profile)
