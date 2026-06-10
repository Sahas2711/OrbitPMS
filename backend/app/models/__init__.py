"""
Model registry for OrbitPMS.

All models must be imported here so Alembic's autogenerate
can discover them and detect schema changes.

Usage:
    from app.models import Base, User, Room, Booking, Invoice
"""

from app.database.base import Base
from app.models.user import User
from app.models.room import Room
from app.models.booking import Booking
from app.models.invoice import Invoice

__all__ = [
    "Base",
    "User",
    "Room",
    "Booking",
    "Invoice",
]
