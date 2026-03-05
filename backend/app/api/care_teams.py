"""
Care Team API routes — multi-doctor collaboration on patient cases.

Allows doctors to create care teams for patients and add/remove
team members with roles (PRIMARY, CONSULTANT, SPECIALIST).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.engine import get_session
from app.deps import require_doctor, get_current_user
from app.models.user import User
from app.models.profiles import DoctorProfile, PatientProfile
from app.models.care_team import CareTeam, CareTeamMember

router = APIRouter(prefix="/care-teams", tags=["care-teams"])


# ── Schemas ───────────────────────────────────────────────────────

class CareTeamCreate(BaseModel):
    patient_id: uuid.UUID
    name: str = PydanticField(..., min_length=1, max_length=200)
    description: Optional[str] = PydanticField(None, max_length=500)


class CareTeamMemberAdd(BaseModel):
    doctor_id: uuid.UUID
    role: str = PydanticField("CONSULTANT", pattern="^(PRIMARY|CONSULTANT|SPECIALIST)$")


class CareTeamMemberResponse(BaseModel):
    id: uuid.UUID
    care_team_id: uuid.UUID
    doctor_id: uuid.UUID
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}


class CareTeamResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    name: str
    description: Optional[str]
    created_at: datetime
    members: list[CareTeamMemberResponse] = []

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────

@router.post("", response_model=CareTeamResponse, status_code=status.HTTP_201_CREATED)
async def create_care_team(
    body: CareTeamCreate,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> CareTeamResponse:
    """Create a care team for a patient."""
    # Verify doctor profile
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        raise HTTPException(status_code=404, detail="Complete your doctor profile first")

    # Verify patient exists
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    team = CareTeam(
        patient_id=body.patient_id,
        name=body.name,
        description=body.description,
    )
    session.add(team)
    await session.flush()

    # Automatically add the creating doctor as PRIMARY
    member = CareTeamMember(
        care_team_id=team.id,
        doctor_id=my_profile.id,
        role="PRIMARY",
    )
    session.add(member)
    await session.commit()
    await session.refresh(team)

    # Reload with members
    result = await session.execute(
        select(CareTeam)
        .options(selectinload(CareTeam.members))
        .where(CareTeam.id == team.id)
    )
    team = result.scalar_one()
    return CareTeamResponse.model_validate(team)


@router.post("/{team_id}/members", response_model=CareTeamMemberResponse, status_code=status.HTTP_201_CREATED)
async def add_care_team_member(
    team_id: uuid.UUID,
    body: CareTeamMemberAdd,
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> CareTeamMemberResponse:
    """Add a doctor to a care team."""
    team = await session.get(CareTeam, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Care team not found")

    # Verify the doctor being added exists
    doctor = await session.get(DoctorProfile, body.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check for duplicate
    existing = await session.execute(
        select(CareTeamMember).where(
            CareTeamMember.care_team_id == team_id,
            CareTeamMember.doctor_id == body.doctor_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Doctor already in this care team")

    member = CareTeamMember(
        care_team_id=team_id,
        doctor_id=body.doctor_id,
        role=body.role,
    )
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return CareTeamMemberResponse.model_validate(member)


@router.get("/patient/{patient_id}", response_model=list[CareTeamResponse])
async def get_patient_care_teams(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[CareTeamResponse]:
    """Get all care teams for a patient."""
    result = await session.execute(
        select(CareTeam)
        .options(selectinload(CareTeam.members))
        .where(CareTeam.patient_id == patient_id)
        .order_by(CareTeam.created_at.desc())
    )
    teams = result.scalars().all()
    return [CareTeamResponse.model_validate(t) for t in teams]


@router.get("/doctor/me", response_model=list[CareTeamResponse])
async def get_my_care_teams(
    user: User = Depends(require_doctor),
    session: AsyncSession = Depends(get_session),
) -> list[CareTeamResponse]:
    """Get care teams the current doctor belongs to."""
    result = await session.execute(
        select(DoctorProfile).where(DoctorProfile.user_id == user.id)
    )
    my_profile = result.scalar_one_or_none()
    if not my_profile:
        return []

    result = await session.execute(
        select(CareTeam)
        .options(selectinload(CareTeam.members))
        .join(CareTeamMember)
        .where(CareTeamMember.doctor_id == my_profile.id)
        .order_by(CareTeam.created_at.desc())
    )
    teams = result.unique().scalars().all()
    return [CareTeamResponse.model_validate(t) for t in teams]
