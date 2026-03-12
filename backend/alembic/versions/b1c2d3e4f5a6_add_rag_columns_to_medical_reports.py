"""add_rag_columns_to_medical_reports

Adds file_name, file_type, page_index_tree (JSONB), and ai_insights (JSONB)
columns to the medical_reports table to support the PageIndex RAG feature.

Revision ID: b1c2d3e4f5a6
Revises: ef20aeb66406
Create Date: 2026-03-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = '3638fa1e8719'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add RAG-related columns to medical_reports."""
    op.add_column(
        'medical_reports',
        sa.Column('file_name', sa.String(length=255), nullable=True),
    )
    op.add_column(
        'medical_reports',
        sa.Column('file_type', sa.String(length=100), nullable=True),
    )
    op.add_column(
        'medical_reports',
        sa.Column(
            'page_index_tree',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.add_column(
        'medical_reports',
        sa.Column(
            'ai_insights',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Remove RAG-related columns from medical_reports."""
    op.drop_column('medical_reports', 'ai_insights')
    op.drop_column('medical_reports', 'page_index_tree')
    op.drop_column('medical_reports', 'file_type')
    op.drop_column('medical_reports', 'file_name')
