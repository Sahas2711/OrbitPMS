"""
User repository for OrbitPMS.

Provides data access methods for the User model following
the repository pattern. All database interactions go through
this layer.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class UserRepository:
    """Repository for User database operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        role: str = "staff",
    ) -> User:
        """Create a new user record.

        Args:
            full_name: User's display name.
            email: Unique email address.
            password_hash: Bcrypt hash of the user's password.
            role: User role string (default: ``"staff"``).

        Returns:
            The newly created User ORM instance.
        """
        user = User(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role,
        )
        self._session.add(user)
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def get_by_email(self, email: str) -> User | None:
        """Look up a user by email address.

        Args:
            email: The email to search for.

        Returns:
            The matching User, or None if not found.
        """
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalars().first()

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Look up a user by primary key.

        Args:
            user_id: The UUID of the user.

        Returns:
            The matching User, or None if not found.
        """
        return await self._session.get(User, user_id)

    async def get_all(self) -> list[User]:
        """Retrieve all users.

        Returns:
            List of all User records.
        """
        result = await self._session.execute(
            select(User).order_by(User.created_at.desc())
        )
        return list(result.scalars().all())

    async def update_status(self, user_id: uuid.UUID, is_active: bool) -> User | None:
        """Update a user's active status.

        Args:
            user_id: The UUID of the user.
            is_active: New active status.

        Returns:
            The updated User, or None if not found.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.is_active = is_active
        await self._session.flush()
        await self._session.refresh(user)
        return user

    async def delete(self, user_id: uuid.UUID) -> bool:
        """Delete a user by ID.

        Args:
            user_id: The UUID of the user.

        Returns:
            True if deleted, False if not found.
        """
        user = await self.get_by_id(user_id)
        if user is None:
            return False
        await self._session.delete(user)
        await self._session.flush()
        return True
