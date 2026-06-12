"""
Availability schemas for OrbitPMS.

Provides Pydantic models for the room availability calendar API,
returning per-room daily status for a given month.
"""

import uuid
from decimal import Decimal

from pydantic import BaseModel, Field


class DailyAvailability(BaseModel):
    """Availability status for a single day in the month."""

    day: int = Field(
        ...,
        ge=1,
        le=31,
        description="Day of the month (1-31)",
        examples=[1, 15],
    )
    status: str = Field(
        ...,
        description=(
            "Availability status for this day. "
            "One of: available, booked, maintenance."
        ),
        examples=["available", "booked", "maintenance"],
    )

    model_config = {
        "json_schema_extra": {
            "example": {"day": 1, "status": "available"},
        },
    }


class RoomAvailability(BaseModel):
    """Availability data for a single room across the month."""

    room_id: uuid.UUID = Field(
        ...,
        description="Unique room identifier",
    )
    room_number: str = Field(
        ...,
        description="Room number",
        examples=["101"],
    )
    room_type: str = Field(
        ...,
        description="Room type (standard, deluxe, suite)",
        examples=["deluxe"],
    )
    price_per_night: Decimal = Field(
        ...,
        description="Price per night for the room",
        examples=[150.00],
    )
    status: str = Field(
        ...,
        description="Current overall room status (available, occupied, maintenance)",
        examples=["available"],
    )
    availability: list[DailyAvailability] = Field(
        ...,
        description="List of daily availability entries, one per day in the month",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "room_number": "101",
                "room_type": "deluxe",
                "price_per_night": 150.00,
                "status": "available",
                "availability": [
                    {"day": 1, "status": "booked"},
                    {"day": 2, "status": "booked"},
                    {"day": 3, "status": "available"},
                ],
            },
        },
    }


class AvailabilitySummary(BaseModel):
    """Summary counts for the month."""

    total_rooms: int = Field(
        ...,
        description="Total number of rooms in the hotel",
        examples=[20],
    )
    available: int = Field(
        ...,
        description="Number of rooms currently available",
        examples=[15],
    )
    booked: int = Field(
        ...,
        description="Number of rooms currently occupied/booked",
        examples=[3],
    )
    maintenance: int = Field(
        ...,
        description="Number of rooms under maintenance",
        examples=[2],
    )


class MonthAvailabilityResponse(BaseModel):
    """Response schema for the monthly availability calendar."""

    year: int = Field(
        ...,
        description="Calendar year",
        examples=[2026],
    )
    month: int = Field(
        ...,
        ge=1,
        le=12,
        description="Calendar month (1-12)",
        examples=[7],
    )
    days_in_month: int = Field(
        ...,
        ge=28,
        le=31,
        description="Number of days in this month",
        examples=[31],
    )
    rooms: list[RoomAvailability] = Field(
        ...,
        description="Per-room availability data for each day in the month",
    )
    summary: AvailabilitySummary = Field(
        ...,
        description="Aggregated availability summary counts",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "year": 2026,
                "month": 7,
                "days_in_month": 31,
                "rooms": [
                    {
                        "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                        "room_number": "101",
                        "room_type": "deluxe",
                        "price_per_night": 150.00,
                        "status": "available",
                        "availability": [
                            {"day": 1, "status": "booked"},
                            {"day": 2, "status": "booked"},
                            {"day": 3, "status": "available"},
                        ],
                    },
                ],
                "summary": {
                    "total_rooms": 10,
                    "available": 7,
                    "booked": 2,
                    "maintenance": 1,
                },
            },
        },
    }
