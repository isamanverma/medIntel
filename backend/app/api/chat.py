"""
Secure Chat API — Phase 5c UX Improvements

Endpoints:
  POST   /api/chat/rooms                          — Create a chat room (DIRECT deduplication built-in)
  GET    /api/chat/rooms                          — List rooms with enriched context (name, preview, unread, role)
  PATCH  /api/chat/rooms/{id}/read                — Mark room as read (stamps last_read_at)
  POST   /api/chat/rooms/{id}/messages            — Send a message (append-only for users)
  GET    /api/chat/rooms/{id}/messages            — Get message history (cursor pagination: since / before)
  DELETE /api/chat/rooms/{room_id}/messages/{id}  — Admin-only soft delete (TEXT messages only)
  GET    /api/chat/users/searchable               — Search users the caller is allowed to chat with

Security & Constraints:
  - Messages can never be edited or deleted by the sender / other users.
  - Only admins may soft-delete TEXT messages (sets is_deleted=True, content replaced).
  - SYSTEM messages are never deletable, even by admins.
  - Deleted messages show "[message deleted]" to all participants.
  - DIRECT room deduplication: creating a second DIRECT room with the same two users
    returns the existing room instead of inserting a duplicate.
  - searchable_users enforces role-based visibility:
      Patients  → only their linked doctors
      Doctors   → their linked patients + all other doctors
      Admins    → all users
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, UTC
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text as sa_text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.engine import get_session
from app.deps import get_current_user, require_admin
from app.models.user import User
from app.models.profiles import PatientProfile, DoctorProfile
from app.models.mapping import PatientDoctorMapping
from app.models.enums import MappingStatus, UserRole
from app.models.chat import ChatRoom, ChatParticipant, ChatMessage, RoomType, MessageType

router = APIRouter(prefix="/api/chat", tags=["chat"])


# ── Request / Response schemas ────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    name: Optional[str] = None
    room_type: str = "DIRECT"
    participant_ids: list[str]   # user UUIDs to invite (excluding self)


class SendMessageRequest(BaseModel):
    content: str


class ChatRoomEnrichedResponse(BaseModel):
    """Room list item — carries enough context to render a full sidebar row."""
    id: str
    name: Optional[str]
    room_type: str
    created_by: str
    created_at: str
    participant_count: int
    # Enriched fields
    last_message_preview: Optional[str]     # first 80 chars of last non-deleted msg
    last_message_at: Optional[str]          # ISO timestamp — for sidebar sorting
    unread_count: int                        # messages since last_read_at
    other_participant_id: Optional[str]      # for DIRECT rooms — used by frontend dedup
    other_participant_name: Optional[str]    # "Dr. Sarah Chen" or "John Smith"
    other_participant_role: Optional[str]    # "DOCTOR" / "PATIENT" / "ADMIN"


class ChatMessageResponse(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: Optional[str]              # resolved user display name
    content: str
    created_at: str
    is_deleted: bool
    message_type: str                        # "TEXT" or "SYSTEM"


class ChatUserResult(BaseModel):
    """A user the caller is allowed to start a chat with."""
    id: str                  # user UUID
    name: str
    role: str
    display_label: str       # e.g. "Dr. Sarah Chen · Cardiology" or "John Smith · Patient"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    """Return a timezone-aware UTC datetime. Always use this instead of
    datetime.utcnow() which returns a naive datetime and breaks asyncpg
    when writing to TIMESTAMP WITHOUT TIME ZONE columns via SQLAlchemy."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _strip_tz(dt: datetime) -> datetime:
    """Strip timezone info from a datetime, treating it as naive UTC.

    Supabase returns TIMESTAMPTZ columns (e.g. ChatParticipant.last_read_at,
    ChatParticipant.joined_at) as timezone-aware datetimes, while
    ChatMessage.created_at is stored as TIMESTAMP WITHOUT TIME ZONE (naive).
    asyncpg raises DataError when you compare the two types directly in a
    WHERE clause:
        'can't subtract offset-naive and offset-aware datetimes'

    Calling _strip_tz() on any value read from a TIMESTAMPTZ column before
    using it in a comparison against a TIMESTAMP column keeps both sides
    naive and consistent.
    """
    return dt.replace(tzinfo=None) if dt and dt.tzinfo is not None else dt


def _room_enriched(
    room: ChatRoom,
    participant_count: int,
    last_preview: Optional[str],
    last_msg_at: Optional[str],
    unread_count: int,
    other_id: Optional[str],
    other_name: Optional[str],
    other_role: Optional[str],
) -> ChatRoomEnrichedResponse:
    return ChatRoomEnrichedResponse(
        id=str(room.id),
        name=room.name,
        room_type=room.room_type.value if hasattr(room.room_type, "value") else str(room.room_type),
        created_by=str(room.created_by),
        created_at=room.created_at.isoformat() if room.created_at else "",
        participant_count=participant_count,
        last_message_preview=last_preview,
        last_message_at=last_msg_at,
        unread_count=unread_count,
        other_participant_id=other_id,
        other_participant_name=other_name,
        other_participant_role=other_role,
    )


def _msg_resp(msg: ChatMessage, sender_name: Optional[str] = None) -> ChatMessageResponse:
    msg_type = msg.message_type.value if hasattr(msg.message_type, "value") else str(msg.message_type)
    return ChatMessageResponse(
        id=str(msg.id),
        room_id=str(msg.room_id),
        sender_id=str(msg.sender_id),
        sender_name=sender_name,
        content="[message deleted]" if msg.is_deleted else msg.content,
        created_at=msg.created_at.isoformat() if msg.created_at else "",
        is_deleted=msg.is_deleted,
        message_type=msg_type,
    )


async def _assert_participant(
    session: AsyncSession, room_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    """Raise 403 if the user is not a participant in the room."""
    result = await session.execute(
        select(ChatParticipant).where(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == user_id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="You are not a participant of this chat room",
        )


async def _find_direct_room(
    session: AsyncSession,
    user_a: uuid.UUID,
    user_b: uuid.UUID,
) -> Optional[ChatRoom]:
    """
    Return an existing DIRECT room that contains exactly user_a and user_b,
    or None if no such room exists.

    Uses a single atomic query:
      1. Find room_ids where user_a is a participant.
      2. Intersect with room_ids where user_b is a participant.
      3. Join to chat_rooms and keep only DIRECT rooms.
      4. Among those, keep only rooms with exactly 2 participants total
         (guards against a GROUP room that happens to contain both users).
      5. Return the oldest matching room (created_at ASC) so that if a
         duplicate somehow slipped in, we always prefer the original.

    Doing this in one round-trip eliminates the TOCTOU window that allowed
    duplicates to be created when two requests arrived simultaneously.
    """
    from sqlalchemy import func, and_

    # Subquery: room_ids shared by both users
    a_sub = select(ChatParticipant.room_id).where(
        ChatParticipant.user_id == user_a
    ).scalar_subquery()

    b_sub = select(ChatParticipant.room_id).where(
        ChatParticipant.user_id == user_b
    ).scalar_subquery()

    # Subquery: participant count per room (to enforce exactly-2 constraint)
    count_sub = (
        select(
            ChatParticipant.room_id,
            func.count(ChatParticipant.id).label("participant_count"),
        )
        .group_by(ChatParticipant.room_id)
        .subquery()
    )

    result = await session.execute(
        select(ChatRoom)
        .join(count_sub, count_sub.c.room_id == ChatRoom.id)
        .where(
            and_(
                ChatRoom.id.in_(a_sub),
                ChatRoom.id.in_(b_sub),
                ChatRoom.room_type == RoomType.DIRECT,
                count_sub.c.participant_count == 2,
            )
        )
        .order_by(ChatRoom.created_at.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _resolve_user_name(session: AsyncSession, user_id: uuid.UUID) -> Optional[str]:
    """Look up a user's display name by their user UUID."""
    user = await session.get(User, user_id)
    return user.name if user else None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/rooms", response_model=ChatRoomEnrichedResponse, status_code=201)
async def create_room(
    body: CreateRoomRequest,
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> ChatRoomEnrichedResponse:
    """
    Create a new chat room and add the creator + listed participants.

    For DIRECT rooms with exactly one other participant, this endpoint is
    idempotent: if a DIRECT room already exists between these two users it is
    returned as-is instead of creating a duplicate.
    """
    try:
        room_type = RoomType(body.room_type.upper())
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Invalid room_type: {body.room_type}")

    # ── DIRECT deduplication ──────────────────────────────────────────────
    if room_type == RoomType.DIRECT and len(body.participant_ids) == 1:
        try:
            other_id = uuid.UUID(body.participant_ids[0].strip())
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid participant UUID")

        # Acquire a transaction-level PostgreSQL advisory lock keyed on the
        # sorted pair of user UUIDs.  This serialises all concurrent POST /rooms
        # requests for the same pair so that only one "not found → insert" path
        # can run at a time, eliminating the TOCTOU race that allowed duplicates
        # when asyncio.gather fired several simultaneous create requests.
        #
        # The lock key is a deterministic 63-bit integer derived by XOR-ing the
        # two UUID integers.  XOR is commutative, so the key is the same
        # regardless of which user initiates the request (doctor→patient or
        # patient→doctor), which is exactly what we need for symmetric dedup.
        #
        # pg_advisory_xact_lock blocks until the lock is available and releases
        # it automatically at transaction end (commit or rollback), so there is
        # no risk of a forgotten unlock.
        lock_key = int((me.id.int ^ other_id.int) & 0x7FFFFFFFFFFFFFFF)
        await session.execute(sa_text(f"SELECT pg_advisory_xact_lock({lock_key})"))

        existing = await _find_direct_room(session, me.id, other_id)
        if existing:
            # Return enriched response for the existing room
            count_res = await session.execute(
                select(ChatParticipant).where(ChatParticipant.room_id == existing.id)
            )
            participants = count_res.scalars().all()

            # Get last message for preview
            last_msg_res = await session.execute(
                select(ChatMessage)
                .where(ChatMessage.room_id == existing.id, ChatMessage.is_deleted == False)
                .order_by(ChatMessage.created_at.desc())
                .limit(1)
            )
            last_msg = last_msg_res.scalar_one_or_none()

            # Unread count for current user
            my_part_res = await session.execute(
                select(ChatParticipant).where(
                    ChatParticipant.room_id == existing.id,
                    ChatParticipant.user_id == me.id,
                )
            )
            my_part = my_part_res.scalar_one_or_none()
            unread = 0
            if my_part:
                if my_part.last_read_at:
                    unread_res = await session.execute(
                        select(ChatMessage).where(
                            ChatMessage.room_id == existing.id,
                            ChatMessage.created_at > _strip_tz(my_part.last_read_at),
                            ChatMessage.sender_id != me.id,
                        )
                    )
                    unread = len(unread_res.scalars().all())
                else:
                    unread_res = await session.execute(
                        select(ChatMessage).where(
                            ChatMessage.room_id == existing.id,
                            ChatMessage.sender_id != me.id,
                        )
                    )
                    unread = len(unread_res.scalars().all())

            other_user = await session.get(User, other_id)
            other_name = other_user.name if other_user else None
            other_role = other_user.role.value if other_user and hasattr(other_user.role, "value") else (str(other_user.role) if other_user else None)

            return _room_enriched(
                existing,
                len(participants),
                last_msg.content[:80] if last_msg else None,
                last_msg.created_at.isoformat() if last_msg else None,
                unread,
                str(other_id),
                other_name,
                other_role,
            )

    # ── Create new room ───────────────────────────────────────────────────
    room = ChatRoom(
        name=body.name,
        room_type=room_type,
        created_by=me.id,
    )
    session.add(room)
    await session.flush()  # populate room.id

    all_participant_ids: set[str] = {str(me.id)} | {p.strip() for p in body.participant_ids}
    valid_other_ids: list[uuid.UUID] = []
    for pid_str in all_participant_ids:
        try:
            pid = uuid.UUID(pid_str)
        except ValueError:
            continue
        session.add(ChatParticipant(room_id=room.id, user_id=pid))
        if pid != me.id:
            valid_other_ids.append(pid)

    # Inject a SYSTEM message marking the room as created
    system_msg = ChatMessage(
        room_id=room.id,
        sender_id=me.id,
        content=f"Secure chat started by {me.name}.",
        message_type=MessageType.SYSTEM,
    )
    session.add(system_msg)

    await session.commit()
    await session.refresh(room)

    # Resolve other participant name for DIRECT rooms
    other_name: Optional[str] = None
    other_role: Optional[str] = None
    other_uuid: Optional[str] = None
    if room_type == RoomType.DIRECT and valid_other_ids:
        other_user = await session.get(User, valid_other_ids[0])
        if other_user:
            other_name = other_user.name
            other_role = other_user.role.value if hasattr(other_user.role, "value") else str(other_user.role)
            other_uuid = str(valid_other_ids[0])

    return _room_enriched(
        room,
        len(all_participant_ids),
        None,   # brand-new room, only the system message exists — don't preview it
        None,
        0,
        other_uuid,
        other_name,
        other_role,
    )


@router.get("/rooms", response_model=list[ChatRoomEnrichedResponse])
async def list_rooms(
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> list[ChatRoomEnrichedResponse]:
    """
    List all chat rooms the current user participates in.

    Each room entry is enriched with:
      - last_message_preview  (last non-deleted, non-system message, truncated to 80 chars)
      - last_message_at       (for client-side time label and sort)
      - unread_count          (messages since last_read_at that weren't sent by the caller)
      - other_participant_name / role  (for DIRECT rooms — used in sidebar and header)

    Sorted by last activity (most recent first), falling back to room creation date.
    """
    room_result = await session.execute(
        select(ChatRoom)
        .join(ChatParticipant, ChatParticipant.room_id == ChatRoom.id)
        .where(ChatParticipant.user_id == me.id)
        .order_by(ChatRoom.created_at.desc())
    )
    rooms = room_result.scalars().all()

    responses: list[ChatRoomEnrichedResponse] = []

    for room in rooms:
        # ── Participant count ──────────────────────────────────────
        part_res = await session.execute(
            select(ChatParticipant).where(ChatParticipant.room_id == room.id)
        )
        participants = part_res.scalars().all()
        participant_count = len(participants)

        # ── Last non-deleted TEXT message ──────────────────────────
        last_msg_res = await session.execute(
            select(ChatMessage)
            .where(
                ChatMessage.room_id == room.id,
                ChatMessage.is_deleted == False,
                ChatMessage.message_type == MessageType.TEXT,
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()
        last_preview = last_msg.content[:80] if last_msg else None
        last_msg_at = last_msg.created_at.isoformat() if last_msg else None

        # ── Unread count ───────────────────────────────────────────
        # Find caller's participant record for last_read_at
        my_part_res = await session.execute(
            select(ChatParticipant).where(
                ChatParticipant.room_id == room.id,
                ChatParticipant.user_id == me.id,
            )
        )
        my_part = my_part_res.scalar_one_or_none()

        unread = 0
        if my_part:
            unread_query = select(ChatMessage).where(
                ChatMessage.room_id == room.id,
                ChatMessage.sender_id != me.id,
                ChatMessage.message_type == MessageType.TEXT,
            )
            if my_part.last_read_at:
                unread_query = unread_query.where(
                    ChatMessage.created_at > _strip_tz(my_part.last_read_at)
                )
            unread_res = await session.execute(unread_query)
            unread = len(unread_res.scalars().all())

        # ── Other participant name/role (DIRECT only) ──────────────
        other_id: Optional[str] = None
        other_name: Optional[str] = None
        other_role: Optional[str] = None

        if room.room_type == RoomType.DIRECT:
            for part in participants:
                if part.user_id != me.id:
                    other_user = await session.get(User, part.user_id)
                    if other_user:
                        other_id = str(part.user_id)
                        other_name = other_user.name
                        other_role = (
                            other_user.role.value
                            if hasattr(other_user.role, "value")
                            else str(other_user.role)
                        )
                    break

        responses.append(
            _room_enriched(
                room,
                participant_count,
                last_preview,
                last_msg_at,
                unread,
                other_id,
                other_name,
                other_role,
            )
        )

    # Sort: rooms with recent messages float to the top
    responses.sort(
        key=lambda r: r.last_message_at or r.created_at,
        reverse=True,
    )

    return responses


@router.patch("/rooms/{room_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_room_read(
    room_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> None:
    """
    Stamp last_read_at = now() for the calling user in this room.
    Called automatically by the frontend when the user opens a room,
    which clears the unread badge for that room in subsequent list_rooms calls.
    """
    result = await session.execute(
        select(ChatParticipant).where(
            ChatParticipant.room_id == room_id,
            ChatParticipant.user_id == me.id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant of this chat room")

    participant.last_read_at = _utcnow()
    session.add(participant)
    await session.commit()


@router.post(
    "/rooms/{room_id}/messages",
    response_model=ChatMessageResponse,
    status_code=201,
)
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

    msg = ChatMessage(
        room_id=room_id,
        sender_id=me.id,
        content=body.content.strip(),
        message_type=MessageType.TEXT,
    )
    session.add(msg)
    await session.commit()
    await session.refresh(msg)
    return _msg_resp(msg, sender_name=me.name)


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
async def get_messages(
    room_id: uuid.UUID,
    since: Optional[str] = Query(
        default=None,
        description="ISO datetime cursor — return only messages AFTER this timestamp. "
                    "Used by the polling loop to fetch only new messages.",
    ),
    before: Optional[str] = Query(
        default=None,
        description="ISO datetime cursor — return messages BEFORE this timestamp "
                    "(oldest-first). Used for infinite-scroll / load-more.",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> list[ChatMessageResponse]:
    """
    Fetch messages for a room.

    Three modes:
      • No cursors  → last `limit` messages (newest → reversed to oldest-first)
      • since=<ISO> → all messages after that timestamp, oldest-first (polling delta)
      • before=<ISO>→ `limit` messages before that timestamp, oldest-first (load more)

    Caller must be a participant. Deleted messages are included with
    content replaced by "[message deleted]".
    """
    await _assert_participant(session, room_id, me.id)

    base_query = select(ChatMessage).where(ChatMessage.room_id == room_id)

    if since:
        try:
            # Normalize timezone representations before parsing:
            # 1. Replace trailing "Z" with "+00:00" (standard fromisoformat form)
            # 2. Replace decoded space with "+" — browsers/httpx percent-encode "+" in
            #    query strings; some URL parsers then decode "%2B" back to "+" but the
            #    raw "+" in a query value is decoded as a space by form-encoding rules,
            #    so "2000-01-01T00:00:00+00:00" arrives as "2000-01-01T00:00:00 00:00".
            since_norm = since.replace("Z", "+00:00").replace(" ", "+")
            since_dt = datetime.fromisoformat(since_norm)
            # Normalize to naive UTC — the DB stores TIMESTAMP WITHOUT TIME ZONE.
            # asyncpg raises DataError when a timezone-aware datetime is bound to
            # a TIMESTAMP WITHOUT TIME ZONE column comparison.
            since_dt = since_dt.replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid 'since' datetime format")
        query = (
            base_query
            .where(ChatMessage.created_at > since_dt)
            .order_by(ChatMessage.created_at.asc())
        )
        result = await session.execute(query)
        msgs = list(result.scalars().all())

    elif before:
        try:
            # Same normalization as `since` above — handle both "Z" suffix and
            # the space-for-plus substitution that happens with URL form-encoding.
            before_norm = before.replace("Z", "+00:00").replace(" ", "+")
            before_dt = datetime.fromisoformat(before_norm)
            # Normalize to naive UTC — same reason as `since_dt` above.
            before_dt = before_dt.replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid 'before' datetime format")
        query = (
            base_query
            .where(ChatMessage.created_at < before_dt)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(query)
        msgs = list(result.scalars().all())
        msgs.reverse()  # return oldest-first

    else:
        # Initial load: last `limit` messages, returned oldest-first
        query = (
            base_query
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        result = await session.execute(query)
        msgs = list(result.scalars().all())
        msgs.reverse()

    # Resolve sender names in one pass (cache by UUID to avoid redundant lookups)
    name_cache: dict[uuid.UUID, Optional[str]] = {}
    responses: list[ChatMessageResponse] = []
    for msg in msgs:
        if msg.sender_id not in name_cache:
            name_cache[msg.sender_id] = await _resolve_user_name(session, msg.sender_id)
        responses.append(_msg_resp(msg, name_cache[msg.sender_id]))

    return responses


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
    """
    Admin-only soft delete: marks a TEXT message as deleted.
    SYSTEM messages are immutable and cannot be deleted even by admins.
    """
    msg = await session.get(ChatMessage, message_id)
    if not msg or msg.room_id != room_id:
        raise HTTPException(status_code=404, detail="Message not found")

    msg_type = msg.message_type.value if hasattr(msg.message_type, "value") else str(msg.message_type)
    if msg_type == MessageType.SYSTEM.value:
        raise HTTPException(
            status_code=403,
            detail="System messages cannot be deleted",
        )

    msg.is_deleted = True
    msg.deleted_by = admin.id
    msg.deleted_at = _utcnow()
    session.add(msg)
    await session.commit()


@router.get("/users/searchable", response_model=list[ChatUserResult])
async def searchable_users(
    q: str = Query(default="", description="Partial name search (case-insensitive)"),
    session: AsyncSession = Depends(get_session),
    me: User = Depends(get_current_user),
) -> list[ChatUserResult]:
    """
    Return users the caller is allowed to start a chat with.

    Visibility rules (enforced server-side):
      PATIENT → only their linked doctors (prevents unsolicited patient→patient chat)
      DOCTOR  → their linked patients + all other verified doctors (peer consult)
      ADMIN   → all active users

    Each result includes a display_label for rendering in the search combobox:
      Doctor  → "Dr. Sarah Chen · Cardiology"
      Patient → "John Smith · Patient"
      Admin   → "Admin Name · Admin"
    """
    results: list[ChatUserResult] = []
    q_lower = q.strip().lower()

    def _name_matches(name: str) -> bool:
        return not q_lower or q_lower in name.lower()

    # ── PATIENT: only see their linked doctors ────────────────────────────
    if me.role == UserRole.PATIENT:
        pat_res = await session.execute(
            select(PatientProfile).where(PatientProfile.user_id == me.id)
        )
        patient_profile = pat_res.scalar_one_or_none()
        if not patient_profile:
            return []  # No profile yet — no contacts available

        # Get linked doctor profiles
        mapping_res = await session.execute(
            select(PatientDoctorMapping)
            .where(
                PatientDoctorMapping.patient_id == patient_profile.id,
                PatientDoctorMapping.status == MappingStatus.ACTIVE,
            )
        )
        mappings = mapping_res.scalars().all()

        for m in mappings:
            doc_res = await session.execute(
                select(DoctorProfile).where(DoctorProfile.id == m.doctor_id)
            )
            doc_profile = doc_res.scalar_one_or_none()
            if not doc_profile:
                continue
            doc_user = await session.get(User, doc_profile.user_id)
            if not doc_user or not doc_user.is_active:
                continue
            full_name = f"{doc_profile.first_name} {doc_profile.last_name}"
            if not _name_matches(full_name):
                continue
            results.append(ChatUserResult(
                id=str(doc_user.id),
                name=full_name,
                role="DOCTOR",
                display_label=f"Dr. {doc_profile.first_name} {doc_profile.last_name} · {doc_profile.specialization}",
            ))

    # ── DOCTOR: linked patients + all other doctors ───────────────────────
    elif me.role == UserRole.DOCTOR:
        doc_res = await session.execute(
            select(DoctorProfile).where(DoctorProfile.user_id == me.id)
        )
        doctor_profile = doc_res.scalar_one_or_none()

        # Linked patients
        if doctor_profile:
            mapping_res = await session.execute(
                select(PatientDoctorMapping)
                .where(
                    PatientDoctorMapping.doctor_id == doctor_profile.id,
                    PatientDoctorMapping.status == MappingStatus.ACTIVE,
                )
            )
            mappings = mapping_res.scalars().all()

            for m in mappings:
                pat_profile_res = await session.execute(
                    select(PatientProfile).where(PatientProfile.id == m.patient_id)
                )
                pat_profile = pat_profile_res.scalar_one_or_none()
                if not pat_profile:
                    continue
                pat_user = await session.get(User, pat_profile.user_id)
                if not pat_user or not pat_user.is_active:
                    continue
                full_name = f"{pat_profile.first_name} {pat_profile.last_name}"
                if not _name_matches(full_name):
                    continue
                results.append(ChatUserResult(
                    id=str(pat_user.id),
                    name=full_name,
                    role="PATIENT",
                    display_label=f"{full_name} · Patient",
                ))

        # All other doctors (peer consult) — query User table directly so that
        # doctors who signed up but haven't created a DoctorProfile yet are still
        # visible.  We enrich with DoctorProfile when available for a richer label.
        all_docs_res = await session.execute(
            select(User).where(User.role == UserRole.DOCTOR, User.id != me.id, User.is_active == True)
        )
        all_doc_users = all_docs_res.scalars().all()

        # Build a profile map keyed by user_id for O(1) lookups
        all_profiles_res = await session.execute(select(DoctorProfile))
        profile_map: dict = {dp.user_id: dp for dp in all_profiles_res.scalars().all()}

        for doc_user in all_doc_users:
            # Avoid duplicates (e.g. linked patients who are also doctors — edge case)
            if any(r.id == str(doc_user.id) for r in results):
                continue
            dp = profile_map.get(doc_user.id)
            if dp:
                full_name = f"{dp.first_name} {dp.last_name}"
                display_label = f"Dr. {dp.first_name} {dp.last_name} · {dp.specialization}"
            else:
                full_name = doc_user.name
                display_label = f"{doc_user.name} · Doctor"
            if not _name_matches(full_name):
                continue
            results.append(ChatUserResult(
                id=str(doc_user.id),
                name=full_name,
                role="DOCTOR",
                display_label=display_label,
            ))

    # ── ADMIN: all active users ───────────────────────────────────────────
    else:
        all_users_res = await session.execute(
            select(User).where(User.is_active == True, User.id != me.id)
        )
        all_users = all_users_res.scalars().all()

        for u in all_users:
            if not _name_matches(u.name):
                continue
            role_str = u.role.value if hasattr(u.role, "value") else str(u.role)

            # Build a richer label for doctors
            label = f"{u.name} · {role_str.capitalize()}"
            if u.role == UserRole.DOCTOR:
                doc_p_res = await session.execute(
                    select(DoctorProfile).where(DoctorProfile.user_id == u.id)
                )
                dp = doc_p_res.scalar_one_or_none()
                if dp:
                    label = f"Dr. {dp.first_name} {dp.last_name} · {dp.specialization}"

            results.append(ChatUserResult(
                id=str(u.id),
                name=u.name,
                role=role_str,
                display_label=label,
            ))

    # Sort alphabetically by display_label for consistent UX
    results.sort(key=lambda r: r.display_label.lower())
    return results
