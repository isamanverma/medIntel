"""
Tests for appointment and mapping endpoints.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.models.enums import UserRole
from tests.conftest import auth_header


async def _setup_patient_doctor(client: AsyncClient, make_user):
    """Helper: create a patient + doctor with profiles. Returns (patient, doctor, patient_profile_id, doctor_profile_id)."""
    patient = await make_user(role=UserRole.PATIENT)
    doctor = await make_user(role=UserRole.DOCTOR)

    # Create patient profile
    p_resp = await client.post("/api/profiles/patient", json={
        "first_name": "Test", "last_name": "Patient",
        "date_of_birth": "1990-01-01", "blood_group": "O+",
        "emergency_contact": "+123",
    }, headers=auth_header(patient))
    patient_profile_id = p_resp.json()["id"]

    # Create doctor profile
    d_resp = await client.post("/api/profiles/doctor", json={
        "first_name": "Dr. Test", "last_name": "Doctor",
        "specialization": "General", "license_number": f"MD-{uuid.uuid4().hex[:6]}",
    }, headers=auth_header(doctor))
    doctor_profile_id = d_resp.json()["id"]

    return patient, doctor, patient_profile_id, doctor_profile_id


class TestAppointments:
    """Appointment CRUD tests."""

    async def test_create_appointment(self, client: AsyncClient, make_user):
        patient, doctor, pid, did = await _setup_patient_doctor(client, make_user)
        scheduled = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

        resp = await client.post("/api/appointments", json={
            "patient_id": pid, "doctor_id": did,
            "scheduled_time": scheduled,
        }, headers=auth_header(patient))

        assert resp.status_code == 201
        data = resp.json()
        assert data["status"] == "PENDING"
        assert data["patient_id"] == pid

    async def test_get_upcoming_appointments(self, client: AsyncClient, make_user):
        patient, doctor, pid, did = await _setup_patient_doctor(client, make_user)
        scheduled = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

        await client.post("/api/appointments", json={
            "patient_id": pid, "doctor_id": did,
            "scheduled_time": scheduled,
        }, headers=auth_header(patient))

        resp = await client.get("/api/appointments/upcoming", headers=auth_header(patient))
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_update_appointment_status(self, client: AsyncClient, make_user):
        patient, doctor, pid, did = await _setup_patient_doctor(client, make_user)
        scheduled = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

        create_resp = await client.post("/api/appointments", json={
            "patient_id": pid, "doctor_id": did,
            "scheduled_time": scheduled,
        }, headers=auth_header(doctor))
        appt_id = create_resp.json()["id"]

        resp = await client.put(f"/api/appointments/{appt_id}", json={
            "status": "CONFIRMED",
        }, headers=auth_header(doctor))
        assert resp.status_code == 200
        assert resp.json()["status"] == "CONFIRMED"

    async def test_unauthenticated_cannot_book(self, client: AsyncClient):
        resp = await client.post("/api/appointments", json={
            "patient_id": str(uuid.uuid4()),
            "doctor_id": str(uuid.uuid4()),
            "scheduled_time": datetime.now(timezone.utc).isoformat(),
        })
        assert resp.status_code == 401


class TestMappings:
    """Patient-doctor mapping tests."""

    async def test_create_mapping(self, client: AsyncClient, make_user):
        _, _, pid, did = await _setup_patient_doctor(client, make_user)

        resp = await client.post("/api/mappings", json={
            "patient_id": pid, "doctor_id": did,
        }, headers=auth_header(await make_user()))  # any authenticated user
        assert resp.status_code == 201
        assert resp.json()["status"] == "ACTIVE"

    async def test_get_my_patients(self, client: AsyncClient, make_user):
        patient, doctor, pid, did = await _setup_patient_doctor(client, make_user)

        # Create mapping
        await client.post("/api/mappings", json={
            "patient_id": pid, "doctor_id": did,
        }, headers=auth_header(doctor))

        resp = await client.get("/api/mappings/my-patients", headers=auth_header(doctor))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["first_name"] == "Test"

    async def test_get_my_doctors(self, client: AsyncClient, make_user):
        patient, doctor, pid, did = await _setup_patient_doctor(client, make_user)

        await client.post("/api/mappings", json={
            "patient_id": pid, "doctor_id": did,
        }, headers=auth_header(patient))

        resp = await client.get("/api/mappings/my-doctors", headers=auth_header(patient))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        assert data[0]["specialization"] == "General"

    async def test_delete_mapping(self, client: AsyncClient, make_user):
        _, doctor, pid, did = await _setup_patient_doctor(client, make_user)

        create_resp = await client.post("/api/mappings", json={
            "patient_id": pid, "doctor_id": did,
        }, headers=auth_header(doctor))
        mapping_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/mappings/{mapping_id}", headers=auth_header(doctor))
        assert resp.status_code == 204

    async def test_patient_cannot_list_other_patients(self, client: AsyncClient, make_user):
        patient = await make_user(role=UserRole.PATIENT)
        resp = await client.get("/api/mappings/my-patients", headers=auth_header(patient))
        assert resp.status_code == 403  # Patient can't use doctor-only endpoint
