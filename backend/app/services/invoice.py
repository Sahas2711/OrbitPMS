"""
Invoice service for OrbitPMS.

Implements core business logic for invoice management including
sequential invoice numbering, tax calculations, and PDF generation
triggering.
"""

import logging
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.repositories.invoice import InvoiceRepository
from app.schemas.invoice import InvoiceResponse
from app.services.invoice_pdf import generate_invoice_pdf as render_pdf

# Default tax rate applied to room charges at checkout
DEFAULT_TAX_RATE = Decimal(str(settings.default_tax_rate))

logger = logging.getLogger(__name__)


class InvoiceService:
    """Service layer for invoice operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = InvoiceRepository(session)

    # ── Invoice number generation ──────────────────────────────

    async def generate_invoice_number(self) -> str:
        """Generate a sequential invoice number.

        Format: INV-YYYYMMDD-XXXXX
        Where XXXXX is a zero-padded sequential counter per day.

        Returns:
            A unique invoice number string.
        """
        today = date.today()
        today_str = today.strftime("%Y%m%d")
        count_today = await self._repo.count_by_date(today)
        sequence = count_today + 1
        return f"INV-{today_str}-{sequence:05d}"

    # ── Charge calculation ─────────────────────────────────────

    @staticmethod
    def calculate_charges(
        room_rate: Decimal,
        nights_stayed: int,
        tax_rate: Decimal = DEFAULT_TAX_RATE,
    ) -> dict[str, Decimal]:
        """Calculate invoice charges for a stay.

        Args:
            room_rate: Price per night for the room.
            nights_stayed: Number of nights the guest stayed.
            tax_rate: Tax rate as a decimal (default 10%).

        Returns:
            A dict with 'subtotal', 'tax_amount', and 'total_amount' keys.
        """
        subtotal = room_rate * Decimal(str(nights_stayed))
        tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))
        total = (subtotal + tax_amount).quantize(Decimal("0.01"))

        return {
            "subtotal": subtotal,
            "tax_amount": tax_amount,
            "total_amount": total,
        }

    # ── Invoice creation ───────────────────────────────────────

    async def create_invoice(
        self,
        booking_id: uuid.UUID,
        room_rate: Decimal,
        nights_stayed: int,
        tax_rate: Decimal = DEFAULT_TAX_RATE,
    ) -> InvoiceResponse:
        """Create an invoice record with calculated charges.

        Generates a sequential invoice number, calculates charges based on
        the room rate and nights stayed, and persists the invoice record.

        Args:
            booking_id: UUID of the associated booking.
            room_rate: Price per night for the room.
            nights_stayed: Number of nights stayed.
            tax_rate: Tax rate as a decimal (default 10%).

        Returns:
            An InvoiceResponse with the created invoice data.
        """
        charges = self.calculate_charges(room_rate, nights_stayed, tax_rate)
        invoice_number = await self.generate_invoice_number()

        invoice = await self._repo.create(
            booking_id=booking_id,
            invoice_number=invoice_number,
            subtotal=charges["subtotal"],
            tax_amount=charges["tax_amount"],
            total_amount=charges["total_amount"],
        )

        logger.info(
            "Invoice created: number=%s booking=%s subtotal=%s tax=%s total=%s",
            invoice_number,
            booking_id,
            charges["subtotal"],
            charges["tax_amount"],
            charges["total_amount"],
        )

        return self._to_response(invoice)

    # ── PDF generation ───────────────────────────────────────────

    async def generate_pdf(
        self,
        invoice_id: uuid.UUID,
        booking,
        nights_stayed: int,
        room_rate: Decimal,
    ) -> InvoiceResponse:
        """Generate a PDF invoice for a given invoice record.

        Fetches the invoice, generates a professional PDF with all
        booking and charge details, and updates the invoice record
        with the PDF file path.

        Args:
            invoice_id: UUID of the invoice to generate a PDF for.
            booking: The associated Booking ORM instance.
            nights_stayed: Number of nights billed.
            room_rate: Price per night for the room.

        Returns:
            An updated InvoiceResponse with pdf_url populated.

        Raises:
            ValueError: If the invoice does not exist.
        """
        invoice = await self._repo.get_by_id(invoice_id)
        if invoice is None:
            raise ValueError(f"Invoice with id '{invoice_id}' not found.")

        room_number = booking.room.room_number if booking.room else "—"
        room_type = booking.room.room_type if booking.room else "—"

        pdf_url = render_pdf(
            invoice_number=invoice.invoice_number,
            issued_at=invoice.issued_at,
            guest_name=booking.guest_name,
            guest_email=booking.guest_email,
            guest_phone=booking.guest_phone,
            room_number=room_number,
            room_type=room_type,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
            nights_stayed=nights_stayed,
            room_rate=room_rate,
            subtotal=invoice.subtotal,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.total_amount,
        )

        # Update the invoice record with the PDF URL
        updated = await self._repo.update_pdf_url(invoice_id, pdf_url)
        if updated is None:
            logger.warning(
                "Failed to update pdf_url for invoice %s", invoice_id,
            )
            return self._to_response(invoice)

        logger.info(
            "PDF generated for invoice %s: %s", invoice.invoice_number, pdf_url,
        )

        return self._to_response(updated)

    def _to_response(self, invoice) -> InvoiceResponse:
        """Map an Invoice ORM instance to an InvoiceResponse DTO."""
        return InvoiceResponse(
            id=invoice.id,
            booking_id=invoice.booking_id,
            invoice_number=invoice.invoice_number,
            subtotal=invoice.subtotal,
            tax_amount=invoice.tax_amount,
            total_amount=invoice.total_amount,
            pdf_url=invoice.pdf_url,
            issued_at=invoice.issued_at,
        )

    # ── PDF URL update (used by frontend-uploaded PDFs) ─────────

    async def update_pdf_url(
        self,
        invoice_id: uuid.UUID,
        pdf_url: str,
    ) -> InvoiceResponse:
        """Update the pdf_url of an invoice record.

        Used when a PDF is generated by the frontend and uploaded
        to the backend for persistent storage.

        Args:
            invoice_id: UUID of the invoice.
            pdf_url: The local file path or URL to store.

        Returns:
            The updated InvoiceResponse.

        Raises:
            ValueError: If the invoice does not exist or the update fails.
        """
        updated = await self._repo.update_pdf_url(invoice_id, pdf_url)
        if updated is None:
            raise ValueError(
                f"Failed to update pdf_url for invoice '{invoice_id}'."
            )
        logger.info(
            "PDF URL updated for invoice %s: %s",
            updated.invoice_number,
            pdf_url,
        )
        return self._to_response(updated)

    # ── Query methods ──────────────────────────────────────────

    async def get_invoice(self, invoice_id: uuid.UUID) -> InvoiceResponse:
        """Fetch a single invoice by its ID.

        Args:
            invoice_id: UUID of the invoice.

        Returns:
            An InvoiceResponse with the invoice data.

        Raises:
            ValueError: If the invoice does not exist.
        """
        invoice = await self._repo.get_by_id(invoice_id)
        if invoice is None:
            raise ValueError(f"Invoice with id '{invoice_id}' not found.")
        return self._to_response(invoice)

    async def get_invoice_by_booking(
        self,
        booking_id: uuid.UUID,
    ) -> InvoiceResponse:
        """Fetch the invoice associated with a booking.

        Args:
            booking_id: UUID of the booking.

        Returns:
            An InvoiceResponse with the invoice data.

        Raises:
            ValueError: If no invoice exists for the booking.
        """
        invoice = await self._repo.get_by_booking_id(booking_id)
        if invoice is None:
            raise ValueError(
                f"Invoice for booking '{booking_id}' not found."
            )
        return self._to_response(invoice)

    async def get_all_invoices(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[InvoiceResponse]:
        """Fetch all invoices with pagination (newest first).

        Args:
            skip: Number of records to skip.
            limit: Maximum records to return.

        Returns:
            A list of InvoiceResponse DTOs.
        """
        invoices = await self._repo.get_all(skip=skip, limit=limit)
        return [self._to_response(inv) for inv in invoices]
