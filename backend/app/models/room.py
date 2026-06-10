"""
Room model for OrbitPMS.

Represents hotel rooms with their type, pricing, and availability status.
"""

import uuid

from decimal import Decimal

from sqlalchemy import CheckConstraint, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import RoomStatus
from app.database.base import Base, TimestampMixin


class Room(Base, TimestampMixin):
    __tablename__ = "rooms"

    __table_args__ = (
        CheckConstraint(
            "price_per_night > 0",
            name="ck_room_price_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    room_number: Mapped[str] = mapped_column(
        String(10),
        unique=True,
        index=True,
        nullable=False,
    )
    room_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    price_per_night: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    status: Mapped[RoomStatus] = mapped_column(
        default=RoomStatus.AVAILABLE,
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    bookings: Mapped[list["Booking"]] = relationship(
        "Booking",
        back_populates="room",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Room(id={self.id}, number={self.room_number}, "
            f"type={self.room_type}, status={self.status})>"
        )


# Explicit indexes
Index("ix_rooms_status", Room.status)
