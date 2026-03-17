"""
Tests for role-validated login (ISSUE-028).

A doctor account should NOT be able to log in via the admin portal,
and a patient should NOT be able to log in via the doctor portal, etc.
"""

import uuid
from types import SimpleNamespace
import pytest
from httpx import AsyncClient, ASGITransport

import app.db.engine as engine_module
from app.main import app
from app.models.enums import UserRole
from app.models.user import UserCreate
from app.services.auth_service import create_user


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


def _uid() -> str:
    """Short unique suffix so emails never collide across runs."""
    return uuid.uuid4().hex[:8]


@pytest.mark.asyncio
class TestRoleValidatedLogin:
    """Login must reject credentials when the user's role doesn't match."""

    async def _signup(self, client: AsyncClient, role: str, uid: str):
        email = f"role_{role.lower()}_{uid}@example.com"
        if role == "ADMIN":
            async with engine_module.async_session_factory() as session:
                await create_user(
                    session,
                    data=UserCreate(
                        name=f"Test {role.title()}",
                        email=email,
                        password="Password123",
                        role=UserRole.ADMIN,
                    ),
                )
            return SimpleNamespace(status_code=201)

        return await client.post("/api/auth/signup", json={
            "name": f"Test {role.title()}",
            "email": email,
            "password": "Password123",
            "role": role,
        })

    async def test_doctor_cannot_login_as_admin(self, client: AsyncClient):
        uid = _uid()
        signup_res = await self._signup(client, "DOCTOR", uid)
        assert signup_res.status_code == 201

        login_res = await client.post("/api/auth/login", json={
            "email": f"role_doctor_{uid}@example.com",
            "password": "Password123",
            "role": "ADMIN",
        })
        assert login_res.status_code == 401
        assert "admin" in login_res.json()["detail"].lower()

    async def test_patient_cannot_login_as_doctor(self, client: AsyncClient):
        uid = _uid()
        signup_res = await self._signup(client, "PATIENT", uid)
        assert signup_res.status_code == 201

        login_res = await client.post("/api/auth/login", json={
            "email": f"role_patient_{uid}@example.com",
            "password": "Password123",
            "role": "DOCTOR",
        })
        assert login_res.status_code == 401
        assert "doctor" in login_res.json()["detail"].lower()

    async def test_admin_cannot_login_as_patient(self, client: AsyncClient):
        uid = _uid()
        signup_res = await self._signup(client, "ADMIN", uid)
        assert signup_res.status_code == 201

        login_res = await client.post("/api/auth/login", json={
            "email": f"role_admin_{uid}@example.com",
            "password": "Password123",
            "role": "PATIENT",
        })
        assert login_res.status_code == 401
        assert "patient" in login_res.json()["detail"].lower()

    async def test_correct_role_login_succeeds(self, client: AsyncClient):
        """Login with matching role should still work."""
        uid = _uid()
        signup_res = await self._signup(client, "DOCTOR", uid)
        assert signup_res.status_code == 201

        login_res = await client.post("/api/auth/login", json={
            "email": f"role_doctor_{uid}@example.com",
            "password": "Password123",
            "role": "DOCTOR",
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["role"] == "DOCTOR"

    async def test_login_without_role_still_works(self, client: AsyncClient):
        """Backward compat: omitting role should succeed (no validation)."""
        uid = _uid()
        signup_res = await self._signup(client, "PATIENT", uid)
        assert signup_res.status_code == 201

        login_res = await client.post("/api/auth/login", json={
            "email": f"role_patient_{uid}@example.com",
            "password": "Password123",
        })
        assert login_res.status_code == 200
        assert login_res.json()["user"]["role"] == "PATIENT"
