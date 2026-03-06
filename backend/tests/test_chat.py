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

        # Get history
        res = await client.get(f"/api/chat/rooms/{room_id}/messages", headers={"Authorization": f"Bearer {pat_token}"})
        assert res.status_code == 200
        messages = res.json()
        assert len(messages) == 2
        assert messages[0]["content"] == "Hello!"
        assert messages[1]["content"] == "Hi Doctor"

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

        # Read back messages shows "[message deleted]"
        res = await client.get(f"/api/chat/rooms/{room_id}/messages", headers={"Authorization": f"Bearer {doc_token}"})
        assert res.status_code == 200
        assert res.json()[0]["content"] == "[message deleted]"
        assert res.json()[0]["is_deleted"] is True
