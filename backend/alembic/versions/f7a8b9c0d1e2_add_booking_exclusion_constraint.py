"""add_booking_exclusion_constraint

Adds a PostgreSQL EXCLUDE constraint using GiST to prevent overlapping
bookings for the same room at the database level. This is a safety net
on top of the application-level overlap detection.

The constraint uses daterange with inclusive bounds '[]' so that
back-to-back bookings (e.g. check-out Jul 5, check-in Jul 5) are allowed.

A partial WHERE clause ensures cancelled and checked-out bookings are
excluded from the constraint, freeing those date ranges for new bookings.

Requires the btree_gist extension for GiST index support on UUID (= operator).

Revision ID: f7a8b9c0d1e2
Revises: 77d46ddb124d
Create Date: 2026-06-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7a8b9c0d1e2'
down_revision: Union[str, Sequence[str], None] = '77d46ddb124d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Enable btree_gist extension (provides GiST operator classes for
    #    B-tree types like UUID, needed for the EXCLUDE constraint's '=')
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # 2. Add EXCLUDE constraint to prevent overlapping bookings per room.
    #    - room_id WITH =   → rooms are compared by equality
    #    - daterange(check_in_date, check_out_date, '[]') WITH && → ranges must not overlap
    #    - Partial: only enforces for non-cancelled / non-checked-out bookings
    op.execute("""
        ALTER TABLE bookings
        ADD CONSTRAINT EXCLUDE_booking_room_date_overlap
        EXCLUDE USING gist (
            room_id WITH =,
            daterange(check_in_date, check_out_date, '[]') WITH &&
        ) WHERE (booking_status NOT IN ('CANCELLED', 'CHECKED_OUT'))
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS EXCLUDE_booking_room_date_overlap")
