"""chat_ux_last_read_at_message_type

Adds two new columns to the chat tables to support the Phase 5c UX improvements:

  chat_participants.last_read_at  — nullable DateTime, tracks when each user last
                                    read a room so the frontend can compute unread
                                    counts without a separate table.

  chat_messages.message_type      — non-nullable Enum('TEXT','SYSTEM'), defaults to
                                    'TEXT'. SYSTEM messages are auto-generated event
                                    markers (e.g. "Chat started by Dr. Smith") and
                                    are rendered as centred pills in the UI rather
                                    than chat bubbles. They cannot be soft-deleted
                                    even by admins.

Both columns are backward-compatible:
  - last_read_at  defaults to NULL   → existing rows unaffected
  - message_type  has a server-side default of 'TEXT' → existing rows unaffected

Revision ID: 3638fa1e8719
Revises: a3f1c2d4e5b6
Create Date: 2026-03-08 01:24:23.580541
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------

revision: str = "3638fa1e8719"
down_revision: Union[str, Sequence[str], None] = "a3f1c2d4e5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ---------------------------------------------------------------------------
# Enum definition
# ---------------------------------------------------------------------------

# Define the enum type outside upgrade/downgrade so both functions can
# reference the same object.
messagetype_enum = sa.Enum("TEXT", "SYSTEM", name="messagetype")


def upgrade() -> None:
    """Apply schema additions."""

    # 1. Create the messagetype enum type in Postgres (if it doesn't exist yet)
    messagetype_enum.create(op.get_bind(), checkfirst=True)

    # 2. Add message_type to chat_messages
    #    server_default='TEXT' ensures every pre-existing row gets the correct
    #    value without a data migration step.
    op.add_column(
        "chat_messages",
        sa.Column(
            "message_type",
            messagetype_enum,
            nullable=False,
            server_default="TEXT",
        ),
    )

    # 3. Add last_read_at to chat_participants
    #    Nullable — NULL means the user has never opened this room (= all
    #    messages are unread).
    op.add_column(
        "chat_participants",
        sa.Column(
            "last_read_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Revert schema additions."""

    # Remove the two columns in reverse order
    op.drop_column("chat_participants", "last_read_at")
    op.drop_column("chat_messages", "message_type")

    # Drop the enum type only after the column that uses it is gone
    messagetype_enum.drop(op.get_bind(), checkfirst=True)
