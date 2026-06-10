"""
User service for OrbitPMS.

Implements core business logic for user management including
registration, password hashing, and duplicate detection.
"""

import logging

import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.user import UserRepository
from app.schemas.error import ErrorDetail
from app.schemas.user import RegisterRequest, RegisterResponse

logger = logging.getLogger(__name__)


class UserService:
    """Service layer for user operations.

    Encapsulates business rules and orchestrates repository calls.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)

    # ── Password helpers ────────────────────────────────────────

    @staticmethod
    def hash_password(plain_password: str) -> str:
        """Hash a plaintext password using bcrypt.

        Args:
            plain_password: The raw password string.

        Returns:
            A bcrypt hash string suitable for storage.
        """
        return bcrypt.hashpw(
            plain_password.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

    # ── Registration ────────────────────────────────────────────

    async def register(self, request: RegisterRequest) -> RegisterResponse:
        """Register a new user.

        Validates uniqueness, hashes the password, persists the
        record, and returns a safe response DTO.

        Args:
            request: Validated registration payload.

        Returns:
            A RegisterResponse with the created user's data.

        Raises:
            ValueError: If the email is already taken.
            RuntimeError: If the database operation fails unexpectedly.
        """
        # 1. Check for duplicate email
        existing = await self._repo.get_by_email(request.email)
        if existing is not None:
            raise ValueError(
                f"A user with email '{request.email}' is already registered."
            )

        # 2. Hash the password
        password_hash = self.hash_password(request.password)

        # 3. Create the user record
        user = await self._repo.create(
            full_name=request.full_name,
            email=request.email,
            password_hash=password_hash,
            role=request.role.value,
        )

        # 4. Map to response DTO
        return RegisterResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )
