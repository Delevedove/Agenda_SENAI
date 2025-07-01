"""add sala_recursos association table

Revision ID: 54b949b864a2
Revises: 87d7d4a1acde
Create Date: 2025-07-01 19:05:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '54b949b864a2'
down_revision = '87d7d4a1acde'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sala_recursos',
        sa.Column('sala_id', sa.Integer(), nullable=False),
        sa.Column('recurso_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['sala_id'], ['salas.id']),
        sa.ForeignKeyConstraint(['recurso_id'], ['recursos.id']),
        sa.PrimaryKeyConstraint('sala_id', 'recurso_id')
    )
    with op.batch_alter_table('salas') as batch_op:
        batch_op.drop_column('recursos')


def downgrade():
    with op.batch_alter_table('salas') as batch_op:
        batch_op.add_column(sa.Column('recursos', sa.JSON()))
    op.drop_table('sala_recursos')
