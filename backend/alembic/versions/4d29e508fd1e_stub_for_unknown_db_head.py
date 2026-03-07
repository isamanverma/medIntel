"""stub_for_unknown_db_head

This is a stub migration that represents a revision already applied to the
live database (4d29e508fd1e) but missing from the local versions directory.
It performs no schema changes — its sole purpose is to restore the Alembic
revision chain so that subsequent migrations can be applied correctly.

Revision ID: 4d29e508fd1e
Revises: ef20aeb66406
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d29e508fd1e'
down_revision: Union[str, Sequence[str], None] = 'ef20aeb66406'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op — this revision was already applied directly to the database."""
    pass


def downgrade() -> None:
    """No-op — nothing to undo."""
    pass
