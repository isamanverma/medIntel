"""
Tests for admin stats endpoint and authorization.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models.enums import UserRole
from tests.conftest import auth_header


class TestAdminStats:
    """GET /api/admin/stats"""

    async def test_admin_can_get_stats(self, client: AsyncClient, make_user):
        admin = await make_user(role=UserRole.ADMIN)
        resp = await client.get("/api/admin/stats", headers=auth_header(admin))
        assert resp.status_code == 200
        data = resp.json()
        # Verify all expected keys present
        assert "total_users" in data
        assert "total_patients" in data
        assert "total_doctors" in data
        assert "total_admins" in data
        assert "total_appointments" in data
        assert "total_reports" in data
        assert "total_treatment_plans" in data
        # All counts should be non-negative integers
        for key, value in data.items():
            assert isinstance(value, int)
            assert value >= 0

    async def test_patient_cannot_get_stats(self, client: AsyncClient, make_user):
        patient = await make_user(role=UserRole.PATIENT)
        resp = await client.get("/api/admin/stats", headers=auth_header(patient))
        assert resp.status_code == 403

    async def test_doctor_cannot_get_stats(self, client: AsyncClient, make_user):
        doctor = await make_user(role=UserRole.DOCTOR)
        resp = await client.get("/api/admin/stats", headers=auth_header(doctor))
        assert resp.status_code == 403

    async def test_unauthenticated_cannot_get_stats(self, client: AsyncClient):
        resp = await client.get("/api/admin/stats")
        assert resp.status_code == 401

    async def test_stats_reflect_real_data(self, client: AsyncClient, make_user):
        """Creating users should increase the total_users count."""
        admin = await make_user(role=UserRole.ADMIN)

        # Get initial stats
        resp1 = await client.get("/api/admin/stats", headers=auth_header(admin))
        initial = resp1.json()

        # Create a new patient
        await make_user(role=UserRole.PATIENT)

        # Get updated stats
        resp2 = await client.get("/api/admin/stats", headers=auth_header(admin))
        updated = resp2.json()

        assert updated["total_users"] == initial["total_users"] + 1
        assert updated["total_patients"] == initial["total_patients"] + 1
