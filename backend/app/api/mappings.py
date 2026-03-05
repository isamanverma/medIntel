"""
Patient-Doctor mapping routes — assign doctors to patients and vice versa.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user, require_doctor, require_patient
from app.models.user import User
from app.models.enums import MappingStatus, UserRole
from app.models.mapping import PatientDoctorMapping
from app.models.profiles import PatientProfile, DoctorProfile

router = APIRouter(prefix="/mappings", tags=["mappings"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class MappingCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID


class MappingResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    status: MappingStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class PatientListItem(BaseModel):
    profile_id: uuid.UUID
    first_name: str
    last_name: str
    mapping_id: uuid.UUID

    model_config = {"from_attributes": True}


class DoctorListItem(BaseModel):
    profile_id: uuid.UUID
    first_name: str
    last_name: str
    specialization: str
    mapping_id: uuid.UUID

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=MappingResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_mapping(
    body: MappingCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MappingResponse:
    """Create a patient-doctor mapping."""
    # Verify both profiles exist
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    doctor = await session.get(DoctorProfile, body.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Check for existing active mapping
    result = await session.execute(
        select(PatientDoctorMapping).where(
            PatientDoctorMapping.patient_id == body.patient_id,
            PatientDoctorMapping.doctor_id == body.doctor_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active mapping already exists between this patient and doctor",
        )

    mapping = PatientDoctorMapping(
        patient_id=body.patient_id,
        doctor_id=body.doctor_id,
        status=MappingStatus.ACTIVE,
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return MappingResponse.model_validate(mapping)


@router.get("/my-patients", response_model=list[PatientListItem])
async def get_my_patients(
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> list[PatientListItem]:
    """Get the current doctor's patient list."""
    # Get doctor profile
    result = await session.execute(
        select(DoctorProfile.id).where(DoctorProfile.user_id == user.id)
    )
    doctor_profile_id = result.scalar_one_or_none()
    if not doctor_profile_id:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Get active mappings with patient profiles
    result = await session.execute(
        select(PatientDoctorMapping, PatientProfile)
        .join(PatientProfile, PatientDoctorMapping.patient_id == PatientProfile.id)
        .where(
            PatientDoctorMapping.doctor_id == doctor_profile_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    rows = result.all()
    return [
        PatientListItem(
            profile_id=patient.id,
            first_name=patient.first_name,
            last_name=patient.last_name,
            mapping_id=mapping.id,
        )
        for mapping, patient in rows
    ]


@router.get("/my-doctors", response_model=list[DoctorListItem])
async def get_my_doctors(
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> list[DoctorListItem]:
    """Get the current patient's doctor list."""
    result = await session.execute(
        select(PatientProfile.id).where(PatientProfile.user_id == user.id)
    )
    patient_profile_id = result.scalar_one_or_none()
    if not patient_profile_id:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = await session.execute(
        select(PatientDoctorMapping, DoctorProfile)
        .join(DoctorProfile, PatientDoctorMapping.doctor_id == DoctorProfile.id)
        .where(
            PatientDoctorMapping.patient_id == patient_profile_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    rows = result.all()
    return [
        DoctorListItem(
            profile_id=doctor.id,
            first_name=doctor.first_name,
            last_name=doctor.last_name,
            specialization=doctor.specialization,
            mapping_id=mapping.id,
        )
        for mapping, doctor in rows
    ]


@router.delete("/{mapping_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mapping(
    mapping_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Deactivate a patient-doctor mapping."""
    mapping = await session.get(PatientDoctorMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    mapping.status = MappingStatus.INACTIVE
    session.add(mapping)
    await session.commit()
