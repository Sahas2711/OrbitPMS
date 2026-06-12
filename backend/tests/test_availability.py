"""
Tests for the room availability aggregation service and API.

Covers AvailabilityService.get_monthly_availability() unit tests
and the GET /api/v1/rooms/availability endpoint integration tests.
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.enums import BookingStatus, RoomStatus
from app.main import app
from app.schemas.availability import MonthAvailabilityResponse
from app.services.availability import AvailabilityService


# ═══════════════════════════════════════════════════════════════
# ── Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest.fixture
def anyio_backend():
    return "asyncio"


def make_mock_room(
    room_id=None,
    room_number="101",
    room_type="deluxe",
    price_per_night=Decimal("150.00"),
    status=RoomStatus.AVAILABLE,
):
    """Create a mock Room ORM instance."""
    room = MagicMock()
    room.id = room_id or uuid.uuid4()
    room.room_number = room_number
    room.room_type = room_type
    room.price_per_night = price_per_night
    room.status = status
    return room


def make_mock_booking(
    booking_id=None,
    room_id=None,
    check_in_date=date(2026, 7, 1),
    check_out_date=date(2026, 7, 5),
    booking_status=BookingStatus.CONFIRMED,
):
    """Create a mock Booking ORM instance."""
    booking = MagicMock()
    booking.id = booking_id or uuid.uuid4()
    booking.room_id = room_id
    booking.check_in_date = check_in_date
    booking.check_out_date = check_out_date
    booking.booking_status = booking_status
    return booking


# ═══════════════════════════════════════════════════════════════
# ── AvailabilityService Unit Tests
# ═══════════════════════════════════════════════════════════════


class TestAvailabilityService:
    """Unit tests for AvailabilityService with mocked repositories."""

    @pytest.fixture(autouse=True)
    def setup_mocks(self, mock_session):
        """Set up mocked repositories and service instance."""
        self._session = mock_session
        self._room_repo = MagicMock()
        self._booking_repo = MagicMock()

        with patch("app.services.availability.RoomRepository", return_value=self._room_repo), \
             patch("app.services.availability.BookingRepository", return_value=self._booking_repo):
            self._service = AvailabilityService(session=self._session)
            yield

    async def test_empty_month_all_available(self):
        """A month with no bookings should show all rooms as available."""
        room1 = make_mock_room(room_number="101", room_type="standard", price_per_night=Decimal("100.00"))
        room2 = make_mock_room(room_number="102", room_type="deluxe", price_per_night=Decimal("150.00"))
        self._room_repo.get_all.return_value = [room1, room2]
        self._booking_repo.get_active_bookings_in_range.return_value = []

        result = await self._service.get_monthly_availability(year=2026, month=7)

        assert isinstance(result, MonthAvailabilityResponse)
        assert result.year == 2026
        assert result.month == 7
        assert result.days_in_month == 31
        assert len(result.rooms) == 2

        # Both rooms should be available all month
        for room_avail in result.rooms:
            for daily in room_avail.availability:
                assert daily.status == "available"

        # Summary
        assert result.summary.total_rooms == 2
        assert result.summary.available == 2
        assert result.summary.booked == 0
        assert result.summary.maintenance == 0

    async def test_room_with_booking(self):
        """A room with a booking should show booked status for those days."""
        room_id = uuid.uuid4()
        room = make_mock_room(room_id=room_id, room_number="101")
        self._room_repo.get_all.return_value = [room]

        # Booking from July 1 to July 5
        booking = make_mock_booking(
            room_id=room_id,
            check_in_date=date(2026, 7, 1),
            check_out_date=date(2026, 7, 5),
        )
        self._booking_repo.get_active_bookings_in_range.return_value = [booking]

        result = await self._service.get_monthly_availability(year=2026, month=7)

        assert len(result.rooms) == 1
        room_avail = result.rooms[0]
        assert room_avail.room_number == "101"

        # Days 1-4 should be booked (check_in <= day < check_out)
        for daily in room_avail.availability:
            if daily.day in (1, 2, 3, 4):
                assert daily.status == "booked", f"Day {daily.day} should be booked"
            else:
                assert daily.status == "available", f"Day {daily.day} should be available"

    async def test_maintenance_room(self):
        """A room in maintenance should show maintenance status for all days."""
        room = make_mock_room(room_number="101", status=RoomStatus.MAINTENANCE)
        self._room_repo.get_all.return_value = [room]
        self._booking_repo.get_active_bookings_in_range.return_value = []

        result = await self._service.get_monthly_availability(year=2026, month=7)

        assert len(result.rooms) == 1
        for daily in result.rooms[0].availability:
            assert daily.status == "maintenance"

        assert result.summary.total_rooms == 1
        assert result.summary.maintenance == 1
        assert result.summary.available == 0
        assert result.summary.booked == 0

    async def test_mixed_scenario(self):
        """Multiple rooms with different states should compute correctly."""
        room1_id = uuid.uuid4()
        room2_id = uuid.uuid4()
        room3_id = uuid.uuid4()

        rooms = [
            make_mock_room(room_id=room1_id, room_number="101", status=RoomStatus.AVAILABLE),
            make_mock_room(room_id=room2_id, room_number="102", status=RoomStatus.AVAILABLE),
            make_mock_room(room_id=room3_id, room_number="103", status=RoomStatus.MAINTENANCE),
        ]
        self._room_repo.get_all.return_value = rooms

        # Room 101 has a booking
        booking = make_mock_booking(
            room_id=room1_id,
            check_in_date=date(2026, 7, 10),
            check_out_date=date(2026, 7, 15),
        )
        self._booking_repo.get_active_bookings_in_range.return_value = [booking]

        result = await self._service.get_monthly_availability(year=2026, month=7)

        assert len(result.rooms) == 3

        # Room 101: booked July 10-14
        room101 = [r for r in result.rooms if r.room_number == "101"][0]
        for daily in room101.availability:
            if 10 <= daily.day <= 14:
                assert daily.status == "booked"
            else:
                assert daily.status == "available"

        # Room 102: all available
        room102 = [r for r in result.rooms if r.room_number == "102"][0]
        for daily in room102.availability:
            assert daily.status == "available"

        # Room 103: all maintenance
        room103 = [r for r in result.rooms if r.room_number == "103"][0]
        for daily in room103.availability:
            assert daily.status == "maintenance"

        # Summary: 3 total, 1 booked (room101 on day 1), 1 maintenance, 1 available
        assert result.summary.total_rooms == 3
        assert result.summary.maintenance == 1
        assert result.summary.available == 2  # rooms 101 and 102 are available on day 1
        assert result.summary.booked == 0     # neither is booked on day 1

    async def test_cross_month_booking(self):
        """A booking spanning across months should be covered."""
        room_id = uuid.uuid4()
        room = make_mock_room(room_id=room_id, room_number="101")
        self._room_repo.get_all.return_value = [room]

        # Booking from June 28 to July 3 (crosses month boundary)
        booking = make_mock_booking(
            room_id=room_id,
            check_in_date=date(2026, 6, 28),
            check_out_date=date(2026, 7, 3),
        )
        self._booking_repo.get_active_bookings_in_range.return_value = [booking]

        # Request July availability
        result = await self._service.get_monthly_availability(year=2026, month=7)

        assert len(result.rooms) == 1
        room_avail = result.rooms[0]

        # Days 1-2 should be booked (July 1-2 are within the June 28 - July 3 range)
        for daily in room_avail.availability:
            if daily.day in (1, 2):
                assert daily.status == "booked", f"Day {daily.day} should be booked"
            else:
                assert daily.status == "available", f"Day {daily.day} should be available"

    async def test_leap_year_february(self):
        """February in a leap year should have 29 days."""
        room = make_mock_room(room_number="101")
        self._room_repo.get_all.return_value = [room]
        self._booking_repo.get_active_bookings_in_range.return_value = []

        # 2024 is a leap year
        result = await self._service.get_monthly_availability(year=2024, month=2)

        assert result.days_in_month == 29
        assert len(result.rooms[0].availability) == 29


# ═══════════════════════════════════════════════════════════════
# ── API Endpoint Tests (GET /api/v1/rooms/availability)
# ═══════════════════════════════════════════════════════════════


class TestAvailabilityEndpoint:
    """Integration tests for the availability API endpoint."""

    @pytest.fixture(autouse=True)
    def override_auth(self):
        """Override auth dependencies so endpoint tests don't need real tokens."""
        from app.core.security import get_current_user

        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.role = "admin"
        mock_user.email = "admin@orbitpms.com"
        mock_user.full_name = "Admin User"
        mock_user.is_active = True

        app.dependency_overrides[get_current_user] = lambda: mock_user
        yield
        app.dependency_overrides.clear()

    @pytest.fixture(autouse=True)
    def mock_availability_service(self):
        """Mock AvailabilityService to avoid database dependency."""
        with patch("app.api.v1.rooms.AvailabilityService") as mock:
            self._service_instance = MagicMock()
            self._service_instance.get_monthly_availability = AsyncMock()
            mock.return_value = self._service_instance
            yield mock

    async def test_availability_success(self):
        """A valid request should return 200 with availability data."""
        from app.schemas.availability import (
            AvailabilitySummary,
            DailyAvailability,
            MonthAvailabilityResponse,
            RoomAvailability,
        )

        room_id = uuid.uuid4()
        self._service_instance.get_monthly_availability.return_value = (
            MonthAvailabilityResponse(
                year=2026,
                month=7,
                days_in_month=31,
                rooms=[
                    RoomAvailability(
                        room_id=room_id,
                        room_number="101",
                        room_type="deluxe",
                        price_per_night=Decimal("150.00"),
                        status="available",
                        availability=[
                            DailyAvailability(day=1, status="available"),
                            DailyAvailability(day=2, status="booked"),
                            DailyAvailability(day=3, status="available"),
                        ],
                    ),
                ],
                summary=AvailabilitySummary(
                    total_rooms=1,
                    available=1,
                    booked=0,
                    maintenance=0,
                ),
            )
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/rooms/availability?year=2026&month=7"
            )

        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["month"] == 7
        assert data["days_in_month"] == 31
        assert len(data["rooms"]) == 1
        assert data["rooms"][0]["room_number"] == "101"
        assert data["rooms"][0]["availability"][0]["status"] == "available"
        assert data["rooms"][0]["availability"][1]["status"] == "booked"
        assert data["summary"]["total_rooms"] == 1

    async def test_availability_invalid_year(self):
        """Invalid year should return 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/rooms/availability?year=1900&month=7"
            )

        assert response.status_code == 422

    async def test_availability_invalid_month(self):
        """Invalid month should return 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/rooms/availability?year=2026&month=13"
            )

        assert response.status_code == 422

    async def test_availability_missing_params(self):
        """Missing year/month should return 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/rooms/availability")

        assert response.status_code == 422
