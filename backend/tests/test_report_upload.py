"""
TDD Tests — Medical Report Upload Feature.

Tests the /api/reports/upload multipart endpoint and
the GET /api/reports/patient/{id} listing endpoint.

All LLM background tasks are mocked so no real API calls occur.
"""

from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.models.enums import UserRole
from tests.conftest import auth_header


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _create_patient_with_profile(client: AsyncClient, make_user):
    """Create a PATIENT user + patient profile, return (user, profile_id)."""
    patient = await make_user(role=UserRole.PATIENT)

    resp = await client.post(
        "/api/profiles/patient",
        json={
            "first_name": "Jane",
            "last_name": "Doe",
            "date_of_birth": "1990-01-01",
            "blood_group": "A+",
            "emergency_contact": "+1234567890",
        },
        headers=auth_header(patient),
    )
    assert resp.status_code == 201, f"Profile creation failed: {resp.text}"
    profile_id = resp.json()["id"]
    return patient, profile_id


async def _create_doctor_with_profile(client: AsyncClient, make_user):
    """Create a DOCTOR user + doctor profile, return (user, profile_id)."""
    doctor = await make_user(role=UserRole.DOCTOR)

    resp = await client.post(
        "/api/profiles/doctor",
        json={
            "first_name": "Dr. House",
            "last_name": "MD",
            "specialization": "Diagnostics",
            "license_number": f"LIC-{uuid.uuid4().hex[:6]}",
        },
        headers=auth_header(doctor),
    )
    assert resp.status_code == 201, f"Doctor profile creation failed: {resp.text}"
    return doctor, resp.json()["id"]


# ─── Upload Endpoint Tests ────────────────────────────────────────────────────


class TestReportUpload:
    """POST /api/reports/upload"""

    @patch("app.api.reports.rag_service")
    async def test_upload_pdf_success(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Valid PDF upload → 201, PENDING status, correct metadata."""
        mock_rag.process_document = AsyncMock()

        patient, _ = await _create_patient_with_profile(client, make_user)
        pdf_content = b"%PDF-1.4 minimal test pdf content"

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("blood_work.pdf", io.BytesIO(pdf_content), "application/pdf")},
            data={"report_type": "Blood Work"},
        )

        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["ai_analysis_status"] == "PENDING"
        assert data["file_name"] == "blood_work.pdf"
        assert data["report_type"] == "Blood Work"
        assert data["file_type"] == "application/pdf"

    @patch("app.api.reports.rag_service")
    async def test_upload_jpeg_image_success(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Valid JPEG upload → 201, PENDING status."""
        mock_rag.process_document = AsyncMock()

        patient, _ = await _create_patient_with_profile(client, make_user)
        image_bytes = b"\xff\xd8\xff\xe0fake jpeg content"  # JPEG magic bytes

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("scan.jpg", io.BytesIO(image_bytes), "image/jpeg")},
            data={"report_type": "X-Ray"},
        )

        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["file_name"] == "scan.jpg"
        assert data["file_type"] == "image/jpeg"

    @patch("app.api.reports.rag_service")
    async def test_upload_docx_success(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Valid DOCX upload → 201."""
        mock_rag.process_document = AsyncMock()

        patient, _ = await _create_patient_with_profile(client, make_user)
        docx_bytes = b"PK\x03\x04fake docx content"  # ZIP/DOCX magic

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={
                "file": (
                    "discharge_summary.docx",
                    io.BytesIO(docx_bytes),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            },
            data={"report_type": "Discharge Summary"},
        )

        assert resp.status_code == 201, resp.text

    async def test_upload_invalid_mime_type_rejected(
        self, client: AsyncClient, make_user
    ):
        """Executable or disallowed file type → 422."""
        patient, _ = await _create_patient_with_profile(client, make_user)
        exe_bytes = b"MZ\x90\x00malicious content"

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("malware.exe", io.BytesIO(exe_bytes), "application/octet-stream")},
            data={"report_type": "Blood Work"},
        )

        assert resp.status_code == 422

    async def test_upload_unauthenticated(self, client: AsyncClient):
        """No auth token → 401."""
        pdf_content = b"%PDF-1.4 fake"

        resp = await client.post(
            "/api/reports/upload",
            files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
            data={"report_type": "Blood Work"},
        )

        assert resp.status_code == 401

    async def test_upload_doctor_forbidden(
        self, client: AsyncClient, make_user
    ):
        """DOCTOR role cannot upload via the patient upload endpoint → 403."""
        doctor, _ = await _create_doctor_with_profile(client, make_user)
        pdf_content = b"%PDF-1.4 fake"

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(doctor),
            files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
            data={"report_type": "Blood Work"},
        )

        assert resp.status_code == 403

    @patch("app.api.reports.rag_service")
    async def test_upload_missing_report_type(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Missing required report_type field → 422."""
        mock_rag.process_document = AsyncMock()
        patient, _ = await _create_patient_with_profile(client, make_user)
        pdf_content = b"%PDF-1.4 fake"

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
            # omit report_type
        )

        assert resp.status_code == 422

    @patch("app.api.reports.rag_service")
    async def test_upload_file_size_limit(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Files exceeding 25 MB are rejected with 413."""
        mock_rag.process_document = AsyncMock()
        patient, _ = await _create_patient_with_profile(client, make_user)
        big_file = b"%PDF-1.4 " + b"x" * (26 * 1024 * 1024)  # 26 MB

        resp = await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("bigfile.pdf", io.BytesIO(big_file), "application/pdf")},
            data={"report_type": "MRI"},
        )

        assert resp.status_code == 413


# ─── List Reports Tests ──────────────────────────────────────────────────────


class TestListReports:
    """GET /api/reports/patient/{patient_id}"""

    @patch("app.api.reports.rag_service")
    async def test_list_own_reports(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Authenticated patient can list their own reports."""
        mock_rag.process_document = AsyncMock()
        patient, profile_id = await _create_patient_with_profile(client, make_user)
        pdf_content = b"%PDF-1.4 test"

        # Upload a report
        await client.post(
            "/api/reports/upload",
            headers=auth_header(patient),
            files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
            data={"report_type": "Lab Result"},
        )

        resp = await client.get(
            f"/api/reports/patient/{profile_id}",
            headers=auth_header(patient),
        )

        assert resp.status_code == 200
        reports = resp.json()
        assert len(reports) >= 1
        assert reports[0]["report_type"] == "Lab Result"
        # New fields should be present
        assert "file_name" in reports[0]
        assert "file_type" in reports[0]
        assert "ai_insights" in reports[0]

    async def test_list_reports_unauthenticated(
        self, client: AsyncClient, make_user
    ):
        """Unauthenticated requests rejected → 401."""
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/reports/patient/{fake_id}")
        assert resp.status_code == 401
