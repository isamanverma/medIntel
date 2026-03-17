"""
Tests for referral endpoints, care team endpoints,
admin assignments, and extended patient profile fields.
"""

import pytest
from httpx import AsyncClient, ASGITransport

import app.db.engine as engine_module
from app.main import app
from app.models.enums import UserRole
from app.models.user import UserCreate
from app.services.auth_service import create_user
import uuid as _uuid


transport = ASGITransport(app=app)

# Unique run ID to avoid email collisions across test runs
_RUN = _uuid.uuid4().hex[:6]


# ── Helpers ───────────────────────────────────────────────────────

async def _signup(client: AsyncClient, email: str, name: str, role: str) -> dict:
    if role == "ADMIN":
        async with engine_module.async_session_factory() as session:
            token = await create_user(
                session,
                data=UserCreate(
                    email=email,
                    password="Test1234!",
                    name=name,
                    role=UserRole.ADMIN,
                ),
            )
        return {
            "id": str(token.user.id),
            "email": token.user.email,
            "name": token.user.name,
            "role": token.user.role.value,
        }

    resp = await client.post("/api/auth/signup", json={
        "email": email, "password": "Test1234!", "name": name, "role": role,
    })
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    return resp.json()["user"]  # TokenResponse.user has id, email, name, role


async def _login(client: AsyncClient, email: str) -> str:
    resp = await client.post("/api/auth/login", json={
        "email": email, "password": "Test1234!",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


async def _make_patient(client: AsyncClient, suffix: str) -> tuple[str, str, dict]:
    """Create a user + patient profile. Returns (token, user_id, profile)."""
    email = f"patient_{suffix}_{_RUN}@test.com"
    user_data = await _signup(client, email, f"Patient {suffix}", "PATIENT")
    token = await _login(client, email)
    profile_resp = await client.post(
        "/api/profiles/patient",
        json={
            "first_name": f"PatFirst{suffix}",
            "last_name": f"PatLast{suffix}",
            "date_of_birth": "1990-01-15",
            "blood_group": "O+",
            "emergency_contact": "555-0100",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 201
    return token, user_data["id"], profile_resp.json()


async def _make_doctor(client: AsyncClient, suffix: str) -> tuple[str, str, dict]:
    """Create a user + doctor profile. Returns (token, user_id, profile)."""
    email = f"doctor_{suffix}_{_RUN}@test.com"
    user_data = await _signup(client, email, f"Doctor {suffix}", "DOCTOR")
    token = await _login(client, email)
    profile_resp = await client.post(
        "/api/profiles/doctor",
        json={
            "first_name": f"DocFirst{suffix}",
            "last_name": f"DocLast{suffix}",
            "specialization": "General Practice",
            "license_number": f"LIC-{suffix}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert profile_resp.status_code == 201
    return token, user_data["id"], profile_resp.json()


# ── Extended Patient Profile Tests ────────────────────────────────

class TestExtendedPatientProfile:
    """Test comprehensive patient profile fields."""

    @pytest.mark.asyncio
    async def test_create_profile_with_extended_fields(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            email = f"extended_pat_{_RUN}@test.com"
            await _signup(client, email, "Extended Patient", "PATIENT")
            token = await _login(client, email)

            resp = await client.post(
                "/api/profiles/patient",
                json={
                    "first_name": "Jane",
                    "last_name": "Smith",
                    "date_of_birth": "1985-06-15",
                    "blood_group": "A+",
                    "emergency_contact": "555-1234",
                    "gender": "Female",
                    "phone": "+1-555-0123",
                    "preferred_language": "English",
                    "allergies": ["Penicillin", "Shellfish"],
                    "chronic_conditions": ["Asthma", "Type 2 Diabetes"],
                    "past_surgeries": "Appendectomy 2010",
                    "height_cm": 165.5,
                    "weight_kg": 62.0,
                    "blood_pressure": "120/80",
                    "insurance_provider": "BlueCross",
                    "insurance_policy_number": "POL-12345",
                    "insurance_group_number": "GRP-678",
                    "address_street": "123 Main St",
                    "address_city": "Springfield",
                    "address_state": "IL",
                    "address_zip": "62701",
                    "address_country": "USA",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["gender"] == "Female"
            assert data["allergies"] == ["Penicillin", "Shellfish"]
            assert data["height_cm"] == 165.5
            assert data["insurance_provider"] == "BlueCross"
            assert data["address_city"] == "Springfield"

    @pytest.mark.asyncio
    async def test_update_extended_fields(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            email = f"update_ext_pat_{_RUN}@test.com"
            await _signup(client, email, "Update Patient", "PATIENT")
            token = await _login(client, email)

            # Create with minimal fields
            await client.post(
                "/api/profiles/patient",
                json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "date_of_birth": "1992-03-20",
                    "blood_group": "B-",
                    "emergency_contact": "555-9876",
                },
                headers={"Authorization": f"Bearer {token}"},
            )

            # Update with extended fields
            resp = await client.put(
                "/api/profiles/patient/me",
                json={
                    "allergies": ["Latex"],
                    "height_cm": 180.0,
                    "weight_kg": 78.5,
                    "insurance_provider": "Aetna",
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["allergies"] == ["Latex"]
            assert data["height_cm"] == 180.0
            assert data["insurance_provider"] == "Aetna"


# ── Referral Tests ────────────────────────────────────────────────

class TestReferrals:
    """Test doctor-to-doctor referral system."""

    @pytest.mark.asyncio
    async def test_create_referral(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, doc1_profile = await _make_doctor(client, "ref1")
            _, _, doc2_profile = await _make_doctor(client, "ref2")
            _, _, patient_profile = await _make_patient(client, "ref1")

            resp = await client.post(
                "/api/referrals",
                json={
                    "referred_doctor_id": doc2_profile["id"],
                    "patient_id": patient_profile["id"],
                    "reason": "Cardiac evaluation needed",
                    "notes": "Patient has chest pain history",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["status"] == "PENDING"
            assert data["reason"] == "Cardiac evaluation needed"

    @pytest.mark.asyncio
    async def test_get_sent_referrals(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, doc1_profile = await _make_doctor(client, "sent1")
            _, _, doc2_profile = await _make_doctor(client, "sent2")
            _, _, patient_profile = await _make_patient(client, "sent1")

            await client.post(
                "/api/referrals",
                json={
                    "referred_doctor_id": doc2_profile["id"],
                    "patient_id": patient_profile["id"],
                    "reason": "Follow-up care needed",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )

            resp = await client.get(
                "/api/referrals/sent",
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_get_received_referrals(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, _ = await _make_doctor(client, "recv1")
            doc2_token, _, doc2_profile = await _make_doctor(client, "recv2")
            _, _, patient_profile = await _make_patient(client, "recv1")

            await client.post(
                "/api/referrals",
                json={
                    "referred_doctor_id": doc2_profile["id"],
                    "patient_id": patient_profile["id"],
                    "reason": "Specialist needed",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )

            resp = await client.get(
                "/api/referrals/received",
                headers={"Authorization": f"Bearer {doc2_token}"},
            )
            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_accept_referral(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, _ = await _make_doctor(client, "acc1")
            doc2_token, _, doc2_profile = await _make_doctor(client, "acc2")
            _, _, patient_profile = await _make_patient(client, "acc1")

            create_resp = await client.post(
                "/api/referrals",
                json={
                    "referred_doctor_id": doc2_profile["id"],
                    "patient_id": patient_profile["id"],
                    "reason": "Second opinion",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            referral_id = create_resp.json()["id"]

            resp = await client.patch(
                f"/api/referrals/{referral_id}",
                json={"status": "ACCEPTED"},
                headers={"Authorization": f"Bearer {doc2_token}"},
            )
            assert resp.status_code == 200
            assert resp.json()["status"] == "ACCEPTED"

    @pytest.mark.asyncio
    async def test_cannot_self_refer(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_token, _, doc_profile = await _make_doctor(client, "self1")
            _, _, patient_profile = await _make_patient(client, "self1")

            resp = await client.post(
                "/api/referrals",
                json={
                    "referred_doctor_id": doc_profile["id"],
                    "patient_id": patient_profile["id"],
                    "reason": "Self referral test",
                },
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            assert resp.status_code == 400


# ── Care Team Tests ───────────────────────────────────────────────

class TestCareTeams:
    """Test multi-doctor care team collaboration."""

    @pytest.mark.asyncio
    async def test_create_care_team(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_token, _, _ = await _make_doctor(client, "team1")
            _, _, patient_profile = await _make_patient(client, "team1")

            resp = await client.post(
                "/api/care-teams",
                json={
                    "patient_id": patient_profile["id"],
                    "name": "Cardiac Care Team",
                    "description": "Managing patient heart condition",
                },
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            assert resp.status_code == 201
            data = resp.json()
            assert data["name"] == "Cardiac Care Team"
            assert len(data["members"]) == 1
            assert data["members"][0]["role"] == "PRIMARY"

    @pytest.mark.asyncio
    async def test_add_member_to_care_team(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, _ = await _make_doctor(client, "addm1")
            _, _, doc2_profile = await _make_doctor(client, "addm2")
            _, _, patient_profile = await _make_patient(client, "addm1")

            create_resp = await client.post(
                "/api/care-teams",
                json={
                    "patient_id": patient_profile["id"],
                    "name": "Diabetes Team",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            team_id = create_resp.json()["id"]

            resp = await client.post(
                f"/api/care-teams/{team_id}/members",
                json={
                    "doctor_id": doc2_profile["id"],
                    "role": "SPECIALIST",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            assert resp.status_code == 201
            assert resp.json()["role"] == "SPECIALIST"

    @pytest.mark.asyncio
    async def test_get_patient_care_teams(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_token, _, _ = await _make_doctor(client, "gpt1")
            pat_token, _, patient_profile = await _make_patient(client, "gpt1")

            await client.post(
                "/api/care-teams",
                json={
                    "patient_id": patient_profile["id"],
                    "name": "General Team",
                },
                headers={"Authorization": f"Bearer {doc_token}"},
            )

            resp = await client.get(
                f"/api/care-teams/patient/{patient_profile['id']}",
                headers={"Authorization": f"Bearer {pat_token}"},
            )
            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_get_doctor_care_teams(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_token, _, _ = await _make_doctor(client, "dct1")
            _, _, patient_profile = await _make_patient(client, "dct1")

            await client.post(
                "/api/care-teams",
                json={
                    "patient_id": patient_profile["id"],
                    "name": "My Team",
                },
                headers={"Authorization": f"Bearer {doc_token}"},
            )

            resp = await client.get(
                "/api/care-teams/doctor/me",
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            assert resp.status_code == 200
            assert len(resp.json()) >= 1

    @pytest.mark.asyncio
    async def test_duplicate_member_rejected(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc1_token, _, doc1_profile = await _make_doctor(client, "dup1")
            _, _, doc2_profile = await _make_doctor(client, "dup2")
            _, _, patient_profile = await _make_patient(client, "dup1")

            create_resp = await client.post(
                "/api/care-teams",
                json={
                    "patient_id": patient_profile["id"],
                    "name": "Dup Test Team",
                },
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            team_id = create_resp.json()["id"]

            await client.post(
                f"/api/care-teams/{team_id}/members",
                json={"doctor_id": doc2_profile["id"], "role": "CONSULTANT"},
                headers={"Authorization": f"Bearer {doc1_token}"},
            )

            # Second add should fail
            resp = await client.post(
                f"/api/care-teams/{team_id}/members",
                json={"doctor_id": doc2_profile["id"], "role": "CONSULTANT"},
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            assert resp.status_code == 409


# ── Admin Assignment Tests ────────────────────────────────────────

class TestAdminAssignments:
    """Test admin patient-doctor assignment management."""

    @pytest.mark.asyncio
    async def test_admin_can_assign(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # Create admin
            await _signup(client, f"assign_admin_{_RUN}@test.com", "Admin", "ADMIN")
            admin_token = await _login(client, f"assign_admin_{_RUN}@test.com")

            # Create patient and doctor
            _, _, patient_profile = await _make_patient(client, "assign1")
            _, _, doctor_profile = await _make_doctor(client, "assign1")

            resp = await client.post(
                "/api/admin/assignments",
                json={
                    "patient_id": patient_profile["id"],
                    "doctor_id": doctor_profile["id"],
                },
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert resp.status_code == 201
            assert resp.json()["status"] == "ACTIVE"

    @pytest.mark.asyncio
    async def test_admin_can_list_assignments(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await _signup(client, f"list_admin_{_RUN}@test.com", "Admin", "ADMIN")
            admin_token = await _login(client, f"list_admin_{_RUN}@test.com")

            resp = await client.get(
                "/api/admin/assignments",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_admin_can_delete_assignment(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            await _signup(client, f"del_admin_{_RUN}@test.com", "Admin", "ADMIN")
            admin_token = await _login(client, f"del_admin_{_RUN}@test.com")

            _, _, patient_profile = await _make_patient(client, "del1")
            _, _, doctor_profile = await _make_doctor(client, "del1")

            create_resp = await client.post(
                "/api/admin/assignments",
                json={
                    "patient_id": patient_profile["id"],
                    "doctor_id": doctor_profile["id"],
                },
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assignment_id = create_resp.json()["id"]

            resp = await client.delete(
                f"/api/admin/assignments/{assignment_id}",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert resp.status_code == 204

    @pytest.mark.asyncio
    async def test_non_admin_cannot_assign(self):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            doc_token, _, doctor_profile = await _make_doctor(client, "nonadmin1")
            _, _, patient_profile = await _make_patient(client, "nonadmin1")

            resp = await client.post(
                "/api/admin/assignments",
                json={
                    "patient_id": patient_profile["id"],
                    "doctor_id": doctor_profile["id"],
                },
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            assert resp.status_code == 403
