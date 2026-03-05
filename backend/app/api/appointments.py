"""
Appointment routes — book, list, update, and retrieve appointments.
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
from app.deps import get_current_user
from app.models.user import User
from app.models.enums import AppointmentStatus, UserRole
from app.models.appointment import Appointment
from app.models.profiles import PatientProfile, DoctorProfile

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    scheduled_time: datetime
    meeting_notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus
    meeting_notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    scheduled_time: datetime
    status: AppointmentStatus
    meeting_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────────────────────────────

async def _get_profile_id(
    session: AsyncSession, user: User
) -> uuid.UUID:
    """Get the profile ID for the current user (patient or doctor)."""
    if user.role == UserRole.PATIENT:
        result = await session.execute(
            select(PatientProfile.id).where(PatientProfile.user_id == user.id)
        )
    elif user.role == UserRole.DOCTOR:
        result = await session.execute(
            select(DoctorProfile.id).where(DoctorProfile.user_id == user.id)
        )
    else:
        raise HTTPException(status_code=403, detail="Admin cannot have appointments")

    profile_id = result.scalar_one_or_none()
    if not profile_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Please complete your profile first",
        )
    return profile_id


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment(
    body: AppointmentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AppointmentResponse:
    """Book a new appointment."""
    # Verify the patient and doctor profiles exist
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    doctor = await session.get(DoctorProfile, body.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    appointment = Appointment(
        patient_id=body.patient_id,
        doctor_id=body.doctor_id,
        scheduled_time=body.scheduled_time,
        meeting_notes=body.meeting_notes,
        status=AppointmentStatus.PENDING,
    )
    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)
    return AppointmentResponse.model_validate(appointment)


@router.get("/upcoming", response_model=list[AppointmentResponse])
async def get_upcoming_appointments(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[AppointmentResponse]:
    """Get upcoming appointments for the current user."""
    profile_id = await _get_profile_id(session, user)
    now = datetime.now(timezone.utc)

    if user.role == UserRole.PATIENT:
        condition = Appointment.patient_id == profile_id
    else:
        condition = Appointment.doctor_id == profile_id

    result = await session.execute(
        select(Appointment)
        .where(condition)
        .where(Appointment.scheduled_time >= now)
        .where(Appointment.status.in_([
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
        ]))
        .order_by(Appointment.scheduled_time.asc())
    )
    appointments = result.scalars().all()
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.get("/history", response_model=list[AppointmentResponse])
async def get_appointment_history(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[AppointmentResponse]:
    """Get past / completed / cancelled appointments."""
    profile_id = await _get_profile_id(session, user)

    if user.role == UserRole.PATIENT:
        condition = Appointment.patient_id == profile_id
    else:
        condition = Appointment.doctor_id == profile_id

    result = await session.execute(
        select(Appointment)
        .where(condition)
        .where(Appointment.status.in_([
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
        ]))
        .order_by(Appointment.scheduled_time.desc())
    )
    appointments = result.scalars().all()
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AppointmentResponse:
    """Get a single appointment's details."""
    appointment = await session.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify the user is associated with this appointment
    profile_id = await _get_profile_id(session, user)
    if appointment.patient_id != profile_id and appointment.doctor_id != profile_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return AppointmentResponse.model_validate(appointment)


@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment_status(
    appointment_id: uuid.UUID,
    body: AppointmentStatusUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AppointmentResponse:
    """Update an appointment's status (confirm, cancel, complete)."""
    appointment = await session.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify the user is associated
    profile_id = await _get_profile_id(session, user)
    if appointment.patient_id != profile_id and appointment.doctor_id != profile_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    appointment.status = body.status
    if body.meeting_notes is not None:
        appointment.meeting_notes = body.meeting_notes

    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)
    return AppointmentResponse.model_validate(appointment)
