"""
Tests for the guest check-out workflow.

Covers both the BookingService.check_out() method (unit tests)
and the POST /api/v1/bookings/{booking_id}/check-out endpoint
(integration tests with mocked service layer).
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.enums import BookingStatus, RoomStatus
from app.main import app
from app.schemas.invoice import InvoiceResponse


# ═══════════════════════════════════════════════════════════════
# ── Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest.fixture
def anyio_backend():
    return "asyncio"


def make_mock_booking(
    booking_id=None,
    room_id=None,
    guest_name="Jane Doe",
    booking_status=BookingStatus.CHECKED_IN,
    check_in_date=date(2026, 7, 1),
    check_out_date=date(2026, 7, 5),
):
    """Create a mock Booking ORM instance with the minimum required attributes."""
    booking = MagicMock()
    booking.id = booking_id or uuid.uuid4()
    booking.room_id = room_id or uuid.uuid4()
    booking.guest_name = guest_name
    booking.guest_email = "jane@example.com"
    booking.guest_phone = "+1-555-0123"
    booking.booking_status = booking_status
    booking.check_in_date = check_in_date
    booking.check_out_date = check_out_date
    booking.total_amount = Decimal("600.00")
    booking.created_by = uuid.uuid4()
    booking.created_at = datetime.now(timezone.utc)

    # Mock the room relationship
    room = MagicMock()
    room.room_number = "101"
    room.room_type = "deluxe"
    room.price_per_night = Decimal("150.00")
    room.status = RoomStatus.AVAILABLE
    booking.room = room

    return booking


def make_mock_room(
    room_id=None,
    room_number="101",
    room_type="deluxe",
    price_per_night=Decimal("150.00"),
    status=RoomStatus.OCCUPIED,
):
    """Create a mock Room ORM instance."""
    room = MagicMock()
    room.id = room_id or uuid.uuid4()
    room.room_number = room_number
    room.room_type = room_type
    room.price_per_night = price_per_night
    room.status = status
    return room


def make_mock_invoice(booking_id=None):
    """Create a mock Invoice ORM instance."""
    invoice = MagicMock()
    invoice.id = uuid.uuid4()
    invoice.booking_id = booking_id or uuid.uuid4()
    invoice.invoice_number = "INV-20260705-ABCD1234"
    invoice.subtotal = Decimal("600.00")
    invoice.tax_amount = Decimal("60.00")
    invoice.total_amount = Decimal("660.00")
    invoice.issued_at = datetime.now(timezone.utc)
    invoice.pdf_url = None
    return invoice


# ═══════════════════════════════════════════════════════════════
# ── Service Unit Tests (BookingService.check_out)
# ═══════════════════════════════════════════════════════════════


class TestCheckOutService:
    """Unit tests for BookingService.check_out() with mocked repositories."""

    @pytest.fixture(autouse=True)
    def setup_mocks(self, mock_session):
        """Set up mocked repositories and service instance."""
        self._session = mock_session
        self._booking_repo = MagicMock()
        self._booking_repo.get_by_id = AsyncMock()
        self._booking_repo.update = AsyncMock()

        self._room_repo = MagicMock()
        self._room_repo.get_by_id = AsyncMock()
        self._room_repo.update = AsyncMock()

        with patch("app.services.booking.BookingRepository", return_value=self._booking_repo), \
             patch("app.services.booking.RoomRepository", return_value=self._room_repo), \
             patch("app.services.booking.Invoice") as mock_invoice_cls:

            self._mock_invoice_cls = mock_invoice_cls
            from app.services.booking import BookingService
            self._service = BookingService(session=self._session)

            yield

    # ── Successful checkout ──────────────────────────────────

    async def test_checkout_success(self):
        """A valid checked-in booking should be checked out successfully."""
        booking_id = uuid.uuid4()
        booking = make_mock_booking(booking_id=booking_id)
        self._booking_repo.get_by_id.return_value = booking
        self._room_repo.get_by_id.return_value = make_mock_room(room_id=booking.room_id)

        # After update, return the booking with checked_out status
        checked_out_booking = make_mock_booking(
            booking_id=booking_id,
            room_id=booking.room_id,
            booking_status=BookingStatus.CHECKED_OUT,
        )
        self._booking_repo.update.return_value = checked_out_booking

        mock_invoice_instance = make_mock_invoice(booking_id=booking_id)
        self._mock_invoice_cls.return_value = mock_invoice_instance

        result = await self._service.check_out(booking_id)

        # Verify result is an InvoiceResponse
        assert isinstance(result, InvoiceResponse)
        assert result.invoice_number == mock_invoice_instance.invoice_number
        assert result.subtotal == Decimal("600.00")
        assert result.tax_amount == Decimal("60.00")
        assert result.total_amount == Decimal("660.00")

        # Verify room was released
        self._room_repo.update.assert_any_call(
            room_id=booking.room_id,
            status=RoomStatus.AVAILABLE,
        )

        # Verify booking status was updated
        self._booking_repo.update.assert_any_call(
            booking_id=booking_id,
            booking_status=BookingStatus.CHECKED_OUT,
            total_amount=Decimal("660.00"),
        )

        # Verify invoice was created
        self._mock_invoice_cls.assert_called_once()
        assert self._mock_invoice_cls.call_args[1]["booking_id"] == booking_id
        assert self._mock_invoice_cls.call_args[1]["subtotal"] == Decimal("600.00")
        assert self._mock_invoice_cls.call_args[1]["tax_amount"] == Decimal("60.00")
        assert self._mock_invoice_cls.call_args[1]["total_amount"] == Decimal("660.00")

    # ── Charge calculation ───────────────────────────────────

    async def test_checkout_charge_calculation(self):
        """Charges should be calculated correctly: subtotal = nights × rate, tax = 10%."""
        booking_id = uuid.uuid4()
        # 4 nights at $150/night
        booking = make_mock_booking(
            booking_id=booking_id,
            check_in_date=date(2026, 7, 1),
            check_out_date=date(2026, 7, 5),
        )
        self._booking_repo.get_by_id.return_value = booking
        self._room_repo.get_by_id.return_value = make_mock_room(
            room_id=booking.room_id,
            price_per_night=Decimal("150.00"),
        )
        self._booking_repo.update.return_value = booking
        self._mock_invoice_cls.return_value = make_mock_invoice(booking_id=booking_id)

        result = await self._service.check_out(booking_id)

        assert result.subtotal == Decimal("600.00")  # 4 nights × $150
        assert result.tax_amount == Decimal("60.00")  # 10% of $600
        assert result.total_amount == Decimal("660.00")  # $600 + $60

    async def test_checkout_early_checkout(self):
        """Early check-out should charge for actual nights stayed."""
        booking_id = uuid.uuid4()
        # Check-in was 2 days ago, scheduled check-out is 3 days from now
        booking = make_mock_booking(
            booking_id=booking_id,
            check_in_date=date(2026, 6, 29),    # 2 nights ago
            check_out_date=date(2026, 7, 4),    # scheduled for later
        )
        self._booking_repo.get_by_id.return_value = booking
        self._room_repo.get_by_id.return_value = make_mock_room(
            room_id=booking.room_id,
            price_per_night=Decimal("200.00"),
        )

        # Today is 2026-07-01 (to keep test stable)
        # We need to simulate today being 2026-07-01
        with patch("app.services.booking.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 1)
            mock_date.side_effect = lambda *args, **kw: date(*args, **kw)

            self._booking_repo.update.return_value = booking
            self._mock_invoice_cls.return_value = make_mock_invoice(booking_id=booking_id)

            result = await self._service.check_out(booking_id)

        # 2 nights stayed (June 29 → July 1)
        assert result.subtotal == Decimal("400.00")  # 2 nights × $200
        assert result.tax_amount == Decimal("40.00")  # 10% of $400
        assert result.total_amount == Decimal("440.00")  # $400 + $40

    # ── Error cases ──────────────────────────────────────────

    async def test_checkout_booking_not_found(self):
        """Check-out should fail with meaningful error if booking does not exist."""
        booking_id = uuid.uuid4()
        self._booking_repo.get_by_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            await self._service.check_out(booking_id)

        assert "not found" in str(exc_info.value).lower()

    async def test_checkout_not_checked_in(self):
        """Check-out should fail if booking is not in 'checked_in' status."""
        for status in [BookingStatus.CONFIRMED, BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED]:
            booking_id = uuid.uuid4()
            booking = make_mock_booking(booking_id=booking_id, booking_status=status)
            self._booking_repo.get_by_id.return_value = booking

            with pytest.raises(ValueError) as exc_info:
                await self._service.check_out(booking_id)

            assert "check out" in str(exc_info.value).lower()
            assert status.value in str(exc_info.value)

    async def test_checkout_room_not_found(self):
        """Check-out should fail if the associated room is missing."""
        booking_id = uuid.uuid4()
        booking = make_mock_booking(booking_id=booking_id)
        self._booking_repo.get_by_id.return_value = booking
        self._room_repo.get_by_id.return_value = None  # Room missing

        with pytest.raises(ValueError) as exc_info:
            await self._service.check_out(booking_id)

        assert "room" in str(exc_info.value).lower()

    async def test_checkout_transaction_rollback_on_failure(self):
        """If any step fails, the session should be rolled back."""
        booking_id = uuid.uuid4()
        booking = make_mock_booking(booking_id=booking_id)
        self._booking_repo.get_by_id.return_value = booking
        self._room_repo.get_by_id.return_value = make_mock_room(room_id=booking.room_id)

        # Simulate failure during invoice creation
        self._session.add.side_effect = RuntimeError("Database connection lost")

        with pytest.raises(RuntimeError):
            await self._service.check_out(booking_id)

        # Verify rollback was called
        self._session.rollback.assert_awaited_once()


# ═══════════════════════════════════════════════════════════════
# ── Endpoint Integration Tests (POST /api/v1/bookings/{id}/check-out)
# ═══════════════════════════════════════════════════════════════


class TestCheckOutEndpoint:
    """Integration tests for the check-out API endpoint."""

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
    def mock_booking_service(self):
        """Mock BookingService to avoid database dependency."""
        with patch("app.api.v1.bookings.BookingService") as mock:
            self._service_instance = AsyncMock()
            self._service_instance.check_out = AsyncMock()
            mock.return_value = self._service_instance
            yield mock

    async def test_checkout_success(self):
        """A valid check-out should return 200 with invoice data."""
        booking_id = uuid.uuid4()
        invoice_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        self._service_instance.check_out.return_value = InvoiceResponse(
            id=invoice_id,
            booking_id=booking_id,
            invoice_number="INV-20260705-ABCD1234",
            subtotal=Decimal("600.00"),
            tax_amount=Decimal("60.00"),
            total_amount=Decimal("660.00"),
            issued_at=now,
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/bookings/{booking_id}/check-out",
            )

        assert response.status_code == 200
        data = response.json()
        assert data["invoice_number"] == "INV-20260705-ABCD1234"
        assert data["subtotal"] == 600.00
        assert data["tax_amount"] == 60.00
        assert data["total_amount"] == 660.00
        assert data["booking_id"] == str(booking_id)
        assert "id" in data
        assert "issued_at" in data

    async def test_checkout_booking_not_found(self):
        """Non-existent booking should return 404."""
        booking_id = uuid.uuid4()
        self._service_instance.check_out.side_effect = ValueError(
            f"Booking with id '{booking_id}' not found."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/bookings/{booking_id}/check-out",
            )

        assert response.status_code == 404
        assert "not found" in response.text.lower()

    async def test_checkout_invalid_status(self):
        """Booking not in 'checked_in' status should return 409."""
        booking_id = uuid.uuid4()
        self._service_instance.check_out.side_effect = ValueError(
            "Cannot check out: booking is currently 'confirmed'. "
            "Only 'checked_in' bookings can be checked out."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/bookings/{booking_id}/check-out",
            )

        assert response.status_code == 409
        assert "check out" in response.text.lower()

    async def test_checkout_missing_room(self):
        """Booking with missing associated room should return 409."""
        booking_id = uuid.uuid4()
        self._service_instance.check_out.side_effect = ValueError(
            f"Room associated with booking '{booking_id}' not found."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/bookings/{booking_id}/check-out",
            )

        assert response.status_code == 409
        assert "room" in response.text.lower()

    async def test_checkout_invalid_uuid(self):
        """Invalid UUID should return 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/bookings/not-a-uuid/check-out",
            )

        assert response.status_code == 422
