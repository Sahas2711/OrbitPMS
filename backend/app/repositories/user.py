"""
User repository for OrbitPMS.

Implements data access layer for the users table using
SQLAlchemy 2.0 async patterns.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import UserRole
from app.models.user import User


class UserRepository:
    """Data access layer for User operations."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch a user by their primary key."""
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by their email address."""
        result = await self._session.execute(
            select(User).where(User.email == email)
        )
        return result.scalars().first()

    async def create(
        self,
        full_name: str,
        email: str,
        password_hash: str,
        role: str = "staff",
    ) -> User:
        """Create a new user record and flush to get the ID."""
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


