"""
Room schemas for OrbitPMS.

Provides Pydantic models for room CRUD operations including
input validation for pricing, room type, and status transitions.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.enums import RoomStatus

VALID_ROOM_TYPES = {"standard", "deluxe", "suite"}


# ═══════════════════════════════════════════════════════════════
# ── Request Schemas
# ═══════════════════════════════════════════════════════════════


class RoomCreate(BaseModel):
    """Request schema for creating a new room."""

    room_number: str = Field(
        ...,
        min_length=1,
        max_length=10,
        description="Room number (must be unique)",
        examples=["101", "202A"],
    )
    room_type: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Room type (standard, deluxe, suite)",
        examples=["standard", "deluxe", "suite"],
    )
    price_per_night: Decimal = Field(
        ...,
        gt=0,
        max_digits=10,
        decimal_places=2,
        description="Price per night (must be greater than 0)",
        examples=[150.00, 299.99],
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional room description",
        examples=["Ocean view suite with king-sized bed"],
    )

    # ── Field validators ────────────────────────────────────────

    @field_validator("room_number")
    @classmethod
    def normalize_room_number(cls, value: str) -> str:
        """Strip whitespace and uppercase the room number."""
        stripped = value.strip().upper()
        if not stripped:
            raise ValueError("Room number cannot be empty or whitespace only")
        return stripped

    @field_validator("room_type")
    @classmethod
    def validate_room_type(cls, value: str) -> str:
        """Ensure room type is one of the valid types."""
        lower = value.strip().lower()
        if lower not in VALID_ROOM_TYPES:
            raise ValueError(
                f"Invalid room type '{value}'. Must be one of: "
                f"{', '.join(sorted(VALID_ROOM_TYPES))}"
            )
        return lower


class RoomUpdate(BaseModel):
    """Request schema for updating an existing room.

    All fields are optional — only provided fields are updated.
    """

    room_number: str | None = Field(
        default=None,
        min_length=1,
        max_length=10,
        description="Room number (must be unique)",
        examples=["101", "202A"],
    )
    room_type: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
        description="Room type (standard, deluxe, suite)",
        examples=["standard", "deluxe", "suite"],
    )
    price_per_night: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=10,
        decimal_places=2,
        description="Price per night (must be greater than 0)",
        examples=[150.00, 299.99],
    )
    status: RoomStatus | None = Field(
        default=None,
        description="Room availability status",
    )
    description: str | None = Field(
        default=None,
        max_length=1000,
        description="Optional room description",
    )

    # ── Field validators ────────────────────────────────────────

    @field_validator("room_number")
    @classmethod
    def normalize_room_number(cls, value: str | None) -> str | None:
        if value is None:
            return value
        stripped = value.strip().upper()
        if not stripped:
            raise ValueError("Room number cannot be empty or whitespace only")
        return stripped

    @field_validator("room_type")
    @classmethod
    def validate_room_type(cls, value: str | None) -> str | None:
        if value is None:
            return value
        lower = value.strip().lower()
        if lower not in VALID_ROOM_TYPES:
            raise ValueError(
                f"Invalid room type '{value}'. Must be one of: "
                f"{', '.join(sorted(VALID_ROOM_TYPES))}"
            )
        return lower

    # ── Model validators ────────────────────────────────────────

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "RoomUpdate":
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


class RoomResponse(BaseModel):
    """Response schema for room data returned by the API."""

    id: uuid.UUID = Field(
        ...,
        description="Unique room identifier",
    )
    room_number: str = Field(
        ...,
        description="Room number",
    )
    room_type: str = Field(
        ...,
        description="Room type",
    )
    price_per_night: Decimal = Field(
        ...,
        description="Price per night",
    )
    status: RoomStatus = Field(
        ...,
        description="Current room status",
    )
    description: str | None = Field(
        default=None,
        description="Room description",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the room was created",
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "room_number": "101",
                "room_type": "standard",
                "price_per_night": 150.00,
                "status": "available",
                "description": "Standard room with city view",
                "created_at": "2026-06-10T12:00:00Z",
            }
        },
    }
