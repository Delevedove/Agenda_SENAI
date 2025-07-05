"""add classe_icone column to laboratorios again

Revision ID: 84ae848229ac
Revises: 3644e171a2a1
Create Date: 2025-07-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '84ae848229ac'
down_revision = '3644e171a2a1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('laboratorios') as batch_op:
        batch_op.add_column(sa.Column('classe_icone', sa.String(length=50), nullable=True))


def downgrade():
    with op.batch_alter_table('laboratorios') as batch_op:
        batch_op.drop_column('classe_icone')
