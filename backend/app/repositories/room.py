"""
Room repository for OrbitPMS.

Implements data access layer for the rooms table with full
CRUD operations following the repository pattern.
"""

import uuid
from decimal import Decimal

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.room import Room


class RoomRepository:
    """Repository for Room database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        room_number: str,
        room_type: str,
        price_per_night: Decimal,
        description: str | None = None,
    ) -> Room:
        """Create a new room record.

        Args:
            room_number: Unique room number.
            room_type: Room category (standard, deluxe, suite).
            price_per_night: Price per night.
            description: Optional room description.

        Returns:
            The newly created Room ORM instance.
        """
        room = Room(
            room_number=room_number,
            room_type=room_type,
            price_per_night=price_per_night,
            description=description,
        )
        self._session.add(room)
        await self._session.flush()
        await self._session.refresh(room)
        return room

    async def get_by_id(self, room_id: uuid.UUID) -> Room | None:
        """Fetch a room by its primary key."""
        return await self._session.get(Room, room_id)

    async def get_by_room_number(self, room_number: str) -> Room | None:
        """Fetch a room by its room number (case-insensitive lookup)."""
        result = await self._session.execute(
            select(Room).where(
                Room.room_number == room_number.strip().upper()
            )
        )
        return result.scalars().first()

    async def get_all(
        self,
        status: str | None = None,
        room_type: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Room]:
        """Fetch all rooms with optional filters.

        Args:
            status: Optional filter by room status.
            room_type: Optional filter by room type.
            skip: Number of records to skip (pagination).
            limit: Maximum number of records to return.

        Returns:
            A list of matching Room instances.
        """
        query = select(Room)

        if status is not None:
            query = query.where(Room.status == status)
        if room_type is not None:
            query = query.where(Room.room_type == room_type)

        query = query.order_by(Room.room_number).offset(skip).limit(limit)

        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def update(
        self,
        room_id: uuid.UUID,
        **kwargs,
    ) -> Room | None:
        """Update a room record with the given keyword arguments.

        Only provided fields are updated. Returns the updated
        Room instance, or None if the room does not exist.

        Args:
            room_id: The UUID of the room to update.
            **kwargs: Fields to update (room_number, room_type, etc.).

        Returns:
            The updated Room, or None if not found.
        """
        # Remove None values so we don't overwrite with null
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        if not update_data:
            return await self.get_by_id(room_id)

        # Exclude any keys that don't belong to the Room model
        valid_columns = {c.name for c in Room.__table__.columns}
        update_data = {
            k: v for k, v in update_data.items() if k in valid_columns
        }

        if not update_data:
            return await self.get_by_id(room_id)

        stmt = (
            update(Room)
            .where(Room.id == room_id)
            .values(**update_data)
            .returning(Room)
        )
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalars().first()

    async def delete(self, room_id: uuid.UUID) -> bool:
        """Delete a room record.

        Args:
            room_id: The UUID of the room to delete.

        Returns:
            True if a room was deleted, False otherwise.
        """
        stmt = delete(Room).where(Room.id == room_id).returning(Room.id)
        result = await self._session.execute(stmt)
        await self._session.flush()
        return result.scalars().first() is not None
