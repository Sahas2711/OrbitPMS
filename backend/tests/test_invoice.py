"""
Tests for the invoice generation and management workflow.

Covers InvoiceService unit tests and the invoice API endpoint
integration tests with mocked service layer.
"""

import os
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.invoice import InvoiceResponse
from app.services.invoice import InvoiceService


# ═══════════════════════════════════════════════════════════════
# ── Fixtures
# ═══════════════════════════════════════════════════════════════


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ═══════════════════════════════════════════════════════════════
# ── InvoiceService Unit Tests
# ═══════════════════════════════════════════════════════════════


class TestChargeCalculation:
    """Tests for InvoiceService.calculate_charges static method."""

    def test_standard_calculation(self):
        """Standard 4-night stay at $150/night with 10% tax."""
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("150.00"),
            nights_stayed=4,
        )

        assert charges["subtotal"] == Decimal("600.00")  # 4 × $150
        assert charges["tax_amount"] == Decimal("60.00")  # 10% of $600
        assert charges["total_amount"] == Decimal("660.00")  # $600 + $60

    def test_single_night(self):
        """Single night stay should calculate correctly."""
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("200.00"),
            nights_stayed=1,
        )

        assert charges["subtotal"] == Decimal("200.00")
        assert charges["tax_amount"] == Decimal("20.00")  # 10% of $200
        assert charges["total_amount"] == Decimal("220.00")

    def test_custom_tax_rate(self):
        """Custom tax rate should be applied correctly."""
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("1000.00"),
            nights_stayed=1,
            tax_rate=Decimal("0.15"),  # 15%
        )

        assert charges["subtotal"] == Decimal("1000.00")
        assert charges["tax_amount"] == Decimal("150.00")  # 15% of $1000
        assert charges["total_amount"] == Decimal("1150.00")

    def test_zero_tax_rate(self):
        """Zero tax rate should result in subtotal == total."""
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("500.00"),
            nights_stayed=3,
            tax_rate=Decimal("0.00"),
        )

        assert charges["subtotal"] == Decimal("1500.00")
        assert charges["tax_amount"] == Decimal("0.00")
        assert charges["total_amount"] == Decimal("1500.00")

    def test_decimal_precision(self):
        """Tax amounts should be rounded to 2 decimal places."""
        # Odd tax amount to test rounding
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("99.99"),
            nights_stayed=3,
            tax_rate=Decimal("0.10"),
        )

        assert charges["subtotal"] == Decimal("299.97")
        assert charges["tax_amount"] == Decimal("30.00")  # 29.997 → 30.00
        assert charges["total_amount"] == Decimal("329.97")

    def test_minimum_one_night_fallback(self):
        """The service accepts 0 nights (caller handles minimum)."""
        charges = InvoiceService.calculate_charges(
            room_rate=Decimal("150.00"),
            nights_stayed=0,
        )

        assert charges["subtotal"] == Decimal("0.00")
        assert charges["tax_amount"] == Decimal("0.00")
        assert charges["total_amount"] == Decimal("0.00")


class TestInvoiceService:
    """Unit tests for InvoiceService with mocked repository."""

    @pytest.fixture(autouse=True)
    def setup_mocks(self, mock_session):
        """Set up mocked repository and service instance."""
        self._session = mock_session
        self._invoice_repo = MagicMock()
        self._invoice_repo.create = AsyncMock()
        self._invoice_repo.get_by_id = AsyncMock()
        self._invoice_repo.get_by_booking_id = AsyncMock()
        self._invoice_repo.get_all = AsyncMock()
        self._invoice_repo.count_by_date = AsyncMock()
        self._invoice_repo.update_pdf_url = AsyncMock()

        with patch("app.services.invoice.InvoiceRepository", return_value=self._invoice_repo):
            self._service = InvoiceService(session=self._session)

            yield

    # ── Invoice number generation ─────────────────────────────

    async def test_generate_invoice_number_sequential(self):
        """Invoice numbers should be sequential per day."""
        self._invoice_repo.count_by_date.return_value = 0

        with patch("app.services.invoice.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 1)
            mock_date.side_effect = lambda *args, **kw: date(*args, **kw)

            number = await self._service.generate_invoice_number()

        assert number == "INV-20260701-00001"

    async def test_generate_invoice_number_increment(self):
        """Each new invoice should increment the daily counter."""
        self._invoice_repo.count_by_date.return_value = 42

        with patch("app.services.invoice.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 15)
            mock_date.side_effect = lambda *args, **kw: date(*args, **kw)

            number = await self._service.generate_invoice_number()

        assert number == "INV-20260715-00043"

    # ── Invoice creation ──────────────────────────────────────

    async def test_create_invoice(self):
        """Creating an invoice should use sequential numbering and calculate charges."""
        booking_id = uuid.uuid4()
        self._invoice_repo.count_by_date.return_value = 0

        # Mock the repo.create to return a fake invoice
        mock_invoice = MagicMock()
        mock_invoice.id = uuid.uuid4()
        mock_invoice.booking_id = booking_id
        mock_invoice.invoice_number = "INV-20260701-00001"
        mock_invoice.subtotal = Decimal("600.00")
        mock_invoice.tax_amount = Decimal("60.00")
        mock_invoice.total_amount = Decimal("660.00")
        mock_invoice.pdf_url = None
        mock_invoice.issued_at = datetime.now(timezone.utc)
        self._invoice_repo.create.return_value = mock_invoice

        with patch("app.services.invoice.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 1)
            mock_date.side_effect = lambda *args, **kw: date(*args, **kw)

            result = await self._service.create_invoice(
                booking_id=booking_id,
                room_rate=Decimal("150.00"),
                nights_stayed=4,
            )

        assert isinstance(result, InvoiceResponse)
        assert result.invoice_number == "INV-20260701-00001"
        assert result.subtotal == Decimal("600.00")
        assert result.tax_amount == Decimal("60.00")
        assert result.total_amount == Decimal("660.00")
        assert result.pdf_url is None

        # Verify repo was called correctly
        self._invoice_repo.create.assert_awaited_once_with(
            booking_id=booking_id,
            invoice_number="INV-20260701-00001",
            subtotal=Decimal("600.00"),
            tax_amount=Decimal("60.00"),
            total_amount=Decimal("660.00"),
        )

    # ── Query methods ─────────────────────────────────────────

    async def test_get_invoice_found(self):
        """Getting an invoice by ID should return the invoice data."""
        invoice_id = uuid.uuid4()
        booking_id = uuid.uuid4()
        now = datetime.now(timezone.utc)

        mock_invoice = MagicMock()
        mock_invoice.id = invoice_id
        mock_invoice.booking_id = booking_id
        mock_invoice.invoice_number = "INV-20260701-00001"
        mock_invoice.subtotal = Decimal("600.00")
        mock_invoice.tax_amount = Decimal("60.00")
        mock_invoice.total_amount = Decimal("660.00")
        mock_invoice.pdf_url = None
        mock_invoice.issued_at = now
        self._invoice_repo.get_by_id.return_value = mock_invoice

        result = await self._service.get_invoice(invoice_id)

        assert result.id == invoice_id
        assert result.booking_id == booking_id
        assert result.invoice_number == "INV-20260701-00001"

    async def test_get_invoice_not_found(self):
        """Getting a non-existent invoice should raise ValueError."""
        invoice_id = uuid.uuid4()
        self._invoice_repo.get_by_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            await self._service.get_invoice(invoice_id)

        assert "not found" in str(exc_info.value).lower()

    async def test_get_invoice_by_booking(self):
        """Getting invoice by booking ID should return the invoice."""
        booking_id = uuid.uuid4()
        mock_invoice = MagicMock()
        mock_invoice.id = uuid.uuid4()
        mock_invoice.booking_id = booking_id
        mock_invoice.invoice_number = "INV-20260701-00001"
        mock_invoice.subtotal = Decimal("600.00")
        mock_invoice.tax_amount = Decimal("60.00")
        mock_invoice.total_amount = Decimal("660.00")
        mock_invoice.pdf_url = None
        mock_invoice.issued_at = datetime.now(timezone.utc)
        self._invoice_repo.get_by_booking_id.return_value = mock_invoice

        result = await self._service.get_invoice_by_booking(booking_id)

        assert result.booking_id == booking_id
        assert result.invoice_number == "INV-20260701-00001"

    async def test_get_invoice_by_booking_not_found(self):
        """Getting invoice for non-existent booking should raise ValueError."""
        booking_id = uuid.uuid4()
        self._invoice_repo.get_by_booking_id.return_value = None

        with pytest.raises(ValueError) as exc_info:
            await self._service.get_invoice_by_booking(booking_id)

        assert "not found" in str(exc_info.value).lower()

    async def test_get_all_invoices(self):
        """Listing all invoices should return a list of InvoiceResponse DTOs."""
        mock_invoice = MagicMock()
        mock_invoice.id = uuid.uuid4()
        mock_invoice.booking_id = uuid.uuid4()
        mock_invoice.invoice_number = "INV-20260701-00001"
        mock_invoice.subtotal = Decimal("600.00")
        mock_invoice.tax_amount = Decimal("60.00")
        mock_invoice.total_amount = Decimal("660.00")
        mock_invoice.pdf_url = None
        mock_invoice.issued_at = datetime.now(timezone.utc)

        self._invoice_repo.get_all.return_value = [mock_invoice, mock_invoice]

        results = await self._service.get_all_invoices(skip=0, limit=10)

        assert len(results) == 2
        assert all(isinstance(r, InvoiceResponse) for r in results)
        self._invoice_repo.get_all.assert_awaited_once_with(skip=0, limit=10)


# ═══════════════════════════════════════════════════════════════
# ── Invoice API Endpoint Tests
# ═══════════════════════════════════════════════════════════════


class TestInvoiceEndpoints:
    """Integration tests for the invoice API endpoints."""

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
    def mock_invoice_service(self):
        """Mock InvoiceService to avoid database dependency."""
        with patch("app.api.v1.invoices.InvoiceService") as mock:
            self._service_instance = MagicMock()
            self._service_instance.get_all_invoices = AsyncMock()
            self._service_instance.get_invoice = AsyncMock()
            self._service_instance.get_invoice_by_booking = AsyncMock()
            mock.return_value = self._service_instance
            yield mock

    async def test_list_invoices(self):
        """Listing invoices should return 200 with invoice list."""
        invoice_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        self._service_instance.get_all_invoices.return_value = [
            InvoiceResponse(
                id=invoice_id,
                booking_id=uuid.uuid4(),
                invoice_number="INV-20260701-00001",
                subtotal=Decimal("600.00"),
                tax_amount=Decimal("60.00"),
                total_amount=Decimal("660.00"),
                issued_at=now,
            )
        ]

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/invoices")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["invoice_number"] == "INV-20260701-00001"
        assert data[0]["subtotal"] == 600.00
        assert data[0]["total_amount"] == 660.00

    async def test_get_invoice_found(self):
        """Getting an existing invoice should return 200 with invoice data."""
        invoice_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        self._service_instance.get_invoice.return_value = InvoiceResponse(
            id=invoice_id,
            booking_id=uuid.uuid4(),
            invoice_number="INV-20260701-00001",
            subtotal=Decimal("600.00"),
            tax_amount=Decimal("60.00"),
            total_amount=Decimal("660.00"),
            issued_at=now,
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/{invoice_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["invoice_number"] == "INV-20260701-00001"
        assert data["id"] == str(invoice_id)
        assert "issued_at" in data

    async def test_get_invoice_not_found(self):
        """Getting a non-existent invoice should return 404."""
        invoice_id = uuid.uuid4()
        self._service_instance.get_invoice.side_effect = ValueError(
            f"Invoice with id '{invoice_id}' not found."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/{invoice_id}")

        assert response.status_code == 404
        assert "not found" in response.text.lower()

    async def test_get_invoice_by_booking_found(self):
        """Getting invoice by booking should return 200."""
        booking_id = uuid.uuid4()
        self._service_instance.get_invoice_by_booking.return_value = InvoiceResponse(
            id=uuid.uuid4(),
            booking_id=booking_id,
            invoice_number="INV-20260701-00001",
            subtotal=Decimal("600.00"),
            tax_amount=Decimal("60.00"),
            total_amount=Decimal("660.00"),
            issued_at=datetime.now(timezone.utc),
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/by-booking/{booking_id}")

        assert response.status_code == 200
        assert response.json()["booking_id"] == str(booking_id)

    async def test_get_invoice_by_booking_not_found(self):
        """Getting invoice for non-existent booking should return 404."""
        booking_id = uuid.uuid4()
        self._service_instance.get_invoice_by_booking.side_effect = ValueError(
            f"Invoice for booking '{booking_id}' not found."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/by-booking/{booking_id}")

        assert response.status_code == 404
        assert "not found" in response.text.lower()

    async def test_get_invoice_invalid_uuid(self):
        """Invalid UUID should return 422."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/invoices/not-a-uuid")

        assert response.status_code == 422

    async def test_download_pdf_not_found(self):
        """Downloading PDF for invoice without pdf_url should return 404."""
        invoice_id = uuid.uuid4()
        self._service_instance.get_invoice.return_value = InvoiceResponse(
            id=invoice_id,
            booking_id=uuid.uuid4(),
            invoice_number="INV-20260701-00001",
            subtotal=Decimal("600.00"),
            tax_amount=Decimal("60.00"),
            total_amount=Decimal("660.00"),
            pdf_url=None,
            issued_at=datetime.now(timezone.utc),
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/{invoice_id}/pdf")

        assert response.status_code == 404
        assert "not been generated" in response.text.lower()

    async def test_download_pdf_invoice_not_found(self):
        """Downloading PDF for non-existent invoice should return 404."""
        invoice_id = uuid.uuid4()
        self._service_instance.get_invoice.side_effect = ValueError(
            f"Invoice with id '{invoice_id}' not found."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/invoices/{invoice_id}/pdf")

        assert response.status_code == 404
        assert "not found" in response.text.lower()


# ═══════════════════════════════════════════════════════════════
# ── PDF Invoice Generation Tests
# ═══════════════════════════════════════════════════════════════


class TestInvoicePDFGeneration:
    """Tests for the PDF invoice generation function."""

    def test_generate_invoice_pdf_bytes(self):
        """PDF generation should return valid PDF bytes."""
        from app.services.invoice_pdf import generate_invoice_pdf_bytes

        pdf_bytes = generate_invoice_pdf_bytes(
            invoice_number="INV-20260701-00001",
            issued_at=datetime(2026, 7, 1, 10, 0, 0, tzinfo=timezone.utc),
            guest_name="Jane Doe",
            guest_email="jane@example.com",
            guest_phone="+1-555-0123",
            room_number="101",
            room_type="Deluxe",
            check_in_date=date(2026, 6, 29),
            check_out_date=date(2026, 7, 1),
            nights_stayed=2,
            room_rate=Decimal("200.00"),
            subtotal=Decimal("400.00"),
            tax_amount=Decimal("40.00"),
            total_amount=Decimal("440.00"),
        )

        # Should return non-empty bytes
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100

        # Should start with PDF magic number
        assert pdf_bytes.startswith(b"%PDF")

    def test_generate_invoice_pdf_multiple_nights(self):
        """PDF with longer stay should still generate correctly."""
        from app.services.invoice_pdf import generate_invoice_pdf_bytes

        pdf_bytes = generate_invoice_pdf_bytes(
            invoice_number="INV-20260705-00002",
            issued_at=datetime(2026, 7, 5, 14, 30, 0, tzinfo=timezone.utc),
            guest_name="John Smith",
            guest_email="john@example.com",
            guest_phone=None,
            room_number="205",
            room_type="Suite",
            check_in_date=date(2026, 7, 1),
            check_out_date=date(2026, 7, 5),
            nights_stayed=4,
            room_rate=Decimal("350.00"),
            subtotal=Decimal("1400.00"),
            tax_amount=Decimal("140.00"),
            total_amount=Decimal("1540.00"),
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 100
        assert pdf_bytes.startswith(b"%PDF")

    def test_generate_invoice_pdf_file(self, tmp_path):
        """PDF file generation should save the file correctly."""
        from app.services.invoice_pdf import generate_invoice_pdf

        # Temporarily override the storage path
        from app.core.config import settings
        original_path = settings.invoice_storage_path
        temp_storage = tmp_path / "invoices"
        temp_storage.mkdir(parents=True, exist_ok=True)
        settings.invoice_storage_path = str(temp_storage)

        try:
            pdf_url = generate_invoice_pdf(
                invoice_number="INV-20260701-00003",
                issued_at=datetime(2026, 7, 1, 10, 0, 0, tzinfo=timezone.utc),
                guest_name="Test Guest",
                guest_email="test@example.com",
                guest_phone="+1-555-TEST",
                room_number="310",
                room_type="Standard",
                check_in_date=date(2026, 6, 28),
                check_out_date=date(2026, 7, 1),
                nights_stayed=3,
                room_rate=Decimal("100.00"),
                subtotal=Decimal("300.00"),
                tax_amount=Decimal("30.00"),
                total_amount=Decimal("330.00"),
            )

            # Verify the returned path is a string starting with the storage path
            assert isinstance(pdf_url, str)
            assert "INV-20260701-00003.pdf" in pdf_url

            # Verify the file exists and is valid PDF
            from app.services.invoice_pdf import get_pdf_path
            file_path = get_pdf_path(pdf_url)
            assert os.path.exists(file_path)

            with open(file_path, "rb") as f:
                file_bytes = f.read()
                assert file_bytes.startswith(b"%PDF")
                assert len(file_bytes) > 100
        finally:
            # Restore the original storage path
            settings.invoice_storage_path = original_path

    def test_get_pdf_path_resolution(self):
        """PDF path resolution should work correctly."""
        from app.services.invoice_pdf import get_pdf_path

        result = get_pdf_path("/storage/invoices/INV-20260701-00001.pdf")
        assert result.endswith("INV-20260701-00001.pdf")
        assert "storage" in result
