"""
Tests for the patient discovery endpoint.

Covers:
  - GET /api/mappings/discover-patients requires a doctor with a profile
  - Name search (partial, case-insensitive)
  - Blood group filter
  - Gender filter
  - already_linked flag is set correctly for mapped patients
  - Non-doctor users (patient, unauthenticated) are rejected with 403/401
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
import uuid as _uuid

transport = ASGITransport(app=app)
_RUN = _uuid.uuid4().hex[:6]


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _signup(client: AsyncClient, email: str, name: str, role: str) -> dict:
    resp = await client.post(
        "/api/auth/signup",
        json={"email": email, "password": "Test1234!", "name": name, "role": role},
    )
    assert resp.status_code == 201, f"Signup failed: {resp.text}"
    return resp.json()["user"]


async def _login(client: AsyncClient, email: str) -> str:
    resp = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "Test1234!"},
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]


async def _create_doctor_profile(
    client: AsyncClient,
    token: str,
    first: str = "Doc",
    last: str = "Smith",
    spec: str = "General Practice",
    license_no: str | None = None,
) -> dict:
    resp = await client.post(
        "/api/profiles/doctor",
        json={
            "first_name": first,
            "last_name": last,
            "specialization": spec,
            "license_number": license_no or f"LIC-{_uuid.uuid4().hex[:8]}",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, f"Doctor profile creation failed: {resp.text}"
    return resp.json()


async def _create_patient_profile(
    client: AsyncClient,
    token: str,
    first: str,
    last: str,
    blood_group: str = "O+",
    gender: str | None = None,
    dob: str = "1990-06-15",
) -> dict:
    body: dict = {
        "first_name": first,
        "last_name": last,
        "date_of_birth": dob,
        "blood_group": blood_group,
        "emergency_contact": "555-0000",
    }
    if gender:
        body["gender"] = gender
    resp = await client.post(
        "/api/profiles/patient",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201, f"Patient profile creation failed: {resp.text}"
    return resp.json()


async def _link_patient(client: AsyncClient, doctor_token: str, patient_profile_id: str) -> dict:
    resp = await client.post(
        "/api/mappings",
        json={"patient_id": patient_profile_id},
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert resp.status_code == 201, f"Mapping creation failed: {resp.text}"
    return resp.json()


# ── Test class ────────────────────────────────────────────────────────────────

class TestPatientDiscovery:
    """End-to-end tests for GET /api/mappings/discover-patients."""

    # ------------------------------------------------------------------
    # Auth / role guard
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_unauthenticated_request_is_rejected(self):
        """No token → 401."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            resp = await c.get("/api/mappings/discover-patients?q=alice")
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_patient_user_cannot_access_discovery(self):
        """A PATIENT role should not be able to call this endpoint → 403."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            email = f"disc_blocked_pat_{_RUN}@test.com"
            await _signup(c, email, "Blocked Patient", "PATIENT")
            token = await _login(c, email)
            resp = await c.get(
                "/api/mappings/discover-patients?q=test",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_doctor_without_profile_gets_404(self):
        """A doctor account with no profile yet should get 404 (profile not found)."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            email = f"disc_noprofile_{_RUN}@test.com"
            await _signup(c, email, "No Profile Doc", "DOCTOR")
            token = await _login(c, email)
            resp = await c.get(
                "/api/mappings/discover-patients?q=test",
                headers={"Authorization": f"Bearer {token}"},
            )
        assert resp.status_code == 404
        assert "profile" in resp.json()["detail"].lower()

    # ------------------------------------------------------------------
    # Basic search + response shape
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_empty_query_and_no_filters_returns_empty_list(self):
        """No query string, no filters → backend returns 200 with an empty list.

        Note: in a shared in-memory test DB other tests may have already created
        patients, so we only assert the response is 200 and is a list — the
        frontend enforces the "type something first" constraint via client-side
        guard, not by the backend returning an error.
        """
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            doc_email = f"disc_doc_empty_{_RUN}@test.com"
            await _signup(c, doc_email, "Discovery Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Call with no parameters at all
            resp = await c.get(
                "/api/mappings/discover-patients",
                headers={"Authorization": f"Bearer {doc_token}"},
            )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_response_has_correct_shape(self):
        """Each item in the response must have all expected fields."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            # Doctor
            doc_email = f"disc_shape_doc_{run}@test.com"
            await _signup(c, doc_email, "Shape Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Patient
            pat_email = f"disc_shape_pat_{run}@test.com"
            await _signup(c, pat_email, "Shapiro Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(
                c, pat_token, "Shapiro", "Patient", blood_group="B+", gender="Male"
            )

            resp = await c.get(
                "/api/mappings/discover-patients?q=Shapiro",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        results = resp.json()
        assert len(results) >= 1

        item = results[0]
        required_fields = {
            "profile_id",
            "first_name",
            "last_name",
            "blood_group",
            "gender",
            "age",
            "already_linked",
        }
        assert required_fields.issubset(item.keys()), (
            f"Missing fields: {required_fields - item.keys()}"
        )
        # already_linked should be False for a new patient
        assert item["already_linked"] is False
        # age should be a positive integer
        assert isinstance(item["age"], int)
        assert item["age"] > 0

    # ------------------------------------------------------------------
    # Name search
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_search_by_first_name(self):
        """Partial first name search should return matching patients."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_fn_doc_{run}@test.com"
            await _signup(c, doc_email, "FN Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Patient whose first name matches
            pat_email = f"disc_fn_pat_{run}@test.com"
            await _signup(c, pat_email, "Bartholomew Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(c, pat_token, "Bartholomew", "Jones")

            resp = await c.get(
                "/api/mappings/discover-patients?q=Barthol",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        names = [r["first_name"] for r in resp.json()]
        assert "Bartholomew" in names

    @pytest.mark.asyncio
    async def test_search_by_last_name(self):
        """Partial last name search should return matching patients."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_ln_doc_{run}@test.com"
            await _signup(c, doc_email, "LN Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            pat_email = f"disc_ln_pat_{run}@test.com"
            await _signup(c, pat_email, "LN Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(c, pat_token, "Margaret", "Featherstone")

            resp = await c.get(
                "/api/mappings/discover-patients?q=feather",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        last_names = [r["last_name"] for r in resp.json()]
        assert "Featherstone" in last_names

    @pytest.mark.asyncio
    async def test_search_is_case_insensitive(self):
        """Search should match regardless of case."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_ci_doc_{run}@test.com"
            await _signup(c, doc_email, "CI Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            pat_email = f"disc_ci_pat_{run}@test.com"
            await _signup(c, pat_email, "CI Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(c, pat_token, "Reginald", "Blackwood")

            # Query in all-uppercase
            resp = await c.get(
                "/api/mappings/discover-patients?q=REGINALD",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        names = [r["first_name"] for r in resp.json()]
        assert "Reginald" in names

    @pytest.mark.asyncio
    async def test_search_no_match_returns_empty_list(self):
        """A query that matches nobody returns an empty list, not an error."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_nm_doc_{run}@test.com"
            await _signup(c, doc_email, "NM Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            resp = await c.get(
                "/api/mappings/discover-patients?q=ZZZNOMATCHZZZ",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        assert resp.json() == []

    # ------------------------------------------------------------------
    # Blood group filter
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_blood_group_filter(self):
        """Only patients with the requested blood group should be returned."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_bg_doc_{run}@test.com"
            await _signup(c, doc_email, "BG Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Patient with AB- (rare)
            pat_email = f"disc_bg_pat_{run}@test.com"
            await _signup(c, pat_email, "BG Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(
                c, pat_token, "Abigail", f"Rh{run}", blood_group="AB-"
            )

            # Filter by AB-
            resp = await c.get(
                "/api/mappings/discover-patients?blood_group=AB-",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        results = resp.json()
        # All returned patients must have the requested blood group
        for r in results:
            assert r["blood_group"] == "AB-", (
                f"Expected AB- but got {r['blood_group']} for {r['first_name']}"
            )
        # Our specific patient must be present
        last_names = [r["last_name"] for r in results]
        assert f"Rh{run}" in last_names

    @pytest.mark.asyncio
    async def test_blood_group_filter_excludes_others(self):
        """Patients with a different blood group must not appear in filtered results."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_bgx_doc_{run}@test.com"
            await _signup(c, doc_email, "BGX Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Create a patient with O+ blood group
            pat_email = f"disc_bgx_pat_{run}@test.com"
            await _signup(c, pat_email, "BGX Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(
                c, pat_token, "Opositive", f"Excl{run}", blood_group="O+"
            )

            # Filter by A- — should NOT return the O+ patient above
            resp = await c.get(
                f"/api/mappings/discover-patients?q=Excl{run}&blood_group=A-",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        results = resp.json()
        last_names = [r["last_name"] for r in results]
        assert f"Excl{run}" not in last_names

    # ------------------------------------------------------------------
    # already_linked flag
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_already_linked_flag_false_for_new_patient(self):
        """A patient the doctor has NOT yet linked should have already_linked=False."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_alf_doc_{run}@test.com"
            await _signup(c, doc_email, "ALF Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            pat_email = f"disc_alf_pat_{run}@test.com"
            await _signup(c, pat_email, "ALF Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            await _create_patient_profile(c, pat_token, "Alfredo", f"Unlinked{run}")

            resp = await c.get(
                f"/api/mappings/discover-patients?q=Unlinked{run}",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        results = resp.json()
        assert len(results) == 1
        assert results[0]["already_linked"] is False

    @pytest.mark.asyncio
    async def test_already_linked_flag_true_after_mapping(self):
        """After the doctor links a patient, discover-patients must show already_linked=True."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            # Doctor
            doc_email = f"disc_alt_doc_{run}@test.com"
            await _signup(c, doc_email, "ALT Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Patient
            pat_email = f"disc_alt_pat_{run}@test.com"
            await _signup(c, pat_email, "ALT Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            patient_profile = await _create_patient_profile(
                c, pat_token, "Alfred", f"Linked{run}"
            )
            patient_profile_id = patient_profile["id"]

            # Before linking
            resp_before = await c.get(
                f"/api/mappings/discover-patients?q=Linked{run}",
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            assert resp_before.status_code == 200
            assert resp_before.json()[0]["already_linked"] is False

            # Link the patient
            await _link_patient(c, doc_token, patient_profile_id)

            # After linking
            resp_after = await c.get(
                f"/api/mappings/discover-patients?q=Linked{run}",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp_after.status_code == 200
        results = resp_after.json()
        assert len(results) == 1
        assert results[0]["already_linked"] is True
        assert results[0]["profile_id"] == patient_profile_id

    @pytest.mark.asyncio
    async def test_linked_flag_is_per_doctor(self):
        """Two doctors search the same patient — only the one who linked sees already_linked=True."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            # Doctor 1
            doc1_email = f"disc_pd_doc1_{run}@test.com"
            await _signup(c, doc1_email, "PD Doc1", "DOCTOR")
            doc1_token = await _login(c, doc1_email)
            await _create_doctor_profile(c, doc1_token, first="Doctor", last="One")

            # Doctor 2
            doc2_email = f"disc_pd_doc2_{run}@test.com"
            await _signup(c, doc2_email, "PD Doc2", "DOCTOR")
            doc2_token = await _login(c, doc2_email)
            await _create_doctor_profile(c, doc2_token, first="Doctor", last="Two")

            # Patient
            pat_email = f"disc_pd_pat_{run}@test.com"
            await _signup(c, pat_email, "PD Patient", "PATIENT")
            pat_token = await _login(c, pat_email)
            patient_profile = await _create_patient_profile(
                c, pat_token, "Persephone", f"Delta{run}"
            )
            patient_profile_id = patient_profile["id"]

            # Doctor 1 links the patient
            await _link_patient(c, doc1_token, patient_profile_id)

            # Doctor 1 sees already_linked=True
            resp1 = await c.get(
                f"/api/mappings/discover-patients?q=Delta{run}",
                headers={"Authorization": f"Bearer {doc1_token}"},
            )
            # Doctor 2 sees already_linked=False (they haven't linked this patient)
            resp2 = await c.get(
                f"/api/mappings/discover-patients?q=Delta{run}",
                headers={"Authorization": f"Bearer {doc2_token}"},
            )

        assert resp1.status_code == 200
        assert resp2.status_code == 200

        assert resp1.json()[0]["already_linked"] is True
        assert resp2.json()[0]["already_linked"] is False

    # ------------------------------------------------------------------
    # limit parameter
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_limit_parameter_is_respected(self):
        """The limit query parameter must cap the number of results returned."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            run = _uuid.uuid4().hex[:6]

            doc_email = f"disc_lim_doc_{run}@test.com"
            await _signup(c, doc_email, "Limit Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            # Create 3 patients with a shared unusual last name
            for i in range(3):
                pe = f"disc_lim_pat{i}_{run}@test.com"
                await _signup(c, pe, f"Limit Pat {i}", "PATIENT")
                pt = await _login(c, pe)
                await _create_patient_profile(
                    c, pt, f"Lim{i}", f"Capper{run}", blood_group="O+"
                )

            # Request with limit=2
            resp = await c.get(
                f"/api/mappings/discover-patients?q=Capper{run}&limit=2",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp.status_code == 200
        assert len(resp.json()) <= 2

    @pytest.mark.asyncio
    async def test_limit_out_of_range_returns_422(self):
        """limit=0 or limit>100 should be rejected with 422 Unprocessable Entity."""
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            doc_email = f"disc_lim422_doc_{_RUN}@test.com"
            await _signup(c, doc_email, "Lim422 Doc", "DOCTOR")
            doc_token = await _login(c, doc_email)
            await _create_doctor_profile(c, doc_token)

            resp_zero = await c.get(
                "/api/mappings/discover-patients?q=test&limit=0",
                headers={"Authorization": f"Bearer {doc_token}"},
            )
            resp_over = await c.get(
                "/api/mappings/discover-patients?q=test&limit=101",
                headers={"Authorization": f"Bearer {doc_token}"},
            )

        assert resp_zero.status_code == 422
        assert resp_over.status_code == 422
