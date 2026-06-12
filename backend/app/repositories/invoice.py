"""
Invoice repository for OrbitPMS.

Implements data access layer for the invoices table with full
CRUD operations and daily counting for sequential invoice numbering.
"""

import uuid
from datetime import date

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice


class InvoiceRepository:
    """Repository for Invoice database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        booking_id: uuid.UUID,
        invoice_number: str,
        subtotal,
        tax_amount,
        total_amount,
    ) -> Invoice:
        """Create a new invoice record.

        Args:
            booking_id: UUID of the associated booking.
            invoice_number: Human-readable invoice number.
            subtotal: Room charges before tax.
            tax_amount: Tax applied to the subtotal.
            total_amount: Grand total (subtotal + tax).

        Returns:
            The newly created Invoice ORM instance.
        """
        invoice = Invoice(
            booking_id=booking_id,
            invoice_number=invoice_number,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
        )
        self._session.add(invoice)
        await self._session.flush()
        await self._session.refresh(invoice)
        return invoice

    async def get_by_id(self, invoice_id: uuid.UUID) -> Invoice | None:
        """Fetch an invoice by its primary key."""
        return await self._session.get(Invoice, invoice_id)

    async def get_by_booking_id(self, booking_id: uuid.UUID) -> Invoice | None:
        """Fetch the invoice associated with a specific booking."""
        stmt = select(Invoice).where(Invoice.booking_id == booking_id)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Invoice]:
        """Fetch all invoices ordered by issue date (newest first).

        Args:
            skip: Number of records to skip (pagination).
            limit: Maximum number of records to return.

        Returns:
            A list of Invoice instances.
        """
        stmt = (
            select(Invoice)
            .order_by(Invoice.issued_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_date(self, target_date: date) -> int:
        """Count how many invoices were issued on a given date.

        Used to generate sequential invoice numbers per day
        (e.g., INV-20260701-00001, INV-20260701-00002).

        Args:
            target_date: The date to count invoices for.

        Returns:
            The number of invoices issued on that date.
        """
        stmt = (
            select(func.count())
            .select_from(Invoice)
            .where(func.date(Invoice.issued_at) == target_date)
        )
        result = await self._session.execute(stmt)
        return result.scalar() or 0

    async def update_pdf_url(
        self,
        invoice_id: uuid.UUID,
        pdf_url: str,
    ) -> Invoice | None:
        """Set the pdf_url field after generating the PDF document.

        Args:
            invoice_id: UUID of the invoice to update.
            pdf_url: URL or file path to the generated PDF.

        Returns:
            The updated Invoice, or None if not found.
        """
        stmt = (
            update(Invoice)
            .where(Invoice.id == invoice_id)
            .values(pdf_url=pdf_url)
            .returning(Invoice)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalars().first()
