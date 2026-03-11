"""
Admin-only API endpoints.

Provides system-wide statistics for the admin dashboard.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.db.engine import get_session
from app.deps import require_admin
from app.models.user import User
from app.models.enums import UserRole, MappingStatus
from app.models.appointment import Appointment
from app.models.report import MedicalReport
from app.models.treatment import TreatmentPlan
from app.models.mapping import PatientDoctorMapping
from app.models.profiles import PatientProfile, DoctorProfile

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Response schema ───────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    total_patients: int
    total_doctors: int
    total_admins: int
    total_appointments: int
    total_reports: int
    total_treatment_plans: int


# ── Routes ────────────────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> AdminStats:
    """Return platform-wide statistics.  Admin only."""

    total_users = (await session.execute(select(func.count(User.id)))).scalar_one()

    total_patients = (await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.PATIENT)
    )).scalar_one()

    total_doctors = (await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.DOCTOR)
    )).scalar_one()

    total_admins = (await session.execute(
        select(func.count(User.id)).where(User.role == UserRole.ADMIN)
    )).scalar_one()

    total_appointments = (await session.execute(
        select(func.count(Appointment.id))
    )).scalar_one()

    total_reports = (await session.execute(
        select(func.count(MedicalReport.id))
    )).scalar_one()

    total_treatment_plans = (await session.execute(
        select(func.count(TreatmentPlan.id))
    )).scalar_one()

    return AdminStats(
        total_users=total_users,
        total_patients=total_patients,
        total_doctors=total_doctors,
        total_admins=total_admins,
        total_appointments=total_appointments,
        total_reports=total_reports,
        total_treatment_plans=total_treatment_plans,
    )


# ── User List ─────────────────────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/users", response_model=list[AdminUserResponse])
async def get_admin_users(
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> list[AdminUserResponse]:
    """Return all users.  Admin only."""
    result = await session.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return [
        AdminUserResponse(
            id=str(u.id),
            email=u.email,
            name=u.name,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            is_active=u.is_active,
            created_at=str(u.created_at),
        )
        for u in users
    ]


# ── Assignable Users (for dropdowns) ─────────────────────────────

class AssignablePatient(BaseModel):
    user_id: str
    profile_id: str
    name: str
    email: str


class AssignableDoctor(BaseModel):
    user_id: str
    profile_id: str
    name: str
    email: str
    specialization: str


class AssignableUsersResponse(BaseModel):
    patients: list[AssignablePatient]
    doctors: list[AssignableDoctor]


@router.get("/assignable", response_model=AssignableUsersResponse)
async def get_assignable_users(
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> AssignableUsersResponse:
    """Return all patients and doctors with their profile IDs for assignment dropdowns."""

    # Patients: join PatientProfile → User
    patient_result = await session.execute(
        select(PatientProfile, User)
        .join(User, PatientProfile.user_id == User.id)
        .where(User.is_active == True)
        .order_by(PatientProfile.first_name, PatientProfile.last_name)
    )
    patients = [
        AssignablePatient(
            user_id=str(user.id),
            profile_id=str(profile.id),
            name=f"{profile.first_name} {profile.last_name}",
            email=user.email,
        )
        for profile, user in patient_result.all()
    ]

    # Doctors: join DoctorProfile → User
    doctor_result = await session.execute(
        select(DoctorProfile, User)
        .join(User, DoctorProfile.user_id == User.id)
        .where(User.is_active == True)
        .order_by(DoctorProfile.first_name, DoctorProfile.last_name)
    )
    doctors = [
        AssignableDoctor(
            user_id=str(user.id),
            profile_id=str(profile.id),
            name=f"{profile.first_name} {profile.last_name}",
            email=user.email,
            specialization=profile.specialization,
        )
        for profile, user in doctor_result.all()
    ]

    return AssignableUsersResponse(patients=patients, doctors=doctors)


# ── Admin Assignments ─────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID


class AssignmentUpdate(BaseModel):
    doctor_id: uuid.UUID


class AssignmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_user_id: str
    patient_name: str
    patient_email: str
    doctor_id: str
    doctor_user_id: str
    doctor_name: str
    doctor_email: str
    doctor_specialization: str
    status: str
    created_at: str

    model_config = {"from_attributes": True}


async def _build_assignment_response(
    mapping: PatientDoctorMapping,
    session: AsyncSession,
) -> AssignmentResponse:
    """Resolve profile + user details for a single mapping and return an enriched response."""
    patient_profile = await session.get(PatientProfile, mapping.patient_id)
    doctor_profile = await session.get(DoctorProfile, mapping.doctor_id)

    patient_user = await session.get(User, patient_profile.user_id) if patient_profile else None
    doctor_user = await session.get(User, doctor_profile.user_id) if doctor_profile else None

    return AssignmentResponse(
        id=str(mapping.id),
        patient_id=str(mapping.patient_id),
        patient_user_id=str(patient_profile.user_id) if patient_profile else "",
        patient_name=(
            f"{patient_profile.first_name} {patient_profile.last_name}"
            if patient_profile
            else "Unknown Patient"
        ),
        patient_email=patient_user.email if patient_user else "—",
        doctor_id=str(mapping.doctor_id),
        doctor_user_id=str(doctor_profile.user_id) if doctor_profile else "",
        doctor_name=(
            f"{doctor_profile.first_name} {doctor_profile.last_name}"
            if doctor_profile
            else "Unknown Doctor"
        ),
        doctor_email=doctor_user.email if doctor_user else "—",
        doctor_specialization=doctor_profile.specialization if doctor_profile else "—",
        status=str(mapping.status.value) if hasattr(mapping.status, "value") else str(mapping.status),
        created_at=str(mapping.created_at),
    )


@router.post("/assignments", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentCreate,
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> AssignmentResponse:
    """Admin assigns a patient to a doctor."""
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = await session.get(DoctorProfile, body.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check for existing active mapping
    existing = await session.execute(
        select(PatientDoctorMapping).where(
            PatientDoctorMapping.patient_id == body.patient_id,
            PatientDoctorMapping.doctor_id == body.doctor_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Assignment already exists")

    mapping = PatientDoctorMapping(
        patient_id=body.patient_id,
        doctor_id=body.doctor_id,
        status=MappingStatus.ACTIVE,
    )
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return await _build_assignment_response(mapping, session)


@router.get("/assignments", response_model=list[AssignmentResponse])
async def get_assignments(
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> list[AssignmentResponse]:
    """List all patient-doctor assignments, enriched with names and emails."""
    # Single query: join mappings → patient profile → patient user
    #                            → doctor profile  → doctor user
    PatientUser = aliased(User, name="patient_user")
    DoctorUser = aliased(User, name="doctor_user")

    stmt = (
        select(
            PatientDoctorMapping,
            PatientProfile,
            PatientUser,
            DoctorProfile,
            DoctorUser,
        )
        .join(PatientProfile, PatientDoctorMapping.patient_id == PatientProfile.id)
        .join(PatientUser, PatientProfile.user_id == PatientUser.id)
        .join(DoctorProfile, PatientDoctorMapping.doctor_id == DoctorProfile.id)
        .join(DoctorUser, DoctorProfile.user_id == DoctorUser.id)
        .order_by(PatientDoctorMapping.created_at.desc())
    )

    result = await session.execute(stmt)
    rows = result.all()

    return [
        AssignmentResponse(
            id=str(mapping.id),
            patient_id=str(mapping.patient_id),
            patient_user_id=str(patient_profile.user_id),
            patient_name=f"{patient_profile.first_name} {patient_profile.last_name}",
            patient_email=patient_user.email,
            doctor_id=str(mapping.doctor_id),
            doctor_user_id=str(doctor_profile.user_id),
            doctor_name=f"{doctor_profile.first_name} {doctor_profile.last_name}",
            doctor_email=doctor_user.email,
            doctor_specialization=doctor_profile.specialization,
            status=str(mapping.status.value) if hasattr(mapping.status, "value") else str(mapping.status),
            created_at=str(mapping.created_at),
        )
        for mapping, patient_profile, patient_user, doctor_profile, doctor_user in rows
    ]


@router.patch("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: uuid.UUID,
    body: AssignmentUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> AssignmentResponse:
    """Admin reassigns a patient to a different doctor."""
    mapping = await session.get(PatientDoctorMapping, assignment_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if mapping.status != MappingStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Cannot edit an inactive assignment")

    # Validate new doctor profile exists
    new_doctor = await session.get(DoctorProfile, body.doctor_id)
    if not new_doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Guard: no change
    if mapping.doctor_id == body.doctor_id:
        raise HTTPException(status_code=400, detail="Patient is already assigned to this doctor")

    # Guard: patient already has an active mapping with the new doctor
    conflict = await session.execute(
        select(PatientDoctorMapping).where(
            PatientDoctorMapping.patient_id == mapping.patient_id,
            PatientDoctorMapping.doctor_id == body.doctor_id,
            PatientDoctorMapping.status == MappingStatus.ACTIVE,
        )
    )
    if conflict.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Patient already has an active assignment with this doctor",
        )

    mapping.doctor_id = body.doctor_id
    session.add(mapping)
    await session.commit()
    await session.refresh(mapping)
    return await _build_assignment_response(mapping, session)


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> None:
    """Admin removes a patient-doctor assignment (soft delete → INACTIVE)."""
    mapping = await session.get(PatientDoctorMapping, assignment_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Assignment not found")
    mapping.status = MappingStatus.INACTIVE
    session.add(mapping)
    await session.commit()


# ── Admin User Controls ───────────────────────────────────────────

class UserRoleUpdate(BaseModel):
    role: str


class UserStatusUpdate(BaseModel):
    is_active: bool


@router.patch("/users/{user_id}/role", response_model=AdminUserResponse)
async def update_user_role(
    user_id: uuid.UUID,
    body: UserRoleUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
) -> AdminUserResponse:
    """Admin changes a user's role."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent changing own role
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    try:
        new_role = UserRole(body.role.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid role: {body.role}")

    # Prevent demoting the last admin
    if user.role == UserRole.ADMIN and new_role != UserRole.ADMIN:
        admin_count = (await session.execute(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active == True)
        )).scalar_one()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the last admin account")

    user.role = new_role
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AdminUserResponse(
        id=str(user.id), email=user.email, name=user.name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active, created_at=str(user.created_at),
    )


@router.patch("/users/{user_id}/status", response_model=AdminUserResponse)
async def update_user_status(
    user_id: uuid.UUID,
    body: UserStatusUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
) -> AdminUserResponse:
    """Admin activates or deactivates a user account."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    user.is_active = body.is_active
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AdminUserResponse(
        id=str(user.id), email=user.email, name=user.name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        is_active=user.is_active, created_at=str(user.created_at),
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
) -> None:
    """Admin permanently deletes a user account."""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    if user.role == UserRole.ADMIN:
        admin_count = (await session.execute(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active == True)
        )).scalar_one()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account")

    await session.delete(user)
    await session.commit()
