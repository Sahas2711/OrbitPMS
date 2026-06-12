"""
Invoice schemas for OrbitPMS.

Provides Pydantic models for invoice data returned during
the guest checkout process.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class InvoiceResponse(BaseModel):
    """Response schema for invoice data returned by the API."""

    id: uuid.UUID = Field(
        ...,
        description="Unique invoice identifier",
    )
    booking_id: uuid.UUID = Field(
        ...,
        description="UUID of the associated booking",
    )
    invoice_number: str = Field(
        ...,
        description="Human-readable invoice number",
    )
    subtotal: Decimal = Field(
        ...,
        description="Room charges before tax",
    )
    tax_amount: Decimal = Field(
        ...,
        description="Tax applied to the subtotal",
    )
    total_amount: Decimal = Field(
        ...,
        description="Grand total (subtotal + tax)",
    )
    issued_at: datetime = Field(
        ...,
        description="Timestamp when the invoice was issued",
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "booking_id": "1e6a8f64-5717-4562-b3fc-2c963f66afa6",
                "invoice_number": "INV-20260701-00001",
                "subtotal": 600.00,
                "tax_amount": 60.00,
                "total_amount": 660.00,
                "issued_at": "2026-07-05T10:00:00Z",
            }
        },
    }
