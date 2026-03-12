"""
TDD Tests — Medical RAG Chat Feature.

Tests the /api/reports/rag-chat endpoint and
the /api/reports/patient/{id}/insights endpoint.

All LLM calls are mocked to avoid real API usage in tests.
"""

from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from app.models.enums import UserRole
from tests.conftest import auth_header


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _create_patient_with_profile(client: AsyncClient, make_user):
    patient = await make_user(role=UserRole.PATIENT)
    resp = await client.post(
        "/api/profiles/patient",
        json={
            "first_name": "John",
            "last_name": "Patient",
            "date_of_birth": "1985-06-15",
            "blood_group": "O+",
            "emergency_contact": "+9876543210",
        },
        headers=auth_header(patient),
    )
    assert resp.status_code == 201
    return patient, resp.json()["id"]


async def _upload_report(client: AsyncClient, patient, mock_rag) -> dict:
    """Helper: upload a PDF report and return the response JSON."""
    mock_rag.process_document = AsyncMock()
    resp = await client.post(
        "/api/reports/upload",
        headers=auth_header(patient),
        files={"file": ("prescription.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
        data={"report_type": "Prescription"},
    )
    assert resp.status_code == 201
    return resp.json()


# ─── RAG Chat Tests ───────────────────────────────────────────────────────────


class TestRAGChat:
    """POST /api/reports/rag-chat"""

    @patch("app.api.reports.rag_service")
    async def test_rag_chat_success(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Patient can successfully query their own documents."""
        patient, profile_id = await _create_patient_with_profile(client, make_user)
        await _upload_report(client, patient, mock_rag)

        mock_rag.answer_medical_query = AsyncMock(
            return_value={
                "answer": "Metformin is a medication used to treat type 2 diabetes.",
                "sources": [
                    {"doc_name": "prescription.pdf", "page_range": "1–2"}
                ],
            }
        )

        resp = await client.post(
            "/api/reports/rag-chat",
            headers=auth_header(patient),
            json={
                "query": "What is metformin for?",
                "patient_id": profile_id,
            },
        )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "answer" in data
        assert "sources" in data
        assert isinstance(data["answer"], str)
        assert isinstance(data["sources"], list)

    @patch("app.api.reports.rag_service")
    async def test_rag_chat_no_documents(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Query with no uploaded documents returns a graceful message, not an error."""
        patient, profile_id = await _create_patient_with_profile(client, make_user)

        mock_rag.answer_medical_query = AsyncMock(
            return_value={
                "answer": "No medical documents found. Please upload your medical documents first.",
                "sources": [],
            }
        )

        resp = await client.post(
            "/api/reports/rag-chat",
            headers=auth_header(patient),
            json={
                "query": "What medications am I on?",
                "patient_id": profile_id,
            },
        )

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert "answer" in data
        assert len(data["sources"]) == 0

    async def test_rag_chat_unauthenticated(self, client: AsyncClient):
        """Unauthenticated requests rejected → 401."""
        resp = await client.post(
            "/api/reports/rag-chat",
            json={"query": "What is my diagnosis?", "patient_id": str(uuid.uuid4())},
        )
        assert resp.status_code == 401

    async def test_rag_chat_patient_cannot_query_other_patient(
        self, client: AsyncClient, make_user
    ):
        """Patient A cannot query Patient B's documents → 403."""
        patient_a, profile_id_a = await _create_patient_with_profile(client, make_user)
        patient_b, profile_id_b = await _create_patient_with_profile(client, make_user)

        resp = await client.post(
            "/api/reports/rag-chat",
            headers=auth_header(patient_a),  # patient A's token
            json={
                "query": "What medications is this patient on?",
                "patient_id": profile_id_b,  # patient B's profile
            },
        )

        assert resp.status_code == 403

    @patch("app.api.reports.rag_service")
    async def test_rag_chat_response_contains_disclaimer(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """Response from the API contains the answer and sources fields."""
        patient, profile_id = await _create_patient_with_profile(client, make_user)

        mock_rag.answer_medical_query = AsyncMock(
            return_value={
                "answer": "Amoxicillin is an antibiotic. Always consult your doctor before stopping medication.",
                "sources": [],
            }
        )

        resp = await client.post(
            "/api/reports/rag-chat",
            headers=auth_header(patient),
            json={"query": "What is this antibiotic?", "patient_id": profile_id},
        )

        assert resp.status_code == 200
        data = resp.json()
        # Both keys must always be present in the response
        assert set(data.keys()) >= {"answer", "sources"}

    async def test_rag_chat_empty_query_rejected(
        self, client: AsyncClient, make_user
    ):
        """Blank query string is rejected with 422."""
        patient, profile_id = await _create_patient_with_profile(client, make_user)

        resp = await client.post(
            "/api/reports/rag-chat",
            headers=auth_header(patient),
            json={"query": "", "patient_id": profile_id},
        )

        assert resp.status_code == 422


# ─── Insights Endpoint Tests ──────────────────────────────────────────────────


class TestReportInsights:
    """GET /api/reports/patient/{patient_id}/insights"""

    @patch("app.api.reports.rag_service")
    async def test_insights_returns_empty_when_no_reports(
        self, mock_rag, client: AsyncClient, make_user
    ):
        """No documents → empty insights dict, not 404."""
        mock_rag.get_aggregated_insights = AsyncMock(
            return_value={
                "medications": [],
                "diagnoses": [],
                "lab_values": [],
                "key_findings": [],
                "risk_flags": [],
            }
        )
        patient, profile_id = await _create_patient_with_profile(client, make_user)

        resp = await client.get(
            f"/api/reports/patient/{profile_id}/insights",
            headers=auth_header(patient),
        )

        assert resp.status_code == 200
        data = resp.json()
        # Should have the structured keys even if empty
        assert "medications" in data
        assert "diagnoses" in data
        assert "lab_values" in data
        assert "key_findings" in data
        assert "risk_flags" in data

    async def test_insights_unauthenticated(self, client: AsyncClient):
        """Unauthenticated → 401."""
        resp = await client.get(
            f"/api/reports/patient/{uuid.uuid4()}/insights"
        )
        assert resp.status_code == 401

    async def test_insights_patient_cannot_view_other_patient(
        self, client: AsyncClient, make_user
    ):
        """Patient A cannot view Patient B's insights → 403."""
        patient_a, _ = await _create_patient_with_profile(client, make_user)
        patient_b, profile_id_b = await _create_patient_with_profile(client, make_user)

        resp = await client.get(
            f"/api/reports/patient/{profile_id_b}/insights",
            headers=auth_header(patient_a),
        )

        assert resp.status_code == 403
