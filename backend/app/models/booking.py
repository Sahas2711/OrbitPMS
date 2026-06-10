"""
Booking model for OrbitPMS.

Tracks reservations including guest information, room assignment,
check-in/out dates, and billing status. Links users (staff who created
the booking) to rooms.
"""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import BookingStatus
from app.database.base import Base, TimestampMixin


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    __table_args__ = (
        CheckConstraint(
            "check_out_date > check_in_date",
            name="ck_booking_dates_valid",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    guest_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )
    guest_email: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    guest_phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False,
    )
    check_in_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    check_out_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    booking_status: Mapped[BookingStatus] = mapped_column(
        default=BookingStatus.CONFIRMED,
        nullable=False,
    )
    total_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    created_by_user: Mapped["User"] = relationship(
        "User",
        back_populates="bookings",
        lazy="selectin",
    )
    room: Mapped["Room"] = relationship(
        "Room",
        back_populates="bookings",
        lazy="selectin",
    )
    invoice: Mapped["Invoice"] = relationship(
        "Invoice",
        back_populates="booking",
        uselist=False,
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Booking(id={self.id}, guest={self.guest_name}, "
            f"status={self.booking_status})>"
        )


# Explicit indexes
Index("ix_bookings_room_id", Booking.room_id)
Index("ix_bookings_booking_status", Booking.booking_status)
