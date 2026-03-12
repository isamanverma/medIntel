"""
CometChat Video Calling API

Endpoints:
  POST /api/video/token               — Provision user in CometChat + return auth token
  GET  /api/video/eligibility/{id}    — Check whether the call window is open for an appointment

The call window is: scheduled_time − 5 min  →  scheduled_time + 60 min
Only CONFIRMED appointments qualify.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.db.engine import get_session
from app.deps import get_current_user
from app.models.user import User
from app.models.profiles import PatientProfile, DoctorProfile
from app.models.appointment import Appointment
from app.models.enums import UserRole, AppointmentStatus

router = APIRouter(prefix="/api/video", tags=["video"])

# ── Constants ─────────────────────────────────────────────────────────────────

# Call window spans the entire calendar day (UTC) of the appointment.
# The window opens at midnight on the appointment's day and closes at
# midnight at the start of the following day.
_ONE_DAY = timedelta(days=1)

_COMETCHAT_BASE = "https://api-{region}.cometchat.io/v3"


def _cometchat_url(path: str) -> str:
    base = _COMETCHAT_BASE.format(region=settings.COMETCHAT_REGION)
    return f"{base}{path}"


def _cometchat_headers() -> dict[str, str]:
    return {
        "appId": settings.COMETCHAT_APP_ID,
        "apiKey": settings.COMETCHAT_REST_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


# ── Response schemas ──────────────────────────────────────────────────────────

class VideoTokenResponse(BaseModel):
    cometchat_uid: str
    auth_token: str
    app_id: str
    region: str


class CallEligibilityResponse(BaseModel):
    eligible: bool
    reason: str
    appointment_id: str
    scheduled_time: str
    other_party_cometchat_uid: Optional[str]
    other_party_name: Optional[str]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _provision_cometchat_user(uid: str, name: str) -> None:
    """Create or update the CometChat user (idempotent)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            _cometchat_url("/users"),
            headers=_cometchat_headers(),
            json={"uid": uid, "name": name},
        )
        # 200 = created, 409 = already exists (both are fine)
        if resp.status_code not in (200, 201, 409):
            # Try PUT to update metadata if the user exists
            await client.put(
                _cometchat_url(f"/users/{uid}"),
                headers=_cometchat_headers(),
                json={"name": name},
            )


async def _get_cometchat_auth_token(uid: str) -> str:
    """Generate a fresh CometChat auth token for the given UID."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            _cometchat_url(f"/users/{uid}/auth_tokens"),
            headers=_cometchat_headers(),
            json={},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"CometChat token generation failed: {resp.status_code}",
            )
        data = resp.json()
        return data["data"]["authToken"]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/token", response_model=VideoTokenResponse)
async def get_video_token(
    current_user: User = Depends(get_current_user),
) -> VideoTokenResponse:
    """
    Provision the calling user in CometChat (idempotent) and return a
    fresh auth token.  The frontend uses this token to log the user
    into the CometChat SDK.

    CometChat UID = str(user.id)  — stable, unique per user.
    """
    if not settings.COMETCHAT_APP_ID or not settings.COMETCHAT_REST_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Video calling is not configured on this server.",
        )

    uid = str(current_user.id)
    name = current_user.name

    # Ensure the user exists in CometChat
    await _provision_cometchat_user(uid, name)

    # Generate + return a fresh auth token
    auth_token = await _get_cometchat_auth_token(uid)

    return VideoTokenResponse(
        cometchat_uid=uid,
        auth_token=auth_token,
        app_id=settings.COMETCHAT_APP_ID,
        region=settings.COMETCHAT_REGION,
    )


@router.get("/eligibility/{appointment_id}", response_model=CallEligibilityResponse)
async def get_call_eligibility(
    appointment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CallEligibilityResponse:
    """
    Return whether the current user is allowed to start/join a video call
    for the given appointment.

    Eligibility rules:
    1. Appointment must exist and the user must be one of its parties.
    2. Status must be CONFIRMED.
    3. Current time must be within the call window:
         [scheduled_time − 5 min, scheduled_time + 60 min]
    """
    appt = await session.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    now = datetime.now(timezone.utc)

    # ── Identify current user's profile and verify they belong to this appointment ──

    other_party_uid: Optional[str] = None
    other_party_name: Optional[str] = None

    if current_user.role == UserRole.PATIENT:
        # Look up the patient profile for this user
        result = await session.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient_profile = result.scalar_one_or_none()
        if patient_profile is None or patient_profile.id != appt.patient_id:
            return CallEligibilityResponse(
                eligible=False,
                reason="You are not a party to this appointment.",
                appointment_id=str(appointment_id),
                scheduled_time=appt.scheduled_time.isoformat(),
                other_party_cometchat_uid=None,
                other_party_name=None,
            )
        # Other party = doctor
        dr_result = await session.execute(
            select(DoctorProfile).where(DoctorProfile.id == appt.doctor_id)
        )
        doctor_profile = dr_result.scalar_one_or_none()
        if doctor_profile:
            other_party_uid = str(doctor_profile.user_id)
            other_party_name = f"Dr. {doctor_profile.first_name} {doctor_profile.last_name}"

    elif current_user.role == UserRole.DOCTOR:
        # Look up the doctor profile for this user
        result = await session.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
        )
        doctor_profile = result.scalar_one_or_none()
        if doctor_profile is None or doctor_profile.id != appt.doctor_id:
            return CallEligibilityResponse(
                eligible=False,
                reason="You are not a party to this appointment.",
                appointment_id=str(appointment_id),
                scheduled_time=appt.scheduled_time.isoformat(),
                other_party_cometchat_uid=None,
                other_party_name=None,
            )
        # Other party = patient
        pt_result = await session.execute(
            select(PatientProfile).where(PatientProfile.id == appt.patient_id)
        )
        patient_profile = pt_result.scalar_one_or_none()
        if patient_profile:
            other_party_uid = str(patient_profile.user_id)
            other_party_name = f"{patient_profile.first_name} {patient_profile.last_name}"
    else:
        return CallEligibilityResponse(
            eligible=False,
            reason="Only patients and doctors can join video calls.",
            appointment_id=str(appointment_id),
            scheduled_time=appt.scheduled_time.isoformat(),
            other_party_cometchat_uid=None,
            other_party_name=None,
        )

    # ── Status check ──────────────────────────────────────────────────────────

    if appt.status != AppointmentStatus.CONFIRMED:
        return CallEligibilityResponse(
            eligible=False,
            reason=f"Appointment is {appt.status.value.lower()}, not confirmed.",
            appointment_id=str(appointment_id),
            scheduled_time=appt.scheduled_time.isoformat(),
            other_party_cometchat_uid=other_party_uid,
            other_party_name=other_party_name,
        )

    # ── Time window check ─────────────────────────────────────────────────────

    scheduled = appt.scheduled_time
    if scheduled.tzinfo is None:
        scheduled = scheduled.replace(tzinfo=timezone.utc)

    # The call window is the full calendar day (UTC) of the appointment.
    window_start = scheduled.replace(hour=0, minute=0, second=0, microsecond=0)
    window_end = window_start + _ONE_DAY

    if now < window_start:
        return CallEligibilityResponse(
            eligible=False,
            reason="call_window_future",
            appointment_id=str(appointment_id),
            scheduled_time=appt.scheduled_time.isoformat(),
            other_party_cometchat_uid=other_party_uid,
            other_party_name=other_party_name,
        )

    if now > window_end:
        return CallEligibilityResponse(
            eligible=False,
            reason="The call window for this appointment has passed.",
            appointment_id=str(appointment_id),
            scheduled_time=appt.scheduled_time.isoformat(),
            other_party_cometchat_uid=other_party_uid,
            other_party_name=other_party_name,
        )

    return CallEligibilityResponse(
        eligible=True,
        reason="Call window is open.",
        appointment_id=str(appointment_id),
        scheduled_time=appt.scheduled_time.isoformat(),
        other_party_cometchat_uid=other_party_uid,
        other_party_name=other_party_name,
    )
