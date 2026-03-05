"""
Referral API routes — doctor-to-doctor patient referrals.

Allows doctors to refer patients to other doctors,
and manage incoming/outgoing referral statuses.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import require_doctor
from app.models.user import User
from app.models.profiles import DoctorProfile, PatientProfile
from app.models.referral import Referral

router = APIRouter(prefix="/referrals", tags=["referrals"])


# ── Schemas ───────────────────────────────────────────────────────

class ReferralCreate(BaseModel):
    referred_doctor_id: uuid.UUID
    patient_id: uuid.UUID
    reason: str = PydanticField(..., min_length=1, max_length=500)
    notes: Optional[str] = PydanticField(None, max_length=1000)


class ReferralStatusUpdate(BaseModel):
    status: str = PydanticField(..., pattern="^(ACCEPTED|DECLINED)$")


class ReferralResponse(BaseModel):
    id: uuid.UUID
    referring_doctor_id: uuid.UUID
    referred_doctor_id: uuid.UUID
    patient_id: uuid.UUID
    reason: str
    notes: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────

@router.post("", response_model=ReferralResponse, status_code=status.HTTP_201_CREATED)
async def create_referral(
    body: ReferralCreate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> ReferralResponse:
    """Create a referral to another doctor for a patient."""
    # Get current doctor's profile
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        raise HTTPException(status_code=404, detail="Complete your doctor profile first")

    if my_profile.id == body.referred_doctor_id:
        raise HTTPException(status_code=400, detail="Cannot refer to yourself")

    # Validate referred doctor exists
    ref_doc = await session.get(DoctorProfile, body.referred_doctor_id)
    if not ref_doc:
        raise HTTPException(status_code=404, detail="Referred doctor not found")

    # Validate patient exists
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    referral = Referral(
        referring_doctor_id=my_profile.id,
        referred_doctor_id=body.referred_doctor_id,
        patient_id=body.patient_id,
        reason=body.reason,
        notes=body.notes,
    )
    session.add(referral)
    await session.commit()
    await session.refresh(referral)
    return ReferralResponse.model_validate(referral)


@router.get("/sent", response_model=list[ReferralResponse])
async def get_sent_referrals(
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> list[ReferralResponse]:
    """Get all referrals sent by the current doctor."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        return []
    result = await session.execute(
        select(Referral)
        .where(Referral.referring_doctor_id == my_profile.id)
        .order_by(Referral.created_at.desc())
    )
    return [ReferralResponse.model_validate(r) for r in result.scalars().all()]


@router.get("/received", response_model=list[ReferralResponse])
async def get_received_referrals(
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> list[ReferralResponse]:
    """Get all referrals received by the current doctor."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        return []
    result = await session.execute(
        select(Referral)
        .where(Referral.referred_doctor_id == my_profile.id)
        .order_by(Referral.created_at.desc())
    )
    return [ReferralResponse.model_validate(r) for r in result.scalars().all()]


@router.patch("/{referral_id}", response_model=ReferralResponse)
async def update_referral_status(
    referral_id: uuid.UUID,
    body: ReferralStatusUpdate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> ReferralResponse:
    """Accept or decline a received referral."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        raise HTTPException(status_code=404, detail="Complete your doctor profile first")

    referral = await session.get(Referral, referral_id)
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    if referral.referred_doctor_id != my_profile.id:
        raise HTTPException(status_code=403, detail="Can only update referrals sent to you")

    if referral.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Referral already {referral.status.lower()}")

    referral.status = body.status
    referral.updated_at = datetime.now(timezone.utc)
    session.add(referral)
    await session.commit()
    await session.refresh(referral)
    return ReferralResponse.model_validate(referral)
