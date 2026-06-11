"""
Booking repository for OrbitPMS.

Implements data access layer for the bookings table with full
CRUD operations, date-range queries, and availability checks.
"""

import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import and_, delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking


class BookingRepository:
    """Repository for Booking database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        guest_name: str,
        room_id: uuid.UUID,
        check_in_date: date,
        check_out_date: date,
        guest_email: str | None = None,
        guest_phone: str | None = None,
        created_by: uuid.UUID | None = None,
        total_amount: Decimal | None = None,
    ) -> Booking:
        """Create a new booking record.

        Args:
            guest_name: Full name of the guest.
            room_id: UUID of the booked room.
            check_in_date: Check-in date.
            check_out_date: Check-out date.
            guest_email: Optional guest email.
            guest_phone: Optional guest phone.
            created_by: Optional UUID of the staff member creating this booking.
            total_amount: Optional pre-calculated total amount.

        Returns:
            The newly created Booking ORM instance.
        """
        booking = Booking(
            guest_name=guest_name,
            guest_email=guest_email,
            guest_phone=guest_phone,
            room_id=room_id,
            check_in_date=check_in_date,
            check_out_date=check_out_date,
            created_by=created_by,
            total_amount=total_amount,
        )
        self._session.add(booking)
        await self._session.flush()
        await self._session.refresh(booking)
        return booking

    async def get_by_id(self, booking_id: uuid.UUID) -> Booking | None:
        """Fetch a booking by its primary key."""
        return await self._session.get(Booking, booking_id)

    async def get_all(
        self,
        status: str | None = None,
        room_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Booking]:
        """Fetch all bookings with optional filters.

        Args:
            status: Optional filter by booking status.
            room_id: Optional filter by room UUID.
            date_from: Optional start date filter (bookings on or after).
            date_to: Optional end date filter (bookings on or before).
            skip: Number of records to skip (pagination).
            limit: Maximum number of records to return.

        Returns:
            A list of matching Booking instances.
        """
        query = select(Booking)

        filters = []
        if status is not None:
            filters.append(Booking.booking_status == status)
        if room_id is not None:
            filters.append(Booking.room_id == room_id)
        if date_from is not None:
            filters.append(Booking.check_in_date >= date_from)
        if date_to is not None:
            filters.append(Booking.check_out_date <= date_to)

        if filters:
            query = query.where(and_(*filters))

        query = query.order_by(Booking.check_in_date).offset(skip).limit(limit)

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def get_active_bookings_for_room(
        self,
        room_id: uuid.UUID,
        check_in: date,
        check_out: date,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> list[Booking]:
        """Find bookings that overlap with a given date range for a room.

        Used for availability checks. Two date ranges overlap when
        one starts before the other ends and vice versa.

        Args:
            room_id: The room to check.
            check_in: Proposed check-in date.
            check_out: Proposed check-out date.
            exclude_booking_id: Optional booking ID to exclude (for updates).

        Returns:
            A list of overlapping active (non-cancelled) bookings.
        """
        # Active statuses that block availability
        active_statuses = ["confirmed", "checked_in"]

        filters = [
            Booking.room_id == room_id,
            Booking.booking_status.in_(active_statuses),
            Booking.check_in_date < check_out,
            Booking.check_out_date > check_in,
        ]

        if exclude_booking_id is not None:
            filters.append(Booking.id != exclude_booking_id)

        query = select(Booking).where(and_(*filters))
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        booking_id: uuid.UUID,
        **kwargs,
    ) -> Booking | None:
        """Update a booking record with the given keyword arguments.

        Only provided fields are updated. Returns the updated
        Booking instance, or None if the booking does not exist.

        Args:
            booking_id: The UUID of the booking to update.
            **kwargs: Fields to update (guest_name, check_in_date, etc.).

        Returns:
            The updated Booking, or None if not found.
        """
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        if not update_data:
            return await self.get_by_id(booking_id)

        valid_columns = {c.name for c in Booking.__table__.columns}
        update_data = {
            k: v for k, v in update_data.items() if k in valid_columns
        }

        if not update_data:
            return await self.get_by_id(booking_id)

        stmt = (
            update(Booking)
            .where(Booking.id == booking_id)
            .values(**update_data)
            .returning(Booking)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalars().first()

    async def delete(self, booking_id: uuid.UUID) -> bool:
        """Delete a booking record.

        Args:
            booking_id: The UUID of the booking to delete.

        Returns:
            True if a booking was deleted, False otherwise.
        """
        stmt = (
            delete(Booking)
            .where(Booking.id == booking_id)
            .returning(Booking.id)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalars().first() is not None


