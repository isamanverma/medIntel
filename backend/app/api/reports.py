"""
Medical report routes — create, list, and retrieve reports.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user
from app.models.user import User
from app.models.enums import AIAnalysisStatus
from app.models.report import MedicalReport
from app.models.profiles import PatientProfile

router = APIRouter(prefix="/reports", tags=["reports"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    patient_id: uuid.UUID
    file_url: str = PydanticField(..., min_length=1, max_length=1024)
    report_type: str = PydanticField(..., min_length=1, max_length=100)


class ReportResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    uploader_id: uuid.UUID
    file_url: str
    report_type: str
    uploaded_at: datetime
    ai_analysis_status: AIAnalysisStatus
    ai_summary: Optional[str]

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    body: ReportCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportResponse:
    """Upload a new medical report (metadata only — file URL)."""
    # Verify patient exists
    patient = await session.get(PatientProfile, body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    report = MedicalReport(
        patient_id=body.patient_id,
        uploader_id=user.id,
        file_url=body.file_url,
        report_type=body.report_type,
        ai_analysis_status=AIAnalysisStatus.PENDING,
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)
    return ReportResponse.model_validate(report)


@router.get(
    "/patient/{patient_id}",
    response_model=list[ReportResponse],
)
async def get_patient_reports(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReportResponse]:
    """List all medical reports for a patient."""
    result = await session.execute(
        select(MedicalReport)
        .where(MedicalReport.patient_id == patient_id)
        .order_by(MedicalReport.uploaded_at.desc())
    )
    reports = result.scalars().all()
    return [ReportResponse.model_validate(r) for r in reports]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReportResponse:
    """Get a single report's details."""
    report = await session.get(MedicalReport, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse.model_validate(report)
