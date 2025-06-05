"""add unaccent extension

Revision ID: 0e4c3de4684b
Revises: f0a8ff2aee62
Create Date: 2025-06-05 11:36:01.866774

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e4c3de4684b'
down_revision: Union[str, None] = 'f0a8ff2aee62'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent;")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS unaccent;")
