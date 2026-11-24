"""Add reels tables for video feature

Revision ID: 7a8b9c0d1e2f
Revises: 6a2b1c4d5e7f
Create Date: 2026-11-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, Sequence[str], None] = '6a2b1c4d5e7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema to add reels tables."""
    # Create reels table
    op.create_table(
        'reels',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('author_id', sa.Integer(), nullable=False, index=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('thumbnail_url', sa.String(255), nullable=True),
        sa.Column('privacy', sa.String(20), nullable=False, server_default='public'),
        sa.Column('likes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('comments_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(), nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, index=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_reels_author_id'), 'reels', ['author_id'], unique=False)
    op.create_index(op.f('ix_reels_expires_at'), 'reels', ['expires_at'], unique=False)
    op.create_index(op.f('ix_reels_created_at'), 'reels', ['created_at'], unique=False)

    # Create reel_reactions table
    op.create_table(
        'reel_reactions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reel_id', sa.Integer(), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('reaction_type', sa.String(20), nullable=False, server_default='like'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['reel_id'], ['reels.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('reel_id', 'user_id', name='uq_reel_reaction_user'),
    )
    op.create_index(op.f('ix_reel_reactions_reel_id'), 'reel_reactions', ['reel_id'], unique=False)
    op.create_index(op.f('ix_reel_reactions_user_id'), 'reel_reactions', ['user_id'], unique=False)

    # Create reel_comments table
    op.create_table(
        'reel_comments',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('reel_id', sa.Integer(), nullable=False, index=True),
        sa.Column('author_id', sa.Integer(), nullable=False, index=True),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['reel_id'], ['reels.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['reel_comments.id'], ondelete='CASCADE'),
    )
    op.create_index(op.f('ix_reel_comments_reel_id'), 'reel_comments', ['reel_id'], unique=False)
    op.create_index(op.f('ix_reel_comments_author_id'), 'reel_comments', ['author_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('reel_comments')
    op.drop_table('reel_reactions')
    op.drop_table('reels')