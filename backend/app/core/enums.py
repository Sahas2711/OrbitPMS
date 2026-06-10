"""
Enum definitions for OrbitPMS.

All enums are str-based for seamless integration with
PostgreSQL ENUM types and Pydantic schemas.
"""

from enum import Enum


class UserRole(str, Enum):
    """Role-based access control levels."""

    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    STAFF = "staff"


class RoomStatus(str, Enum):
    """Availability status of a room."""

    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"


class BookingStatus(str, Enum):
    """Lifecycle states of a booking."""

    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
