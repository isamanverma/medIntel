"""
Admin-only API endpoints.

Provides system-wide statistics for the admin dashboard.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import require_admin
from app.models.user import User
from app.models.enums import UserRole
from app.models.appointment import Appointment
from app.models.report import MedicalReport
from app.models.treatment import TreatmentPlan

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
