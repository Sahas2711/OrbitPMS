"""
Room service for OrbitPMS.

Implements core business logic for room management including
CRUD operations, duplicate detection, and status validation.
"""

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.room import RoomRepository
from app.schemas.room import (
    RoomCreate,
    RoomResponse,
    RoomStatusChange,
    RoomUpdate,
    validate_status_transition,
)

logger = logging.getLogger(__name__)


class RoomService:
    """Service layer for room operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = RoomRepository(session)

    # ── Audit helpers ──────────────────────────────────────────────

    @staticmethod
    def _audit_log(
        action: str,
        details: dict,
        actor: User | None = None,
    ) -> None:
        """Emit a structured audit log entry.

        Args:
            action: The action being performed (e.g. 'room.create').
            details: Key-value pairs describing the change.
            actor: The user performing the action, if available.
        """
        actor_identity = f"{actor.email} ({actor.role})" if actor else "system"
        details_str = " | ".join(f"{k}={v}" for k, v in details.items())
        logger.info(
            "AUDIT: %s — actor=%s [%s]",
            action,
            actor_identity,
            details_str,
        )

    async def create_room(
        self,
        request: RoomCreate,
        actor: User | None = None,
    ) -> RoomResponse:
        """Create a new room.

        Args:
            request: Validated room creation payload.
            actor: The user creating the room (for audit logging).

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

        self._audit_log(
            "room.create",
            {
                "room_id": str(room.id),
                "room_number": room.room_number,
                "room_type": room.room_type,
                "price_per_night": str(room.price_per_night),
            },
            actor=actor,
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
        actor: User | None = None,
    ) -> RoomResponse:
        """Update an existing room.

        Args:
            room_id: The UUID of the room to update.
            request: Validated partial update payload.
            actor: The user updating the room (for audit logging).

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

        # 3. Validate status transition if status is changing
        if request.status is not None:
            validate_status_transition(existing.status, request.status)

        # 4. Update the room
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

        # Build a summary of what changed
        changed_fields = {}
        if request.room_number is not None:
            changed_fields["room_number"] = request.room_number
        if request.room_type is not None:
            changed_fields["room_type"] = request.room_type
        if request.price_per_night is not None:
            changed_fields["price_per_night"] = str(request.price_per_night)
        if request.status is not None:
            changed_fields["status"] = request.status.value
        if request.description is not None:
            changed_fields["description"] = "<updated>"

        self._audit_log(
            "room.update",
            {
                "room_id": str(room_id),
                "changed_fields": changed_fields,
            },
            actor=actor,
        )

        return self._to_response(room)

    async def delete_room(
        self,
        room_id: uuid.UUID,
        actor: User | None = None,
    ) -> None:
        """Delete a room.

        Args:
            room_id: The UUID of the room to delete.
            actor: The user deleting the room (for audit logging).

        Raises:
            ValueError: If the room does not exist.
        """
        room = await self._repo.get_by_id(room_id)
        if room is None:
            raise ValueError(f"Room with id '{room_id}' not found.")

        await self._repo.delete(room_id)

        self._audit_log(
            "room.delete",
            {
                "room_id": str(room_id),
                "room_number": room.room_number,
            },
            actor=actor,
        )

    async def change_room_status(
        self,
        room_id: uuid.UUID,
        request: RoomStatusChange,
        actor: User | None = None,
    ) -> RoomResponse:
        """Change a room's availability status.

        Validates the transition against the allowed state machine:
            Available  →  Occupied, Maintenance
            Occupied   →  Available
            Maintenance →  Available

        Args:
            room_id: The UUID of the room.
            request: The desired new status.
            actor: The user changing the status (for audit logging).

        Returns:
            A RoomResponse with the updated room.

        Raises:
            ValueError: If the room does not exist or the transition
                is not allowed.
        """
        # 1. Verify room exists
        existing = await self._repo.get_by_id(room_id)
        if existing is None:
            raise ValueError(f"Room with id '{room_id}' not found.")

        # 2. Validate the transition
        validate_status_transition(existing.status, request.status)

        # 3. Apply the new status
        room = await self._repo.update(
            room_id=room_id,
            status=request.status,
        )
        assert room is not None

        self._audit_log(
            "room.status_change",
            {
                "room_id": str(room_id),
                "room_number": room.room_number,
                "from_status": existing.status.value,
                "to_status": room.status.value,
            },
            actor=actor,
        )

        return self._to_response(room)

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
