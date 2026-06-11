"""
Room management API routes for OrbitPMS v1.

Provides full CRUD operations for hotel rooms with proper
error handling, logging, and OpenAPI documentation.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_role
from app.database.session import get_session
from app.models.user import User
from app.schemas.error import ErrorDetail, ErrorResponse
from app.schemas.room import (
    RoomCreate,
    RoomResponse,
    RoomStatusChange,
    RoomUpdate,
)
from app.services.room import RoomService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rooms", tags=["rooms"])

# ── Authorization helpers ───────────────────────────────────────
# Mutation endpoints require admin or receptionist role

StaffCanMutate = Depends(require_role("admin", "receptionist"))


@router.get(
    "",
    response_model=list[RoomResponse],
    status_code=status.HTTP_200_OK,
    summary="List all rooms",
    description=(
        "Retrieve a paginated list of rooms. Optionally filter by "
        "room status (available, occupied, maintenance) and room type "
        "(standard, deluxe, suite)."
    ),
    responses={
        200: {"description": "List of rooms returned successfully"},
    },
)
async def list_rooms(
    status_param: str | None = Query(
        default=None,
        alias="status",
        description="Filter by room status (available, occupied, maintenance)",
    ),
    room_type: str | None = Query(
        default=None,
        description="Filter by room type (standard, deluxe, suite)",
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
) -> list[RoomResponse]:
    """Get all rooms with optional filtering and pagination."""
    service = RoomService(session=db)
    return await service.get_all_rooms(
        status=status_param,
        room_type=room_type,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{room_id}",
    response_model=RoomResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a room by ID",
    description="Retrieve a single room's details by its UUID.",
    responses={
        200: {"description": "Room found and returned successfully"},
        404: {"model": ErrorResponse, "description": "Room not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def get_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
) -> RoomResponse:
    """Get a single room by its unique identifier."""
    service = RoomService(session=db)

    try:
        return await service.get_room(room_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="room_id",
                message=str(exc),
            ).model_dump(),
        )


@router.post(
    "",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new room",
    description=(
        "Add a new room to the hotel. The room number must be unique "
        "and the room type must be one of: standard, deluxe, suite."
    ),
    responses={
        201: {"description": "Room created successfully"},
        409: {
            "model": ErrorResponse,
            "description": "Room number already exists",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error (invalid input)",
        },
    },
)
async def create_room(
    request: RoomCreate,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> RoomResponse:
    """Create a new hotel room.

    The room number is normalized to uppercase and checked for
    uniqueness before creation.
    """
    service = RoomService(session=db)

    try:
        response = await service.create_room(request, actor=current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(
                field="room_number",
                message=str(exc),
            ).model_dump(),
        )

    logger.info(
        "Room created: number=%s type=%s price=%s",
        response.room_number,
        response.room_type,
        response.price_per_night,
    )
    return response


@router.put(
    "/{room_id}",
    response_model=RoomResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a room",
    description=(
        "Update an existing room's details. All fields are optional — "
        "only provided fields will be updated. The room number uniqueness "
        "is enforced if changed."
    ),
    responses={
        200: {"description": "Room updated successfully"},
        404: {"model": ErrorResponse, "description": "Room not found"},
        409: {
            "model": ErrorResponse,
            "description": "Room number already in use",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error (invalid input)",
        },
    },
)
async def update_room(
    room_id: uuid.UUID,
    request: RoomUpdate,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> RoomResponse:
    """Update an existing room by its ID.

    The room number uniqueness is checked if the room number is
    being changed. Partial updates are supported.
    """
    service = RoomService(session=db)

    try:
        response = await service.update_room(room_id, request, actor=current_user)
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
                field="room_number",
                message=message,
            ).model_dump(),
        )

    logger.info(
        "Room updated: id=%s number=%s",
        room_id,
        response.room_number,
    )
    return response


@router.delete(
    "/{room_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a room",
    description="Delete a room by its UUID. Returns 204 on success.",
    responses={
        204: {"description": "Room deleted successfully"},
        404: {"model": ErrorResponse, "description": "Room not found"},
        422: {"model": ErrorResponse, "description": "Invalid UUID format"},
    },
)
async def delete_room(
    room_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> None:
    """Delete a room by its unique identifier."""
    service = RoomService(session=db)

    try:
        await service.delete_room(room_id, actor=current_user)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(
                field="room_id",
                message=str(exc),
            ).model_dump(),
        )

    logger.info("Room deleted: id=%s", room_id)


@router.patch(
    "/{room_id}/status",
    response_model=RoomResponse,
    status_code=status.HTTP_200_OK,
    summary="Change room status",
    description=(
        "Transition a room to a new status. Valid transitions:\n\n"
        "- **Available** → Occupied, Maintenance\n"
        "- **Occupied** → Available\n"
        "- **Maintenance** → Available\n\n"
        "Invalid transitions return 422."
    ),
    responses={
        200: {"description": "Status updated successfully"},
        404: {"model": ErrorResponse, "description": "Room not found"},
        422: {
            "model": ErrorResponse,
            "description": "Invalid status transition",
        },
    },
)
async def change_room_status(
    room_id: uuid.UUID,
    request: RoomStatusChange,
    db: AsyncSession = Depends(get_session),
    current_user: User = StaffCanMutate,
) -> RoomResponse:
    """Change a room's availability status.

    Requires admin or receptionist role. Uses the status transition
    state machine to validate the change. All changes are logged
    with the acting user's identity for audit purposes.
    """
    service = RoomService(session=db)

    try:
        return await service.change_room_status(
            room_id, request, actor=current_user
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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorDetail(
                field="status",
                message=message,
            ).model_dump(),
        )
