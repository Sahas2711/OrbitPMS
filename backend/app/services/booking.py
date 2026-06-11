"""
Booking service for OrbitPMS.

Implements core business logic for booking management including
room availability checks, date validation, duplicate detection,
and lifecycle status transitions.
"""

import logging
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RoomStatus
from app.models.user import User
from app.repositories.booking import BookingRepository
from app.repositories.room import RoomRepository
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdate

logger = logging.getLogger(__name__)


class BookingService:
    """Service layer for booking operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = BookingRepository(session)
        self._room_repo = RoomRepository(session)

    # ── Audit helpers ──────────────────────────────────────────────

    @staticmethod
    def _audit_log(
        action: str,
        details: dict,
        actor: User | None = None,
    ) -> None:
        """Emit a structured audit log entry."""
        actor_identity = f"{actor.email} ({actor.role})" if actor else "system"
        details_str = " | ".join(f"{k}={v}" for k, v in details.items())
        logger.info(
            "AUDIT: %s — actor=%s [%s]",
            action,
            actor_identity,
            details_str,
        )

    # ── Availability check ────────────────────────────────────────

    async def _check_room_availability(
        self,
        room_id: uuid.UUID,
        check_in: date,
        check_out: date,
        exclude_booking_id: uuid.UUID | None = None,
    ) -> None:
        """Verify the room exists and is available for the date range.

        Args:
            room_id: The UUID of the room.
            check_in: Proposed check-in date.
            check_out: Proposed check-out date.
            exclude_booking_id: Optional booking ID to exclude (for updates).

        Raises:
            ValueError: If the room doesn't exist, is under maintenance,
                or has conflicting bookings.
        """
        # 1. Check room exists and is not in maintenance
        room = await self._room_repo.get_by_id(room_id)
        if room is None:
            raise ValueError(f"Room with id '{room_id}' not found.")

        if room.status == RoomStatus.MAINTENANCE:
            raise ValueError(
                f"Room '{room.room_number}' is currently under maintenance "
                f"and cannot be booked."
            )

        # 2. Check for date conflicts
        conflicts = await self._repo.get_active_bookings_for_room(
            room_id=room_id,
            check_in=check_in,
            check_out=check_out,
            exclude_booking_id=exclude_booking_id,
        )

        if conflicts:
            raise ValueError(
                f"Room '{room.room_number}' is already booked "
                f"during the requested dates."
            )

    # ── CRUD operations ───────────────────────────────────────────

    async def create_booking(
        self,
        request: BookingCreate,
        actor: User | None = None,
    ) -> BookingResponse:
        """Create a new booking.

        Validates room availability for the requested dates
        before creating the booking record.

        Args:
            request: Validated booking creation payload.
            actor: The user creating the booking (for audit logging).

        Returns:
            A BookingResponse with the created booking's data.

        Raises:
            ValueError: If the room is unavailable or not found.
        """
        # 1. Check room availability
        await self._check_room_availability(
            room_id=request.room_id,
            check_in=request.check_in_date,
            check_out=request.check_out_date,
        )

        # 2. Calculate total amount (nights × price)
        nights = (request.check_out_date - request.check_in_date).days
        room = await self._room_repo.get_by_id(request.room_id)
        total_amount: Decimal | None = None
        if room and nights > 0:
            total_amount = room.price_per_night * nights

        # 3. Create the booking with pre-calculated total
        booking = await self._repo.create(
            guest_name=request.guest_name,
            guest_email=request.guest_email,
            guest_phone=request.guest_phone,
            room_id=request.room_id,
            check_in_date=request.check_in_date,
            check_out_date=request.check_out_date,
            created_by=actor.id if actor else None,
            total_amount=total_amount,
        )

        self._audit_log(
            "booking.create",
            {
                "booking_id": str(booking.id),
                "guest": booking.guest_name,
                "room_id": str(booking.room_id),
                "check_in": booking.check_in_date.isoformat(),
                "check_out": booking.check_out_date.isoformat(),
                "total_amount": str(booking.total_amount) if booking.total_amount else "0",
            },
            actor=actor,
        )

        return self._to_response(booking)

    async def get_booking(self, booking_id: uuid.UUID) -> BookingResponse:
        """Get a single booking by ID.

        Args:
            booking_id: The UUID of the booking.

        Returns:
            A BookingResponse with the booking's data.

        Raises:
            ValueError: If the booking does not exist.
        """
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise ValueError(f"Booking with id '{booking_id}' not found.")
        return self._to_response(booking)

    async def get_all_bookings(
        self,
        status: str | None = None,
        room_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[BookingResponse]:
        """Fetch all bookings with optional filters.

        Args:
            status: Optional filter by booking status.
            room_id: Optional filter by room UUID.
            date_from: Optional start date filter.
            date_to: Optional end date filter.
            skip: Number of records to skip.
            limit: Maximum records to return.

        Returns:
            A list of BookingResponse DTOs.
        """
        bookings = await self._repo.get_all(
            status=status,
            room_id=room_id,
            date_from=date_from,
            date_to=date_to,
            skip=skip,
            limit=limit,
        )
        return [self._to_response(b) for b in bookings]

    async def update_booking(
        self,
        booking_id: uuid.UUID,
        request: BookingUpdate,
        actor: User | None = None,
    ) -> BookingResponse:
        """Update an existing booking.

        Re-validates room availability if dates are changed.
        Checks for date conflicts excluding the current booking.

        Args:
            booking_id: The UUID of the booking to update.
            request: Validated partial update payload.
            actor: The user updating the booking (for audit logging).

        Returns:
            A BookingResponse with the updated booking's data.

        Raises:
            ValueError: If the booking does not exist, or the
                update causes a date conflict.
        """
        # 1. Verify booking exists
        existing = await self._repo.get_by_id(booking_id)
        if existing is None:
            raise ValueError(f"Booking with id '{booking_id}' not found.")

        # 2. If dates are changing, re-check availability
        new_check_in = request.check_in_date or existing.check_in_date
        new_check_out = request.check_out_date or existing.check_out_date

        if (
            request.check_in_date is not None
            or request.check_out_date is not None
        ):
            if new_check_out <= new_check_in:
                raise ValueError(
                    "Check-out date must be after check-in date"
                )
            await self._check_room_availability(
                room_id=existing.room_id,
                check_in=new_check_in,
                check_out=new_check_out,
                exclude_booking_id=booking_id,
            )

        # 3. Update the booking
        booking = await self._repo.update(
            booking_id=booking_id,
            guest_name=request.guest_name,
            guest_email=request.guest_email,
            guest_phone=request.guest_phone,
            check_in_date=request.check_in_date,
            check_out_date=request.check_out_date,
            booking_status=request.booking_status,
        )

        assert booking is not None

        # 4. Recalculate total amount if dates changed
        if request.check_in_date is not None or request.check_out_date is not None:
            await self._recalculate_total(booking)

        # 5. If status changed to cancelled, release room availability
        if request.booking_status == "cancelled":
            logger.info(
                "Booking cancelled: id=%s room=%s",
                booking_id,
                booking.room_id,
            )

        self._audit_log(
            "booking.update",
            {
                "booking_id": str(booking_id),
                "guest": booking.guest_name,
                "changes": str(request.model_dump(exclude_none=True)),
            },
            actor=actor,
        )

        return self._to_response(booking)

    async def delete_booking(
        self,
        booking_id: uuid.UUID,
        actor: User | None = None,
    ) -> None:
        """Delete a booking.

        Args:
            booking_id: The UUID of the booking to delete.
            actor: The user deleting the booking (for audit logging).

        Raises:
            ValueError: If the booking does not exist.
        """
        booking = await self._repo.get_by_id(booking_id)
        if booking is None:
            raise ValueError(f"Booking with id '{booking_id}' not found.")

        await self._repo.delete(booking_id)

        self._audit_log(
            "booking.delete",
            {
                "booking_id": str(booking_id),
                "guest": booking.guest_name,
                "room_id": str(booking.room_id),
            },
            actor=actor,
        )

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _to_response(booking) -> BookingResponse:
        """Map a Booking ORM instance to a BookingResponse DTO."""
        return BookingResponse(
            id=booking.id,
            guest_name=booking.guest_name,
            guest_email=booking.guest_email,
            guest_phone=booking.guest_phone,
            room_id=booking.room_id,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
            booking_status=booking.booking_status,
            total_amount=booking.total_amount,
            created_by=booking.created_by,
            created_at=booking.created_at,
        )

    async def _recalculate_total(self, booking) -> None:
        """Recalculate total_amount based on nights × room price."""
        room = await self._room_repo.get_by_id(booking.room_id)
        if room is None:
            return

        nights = (booking.check_out_date - booking.check_in_date).days
        if nights > 0:
            new_total = room.price_per_night * nights
            await self._repo.update(
                booking_id=booking.id,
                total_amount=new_total,
            )
            booking.total_amount = new_total
