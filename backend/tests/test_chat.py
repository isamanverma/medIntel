"""
Comprehensive chat test suite.

Covers every endpoint, edge case, concurrency scenario and security
constraint in the Secure Chat API:

  POST   /api/chat/rooms                     — create / dedup
  GET    /api/chat/rooms                     — list + enrichment
  PATCH  /api/chat/rooms/{id}/read           — mark read / unread count
  POST   /api/chat/rooms/{id}/messages       — send
  GET    /api/chat/rooms/{id}/messages       — history + cursors (since/before)
  DELETE /api/chat/rooms/{id}/messages/{id}  — admin soft-delete
  GET    /api/chat/users/searchable          — role-scoped search

Test classes
────────────
  TestRoomCreation          — create, dedup, GROUP rooms, bad payloads
  TestRoomListing           — enrichment fields, sorting, unread counts
  TestMarkRead              — last_read_at stamping, badge clearing
  TestSendMessage           — happy path, empty content, non-participant
  TestGetMessages           — initial load, since cursor, before cursor, limits
  TestPollingDelta          — since= returns only new messages, timezone safety
  TestLoadMore              — before= cursor pagination
  TestSoftDelete            — admin only, SYSTEM immutable, patient/doctor blocked
  TestSearchableUsers       — patient sees only linked doctors, doctor sees patients
                              + all doctors, admin sees all, name filter, no profile
  TestSecurityBoundaries    — unauthenticated, wrong-room, cross-user attacks
  TestConcurrentRoomCreate  — simultaneous POST /rooms must not create duplicates
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _uid() -> str:
    return uuid.uuid4().hex[:10]


async def _signup_login(
    client: AsyncClient,
    role: str,
    suffix: str = "",
) -> tuple[str, str]:
    """
    Create a fresh user and return (access_token, user_id).
    Uses a random suffix so parallel tests never collide on email.
    """
    tag = _uid() + suffix
    email = f"chat_{role.lower()}_{tag}@test.com"
    await client.post(
        "/api/auth/signup",
        json={"name": f"Test {role} {tag}", "email": email, "password": "Password123!", "role": role},
    )
    res = await client.post(
        "/api/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert res.status_code == 200, f"Login failed: {res.text}"
    data = res.json()
    return data["access_token"], data["user"]["id"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def _create_direct_room(
    client: AsyncClient,
    creator_token: str,
    other_id: str,
    name: str | None = None,
) -> dict:
    payload: dict = {"room_type": "DIRECT", "participant_ids": [other_id]}
    if name:
        payload["name"] = name
    res = await client.post("/api/chat/rooms", json=payload, headers=_auth(creator_token))
    assert res.status_code == 201, f"create_room failed: {res.text}"
    return res.json()


async def _send(
    client: AsyncClient,
    token: str,
    room_id: str,
    content: str,
) -> dict:
    res = await client.post(
        f"/api/chat/rooms/{room_id}/messages",
        json={"content": content},
        headers=_auth(token),
    )
    assert res.status_code == 201, f"send failed: {res.text}"
    return res.json()


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ─────────────────────────────────────────────────────────────────────────────
# TestRoomCreation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestRoomCreation:

    async def test_create_direct_room_returns_201(self, client):
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id, name="Consult")

        assert room["id"]
        assert room["room_type"] == "DIRECT"
        assert room["participant_count"] == 2
        assert room["other_participant_id"] == pat_id
        assert room["unread_count"] == 0
        # brand-new room has no TEXT messages → no preview
        assert room["last_message_preview"] is None

    async def test_create_direct_room_is_idempotent(self, client):
        """Calling POST /rooms twice for the same pair must return the SAME room id."""
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        r1 = await _create_direct_room(client, doc_tok, pat_id)
        r2 = await _create_direct_room(client, doc_tok, pat_id)

        assert r1["id"] == r2["id"], "Duplicate room created instead of returning existing"

    async def test_dedup_is_symmetric(self, client):
        """Patient initiating the room after doctor already created one returns same id."""
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        r_doc = await _create_direct_room(client, doc_tok, pat_id)
        r_pat = await _create_direct_room(client, pat_tok, doc_id)

        assert r_doc["id"] == r_pat["id"], "Symmetric dedup failed"

    async def test_create_group_room(self, client):
        doc1_tok, doc1_id = await _signup_login(client, "DOCTOR", "a")
        doc2_tok, doc2_id = await _signup_login(client, "DOCTOR", "b")
        doc3_tok, doc3_id = await _signup_login(client, "DOCTOR", "c")

        res = await client.post(
            "/api/chat/rooms",
            json={"room_type": "GROUP", "name": "Care Team", "participant_ids": [doc2_id, doc3_id]},
            headers=_auth(doc1_tok),
        )
        assert res.status_code == 201
        room = res.json()
        assert room["room_type"] == "GROUP"
        assert room["participant_count"] == 3

    async def test_group_rooms_are_not_deduped(self, client):
        """GROUP rooms have no dedup — two calls create two separate rooms."""
        doc1_tok, doc1_id = await _signup_login(client, "DOCTOR", "g1")
        doc2_tok, doc2_id = await _signup_login(client, "DOCTOR", "g2")

        res1 = await client.post(
            "/api/chat/rooms",
            json={"room_type": "GROUP", "participant_ids": [doc2_id]},
            headers=_auth(doc1_tok),
        )
        res2 = await client.post(
            "/api/chat/rooms",
            json={"room_type": "GROUP", "participant_ids": [doc2_id]},
            headers=_auth(doc1_tok),
        )
        assert res1.status_code == 201
        assert res2.status_code == 201
        assert res1.json()["id"] != res2.json()["id"]

    async def test_create_room_invalid_room_type(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        res = await client.post(
            "/api/chat/rooms",
            json={"room_type": "INVALID", "participant_ids": [pat_id]},
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422

    async def test_create_room_invalid_participant_uuid(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")

        res = await client.post(
            "/api/chat/rooms",
            json={"room_type": "DIRECT", "participant_ids": ["not-a-uuid"]},
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422

    async def test_create_room_requires_auth(self, client):
        res = await client.post(
            "/api/chat/rooms",
            json={"room_type": "DIRECT", "participant_ids": [str(uuid.uuid4())]},
        )
        assert res.status_code == 401

    async def test_dedup_preserves_existing_messages(self, client):
        """The idempotent create must return the room with its real message history intact."""
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        r1 = await _create_direct_room(client, doc_tok, pat_id)
        await _send(client, doc_tok, r1["id"], "Hello!")
        await _send(client, pat_tok, r1["id"], "Hi!")

        # Re-create (dedup path)
        r2 = await _create_direct_room(client, doc_tok, pat_id)
        assert r2["id"] == r1["id"]

        # Messages are still intact
        msgs_res = await client.get(
            f"/api/chat/rooms/{r1['id']}/messages",
            headers=_auth(doc_tok),
        )
        msgs = msgs_res.json()
        text_msgs = [m for m in msgs if m["message_type"] == "TEXT"]
        assert len(text_msgs) == 2

    async def test_system_message_injected_on_create(self, client):
        """A SYSTEM message 'Secure chat started by …' must appear when a new room is created."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        msgs_res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )
        msgs = msgs_res.json()
        system_msgs = [m for m in msgs if m["message_type"] == "SYSTEM"]
        assert len(system_msgs) == 1
        assert "Secure chat started" in system_msgs[0]["content"]

    async def test_other_participant_name_and_role_on_create(self, client):
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        assert room["other_participant_id"] == pat_id
        assert room["other_participant_role"] == "PATIENT"
        assert room["other_participant_name"] is not None

        # Reverse: patient creates — other is the doctor
        room2 = await _create_direct_room(client, pat_tok, doc_id)
        assert room2["other_participant_id"] == doc_id
        assert room2["other_participant_role"] == "DOCTOR"


# ─────────────────────────────────────────────────────────────────────────────
# TestRoomListing
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestRoomListing:

    async def test_list_rooms_both_participants_see_room(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        for token in [doc_tok, pat_tok]:
            res = await client.get("/api/chat/rooms", headers=_auth(token))
            assert res.status_code == 200
            ids = [r["id"] for r in res.json()]
            assert room["id"] in ids

    async def test_list_rooms_does_not_show_other_users_rooms(self, client):
        doc1_tok, doc1_id = await _signup_login(client, "DOCTOR", "a")
        doc2_tok, doc2_id = await _signup_login(client, "DOCTOR", "b")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room1 = await _create_direct_room(client, doc1_tok, pat_id)
        room2 = await _create_direct_room(client, doc2_tok, pat_id)

        # doc1 should only see their own room, not doc2's
        res = await client.get("/api/chat/rooms", headers=_auth(doc1_tok))
        ids = [r["id"] for r in res.json()]
        assert room1["id"] in ids
        assert room2["id"] not in ids

    async def test_list_rooms_enrichment_fields_populated(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        await _send(client, doc_tok, room["id"], "First message")

        res = await client.get("/api/chat/rooms", headers=_auth(doc_tok))
        listed = next(r for r in res.json() if r["id"] == room["id"])

        assert listed["last_message_preview"] == "First message"
        assert listed["last_message_at"] is not None
        assert listed["other_participant_id"] == pat_id
        assert listed["other_participant_role"] == "PATIENT"
        assert listed["other_participant_name"] is not None

    async def test_list_rooms_sorted_by_most_recent_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat1_tok, pat1_id = await _signup_login(client, "PATIENT", "p1")
        pat2_tok, pat2_id = await _signup_login(client, "PATIENT", "p2")

        room1 = await _create_direct_room(client, doc_tok, pat1_id)
        room2 = await _create_direct_room(client, doc_tok, pat2_id)

        # Send a message in room1 last — room1 should sort to top
        await _send(client, doc_tok, room2["id"], "msg in room2 first")
        await _send(client, doc_tok, room1["id"], "msg in room1 last")

        res = await client.get("/api/chat/rooms", headers=_auth(doc_tok))
        ids = [r["id"] for r in res.json()]
        assert ids[0] == room1["id"], "Most recently active room should be first"

    async def test_list_rooms_requires_auth(self, client):
        res = await client.get("/api/chat/rooms")
        assert res.status_code == 401

    async def test_list_rooms_empty_for_new_user(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        res = await client.get("/api/chat/rooms", headers=_auth(doc_tok))
        assert res.status_code == 200
        assert res.json() == []


# ─────────────────────────────────────────────────────────────────────────────
# TestMarkRead
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMarkRead:

    async def test_mark_read_clears_unread_badge(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        # Doctor sends 3 messages — patient hasn't opened the room yet
        for i in range(3):
            await _send(client, doc_tok, room["id"], f"msg {i}")

        # Patient's room list should show unread_count == 3
        res = await client.get("/api/chat/rooms", headers=_auth(pat_tok))
        listed = next(r for r in res.json() if r["id"] == room["id"])
        assert listed["unread_count"] == 3

        # Patient marks room as read
        patch = await client.patch(
            f"/api/chat/rooms/{room['id']}/read",
            headers=_auth(pat_tok),
        )
        assert patch.status_code == 204

        # Unread count must now be 0
        res2 = await client.get("/api/chat/rooms", headers=_auth(pat_tok))
        listed2 = next(r for r in res2.json() if r["id"] == room["id"])
        assert listed2["unread_count"] == 0

    async def test_own_messages_dont_count_as_unread(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        # Patient sends a message
        await _send(client, pat_tok, room["id"], "from me")

        # Patient's own message must not appear in their unread count
        res = await client.get("/api/chat/rooms", headers=_auth(pat_tok))
        listed = next(r for r in res.json() if r["id"] == room["id"])
        assert listed["unread_count"] == 0

    async def test_system_messages_excluded_from_unread_count(self, client):
        """SYSTEM messages (room-created event) must not inflate the unread badge."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        # Room creation injects one SYSTEM message
        room = await _create_direct_room(client, doc_tok, pat_id)

        # Patient hasn't marked anything read — unread should still be 0
        # because the system message is not a TEXT message
        res = await client.get("/api/chat/rooms", headers=_auth(pat_tok))
        listed = next(r for r in res.json() if r["id"] == room["id"])
        assert listed["unread_count"] == 0

    async def test_mark_read_non_participant_forbidden(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        other_tok, _ = await _signup_login(client, "DOCTOR", "outsider")

        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.patch(
            f"/api/chat/rooms/{room['id']}/read",
            headers=_auth(other_tok),
        )
        assert res.status_code == 403

    async def test_new_messages_after_read_show_as_unread(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        await _send(client, doc_tok, room["id"], "first batch")

        # Patient marks read
        await client.patch(f"/api/chat/rooms/{room['id']}/read", headers=_auth(pat_tok))

        # Doctor sends another message after the read stamp
        await _send(client, doc_tok, room["id"], "second batch — after read")

        # Patient should now have 1 unread
        res = await client.get("/api/chat/rooms", headers=_auth(pat_tok))
        listed = next(r for r in res.json() if r["id"] == room["id"])
        assert listed["unread_count"] == 1


# ─────────────────────────────────────────────────────────────────────────────
# TestSendMessage
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestSendMessage:

    async def test_send_message_happy_path(self, client):
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "Hello patient!")

        assert msg["id"]
        assert msg["content"] == "Hello patient!"
        assert msg["sender_id"] == doc_id
        assert msg["message_type"] == "TEXT"
        assert msg["is_deleted"] is False
        assert msg["sender_name"] is not None

    async def test_send_empty_content_rejected(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)

        for bad in ["", "   ", "\t\n"]:
            res = await client.post(
                f"/api/chat/rooms/{room['id']}/messages",
                json={"content": bad},
                headers=_auth(doc_tok),
            )
            assert res.status_code == 422, f"Expected 422 for content={bad!r}"

    async def test_send_strips_whitespace(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "  hello  ")

        assert msg["content"] == "hello"

    async def test_non_participant_cannot_send(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        outsider_tok, _ = await _signup_login(client, "DOCTOR", "out")

        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.post(
            f"/api/chat/rooms/{room['id']}/messages",
            json={"content": "Snoop"},
            headers=_auth(outsider_tok),
        )
        assert res.status_code == 403

    async def test_send_requires_auth(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.post(
            f"/api/chat/rooms/{room['id']}/messages",
            json={"content": "no token"},
        )
        assert res.status_code == 401

    async def test_send_to_nonexistent_room(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        fake_room_id = str(uuid.uuid4())

        res = await client.post(
            f"/api/chat/rooms/{fake_room_id}/messages",
            json={"content": "ghost"},
            headers=_auth(doc_tok),
        )
        assert res.status_code == 403

    async def test_max_length_message_accepted(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        long_msg = "a" * 4000
        msg = await _send(client, doc_tok, room["id"], long_msg)
        assert len(msg["content"]) == 4000

    async def test_both_participants_can_send(self, client):
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        m1 = await _send(client, doc_tok, room["id"], "Doc speaking")
        m2 = await _send(client, pat_tok, room["id"], "Patient replying")

        assert m1["sender_id"] == doc_id
        assert m2["sender_id"] == pat_id

        msgs = (await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )).json()
        text = [m for m in msgs if m["message_type"] == "TEXT"]
        assert len(text) == 2
        assert text[0]["content"] == "Doc speaking"
        assert text[1]["content"] == "Patient replying"


# ─────────────────────────────────────────────────────────────────────────────
# TestGetMessages
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestGetMessages:

    async def test_initial_load_oldest_first(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        for i in range(5):
            await _send(client, doc_tok, room["id"], f"msg {i}")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200
        msgs = res.json()
        text = [m for m in msgs if m["message_type"] == "TEXT"]
        assert len(text) == 5

        # Verify chronological order
        for i, m in enumerate(text):
            assert m["content"] == f"msg {i}"

    async def test_get_messages_non_participant_forbidden(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        spy_tok, _ = await _signup_login(client, "DOCTOR", "spy")

        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(spy_tok),
        )
        assert res.status_code == 403

    async def test_get_messages_requires_auth(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.get(f"/api/chat/rooms/{room['id']}/messages")
        assert res.status_code == 401

    async def test_empty_room_returns_only_system_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )
        msgs = res.json()
        assert len(msgs) == 1
        assert msgs[0]["message_type"] == "SYSTEM"

    async def test_deleted_messages_shown_with_placeholder(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "will be deleted")

        await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )

        msgs = (await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )).json()
        deleted = next(m for m in msgs if m["id"] == msg["id"])
        assert deleted["is_deleted"] is True
        assert deleted["content"] == "[message deleted]"

    async def test_sender_name_resolved(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        msg = await _send(client, doc_tok, room["id"], "test sender name")
        assert msg["sender_name"] is not None
        assert len(msg["sender_name"]) > 0


# ─────────────────────────────────────────────────────────────────────────────
# TestPollingDelta  (since= cursor)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestPollingDelta:

    async def test_since_is_strictly_room_scoped(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        _, pat1_id = await _signup_login(client, "PATIENT", "scope1")
        _, pat2_id = await _signup_login(client, "PATIENT", "scope2")

        room_a = await _create_direct_room(client, doc_tok, pat1_id)
        room_b = await _create_direct_room(client, doc_tok, pat2_id)

        anchor = await _send(client, doc_tok, room_a["id"], "room-a-anchor")
        await _send(client, doc_tok, room_a["id"], "room-a-new")
        await _send(client, doc_tok, room_b["id"], "room-b-new")

        res = await client.get(
            f"/api/chat/rooms/{room_a['id']}/messages?since={anchor['created_at']}",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200
        msgs = res.json()
        contents = [m["content"] for m in msgs]
        assert "room-a-new" in contents
        assert "room-b-new" not in contents

    async def test_since_returns_only_newer_messages(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        m1 = await _send(client, doc_tok, room["id"], "before cursor")
        # Use m1's timestamp as the since cursor
        cursor = m1["created_at"]

        m2 = await _send(client, doc_tok, room["id"], "after cursor")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since={cursor}",
            headers=_auth(doc_tok),
        )
        msgs = res.json()
        contents = [m["content"] for m in msgs]
        assert "before cursor" not in contents
        assert "after cursor" in contents

    async def test_since_epoch_returns_all_messages(self, client):
        """Passing 1970-01-01 epoch (timezone-aware Z suffix) must not crash."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        await _send(client, doc_tok, room["id"], "some message")

        # This is the exact string the polling hook sends when sinceTimestamp is null
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since=1970-01-01T00:00:00.000Z",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200
        msgs = res.json()
        assert any(m["content"] == "some message" for m in msgs)

    async def test_since_with_timezone_offset_does_not_crash(self, client):
        """since= values with +00:00 offset (not just Z) must also work."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        await _send(client, doc_tok, room["id"], "tz offset test")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since=2000-01-01T00:00:00+00:00",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200

    async def test_since_no_new_messages_returns_empty(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        msg = await _send(client, doc_tok, room["id"], "only message")
        # Use the message's own timestamp — nothing comes after it
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since={msg['created_at']}",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200
        assert res.json() == []

    async def test_since_messages_returned_oldest_first(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        anchor = await _send(client, doc_tok, room["id"], "anchor")
        await _send(client, doc_tok, room["id"], "new A")
        await _send(client, doc_tok, room["id"], "new B")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since={anchor['created_at']}",
            headers=_auth(doc_tok),
        )
        msgs = res.json()
        assert len(msgs) == 2
        assert msgs[0]["content"] == "new A"
        assert msgs[1]["content"] == "new B"

    async def test_since_invalid_format_returns_422(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?since=not-a-date",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TestLoadMore  (before= cursor)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestLoadMore:

    async def test_before_returns_older_messages(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        # Send 3 messages
        m1 = await _send(client, doc_tok, room["id"], "oldest")
        m2 = await _send(client, doc_tok, room["id"], "middle")
        m3 = await _send(client, doc_tok, room["id"], "newest")

        # Fetch messages before m3's timestamp
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?before={m3['created_at']}",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200
        msgs = res.json()
        contents = [m["content"] for m in msgs if m["message_type"] == "TEXT"]
        assert "newest" not in contents
        assert "oldest" in contents
        assert "middle" in contents

    async def test_before_returned_oldest_first(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        m1 = await _send(client, doc_tok, room["id"], "A")
        m2 = await _send(client, doc_tok, room["id"], "B")
        m3 = await _send(client, doc_tok, room["id"], "C")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?before={m3['created_at']}",
            headers=_auth(doc_tok),
        )
        text = [m for m in res.json() if m["message_type"] == "TEXT"]
        assert text[0]["content"] == "A"
        assert text[1]["content"] == "B"

    async def test_before_with_limit(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        msgs = []
        for i in range(5):
            msgs.append(await _send(client, doc_tok, room["id"], f"m{i}"))

        # limit=2, before the last message
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?before={msgs[-1]['created_at']}&limit=2",
            headers=_auth(doc_tok),
        )
        text = [m for m in res.json() if m["message_type"] == "TEXT"]
        assert len(text) == 2

    async def test_before_invalid_format_returns_422(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?before=bad",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422

    async def test_before_with_timezone_z_suffix_does_not_crash(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        await _send(client, doc_tok, room["id"], "test")

        # Simulate frontend sending an ISO string with Z suffix
        future = "2099-01-01T00:00:00.000Z"
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?before={future}",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# TestSoftDelete
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestSoftDelete:

    async def test_admin_can_soft_delete_text_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "delete me")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 204

    async def test_patient_cannot_delete(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "try to delete")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(pat_tok),
        )
        assert res.status_code == 403

    async def test_doctor_cannot_delete(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "try to delete as doc")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 403

    async def test_system_message_cannot_be_deleted_by_admin(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room = await _create_direct_room(client, doc_tok, pat_id)

        # Find the SYSTEM message — use doc_tok because admin is not a room participant
        # and GET /messages requires participant membership.  The admin only needs the
        # message id to attempt the delete; they don't need direct read access.
        msgs = (await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )).json()
        system_msg = next(m for m in msgs if m["message_type"] == "SYSTEM")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{system_msg['id']}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 403
        assert "System messages" in res.json()["detail"]

    async def test_delete_nonexistent_message_returns_404(self, client):
        admin_tok, _ = await _signup_login(client, "ADMIN")
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        fake_msg_id = str(uuid.uuid4())
        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{fake_msg_id}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 404

    async def test_delete_message_wrong_room_returns_404(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat1_tok, pat1_id = await _signup_login(client, "PATIENT", "p1")
        pat2_tok, pat2_id = await _signup_login(client, "PATIENT", "p2")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room1 = await _create_direct_room(client, doc_tok, pat1_id)
        room2 = await _create_direct_room(client, doc_tok, pat2_id)
        msg = await _send(client, doc_tok, room1["id"], "in room1")

        # Try to delete msg using room2's id — should 404
        res = await client.delete(
            f"/api/chat/rooms/{room2['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 404

    async def test_soft_delete_is_visible_to_all_participants(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "visible then deleted")

        await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )

        # Both participants see the deletion
        for token in [doc_tok, pat_tok]:
            msgs = (await client.get(
                f"/api/chat/rooms/{room['id']}/messages",
                headers=_auth(token),
            )).json()
            target = next(m for m in msgs if m["id"] == msg["id"])
            assert target["content"] == "[message deleted]"
            assert target["is_deleted"] is True

    async def test_double_delete_idempotent(self, client):
        """Deleting an already-deleted message should still return 204."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        admin_tok, _ = await _signup_login(client, "ADMIN")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "delete twice")

        await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )
        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 204


# ─────────────────────────────────────────────────────────────────────────────
# TestSearchableUsers
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestSearchableUsers:

    async def test_search_requires_auth(self, client):
        res = await client.get("/api/chat/users/searchable?q=")
        assert res.status_code == 401

    async def test_patient_without_profile_sees_empty(self, client):
        """A patient who has no profile yet (no doctor links) gets an empty list."""
        pat_tok, _ = await _signup_login(client, "PATIENT")
        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(pat_tok))
        assert res.status_code == 200
        assert res.json() == []

    async def test_search_returns_correct_schema(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(doc_tok))
        assert res.status_code == 200
        results = res.json()
        for r in results:
            assert "id" in r
            assert "name" in r
            assert "role" in r
            assert "display_label" in r

    async def test_admin_sees_all_users(self, client):
        admin_tok, admin_id = await _signup_login(client, "ADMIN")
        doc_tok, doc_id = await _signup_login(client, "DOCTOR", "vis")
        pat_tok, pat_id = await _signup_login(client, "PATIENT", "vis")

        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(admin_tok))
        assert res.status_code == 200
        ids = [r["id"] for r in res.json()]
        assert doc_id in ids
        assert pat_id in ids
        # Admin should not see themselves
        assert admin_id not in ids

    async def test_admin_name_filter_works(self, client):
        admin_tok, _ = await _signup_login(client, "ADMIN")
        # Create a user with a unique name we can search for
        tag = _uid()
        unique_email = f"uniquename_{tag}@test.com"
        await client.post("/api/auth/signup", json={
            "name": f"Zygote_{tag} Unique",
            "email": unique_email,
            "password": "Password123!",
            "role": "DOCTOR",
        })

        # Search by the unique prefix
        res = await client.get(
            f"/api/chat/users/searchable?q=Zygote_{tag}",
            headers=_auth(admin_tok),
        )
        assert res.status_code == 200
        results = res.json()
        assert len(results) == 1
        assert f"Zygote_{tag}" in results[0]["name"]

    async def test_doctor_sees_all_other_doctors(self, client):
        doc1_tok, doc1_id = await _signup_login(client, "DOCTOR", "d1")
        doc2_tok, doc2_id = await _signup_login(client, "DOCTOR", "d2")

        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(doc1_tok))
        ids = [r["id"] for r in res.json()]
        assert doc2_id in ids
        # Must not see self
        assert doc1_id not in ids

    async def test_doctor_does_not_see_unlinked_patients(self, client):
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        # No mapping between doc and patient

        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(doc_tok))
        ids = [r["id"] for r in res.json()]
        assert pat_id not in ids

    async def test_name_search_is_case_insensitive(self, client):
        admin_tok, _ = await _signup_login(client, "ADMIN")
        tag = _uid()
        await client.post("/api/auth/signup", json={
            "name": f"CaseTest_{tag} Doctor",
            "email": f"casetest_{tag}@test.com",
            "password": "Password123!",
            "role": "DOCTOR",
        })

        for query in [f"casetest_{tag}", f"CASETEST_{tag}", f"CaseTest_{tag}"]:
            res = await client.get(
                f"/api/chat/users/searchable?q={query}",
                headers=_auth(admin_tok),
            )
            assert res.status_code == 200
            assert len(res.json()) >= 1, f"No results for query={query!r}"

    async def test_search_results_sorted_alphabetically(self, client):
        admin_tok, _ = await _signup_login(client, "ADMIN")
        res = await client.get("/api/chat/users/searchable?q=", headers=_auth(admin_tok))
        results = res.json()
        labels = [r["display_label"].lower() for r in results]
        assert labels == sorted(labels), "Results must be sorted alphabetically"


# ─────────────────────────────────────────────────────────────────────────────
# TestSecurityBoundaries
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestSecurityBoundaries:

    async def test_unauthenticated_cannot_access_any_endpoint(self, client):
        room_id = str(uuid.uuid4())
        msg_id = str(uuid.uuid4())

        endpoints = [
            ("GET",    "/api/chat/rooms"),
            ("POST",   "/api/chat/rooms"),
            ("PATCH",  f"/api/chat/rooms/{room_id}/read"),
            ("GET",    f"/api/chat/rooms/{room_id}/messages"),
            ("POST",   f"/api/chat/rooms/{room_id}/messages"),
            ("DELETE", f"/api/chat/rooms/{room_id}/messages/{msg_id}"),
            ("GET",    "/api/chat/users/searchable"),
        ]
        for method, path in endpoints:
            res = await client.request(method, path, json={})
            assert res.status_code == 401, (
                f"Expected 401 for {method} {path}, got {res.status_code}"
            )

    async def test_cross_user_message_read_blocked(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        attacker_tok, _ = await _signup_login(client, "PATIENT", "attacker")

        room = await _create_direct_room(client, doc_tok, pat_id)
        await _send(client, doc_tok, room["id"], "private message")

        # Attacker tries to read
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(attacker_tok),
        )
        assert res.status_code == 403

    async def test_cross_user_mark_read_blocked(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        attacker_tok, _ = await _signup_login(client, "PATIENT", "atk")

        room = await _create_direct_room(client, doc_tok, pat_id)

        res = await client.patch(
            f"/api/chat/rooms/{room['id']}/read",
            headers=_auth(attacker_tok),
        )
        assert res.status_code == 403

    async def test_invalid_room_uuid_returns_422(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        res = await client.get(
            "/api/chat/rooms/not-a-uuid/messages",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422

    async def test_nonexistent_room_returns_403_not_500(self, client):
        """A valid UUID that doesn't exist in the DB must 403 (not participant), not 500."""
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        fake_id = str(uuid.uuid4())

        for method, path, body in [
            ("GET",   f"/api/chat/rooms/{fake_id}/messages", {}),
            ("POST",  f"/api/chat/rooms/{fake_id}/messages", {"content": "hi"}),
            ("PATCH", f"/api/chat/rooms/{fake_id}/read", {}),
        ]:
            res = await client.request(method, path, json=body, headers=_auth(doc_tok))
            assert res.status_code in (403, 404), (
                f"{method} {path} returned {res.status_code}, expected 403 or 404"
            )

    async def test_malformed_jwt_returns_401(self, client):
        res = await client.get(
            "/api/chat/rooms",
            headers={"Authorization": "Bearer not.a.real.token"},
        )
        assert res.status_code == 401

    async def test_patient_cannot_delete_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, doc_tok, room["id"], "immutable")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(pat_tok),
        )
        assert res.status_code == 403

    async def test_patient_cannot_delete_own_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        room = await _create_direct_room(client, doc_tok, pat_id)
        msg = await _send(client, pat_tok, room["id"], "my message, try to delete")

        res = await client.delete(
            f"/api/chat/rooms/{room['id']}/messages/{msg['id']}",
            headers=_auth(pat_tok),
        )
        assert res.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# TestConcurrentRoomCreate
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestConcurrentRoomCreate:

    async def test_concurrent_create_direct_room_no_duplicate(self, client):
        """
        Fire 5 simultaneous POST /rooms requests for the same pair.
        The deduplication logic must ensure only one room exists afterward.
        """
        doc_tok, doc_id = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")

        payload = {"room_type": "DIRECT", "participant_ids": [pat_id]}

        async def create():
            return await client.post(
                "/api/chat/rooms",
                json=payload,
                headers=_auth(doc_tok),
            )

        results = await asyncio.gather(*(create() for _ in range(5)))

        # All requests must succeed
        for r in results:
            assert r.status_code == 201, f"Got {r.status_code}: {r.text}"

        # All must return the same room id
        ids = {r.json()["id"] for r in results}
        assert len(ids) == 1, f"Got {len(ids)} distinct room ids instead of 1: {ids}"

        # Verify at the list level — doctor sees exactly 1 room with this patient
        list_res = await client.get("/api/chat/rooms", headers=_auth(doc_tok))
        all_rooms = list_res.json()
        patient_rooms = [r for r in all_rooms if r.get("other_participant_id") == pat_id]
        assert len(patient_rooms) == 1, (
            f"Expected 1 room with patient, found {len(patient_rooms)}"
        )

    async def test_concurrent_create_from_both_sides_no_duplicate(self, client):
        """
        Doctor and patient simultaneously create a room with each other.
        Must resolve to a single room.
        """
        doc_tok, doc_id = await _signup_login(client, "DOCTOR", "cc1")
        pat_tok, pat_id = await _signup_login(client, "PATIENT", "cc1")

        doc_payload = {"room_type": "DIRECT", "participant_ids": [pat_id]}
        pat_payload = {"room_type": "DIRECT", "participant_ids": [doc_id]}

        async def doc_create():
            return await client.post("/api/chat/rooms", json=doc_payload, headers=_auth(doc_tok))

        async def pat_create():
            return await client.post("/api/chat/rooms", json=pat_payload, headers=_auth(pat_tok))

        results = await asyncio.gather(
            doc_create(), doc_create(), pat_create(), pat_create()
        )

        for r in results:
            assert r.status_code == 201

        ids = {r.json()["id"] for r in results}
        assert len(ids) == 1, f"Expected 1 room, got {len(ids)}: {ids}"


# ─────────────────────────────────────────────────────────────────────────────
# TestUnreadCountAccuracy
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestUnreadCountAccuracy:

    async def test_unread_count_increments_per_message(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        for expected in range(1, 4):
            await _send(client, doc_tok, room["id"], f"msg {expected}")
            rooms = (await client.get("/api/chat/rooms", headers=_auth(pat_tok))).json()
            listed = next(r for r in rooms if r["id"] == room["id"])
            assert listed["unread_count"] == expected

    async def test_unread_resets_after_mark_read_then_increments_again(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        await _send(client, doc_tok, room["id"], "batch 1")
        await client.patch(f"/api/chat/rooms/{room['id']}/read", headers=_auth(pat_tok))

        rooms = (await client.get("/api/chat/rooms", headers=_auth(pat_tok))).json()
        assert next(r for r in rooms if r["id"] == room["id"])["unread_count"] == 0

        await _send(client, doc_tok, room["id"], "batch 2")
        rooms = (await client.get("/api/chat/rooms", headers=_auth(pat_tok))).json()
        assert next(r for r in rooms if r["id"] == room["id"])["unread_count"] == 1

    async def test_multiple_rooms_unread_counts_independent(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat1_tok, pat1_id = await _signup_login(client, "PATIENT", "u1")
        pat2_tok, pat2_id = await _signup_login(client, "PATIENT", "u2")

        r1 = await _create_direct_room(client, doc_tok, pat1_id)
        r2 = await _create_direct_room(client, doc_tok, pat2_id)

        # 2 messages in room1, 5 in room2
        for _ in range(2):
            await _send(client, doc_tok, r1["id"], "r1 msg")
        for _ in range(5):
            await _send(client, doc_tok, r2["id"], "r2 msg")

        pat1_rooms = (await client.get("/api/chat/rooms", headers=_auth(pat1_tok))).json()
        pat2_rooms = (await client.get("/api/chat/rooms", headers=_auth(pat2_tok))).json()

        p1_unread = next(r for r in pat1_rooms if r["id"] == r1["id"])["unread_count"]
        p2_unread = next(r for r in pat2_rooms if r["id"] == r2["id"])["unread_count"]

        assert p1_unread == 2
        assert p2_unread == 5

        # Marking room1 read for pat1 must not affect room2
        await client.patch(f"/api/chat/rooms/{r1['id']}/read", headers=_auth(pat1_tok))
        pat2_rooms2 = (await client.get("/api/chat/rooms", headers=_auth(pat2_tok))).json()
        p2_unread2 = next(r for r in pat2_rooms2 if r["id"] == r2["id"])["unread_count"]
        assert p2_unread2 == 5


# ─────────────────────────────────────────────────────────────────────────────
# TestMessageOrdering
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
class TestMessageOrdering:

    async def test_messages_always_returned_oldest_first_on_initial_load(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        contents = ["alpha", "beta", "gamma", "delta"]
        for c in contents:
            await _send(client, doc_tok, room["id"], c)

        msgs = (await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )).json()
        text = [m["content"] for m in msgs if m["message_type"] == "TEXT"]
        assert text == contents

    async def test_created_at_is_monotonically_increasing(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        for i in range(4):
            await _send(client, doc_tok, room["id"], f"m{i}")

        msgs = (await client.get(
            f"/api/chat/rooms/{room['id']}/messages",
            headers=_auth(doc_tok),
        )).json()

        timestamps = [m["created_at"] for m in msgs]
        for i in range(1, len(timestamps)):
            assert timestamps[i] >= timestamps[i - 1], (
                f"Timestamp not monotonic at index {i}: {timestamps[i-1]} vs {timestamps[i]}"
            )

    async def test_limit_parameter_respected(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        for i in range(10):
            await _send(client, doc_tok, room["id"], f"m{i}")

        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?limit=3",
            headers=_auth(doc_tok),
        )
        msgs = res.json()
        # limit applies before the reverse — we get the last 3 messages
        assert len(msgs) == 3

    async def test_limit_above_max_clamped(self, client):
        doc_tok, _ = await _signup_login(client, "DOCTOR")
        pat_tok, pat_id = await _signup_login(client, "PATIENT")
        room = await _create_direct_room(client, doc_tok, pat_id)

        # limit > 200 should be rejected with 422
        res = await client.get(
            f"/api/chat/rooms/{room['id']}/messages?limit=999",
            headers=_auth(doc_tok),
        )
        assert res.status_code == 422
