"""
Booking schemas for OrbitPMS.

Provides Pydantic models for booking CRUD operations including
date validation, guest information validation, and status tracking.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.enums import BookingStatus

# ═══════════════════════════════════════════════════════════════
# ── Request Schemas
# ═══════════════════════════════════════════════════════════════


class BookingCreate(BaseModel):
    """Request schema for creating a new booking."""

    guest_name: str = Field(
        ...,
        min_length=1,
        max_length=150,
        description="Full name of the guest",
        examples=["John Doe"],
    )
    guest_email: str | None = Field(
        default=None,
        max_length=255,
        description="Guest email address",
        examples=["john@example.com"],
    )
    guest_phone: str | None = Field(
        default=None,
        max_length=20,
        description="Guest phone number",
        examples=["+1-555-0123"],
    )
    room_id: uuid.UUID = Field(
        ...,
        description="UUID of the room being booked",
    )
    check_in_date: date = Field(
        ...,
        description="Check-in date",
        examples=["2026-07-01"],
    )
    check_out_date: date = Field(
        ...,
        description="Check-out date (must be after check-in)",
        examples=["2026-07-05"],
    )

    # ── Field validators ────────────────────────────────────────

    @field_validator("guest_name")
    @classmethod
    def normalize_guest_name(cls, value: str) -> str:
        """Strip leading/trailing whitespace from guest name."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("Guest name cannot be empty or whitespace only")
        return stripped

    @field_validator("guest_email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        """Basic email format validation if provided."""
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Email cannot be empty if provided")
        if "@" not in stripped or "." not in stripped.split("@")[-1]:
            raise ValueError("Invalid email address format")
        return stripped

    @field_validator("check_in_date")
    @classmethod
    def validate_check_in(cls, value: date) -> date:
        """Ensure check-in date is not in the past."""
        if value < date.today():
            raise ValueError("Check-in date cannot be in the past")
        return value

    # ── Model validators ────────────────────────────────────────

    @model_validator(mode="after")
    def validate_dates(self) -> "BookingCreate":
        """Ensure check-out is after check-in."""
        if self.check_out_date <= self.check_in_date:
            raise ValueError(
                "Check-out date must be after check-in date"
            )
        return self


class BookingUpdate(BaseModel):
    """Request schema for updating an existing booking.

    All fields are optional — only provided fields are updated.
    """

    guest_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
        description="Full name of the guest",
    )
    guest_email: str | None = Field(
        default=None,
        max_length=255,
        description="Guest email address",
    )
    guest_phone: str | None = Field(
        default=None,
        max_length=20,
        description="Guest phone number",
    )
    check_in_date: date | None = Field(
        default=None,
        description="Check-in date",
    )
    check_out_date: date | None = Field(
        default=None,
        description="Check-out date (must be after check-in)",
    )
    booking_status: BookingStatus | None = Field(
        default=None,
        description="Booking lifecycle status",
    )

    # ── Field validators ────────────────────────────────────────

    @field_validator("guest_name")
    @classmethod
    def normalize_guest_name(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Guest name cannot be empty or whitespace only")
        return stripped

    @field_validator("guest_email")
    @classmethod
    def validate_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip()
        if not stripped:
            raise ValueError("Email cannot be empty if provided")
        if "@" not in stripped or "." not in stripped.split("@")[-1]:
            raise ValueError("Invalid email address format")
        return stripped

    @field_validator("check_in_date")
    @classmethod
    def validate_check_in(cls, value: date | None) -> date | None:
        if value is None:
            return value
        if value < date.today():
            raise ValueError("Check-in date cannot be in the past")
        return value

    # ── Model validators ────────────────────────────────────────

    @model_validator(mode="after")
    def validate_dates(self) -> "BookingUpdate":
        """Ensure check-out is after check-in when both provided."""
        if (
            self.check_in_date is not None
            and self.check_out_date is not None
            and self.check_out_date <= self.check_in_date
        ):
            raise ValueError(
                "Check-out date must be after check-in date"
            )
        return self

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "BookingUpdate":
        """Ensure at least one field is provided for update."""
        provided = {
            k: v
            for k, v in self.model_dump().items()
            if v is not None
        }
        if not provided:
            raise ValueError(
                "At least one field must be provided for update"
            )
        return self


# ═══════════════════════════════════════════════════════════════
# ── Response Schemas
# ═══════════════════════════════════════════════════════════════


class BookingResponse(BaseModel):
    """Response schema for booking data returned by the API."""

    id: uuid.UUID = Field(
        ...,
        description="Unique booking identifier",
    )
    guest_name: str = Field(
        ...,
        description="Full name of the guest",
    )
    guest_email: str | None = Field(
        default=None,
        description="Guest email address",
    )
    guest_phone: str | None = Field(
        default=None,
        description="Guest phone number",
    )
    room_id: uuid.UUID = Field(
        ...,
        description="UUID of the booked room",
    )
    room_number: str | None = Field(
        default=None,
        description="Room number of the booked room",
    )
    room_type: str | None = Field(
        default=None,
        description="Room type of the booked room",
    )
    check_in_date: date = Field(
        ...,
        description="Check-in date",
    )
    check_out_date: date = Field(
        ...,
        description="Check-out date",
    )
    booking_status: BookingStatus = Field(
        ...,
        description="Current booking status",
    )
    total_amount: Decimal | None = Field(
        default=None,
        description="Total booking amount",
    )
    created_by: uuid.UUID | None = Field(
        default=None,
        description="UUID of the staff who created this booking",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the booking was created",
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "guest_name": "John Doe",
                "guest_email": "john@example.com",
                "guest_phone": "+1-555-0123",
                "room_id": "1e6a8f64-5717-4562-b3fc-2c963f66afa6",
                "room_number": "101",
                "room_type": "deluxe",
                "check_in_date": "2026-07-01",
                "check_out_date": "2026-07-05",
                "booking_status": "confirmed",
                "total_amount": 600.00,
                "created_by": "2a6a8f64-5717-4562-b3fc-2c963f66afa6",
                "created_at": "2026-06-10T12:00:00Z",
            }
        },
    }
