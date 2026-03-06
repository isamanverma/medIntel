"""
Admin-only API endpoints.

Provides system-wide statistics for the admin dashboard.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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


# ── Admin Assignments ─────────────────────────────────────────────

import uuid
from datetime import datetime

class AssignmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    status: str
    created_at: str

    model_config = {"from_attributes": True}


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
    return AssignmentResponse(
        id=mapping.id,
        patient_id=mapping.patient_id,
        doctor_id=mapping.doctor_id,
        status=mapping.status,
        created_at=str(mapping.created_at),
    )


@router.get("/assignments", response_model=list[AssignmentResponse])
async def get_assignments(
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> list[AssignmentResponse]:
    """List all patient-doctor assignments."""
    result = await session.execute(
        select(PatientDoctorMapping).order_by(PatientDoctorMapping.created_at.desc())
    )
    return [
        AssignmentResponse(
            id=m.id,
            patient_id=m.patient_id,
            doctor_id=m.doctor_id,
            status=m.status,
            created_at=str(m.created_at),
        )
        for m in result.scalars().all()
    ]


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    _admin: User = Depends(require_admin),
) -> None:
    """Admin removes a patient-doctor assignment."""
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


