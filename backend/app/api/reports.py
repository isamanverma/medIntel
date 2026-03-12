"""
Medical report routes — upload, list, RAG chat, and insights.

Endpoints
─────────
  POST   /api/reports/upload                — multipart file upload (patient only)
  POST   /api/reports/rag-chat              — RAG-powered medical Q&A
  GET    /api/reports/patient/{id}/insights — aggregated AI health insights
  GET    /api/reports/patient/{id}          — list reports for a patient
  GET    /api/reports/{report_id}           — single report details
  POST   /api/reports                       — create report from URL (legacy)
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user, require_patient
from app.models.enums import AIAnalysisStatus
from app.models.profiles import PatientProfile
from app.models.report import MedicalReport
from app.models.user import User
from app.services import file_storage, rag_service
from app.services.file_storage import (
    FileTooLargeError,
    InvalidFileTypeError,
    StorageUnavailableError,
)

router = APIRouter(prefix="/reports", tags=["reports"])


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────


class ReportCreate(BaseModel):
    """Legacy JSON body for creating a report with a pre-existing URL."""

    patient_id: uuid.UUID
    file_url: str = PydanticField(..., min_length=1, max_length=1024)
    report_type: str = PydanticField(..., min_length=1, max_length=100)


class ReportResponse(BaseModel):
    id: uuid.UUID
    patient_id: uuid.UUID
    uploader_id: uuid.UUID
    file_url: str
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    report_type: str
    uploaded_at: datetime
    ai_analysis_status: AIAnalysisStatus
    ai_summary: Optional[str] = None
    ai_insights: Optional[dict] = None

    model_config = {"from_attributes": True}


class RAGChatRequest(BaseModel):
    query: str = PydanticField(..., min_length=1, max_length=2000)
    patient_id: uuid.UUID


class RAGChatSource(BaseModel):
    doc_name: str
    page_range: str


class RAGChatResponse(BaseModel):
    answer: str
    sources: list[RAGChatSource]


class AggregatedInsightsResponse(BaseModel):
    medications: list[Any] = []
    diagnoses: list[Any] = []
    lab_values: list[Any] = []
    key_findings: list[Any] = []
    risk_flags: list[Any] = []


# ──────────────────────────────────────────────────────────────────
#  Internal helpers
# ──────────────────────────────────────────────────────────────────


async def _assert_own_patient(
    patient_id: uuid.UUID,
    user: User,
    session: AsyncSession,
) -> PatientProfile:
    """
    Return the PatientProfile for *patient_id*, enforcing ownership.

    - Patients may only access their own profile.
    - Doctors/admins may access any patient's profile.

    Raises 404 if the profile does not exist.
    Raises 403 if a patient tries to access another patient's data.
    """
    profile = await session.get(PatientProfile, patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    if user.role.value == "PATIENT" and profile.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: you can only access your own data",
        )

    return profile


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────


@router.post(
    "/upload",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    report_type: str = Form(..., min_length=1, max_length=100),
    user: User = Depends(require_patient),
    session: AsyncSession = Depends(get_session),
) -> ReportResponse:
    """
    Upload a medical document (PDF, image, or DOCX).

    Patient role only. Validates MIME type and file size (≤ 25 MB).
    Schedules background processing (PageIndex tree + AI insights).
    """
    # Look up the patient profile for this user
    patient_result = await session.execute(
        select(PatientProfile).where(PatientProfile.user_id == user.id)
    )
    patient_profile = patient_result.scalar_one_or_none()
    if not patient_profile:
        raise HTTPException(
            status_code=404,
            detail="Patient profile not found. Create your profile first.",
        )

    # Validate and persist file
    try:
        file_url, file_name, file_type = await file_storage.save_upload(
            file, patient_profile.id
        )
    except InvalidFileTypeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except FileTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc))
    except StorageUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    # Create the MedicalReport record
    report = MedicalReport(
        patient_id=patient_profile.id,
        uploader_id=user.id,
        file_url=file_url,
        file_name=file_name,
        file_type=file_type,
        report_type=report_type,
        ai_analysis_status=AIAnalysisStatus.PENDING,
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    # Schedule background AI processing
    background_tasks.add_task(
        rag_service.process_document,
        report.id,
        file_url,
        file_type,
        file_name,
    )

    return ReportResponse.model_validate(report)


@router.post("/rag-chat", response_model=RAGChatResponse)
async def rag_chat(
    body: RAGChatRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RAGChatResponse:
    """
    Ask a medical question about the patient's uploaded documents.

    Uses PageIndex reasoning-based RAG with Gemini for answer generation.
    Medical safety guardrails are applied automatically.
    """
    await _assert_own_patient(body.patient_id, user, session)

    result = await rag_service.answer_medical_query(
        patient_id=body.patient_id,
        query=body.query,
        session=session,
    )

    return RAGChatResponse(
        answer=result["answer"],
        sources=[RAGChatSource(**s) for s in result.get("sources", [])],
    )


@router.get(
    "/patient/{patient_id}/insights",
    response_model=AggregatedInsightsResponse,
)
async def get_patient_insights(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AggregatedInsightsResponse:
    """
    Aggregated AI health insights from all completed medical reports.

    Returns merged medications, diagnoses, lab values, key findings,
    and risk flags across all processed documents.
    """
    await _assert_own_patient(patient_id, user, session)

    insights = await rag_service.get_aggregated_insights(
        patient_id=patient_id,
        session=session,
    )
    return AggregatedInsightsResponse(**insights)


@router.get(
    "/patient/{patient_id}",
    response_model=list[ReportResponse],
)
async def get_patient_reports(
    patient_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReportResponse]:
    """List all medical reports for a patient (newest first)."""
    await _assert_own_patient(patient_id, user, session)

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
    """Legacy endpoint: create a report with a pre-existing file URL."""
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
