"""
Tests for auth endpoints: signup, login, me, edge cases.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header


# ──────────────────────────────────────────────────────────────────
#  Signup
# ──────────────────────────────────────────────────────────────────

class TestSignup:
    """POST /api/auth/signup"""

    async def test_signup_success(self, client: AsyncClient):
        email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        resp = await client.post("/api/auth/signup", json={
            "email": email,
            "password": "StrongPass123!",
            "name": "Test User",
            "role": "PATIENT",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "PATIENT"

    async def test_signup_duplicate_email(self, client: AsyncClient):
        email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        # First signup
        resp1 = await client.post("/api/auth/signup", json={
            "email": email,
            "password": "StrongPass123!",
            "name": "Test User",
            "role": "PATIENT",
        })
        assert resp1.status_code == 201

        # Second signup with same email
        resp2 = await client.post("/api/auth/signup", json={
            "email": email,
            "password": "StrongPass123!",
            "name": "Test User 2",
            "role": "PATIENT",
        })
        assert resp2.status_code == 409

    async def test_signup_invalid_email(self, client: AsyncClient):
        resp = await client.post("/api/auth/signup", json={
            "email": "not-an-email",
            "password": "StrongPass123!",
            "name": "Test",
            "role": "PATIENT",
        })
        assert resp.status_code == 422

    async def test_signup_missing_fields(self, client: AsyncClient):
        resp = await client.post("/api/auth/signup", json={
            "email": "test@test.com",
        })
        assert resp.status_code == 422


# ──────────────────────────────────────────────────────────────────
#  Login
# ──────────────────────────────────────────────────────────────────

class TestLogin:
    """POST /api/auth/login"""

    async def test_login_success(self, client: AsyncClient):
        email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        password = "LoginTestPass1!"
        # Create user via signup
        await client.post("/api/auth/signup", json={
            "email": email, "password": password,
            "name": "Login Test", "role": "PATIENT",
        })

        resp = await client.post("/api/auth/login", json={
            "email": email,
            "password": password,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == email

    async def test_login_wrong_password(self, client: AsyncClient):
        email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        await client.post("/api/auth/signup", json={
            "email": email, "password": "CorrectPass1!",
            "name": "Wrong PW Test", "role": "PATIENT",
        })

        resp = await client.post("/api/auth/login", json={
            "email": email,
            "password": "WrongPass1!",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_email(self, client: AsyncClient):
        resp = await client.post("/api/auth/login", json={
            "email": "doesnotexist@test.com",
            "password": "SomePass1!",
        })
        assert resp.status_code == 401


# ──────────────────────────────────────────────────────────────────
#  Me
# ──────────────────────────────────────────────────────────────────

class TestMe:
    """GET /api/auth/me"""

    async def test_me_authenticated(self, client: AsyncClient, make_user):
        user = await make_user()
        resp = await client.get("/api/auth/me", headers=auth_header(user))
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == user.email

    async def test_me_no_token(self, client: AsyncClient):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_me_invalid_token(self, client: AsyncClient):
        resp = await client.get("/api/auth/me", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        assert resp.status_code == 401
