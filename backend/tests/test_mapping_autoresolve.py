"""
Tests for patient-doctor mapping — specifically the doctor auto-resolve flow.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
import uuid as _uuid

transport = ASGITransport(app=app)
_RUN = _uuid.uuid4().hex[:6]


async def _signup(client, email, name, role):
    resp = await client.post("/api/auth/signup", json={
        "email": email, "password": "Test1234!", "name": name, "role": role,
    })
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    return resp.json()["user"]


async def _login(client, email):
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "Test1234!",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


class TestMappingAutoResolve:
    """Doctor can create a mapping by only providing patient_id (doctor_id auto-resolved)."""

    @pytest.mark.asyncio
    async def test_doctor_can_add_patient_without_doctor_id(self):
        """The main bug fix: POST /api/mappings with only patient_id should work for doctors."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            # Create doctor with profile
            doc_email = f"mapd_{_RUN}@test.com"
            await _signup(c, doc_email, "MapDoc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await c.post("/api/profiles/doctor", json={
                "first_name": "Map", "last_name": "Doc",
                "specialization": "GP", "license_number": "MAP-001",
            }, headers={"Authorization": f"Bearer {doc_token}"})

            # Create patient with profile
            pat_email = f"mapp_{_RUN}@test.com"
            await _signup(c, pat_email, "MapPat", "PATIENT")
            pat_token = await _login(c, pat_email)
            pat_resp = await c.post("/api/profiles/patient", json={
                "first_name": "Map", "last_name": "Pat",
                "date_of_birth": "1995-01-01", "blood_group": "O+",
                "emergency_contact": "555-0000",
            }, headers={"Authorization": f"Bearer {pat_token}"})
            patient_profile_id = pat_resp.json()["id"]

            # Doctor creates mapping with ONLY patient_id (no doctor_id)
            resp = await c.post("/api/mappings", json={
                "patient_id": patient_profile_id,
            }, headers={"Authorization": f"Bearer {doc_token}"})

            assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"
            data = resp.json()
            assert data["patient_id"] == patient_profile_id
            assert data["status"] == "ACTIVE"

    @pytest.mark.asyncio
    async def test_doctor_can_also_provide_explicit_doctor_id(self):
        """Backward compat: providing doctor_id explicitly should still work."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            doc_email = f"mapd2_{_RUN}@test.com"
            await _signup(c, doc_email, "MapDoc2", "DOCTOR")
            doc_token = await _login(c, doc_email)
            doc_resp = await c.post("/api/profiles/doctor", json={
                "first_name": "Map2", "last_name": "Doc2",
                "specialization": "GP", "license_number": "MAP-002",
            }, headers={"Authorization": f"Bearer {doc_token}"})
            doctor_profile_id = doc_resp.json()["id"]

            pat_email = f"mapp2_{_RUN}@test.com"
            await _signup(c, pat_email, "MapPat2", "PATIENT")
            pat_token = await _login(c, pat_email)
            pat_resp = await c.post("/api/profiles/patient", json={
                "first_name": "Map2", "last_name": "Pat2",
                "date_of_birth": "1990-05-10", "blood_group": "A+",
                "emergency_contact": "555-1111",
            }, headers={"Authorization": f"Bearer {pat_token}"})
            patient_profile_id = pat_resp.json()["id"]

            resp = await c.post("/api/mappings", json={
                "patient_id": patient_profile_id,
                "doctor_id": doctor_profile_id,
            }, headers={"Authorization": f"Bearer {doc_token}"})

            assert resp.status_code == 201
            data = resp.json()
            assert data["doctor_id"] == doctor_profile_id
