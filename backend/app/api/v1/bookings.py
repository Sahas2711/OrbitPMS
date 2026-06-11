"""
Booking management API routes for OrbitPMS v1.

Provides booking creation with room availability validation,
estimated charge calculation, and audit logging.
"""

import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_role
from app.database.session import get_session
from app.models.user import User
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    BookingUpdate,
)
from app.schemas.error import ErrorDetail, ErrorResponse
from app.services.booking import BookingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/bookings", tags=["bookings"])

# ── Authorization helpers ───────────────────────────────────────
# Staff can read bookings; admin and receptionist can mutate

StaffCanMutate = Depends(require_role("admin", "receptionist"))


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new booking",
    description=(
        "Create a hotel room booking for a guest. "
        "The system validates that the room exists, is not under maintenance, "
        "has no date conflicts with existing active bookings, "
        "and automatically calculates the estimated total (nights × room price)."
    ),
    responses={
        201: {"description": "Booking created successfully"},
        404: {
            "model": ErrorResponse,
            "description": "Room not found",
        },
        409: {
            "model": ErrorResponse,
            "description": "Room unavailable or date conflict",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error (invalid input)",
        },
    },
)
async def create_booking(
    request: BookingCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> BookingResponse:
    """Create a new booking.

    Validates room existence and availability, calculates the
    estimated total amount (room price × nights), and persists
    the booking with an audit trail.

    - **Room existence**: Returns 404 if the room ID is invalid.
    - **Maintenance**: Returns 409 if the room is under maintenance.
    - **Date conflict**: Returns 409 if dates overlap an active booking.
    - **Charge calculation**: `total_amount = room.price_per_night × nights`
    """
    service = BookingService(session=db)

    try:
        response = await service.create_booking(
            request,
            actor=current_user,
        )
    except ValueError as exc:
        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorDetail(
                    field="room_id",
                    message=message,
                ).model_dump(),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(
                field="room_id",
                message=message,
            ).model_dump(),
        )

    logger.info(
        "Booking created: id=%s guest=%s room=%s amount=%s",
        response.id,
        response.guest_name,
        response.room_id,
        response.total_amount,
    )
    return response


@router.get(
    "",
    response_model=list[BookingResponse],
    status_code=status.HTTP_200_OK,
    summary="List all bookings",
    description=(
        "Retrieve a paginated list of bookings. Optionally filter by "
        "booking status, room ID, or date range."
    ),
    responses={
        200: {"description": "List of bookings returned successfully"},
    },
)
async def list_bookings(
    status: str | None = Query(
        default=None,
        description="Filter by booking status (confirmed, checked_in, checked_out, cancelled)",
    ),
    room_id: uuid.UUID | None = Query(
        default=None,
        description="Filter by room UUID",
    ),
    date_from: str | None = Query(
        default=None,
        description="Start date filter (inclusive, ISO format YYYY-MM-DD)",
    ),
    date_to: str | None = Query(
        default=None,
        description="End date filter (inclusive, ISO format YYYY-MM-DD)",
    ),
    skip: int = Query(
        default=0,
        ge=0,
        description="Number of records to skip (pagination)",
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
        description="Maximum number of records to return",
    ),
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[BookingResponse]:
    """Get all bookings with optional filtering and pagination.

    Supports filtering by status, room ID, and date range.
    Date parameters should be ISO format strings (e.g. '2026-07-01').
    """
    service = BookingService(session=db)

    # Parse optional date strings
    parsed_date_from = None
    parsed_date_to = None

    if date_from:
        try:
            parsed_date_from = date.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorDetail(
                    field="date_from",
                    message=f"Invalid date format '{date_from}'. Use YYYY-MM-DD.",
                ).model_dump(),
            )

    if date_to:
        try:
            parsed_date_to = date.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=ErrorDetail(
                    field="date_to",
                    message=f"Invalid date format '{date_to}'. Use YYYY-MM-DD.",
                ).model_dump(),
            )

    return await service.get_all_bookings(
        status=status,
        room_id=room_id,
        date_from=parsed_date_from,
        date_to=parsed_date_to,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a booking by ID",
    description="Retrieve a single booking's details by its UUID.",
    responses={
        200: {"description": "Booking found and returned successfully"},
        404: {"model": ErrorResponse, "description": "Booking not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def get_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> BookingResponse:
    """Get a single booking by its unique identifier."""
    service = BookingService(session=db)

    try:
        return await service.get_booking(booking_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="booking_id",
                message=str(exc),
            ).model_dump(),
        )


@router.put(
    "/{booking_id}",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a booking",
    description=(
        "Update an existing booking's details. All fields are optional — "
        "only provided fields will be updated. If dates are changed, "
        "availability is re-checked excluding the current booking."
    ),
    responses={
        200: {"description": "Booking updated successfully"},
        404: {"model": ErrorResponse, "description": "Booking not found"},
        409: {
            "model": ErrorResponse,
            "description": "Date conflict with another booking",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error (invalid input)",
        },
    },
)
async def update_booking(
    booking_id: uuid.UUID,
    request: BookingUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> BookingResponse:
    """Update an existing booking by its ID.

    If check-in or check-out dates are changed, the system
    re-validates room availability excluding this booking.
    """
    service = BookingService(session=db)

    try:
        response = await service.update_booking(
            booking_id,
            request,
            actor=current_user,
        )
    except ValueError as exc:
        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorDetail(
                    field="booking_id",
                    message=message,
                ).model_dump(),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(
                field="room_id",
                message=message,
            ).model_dump(),
        )

    logger.info(
        "Booking updated: id=%s guest=%s",
        booking_id,
        response.guest_name,
    )
    return response


@router.delete(
    "/{booking_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a booking",
    description="Delete a booking by its UUID. Returns 204 on success.",
    responses={
        204: {"description": "Booking deleted successfully"},
        404: {"model": ErrorResponse, "description": "Booking not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def delete_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> None:
    """Delete a booking by its unique identifier."""
    service = BookingService(session=db)

    try:
        await service.delete_booking(booking_id, actor=current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="booking_id",
                message=str(exc),
            ).model_dump(),
        )

    logger.info("Booking deleted: id=%s", booking_id)


@router.post(
    "/{booking_id}/check-in",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Check in a guest",
    description=(
        "Check a guest into their room. The booking must be in "
        "'confirmed' status and the check-in date must be today "
        "or earlier. Atomically updates the booking status to "
        "'checked_in' and the room status to 'occupied'."
    ),
    responses={
        200: {"description": "Guest checked in successfully"},
        404: {"model": ErrorResponse, "description": "Booking not found"},
        409: {
            "model": ErrorResponse,
            "description": "Booking not in confirmed status or check-in date in the future",
        },
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def check_in_booking(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> BookingResponse:
    """Check a guest into their room.

    Validates the booking is in 'confirmed' status and the check-in
    date has arrived. Then atomically:
    - Sets booking status to 'checked_in'
    - Sets room status to 'occupied'

    Both changes are part of a single database transaction.
    """
    service = BookingService(session=db)

    try:
        return await service.check_in(
            booking_id,
            actor=current_user,
        )
    except ValueError as exc:
        message = str(exc)

        if "not found" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=ErrorDetail(
                    field="booking_id",
                    message=message,
                ).model_dump(),
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(
                field="booking_id",
                message=message,
            ).model_dump(),
        )
