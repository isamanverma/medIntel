"""add_condition_description_and_tags_to_patient_profiles

Revision ID: a3f1c2d4e5b6
Revises: 4d29e508fd1e
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f1c2d4e5b6'
down_revision: Union[str, Sequence[str], None] = '4d29e508fd1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add condition_description (TEXT) and condition_tags (JSON) to patient_profiles."""
    op.add_column(
        'patient_profiles',
        sa.Column('condition_description', sa.Text(), nullable=True),
    )
    op.add_column(
        'patient_profiles',
        sa.Column('condition_tags', sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    """Remove condition_description and condition_tags from patient_profiles."""
    op.drop_column('patient_profiles', 'condition_tags')
    op.drop_column('patient_profiles', 'condition_description')
