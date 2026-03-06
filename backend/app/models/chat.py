"""
Chat models: ChatRoom, ChatParticipant, ChatMessage.

Design principles:
- Messages are immutable for all users and doctors (no edit/delete).
- Only admins can soft-delete messages via is_deleted flag.
- Chat history is append-only to guarantee auditability.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List

from sqlmodel import Field, SQLModel, Relationship


class RoomType(str, Enum):
    DIRECT = "DIRECT"   # 1-to-1 (doctor ↔ patient, doctor ↔ doctor)
    GROUP = "GROUP"     # multi-doctor care team channel


class ChatParticipant(SQLModel, table=True):
    __tablename__ = "chat_participants"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    room_id: uuid.UUID = Field(foreign_key="chat_rooms.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    room: Optional["ChatRoom"] = Relationship(back_populates="participants")


class ChatMessage(SQLModel, table=True):
    __tablename__ = "chat_messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    room_id: uuid.UUID = Field(foreign_key="chat_rooms.id", index=True)
    sender_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    content: str = Field(min_length=1, max_length=4000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # Soft-delete: only admins may set this to True
    is_deleted: bool = Field(default=False)
    deleted_by: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    deleted_at: Optional[datetime] = Field(default=None)

    room: Optional["ChatRoom"] = Relationship(back_populates="messages")


class ChatRoom(SQLModel, table=True):
    __tablename__ = "chat_rooms"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    name: Optional[str] = Field(default=None, max_length=200)
    room_type: RoomType = Field(default=RoomType.DIRECT)
    created_by: uuid.UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    participants: List["ChatParticipant"] = Relationship(back_populates="room")
    messages: List["ChatMessage"] = Relationship(back_populates="room")


