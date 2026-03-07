"""
Patient-Doctor mapping routes — assign doctors to patients and vice versa.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
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
    doctor_id: uuid.UUID | None = None


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


class PatientDiscoveryItem(BaseModel):
    """Lightweight patient record returned by the discovery search."""
    profile_id: uuid.UUID
    first_name: str
    last_name: str
    blood_group: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None          # derived from date_of_birth server-side
    already_linked: bool = False
    condition_tags: Optional[list[str]] = None

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────


@router.get("/discover-patients", response_model=list[PatientDiscoveryItem])
async def discover_patients(
    q: Optional[str] = Query(None, description="Search by first or last name (case-insensitive)"),
    blood_group: Optional[str] = Query(None, description="Filter by blood group (e.g. A+, O-)"),
    gender: Optional[str] = Query(None, description="Filter by gender"),
    tag: Optional[str] = Query(None, description="Filter by condition tag (e.g. migraine, epilepsy)"),
    limit: int = Query(20, ge=1, le=100, description="Max results to return"),
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> list[PatientDiscoveryItem]:
    """Search all patient profiles for the patient discovery modal.

    Returns patients with an ``already_linked`` flag so the frontend can
    show a disabled/check state for patients the doctor has already added.
    Supports filtering by condition tag (AI-generated from patient descriptions).
    Requires a verified doctor account.
    """
    # 1. Resolve the calling doctor's profile ID
    result = await session.execute(
        select(DoctorProfile.id).where(DoctorProfile.user_id == user.id)
    )
    doctor_profile_id = result.scalar_one_or_none()
    if not doctor_profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found. Complete your profile first.",
        )

    # 2. Fetch the set of patient_ids already actively linked to this doctor
    linked_result = await session.execute(
        select(PatientDoctorMapping.patient_id).where(
            PatientDoctorMapping.doctor_id == doctor_profile_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    linked_ids: set[uuid.UUID] = {row for row in linked_result.scalars().all()}

    # 3. Build the patient query with optional filters
    stmt = select(PatientProfile)

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(PatientProfile.first_name).like(term),
                func.lower(PatientProfile.last_name).like(term),
            )
        )

    if blood_group and blood_group.strip():
        stmt = stmt.where(PatientProfile.blood_group == blood_group.strip())

    if gender and gender.strip():
        stmt = stmt.where(func.lower(PatientProfile.gender).like(gender.strip().lower()))

    if tag and tag.strip():
        # Use JSON containment-style search: check if any element in the
        # condition_tags JSON array matches the requested tag (case-insensitive).
        # We cast the JSON column to text and use ILIKE for broad compatibility
        # with both Supabase/PostgreSQL.
        from sqlalchemy import cast, Text as SAText
        tag_term = f'%"{tag.strip().lower()}"%'
        stmt = stmt.where(
            func.lower(cast(PatientProfile.condition_tags, SAText)).like(tag_term)
        )

    stmt = stmt.order_by(PatientProfile.first_name, PatientProfile.last_name).limit(limit)

    patients_result = await session.execute(stmt)
    patients = patients_result.scalars().all()

    # 4. Build the response, computing age from date_of_birth
    from datetime import date as date_type

    def _calc_age(dob: date_type) -> int:
        today = date_type.today()
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    return [
        PatientDiscoveryItem(
            profile_id=p.id,
            first_name=p.first_name,
            last_name=p.last_name,
            blood_group=p.blood_group,
            gender=p.gender,
            age=_calc_age(p.date_of_birth) if p.date_of_birth else None,
            already_linked=p.id in linked_ids,
            condition_tags=p.condition_tags or [],
        )
        for p in patients
    ]

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
    """Create a patient-doctor mapping.

    If the caller is a doctor and `doctor_id` is omitted, it is
    automatically resolved from the logged-in user's profile.
    """
    # Auto-resolve doctor_id when not provided and caller is a doctor
    doctor_id = body.doctor_id
    if doctor_id is None:
        if user.role != UserRole.DOCTOR:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="doctor_id is required for non-doctor users",
            )
        result = await session.execute(
            select(DoctorProfile.id).where(DoctorProfile.user_id == user.id)
        )
        doctor_id = result.scalar_one_or_none()
        if not doctor_id:
            raise HTTPException(status_code=404, detail="Doctor profile not found. Complete your profile first.")

    # Verify both profiles exist
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    doctor = await session.get(DoctorProfile, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Check for existing active mapping
    result = await session.execute(
        select(PatientDoctorMapping).where(
            PatientDoctorMapping.patient_id == body.patient_id,
            PatientDoctorMapping.doctor_id == doctor_id,
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
        doctor_id=doctor_id,
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
