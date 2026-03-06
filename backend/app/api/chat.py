"""
Secure Chat API — ISSUE-030

Endpoints:
  POST   /api/chat/rooms              — Create a chat room
  GET    /api/chat/rooms              — List rooms the caller participates in
  POST   /api/chat/rooms/{id}/messages — Send a message (append-only for users)
  GET    /api/chat/rooms/{id}/messages — Get message history
  DELETE /api/chat/rooms/{room_id}/messages/{msg_id}  — Admin-only soft delete

Security:
  - Messages can never be edited or deleted by the sender / other users.
  - Only admins may soft-delete a message (sets is_deleted=True, content replaced).
  - Deleted messages show "[message deleted]" to all participants.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user, require_admin
from app.models.user import User
from app.models.chat import ChatRoom, ChatParticipant, ChatMessage, RoomType

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ── Request / Response schemas ────────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: Optional[str] = None
    room_type: str = "DIRECT"
    participant_ids: list[str]   # UUIDs of users to invite (excluding self)


class SendMessageRequest(BaseModel):
    content: str


class ChatRoomResponse(BaseModel):
    id: str
    name: Optional[str]
    room_type: str
    created_by: str
    created_at: str
    participant_count: int


class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    content: str
    created_at: str
    is_deleted: bool


# ── Helpers ───────────────────────────────────────────────────────

def _room_resp(room: ChatRoom, count: int) -> ChatRoomResponse:
    return ChatRoomResponse(
        id=str(room.id),
        name=room.name,
        room_type=room.room_type.value if hasattr(room.room_type, "value") else str(room.room_type),
        created_by=str(room.created_by),
        created_at=str(room.created_at),
        participant_count=count,
    )


def _msg_resp(msg: ChatMessage) -> ChatMessageResponse:
    return ChatMessageResponse(
        id=str(msg.id),
        room_id=str(msg.room_id),
        sender_id=str(msg.sender_id),
        content="[message deleted]" if msg.is_deleted else msg.content,
        created_at=str(msg.created_at),
        is_deleted=msg.is_deleted,
    )


async def _assert_participant(session: AsyncSession, room_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Raise 403 if the user is not a participant in the room."""
    result = await session.execute(
        select(ChatParticipant).where(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You are not a participant of this chat room")


# ── Routes ────────────────────────────────────────────────────────

@router.post("/rooms", response_model=ChatRoomResponse, status_code=201)
async def create_room(
    body: CreateRoomRequest,
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> ChatRoomResponse:
    """Create a new chat room and add the creator + listed participants."""
    try:
        room_type = RoomType(body.room_type.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid room_type: {body.room_type}")

    room = ChatRoom(
        name=body.name,
        room_type=room_type,
        created_by=me.id,
    )
    session.add(room)
    await session.flush()  # get room.id

    # Add creator as first participant
    all_participant_ids = {str(me.id)} | {p.strip() for p in body.participant_ids}
    for pid_str in all_participant_ids:
        try:
            pid = uuid.UUID(pid_str)
        except ValueError:
            continue
        session.add(ChatParticipant(room_id=room.id, user_id=pid))

    await session.commit()
    await session.refresh(room)
    return _room_resp(room, len(all_participant_ids))


@router.get("/rooms", response_model=list[ChatRoomResponse])
async def list_rooms(
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> list[ChatRoomResponse]:
    """List all chat rooms the current user participates in."""
    result = await session.execute(
        select(ChatRoom)
        .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .where(ChatParticipant.user_id == me.id)
        .order_by(ChatRoom.created_at.desc())
    )
    rooms = result.scalars().all()

    responses = []
    for room in rooms:
        count_res = await session.execute(
            select(ChatParticipant).where(ChatParticipant.room_id == room.id)
        )
        count = len(count_res.scalars().all())
        responses.append(_room_resp(room, count))
    return responses


@router.post("/rooms/{room_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def send_message(
    room_id: uuid.UUID,
    body: SendMessageRequest,
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> ChatMessageResponse:
    """Send a message to a chat room. Messages are immutable once sent."""
    await _assert_participant(session, room_id, me.id)

    if not body.content.strip():
        raise HTTPException(status_code=422, detail="Message content cannot be empty")

    msg = ChatMessage(room_id=room_id, sender_id=me.id, content=body.content.strip())
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return _msg_resp(msg)


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    room_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> list[ChatMessageResponse]:
    """Get all messages in a room (oldest first). Caller must be participant."""
    await _assert_participant(session, room_id, me.id)

    result = await session.execute(
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return [_msg_resp(m) for m in result.scalars().all()]


@router.delete(
    "/rooms/{room_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_message(
    room_id: uuid.UUID,
    message_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(require_admin),
) -> None:
    """Admin-only soft delete: marks message as deleted, content is hidden."""
    msg = await session.get(ChatMessage, message_id)
    if not msg or msg.room_id != room_id:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.is_deleted = True
    msg.deleted_by = admin.id
    msg.deleted_at = datetime.utcnow()
    session.add(msg)
    await session.commit()
