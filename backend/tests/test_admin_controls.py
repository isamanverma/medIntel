"""
Tests for admin user controls (ISSUE-031):
- Role change (PATCH /api/admin/users/{id}/role)
- Status toggle (PATCH /api/admin/users/{id}/status)
- User deletion (DELETE /api/admin/users/{id})
"""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


def uid() -> str:
    return uuid.uuid4().hex[:8]


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def create_and_login(client: AsyncClient, role: str, suffix: str = "") -> str:
    """Sign up a user and return the Bearer token."""
    u = uid() + suffix
    await client.post("/api/auth/signup", json={
        "name": f"Test {role}",
        "email": f"ctrl_{role.lower()}_{u}@test.com",
        "password": "Password123",
        "role": role,
    })
    res = await client.post("/api/auth/login", json={
        "email": f"ctrl_{role.lower()}_{u}@test.com",
        "password": "Password123",
    })
    assert res.status_code == 200, res.text
    return res.json()["access_token"], res.json()["user"]["id"]


@pytest.mark.asyncio
class TestAdminControls:

    async def test_admin_can_change_user_role(self, client: AsyncClient):
        admin_token, _ = await create_and_login(client, "ADMIN")
        _, patient_id = await create_and_login(client, "PATIENT")

        res = await client.patch(
            f"/api/admin/users/{patient_id}/role",
            json={"role": "DOCTOR"},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert res.json()["role"] == "DOCTOR"

    async def test_admin_can_deactivate_user(self, client: AsyncClient):
        admin_token, _ = await create_and_login(client, "ADMIN")
        _, patient_id = await create_and_login(client, "PATIENT")

        res = await client.patch(
            f"/api/admin/users/{patient_id}/status",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        assert res.json()["is_active"] is False

    async def test_admin_can_delete_user(self, client: AsyncClient):
        admin_token, _ = await create_and_login(client, "ADMIN")
        _, patient_id = await create_and_login(client, "PATIENT")

        res = await client.delete(
            f"/api/admin/users/{patient_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 204

    async def test_admin_cannot_delete_self(self, client: AsyncClient):
        admin_token, admin_id = await create_and_login(client, "ADMIN")
        res = await client.delete(
            f"/api/admin/users/{admin_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 400

    async def test_non_admin_cannot_change_role(self, client: AsyncClient):
        doctor_token, _ = await create_and_login(client, "DOCTOR")
        _, patient_id = await create_and_login(client, "PATIENT")

        res = await client.patch(
            f"/api/admin/users/{patient_id}/role",
            json={"role": "DOCTOR"},
            headers={"Authorization": f"Bearer {doctor_token}"},
        )
        assert res.status_code == 403

    async def test_admin_cannot_deactivate_self(self, client: AsyncClient):
        admin_token, admin_id = await create_and_login(client, "ADMIN")
        res = await client.patch(
            f"/api/admin/users/{admin_id}/status",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 400
