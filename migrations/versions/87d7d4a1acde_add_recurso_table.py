"""add recurso table

Revision ID: 87d7d4a1acde
Revises: 40dcacf7189b
Create Date: 2025-07-01 18:33:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '87d7d4a1acde'
down_revision = '40dcacf7189b'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'recursos',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('nome', sa.String(length=50), nullable=False, unique=True),
    )


def downgrade():
    op.drop_table('recursos')

