"""
Availability service for OrbitPMS.

Aggregates room availability data across all rooms for a given month,
computing daily status (available, booked, or maintenance) for use
in the occupancy calendar.
"""

import logging
from calendar import monthrange
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import RoomStatus
from app.repositories.booking import BookingRepository
from app.repositories.room import RoomRepository
from app.schemas.availability import (
    AvailabilitySummary,
    DailyAvailability,
    MonthAvailabilityResponse,
    RoomAvailability,
)

logger = logging.getLogger(__name__)


class AvailabilityService:
    """Service layer for availability aggregation."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._room_repo = RoomRepository(session)
        self._booking_repo = BookingRepository(session)

    async def get_monthly_availability(
        self,
        year: int,
        month: int,
    ) -> MonthAvailabilityResponse:
        """Aggregate availability for every room across an entire month.

        For each room and each day in the month, computes whether the room
        is available, booked (covered by an active booking), or in maintenance.

        Args:
            year: The calendar year (e.g. 2026).
            month: The calendar month (1-12).

        Returns:
            A MonthAvailabilityResponse with per-room daily data and
            summary statistics.
        """
        # 1. Determine the date range for the requested month
        days_in_month = monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, days_in_month)

        # The exclusive upper bound for overlap queries (start of next day
        # after the last day) so that check-out dates on the last day are
        # included as "not booked" for the first of the next month.
        query_end = end_date + timedelta(days=1)

        # 2. Fetch all rooms and active bookings
        rooms = await self._room_repo.get_all()
        bookings = await self._booking_repo.get_active_bookings_in_range(
            date_from=start_date,
            date_to=query_end,
        )

        # 3. Group bookings by room_id for efficient lookup
        bookings_by_room: dict = defaultdict(list)
        for booking in bookings:
            bookings_by_room[booking.room_id].append(booking)

        # 4. Build per-room availability data
        room_data: list[RoomAvailability] = []
        summary_booked = 0
        summary_maintenance = 0

        for room in rooms:
            room_bookings = bookings_by_room.get(room.id, [])
            daily: list[DailyAvailability] = []

            is_in_maintenance = room.status == RoomStatus.MAINTENANCE
            if is_in_maintenance:
                summary_maintenance += 1

            for day_offset in range(days_in_month):
                current_date = start_date + timedelta(days=day_offset)
                day = current_date.day

                if is_in_maintenance:
                    status = "maintenance"
                else:
                    # A booking covers this day if check_in <= day < check_out
                    is_booked = any(
                        booking.check_in_date <= current_date < booking.check_out_date  # noqa: E501
                        for booking in room_bookings
                    )
                    status = "booked" if is_booked else "available"

                daily.append(DailyAvailability(day=day, status=status))

            # Count rooms that are NOT available today (the first day of the
            # month) as "booked" for summary purposes. This gives a snapshot.
            first_day_status = daily[0].status if daily else "available"
            if first_day_status == "booked":
                summary_booked += 1

            room_data.append(
                RoomAvailability(
                    room_id=room.id,
                    room_number=room.room_number,
                    room_type=room.room_type,
                    price_per_night=room.price_per_night,
                    status=room.status.value,
                    availability=daily,
                )
            )

        total_rooms = len(rooms)
        # Rooms that are neither booked nor in maintenance are considered
        # available for the summary.
        summary_available = (
            total_rooms - summary_booked - summary_maintenance
        )

        summary = AvailabilitySummary(
            total_rooms=total_rooms,
            available=summary_available,
            booked=summary_booked,
            maintenance=summary_maintenance,
        )

        logger.info(
            "Availability aggregated: %s-%s rooms=%d avail=%d booked=%d maint=%d",
            year,
            month,
            total_rooms,
            summary_available,
            summary_booked,
            summary_maintenance,
        )

        return MonthAvailabilityResponse(
            year=year,
            month=month,
            days_in_month=days_in_month,
            rooms=room_data,
            summary=summary,
        )
