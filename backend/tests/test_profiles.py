"""
Tests for profile endpoints and authorization boundaries.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.enums import UserRole
from tests.conftest import auth_header


class TestPatientProfile:
    """Patient profile CRUD tests."""

    async def test_create_patient_profile(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.PATIENT)
        resp = await client.post("/api/profiles/patient", json={
            "first_name": "John",
            "last_name": "Doe",
            "date_of_birth": "1990-05-15",
            "blood_group": "O+",
            "emergency_contact": "+1234567890",
        }, headers=auth_header(user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["first_name"] == "John"
        assert data["user_id"] == str(user.id)

    async def test_get_patient_profile(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.PATIENT)
        # Create first
        await client.post("/api/profiles/patient", json={
            "first_name": "Jane",
            "last_name": "Smith",
            "date_of_birth": "1985-03-20",
            "blood_group": "A-",
            "emergency_contact": "+0987654321",
        }, headers=auth_header(user))

        # Then get
        resp = await client.get("/api/profiles/patient/me", headers=auth_header(user))
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Jane"

    async def test_update_patient_profile(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.PATIENT)
        await client.post("/api/profiles/patient", json={
            "first_name": "Original",
            "last_name": "Name",
            "date_of_birth": "1990-01-01",
            "blood_group": "B+",
            "emergency_contact": "+111",
        }, headers=auth_header(user))

        resp = await client.put("/api/profiles/patient/me", json={
            "first_name": "Updated",
        }, headers=auth_header(user))
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"
        assert resp.json()["last_name"] == "Name"  # unchanged

    async def test_duplicate_profile_rejected(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.PATIENT)
        profile_data = {
            "first_name": "Test",
            "last_name": "User",
            "date_of_birth": "1990-01-01",
            "blood_group": "AB+",
            "emergency_contact": "+000",
        }
        resp1 = await client.post("/api/profiles/patient", json=profile_data, headers=auth_header(user))
        assert resp1.status_code == 201
        resp2 = await client.post("/api/profiles/patient", json=profile_data, headers=auth_header(user))
        assert resp2.status_code == 409

    async def test_profile_not_found(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.PATIENT)
        resp = await client.get("/api/profiles/patient/me", headers=auth_header(user))
        assert resp.status_code == 404


class TestDoctorProfile:
    """Doctor profile CRUD tests."""

    async def test_create_doctor_profile(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.DOCTOR)
        resp = await client.post("/api/profiles/doctor", json={
            "first_name": "Dr. Sarah",
            "last_name": "Wilson",
            "specialization": "Cardiology",
            "license_number": "MD-12345",
        }, headers=auth_header(user))
        assert resp.status_code == 201
        data = resp.json()
        assert data["specialization"] == "Cardiology"

    async def test_get_doctor_profile(self, client: AsyncClient, make_user):
        user = await make_user(role=UserRole.DOCTOR)
        await client.post("/api/profiles/doctor", json={
            "first_name": "Dr. Mike",
            "last_name": "Chen",
            "specialization": "Neurology",
            "license_number": "MD-67890",
        }, headers=auth_header(user))

        resp = await client.get("/api/profiles/doctor/me", headers=auth_header(user))
        assert resp.status_code == 200
        assert resp.json()["specialization"] == "Neurology"


class TestAuthorization:
    """Cross-role authorization tests."""

    async def test_doctor_cannot_access_patient_profile(self, client: AsyncClient, make_user):
        doctor = await make_user(role=UserRole.DOCTOR)
        resp = await client.get("/api/profiles/patient/me", headers=auth_header(doctor))
        assert resp.status_code == 403

    async def test_patient_cannot_access_doctor_profile(self, client: AsyncClient, make_user):
        patient = await make_user(role=UserRole.PATIENT)
        resp = await client.get("/api/profiles/doctor/me", headers=auth_header(patient))
        assert resp.status_code == 403

    async def test_patient_cannot_create_doctor_profile(self, client: AsyncClient, make_user):
        patient = await make_user(role=UserRole.PATIENT)
        resp = await client.post("/api/profiles/doctor", json={
            "first_name": "Fake",
            "last_name": "Doctor",
            "specialization": "None",
            "license_number": "FAKE-001",
        }, headers=auth_header(patient))
        assert resp.status_code == 403

    async def test_unauthenticated_cannot_access_profiles(self, client: AsyncClient):
        resp = await client.get("/api/profiles/patient/me")
        assert resp.status_code == 401


class TestPatientMetricHistory:
    """Patient metric logging and history retrieval tests."""

    async def test_patient_can_add_and_list_metric_history(
        self,
        client: AsyncClient,
        make_user,
    ):
        user = await make_user(role=UserRole.PATIENT)
        await client.post(
            "/api/profiles/patient",
            json={
                "first_name": "Metric",
                "last_name": "User",
                "date_of_birth": "1994-01-01",
                "blood_group": "O+",
                "emergency_contact": "+1000000000",
            },
            headers=auth_header(user),
        )

        create_resp = await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "blood_pressure",
                "value": "122/78",
                "recorded_at": "2026-03-15T06:30:00Z",
            },
            headers=auth_header(user),
        )
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["metric_type"] == "blood_pressure"
        assert created["value"] == "122/78"
        assert created["unit"] == "mmHg"
        assert created["numeric_value"] == 122

        list_resp = await client.get(
            "/api/profiles/patient/metrics?metric_type=blood_pressure",
            headers=auth_header(user),
        )
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) == 1
        assert items[0]["value"] == "122/78"
        assert items[0]["metric_type"] == "blood_pressure"

    async def test_patient_metric_list_is_newest_first(
        self,
        client: AsyncClient,
        make_user,
    ):
        user = await make_user(role=UserRole.PATIENT)
        await client.post(
            "/api/profiles/patient",
            json={
                "first_name": "Sort",
                "last_name": "Check",
                "date_of_birth": "1994-01-01",
                "blood_group": "A+",
                "emergency_contact": "+1000000001",
            },
            headers=auth_header(user),
        )

        await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "blood_sugar",
                "value": "130",
                "recorded_at": "2026-03-14T10:00:00Z",
            },
            headers=auth_header(user),
        )
        await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "blood_sugar",
                "value": "118",
                "recorded_at": "2026-03-15T10:00:00Z",
            },
            headers=auth_header(user),
        )

        list_resp = await client.get(
            "/api/profiles/patient/metrics?metric_type=blood_sugar",
            headers=auth_header(user),
        )
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) == 2
        assert items[0]["value"] == "118"
        assert items[1]["value"] == "130"

    async def test_metric_validation_rejects_invalid_bp_format(
        self,
        client: AsyncClient,
        make_user,
    ):
        user = await make_user(role=UserRole.PATIENT)
        await client.post(
            "/api/profiles/patient",
            json={
                "first_name": "Valid",
                "last_name": "Rules",
                "date_of_birth": "1995-01-01",
                "blood_group": "B+",
                "emergency_contact": "+1000000002",
            },
            headers=auth_header(user),
        )

        resp = await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "blood_pressure",
                "value": "120-80",
            },
            headers=auth_header(user),
        )
        assert resp.status_code == 422

    async def test_metric_requires_patient_profile(
        self,
        client: AsyncClient,
        make_user,
    ):
        user = await make_user(role=UserRole.PATIENT)
        resp = await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "weight",
                "value": "72",
            },
            headers=auth_header(user),
        )
        assert resp.status_code == 404

    async def test_doctor_cannot_add_patient_metrics(
        self,
        client: AsyncClient,
        make_user,
    ):
        doctor = await make_user(role=UserRole.DOCTOR)
        resp = await client.post(
            "/api/profiles/patient/metrics",
            json={
                "metric_type": "weight",
                "value": "72",
            },
            headers=auth_header(doctor),
        )
        assert resp.status_code == 403
