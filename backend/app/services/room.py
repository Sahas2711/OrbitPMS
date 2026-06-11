"""
Room service for OrbitPMS.

Implements core business logic for room management including
CRUD operations, duplicate detection, and status validation.
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.room import RoomRepository
from app.schemas.room import RoomCreate, RoomResponse, RoomUpdate

logger = logging.getLogger(__name__)


class RoomService:
    """Service layer for room operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = RoomRepository(session)

    async def create_room(self, request: RoomCreate) -> RoomResponse:
        """Create a new room.

        Args:
            request: Validated room creation payload.

        Returns:
            A RoomResponse with the created room's data.

        Raises:
            ValueError: If the room number is already taken.
        """
        # 1. Check for duplicate room number
        existing = await self._repo.get_by_room_number(request.room_number)
        if existing is not None:
            raise ValueError(
                f"A room with number '{request.room_number}' already exists."
            )

        # 2. Create the room record
        room = await self._repo.create(
            room_number=request.room_number,
            room_type=request.room_type,
            price_per_night=request.price_per_night,
            description=request.description,
        )

        logger.info(
            "Room created: number=%s type=%s price=%s",
            room.room_number,
            room.room_type,
            room.price_per_night,
        )

        return self._to_response(room)

    async def get_room(self, room_id: uuid.UUID) -> RoomResponse:
        """Get a single room by ID.

        Args:
            room_id: The UUID of the room.

        Returns:
            A RoomResponse with the room's data.

        Raises:
            ValueError: If the room does not exist.
        """
        room = await self._repo.get_by_id(room_id)
        if room is None:
            raise ValueError(f"Room with id '{room_id}' not found.")
        return self._to_response(room)

    async def get_all_rooms(
        self,
        status: str | None = None,
        room_type: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[RoomResponse]:
        """Fetch all rooms with optional filters.

        Args:
            status: Optional filter by room status.
            room_type: Optional filter by room type.
            skip: Number of records to skip.
            limit: Maximum records to return.

        Returns:
            A list of RoomResponse DTOs.
        """
        rooms = await self._repo.get_all(
            status=status,
            room_type=room_type,
            skip=skip,
            limit=limit,
        )
        return [self._to_response(room) for room in rooms]

    async def update_room(
        self,
        room_id: uuid.UUID,
        request: RoomUpdate,
    ) -> RoomResponse:
        """Update an existing room.

        Args:
            room_id: The UUID of the room to update.
            request: Validated partial update payload.

        Returns:
            A RoomResponse with the updated room's data.

        Raises:
            ValueError: If the room does not exist, or the new room
                number conflicts with an existing room.
        """
        # 1. Verify room exists
        existing = await self._repo.get_by_id(room_id)
        if existing is None:
            raise ValueError(f"Room with id '{room_id}' not found.")

        # 2. If room number is changing, check uniqueness
        if (
            request.room_number is not None
            and request.room_number != existing.room_number
        ):
            conflict = await self._repo.get_by_room_number(
                request.room_number
            )
            if conflict is not None:
                raise ValueError(
                    f"A room with number '{request.room_number}' "
                    "already exists."
                )

        # 3. Update the room
        room = await self._repo.update(
            room_id=room_id,
            room_number=request.room_number,
            room_type=request.room_type,
            price_per_night=request.price_per_night,
            status=request.status,
            description=request.description,
        )

        # Room should exist since we checked above
        assert room is not None

        logger.info(
            "Room updated: id=%s number=%s",
            room_id,
            room.room_number,
        )
        return self._to_response(room)

    async def delete_room(self, room_id: uuid.UUID) -> None:
        """Delete a room.

        Args:
            room_id: The UUID of the room to delete.

        Raises:
            ValueError: If the room does not exist.
        """
        room = await self._repo.get_by_id(room_id)
        if room is None:
            raise ValueError(f"Room with id '{room_id}' not found.")

        await self._repo.delete(room_id)

        logger.info("Room deleted: id=%s number=%s", room_id, room.room_number)

    # ── Helpers ─────────────────────────────────────────────────

    @staticmethod
    def _to_response(room) -> RoomResponse:
        """Map a Room ORM instance to a RoomResponse DTO."""
        return RoomResponse(
            id=room.id,
            room_number=room.room_number,
            room_type=room.room_type,
            price_per_night=room.price_per_night,
            status=room.status,
            description=room.description,
            created_at=room.created_at,
        )
