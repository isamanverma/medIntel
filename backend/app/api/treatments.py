"""
Treatment plan and medication routes.
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
from app.deps import require_doctor, get_current_user
from app.models.user import User
from app.models.enums import TreatmentPlanStatus, UserRole
from app.models.treatment import TreatmentPlan, Medication
from app.models.profiles import PatientProfile, DoctorProfile

router = APIRouter(prefix="/treatment-plans", tags=["treatment-plans"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class TreatmentPlanCreate(BaseModel):
    patient_id: uuid.UUID
    title: str = PydanticField(..., min_length=1, max_length=255)
    start_date: date
    end_date: Optional[date] = None


class TreatmentPlanResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    title: str
    start_date: date
    end_date: Optional[date]
    status: TreatmentPlanStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TreatmentPlanStatusUpdate(BaseModel):
    status: TreatmentPlanStatus


class MedicationCreate(BaseModel):
    drug_name: str = PydanticField(..., min_length=1, max_length=255)
    dosage_instructions: str = PydanticField(..., min_length=1, max_length=255)
    frequency: str = PydanticField(..., min_length=1, max_length=128)


class MedicationResponse(BaseModel):
    id: uuid.UUID
    treatment_plan_id: uuid.UUID
    drug_name: str
    dosage_instructions: str
    frequency: str

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=TreatmentPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_treatment_plan(
    body: TreatmentPlanCreate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> TreatmentPlanResponse:
    """Doctor creates a treatment plan for a patient."""
    # Get doctor profile
    result = await session.execute(
        select(DoctorProfile.id).where(DoctorProfile.user_id == user.id)
    )
    doctor_profile_id = result.scalar_one_or_none()
    if not doctor_profile_id:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    # Verify patient exists
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    plan = TreatmentPlan(
        patient_id=body.patient_id,
        doctor_id=doctor_profile_id,
        title=body.title,
        start_date=body.start_date,
        end_date=body.end_date,
        status=TreatmentPlanStatus.ACTIVE,
    )
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return TreatmentPlanResponse.model_validate(plan)


@router.get(
    "/patient/{patient_id}",
    response_model=list[TreatmentPlanResponse],
)
async def get_patient_treatment_plans(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[TreatmentPlanResponse]:
    """Get all treatment plans for a patient."""
    result = await session.execute(
        select(TreatmentPlan)
        .where(TreatmentPlan.patient_id == patient_id)
        .order_by(TreatmentPlan.created_at.desc())
    )
    plans = result.scalars().all()
    return [TreatmentPlanResponse.model_validate(p) for p in plans]


@router.put("/{plan_id}", response_model=TreatmentPlanResponse)
async def update_treatment_plan_status(
    plan_id: uuid.UUID,
    body: TreatmentPlanStatusUpdate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> TreatmentPlanResponse:
    """Update a treatment plan's status."""
    plan = await session.get(TreatmentPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")

    plan.status = body.status
    session.add(plan)
    await session.commit()
    await session.refresh(plan)
    return TreatmentPlanResponse.model_validate(plan)


@router.post(
    "/{plan_id}/medications",
    response_model=MedicationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_medication(
    plan_id: uuid.UUID,
    body: MedicationCreate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> MedicationResponse:
    """Add a medication to a treatment plan."""
    plan = await session.get(TreatmentPlan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Treatment plan not found")

    medication = Medication(
        treatment_plan_id=plan_id,
        drug_name=body.drug_name,
        dosage_instructions=body.dosage_instructions,
        frequency=body.frequency,
    )
    session.add(medication)
    await session.commit()
    await session.refresh(medication)
    return MedicationResponse.model_validate(medication)
