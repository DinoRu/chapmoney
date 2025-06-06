"""change reference

Revision ID: f0a8ff2aee62
Revises: 517ae2888239
Create Date: 2025-06-04 00:21:24.160353

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0a8ff2aee62'
down_revision: Union[str, None] = '517ae2888239'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('onesignal_player_id', sa.VARCHAR(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'onesignal_player_id')
    # ### end Alembic commands ###
