"""
Adherence tracking routes — log medication intake and compute stats.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user
from app.models.user import User
from app.models.enums import AdherenceStatus
from app.models.adherence import AdherenceLog
from app.models.treatment import Medication
from app.models.profiles import PatientProfile

router = APIRouter(prefix="/adherence", tags=["adherence"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class AdherenceLogCreate(BaseModel):
    medication_id: uuid.UUID
    patient_id: uuid.UUID
    scheduled_for: datetime
    status: AdherenceStatus


class AdherenceLogResponse(BaseModel):
    id: uuid.UUID
    medication_id: uuid.UUID
    patient_id: uuid.UUID
    scheduled_for: datetime
    status: AdherenceStatus
    logged_at: datetime

    model_config = {"from_attributes": True}


class AdherenceStatsResponse(BaseModel):
    total: int
    taken: int
    missed: int
    late: int
    adherence_percentage: float


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=AdherenceLogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def log_adherence(
    body: AdherenceLogCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AdherenceLogResponse:
    """Log a medication as taken, missed, or late."""
    # Verify medication exists
    medication = await session.get(Medication, body.medication_id)
    if not medication:
        raise HTTPException(status_code=404, detail="Medication not found")

    # Verify patient exists
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    log = AdherenceLog(
        medication_id=body.medication_id,
        patient_id=body.patient_id,
        scheduled_for=body.scheduled_for,
        status=body.status,
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return AdherenceLogResponse.model_validate(log)


@router.get(
    "/patient/{patient_id}",
    response_model=list[AdherenceLogResponse],
)
async def get_adherence_history(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[AdherenceLogResponse]:
    """Get adherence history for a patient."""
    result = await session.execute(
        select(AdherenceLog)
        .where(AdherenceLog.patient_id == patient_id)
        .order_by(AdherenceLog.logged_at.desc())
    )
    logs = result.scalars().all()
    return [AdherenceLogResponse.model_validate(log) for log in logs]


@router.get("/stats/{patient_id}", response_model=AdherenceStatsResponse)
async def get_adherence_stats(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AdherenceStatsResponse:
    """Compute adherence statistics for a patient."""
    result = await session.execute(
        select(
            func.count(AdherenceLog.id).label("total"),
            func.count(AdherenceLog.id).filter(
                AdherenceLog.status == AdherenceStatus.TAKEN
            ).label("taken"),
            func.count(AdherenceLog.id).filter(
                AdherenceLog.status == AdherenceStatus.MISSED
            ).label("missed"),
            func.count(AdherenceLog.id).filter(
                AdherenceLog.status == AdherenceStatus.LATE
            ).label("late"),
        ).where(AdherenceLog.patient_id == patient_id)
    )
    row = result.one()
    total = row.total or 0
    taken = row.taken or 0
    missed = row.missed or 0
    late = row.late or 0

    percentage = (taken / total * 100) if total > 0 else 0.0

    return AdherenceStatsResponse(
        total=total,
        taken=taken,
        missed=missed,
        late=late,
        adherence_percentage=round(percentage, 1),
    )
