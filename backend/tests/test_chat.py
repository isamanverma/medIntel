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

async def create_and_login(client: AsyncClient, role: str, suffix: str = "") -> tuple[str, str]:
    u = uid() + suffix
    await client.post("/api/auth/signup", json={
        "name": f"Test {role}",
        "email": f"chat_{role.lower()}_{u}@test.com",
        "password": "Password123",
        "role": role,
    })
    res = await client.post("/api/auth/login", json={
        "email": f"chat_{role.lower()}_{u}@test.com",
        "password": "Password123",
    })
    return res.json()["access_token"], res.json()["user"]["id"]


@pytest.mark.asyncio
class TestChatAPI:

    async def test_create_and_list_room(self, client: AsyncClient):
        doc_token, doc_id = await create_and_login(client, "DOCTOR", "doc")
        pat_token, pat_id = await create_and_login(client, "PATIENT", "pat")

        # Doctor creates room with patient
        res = await client.post("/api/chat/rooms", json={
            "name": "Consultation",
            "room_type": "DIRECT",
            "participant_ids": [pat_id]
        }, headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 201
        room_id = res.json()["id"]
        assert res.json()["participant_count"] == 2

        # List rooms as doctor
        res = await client.get("/api/chat/rooms", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["id"] == room_id

        # List rooms as patient
        res = await client.get("/api/chat/rooms", headers={"Authorization": f"Bearer {pat_token}"})
        assert res.status_code == 200
        assert len(res.json()) == 1
        assert res.json()[0]["id"] == room_id

    async def test_send_and_get_messages(self, client: AsyncClient):
        doc_token, doc_id = await create_and_login(client, "DOCTOR")
        pat_token, pat_id = await create_and_login(client, "PATIENT")

        res = await client.post("/api/chat/rooms", json={
            "participant_ids": [pat_id]
        }, headers={"Authorization": f"Bearer {doc_token}"})
        room_id = res.json()["id"]

        # Doctor sends message
        res = await client.post(f"/api/chat/rooms/{room_id}/messages", json={
            "content": "Hello!"
        }, headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 201

        # Patient sends message
        res = await client.post(f"/api/chat/rooms/{room_id}/messages", json={
            "content": "Hi Doctor"
        }, headers={"Authorization": f"Bearer {pat_token}"})
        assert res.status_code == 201

        # Get history — includes the auto-injected SYSTEM message from room creation
        res = await client.get(f"/api/chat/rooms/{room_id}/messages", headers={"Authorization": f"Bearer {pat_token}"})
        assert res.status_code == 200
        messages = res.json()
        # 1 SYSTEM message (room created) + 2 TEXT messages = 3 total
        assert len(messages) == 3

        # First message is the system event marker
        assert messages[0]["message_type"] == "SYSTEM"
        assert "Secure chat started" in messages[0]["content"]

        # User messages follow in chronological order
        text_messages = [m for m in messages if m["message_type"] == "TEXT"]
        assert len(text_messages) == 2
        assert text_messages[0]["content"] == "Hello!"
        assert text_messages[1]["content"] == "Hi Doctor"

    async def test_non_participant_cannot_access(self, client: AsyncClient):
        doc_token, doc_id = await create_and_login(client, "DOCTOR")
        pat_token, pat_id = await create_and_login(client, "PATIENT")
        other_doc_token, _ = await create_and_login(client, "DOCTOR", "sneak")

        res = await client.post("/api/chat/rooms", json={
            "participant_ids": [pat_id]
        }, headers={"Authorization": f"Bearer {doc_token}"})
        room_id = res.json()["id"]

        res = await client.post(f"/api/chat/rooms/{room_id}/messages", json={
            "content": "Snoop"
        }, headers={"Authorization": f"Bearer {other_doc_token}"})
        assert res.status_code == 403

        res = await client.get(f"/api/chat/rooms/{room_id}/messages", headers={"Authorization": f"Bearer {other_doc_token}"})
        assert res.status_code == 403

    async def test_admin_can_soft_delete(self, client: AsyncClient):
        doc_token, doc_id = await create_and_login(client, "DOCTOR")
        pat_token, pat_id = await create_and_login(client, "PATIENT")
        admin_token, _ = await create_and_login(client, "ADMIN")

        res = await client.post("/api/chat/rooms", json={
            "participant_ids": [pat_id]
        }, headers={"Authorization": f"Bearer {doc_token}"})
        room_id = res.json()["id"]

        res = await client.post(f"/api/chat/rooms/{room_id}/messages", json={
            "content": "Bad message!"
        }, headers={"Authorization": f"Bearer {doc_token}"})
        msg_id = res.json()["id"]

        # Patient cannot delete
        res = await client.delete(f"/api/chat/rooms/{room_id}/messages/{msg_id}", headers={"Authorization": f"Bearer {pat_token}"})
        assert res.status_code == 403

        # Doctor cannot delete
        res = await client.delete(f"/api/chat/rooms/{room_id}/messages/{msg_id}", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 403

        # Admin CAN delete
        res = await client.delete(f"/api/chat/rooms/{room_id}/messages/{msg_id}", headers={"Authorization": f"Bearer {admin_token}"})
        assert res.status_code == 204

        # Read back messages — first is the SYSTEM message, second is the soft-deleted TEXT message
        res = await client.get(f"/api/chat/rooms/{room_id}/messages", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 200
        messages = res.json()
        # 1 SYSTEM + 1 soft-deleted TEXT = 2 total
        assert len(messages) == 2

        # The SYSTEM message is unaffected
        assert messages[0]["message_type"] == "SYSTEM"
        assert messages[0]["is_deleted"] is False

        # The TEXT message is soft-deleted
        deleted_msg = messages[1]
        assert deleted_msg["message_type"] == "TEXT"
        assert deleted_msg["content"] == "[message deleted]"
        assert deleted_msg["is_deleted"] is True
