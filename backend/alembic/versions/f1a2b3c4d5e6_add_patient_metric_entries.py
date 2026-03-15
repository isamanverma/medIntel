"""add_patient_metric_entries

Revision ID: f1a2b3c4d5e6
Revises: c7e8f9a0b1c2
Create Date: 2026-03-15 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "c7e8f9a0b1c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "patient_metric_entries",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("metric_type", sa.String(length=50), nullable=False),
        sa.Column("value", sa.String(length=64), nullable=False),
        sa.Column("unit", sa.String(length=20), nullable=False),
        sa.Column("numeric_value", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patient_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_patient_metric_entries_patient_id",
        "patient_metric_entries",
        ["patient_id"],
        unique=False,
    )
    op.create_index(
        "ix_patient_metric_entries_metric_type",
        "patient_metric_entries",
        ["metric_type"],
        unique=False,
    )
    op.create_index(
        "ix_patient_metric_entries_recorded_at",
        "patient_metric_entries",
        ["recorded_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_patient_metric_entries_recorded_at", table_name="patient_metric_entries")
    op.drop_index("ix_patient_metric_entries_metric_type", table_name="patient_metric_entries")
    op.drop_index("ix_patient_metric_entries_patient_id", table_name="patient_metric_entries")
    op.drop_table("patient_metric_entries")
