"""
User service for OrbitPMS.

Implements core business logic for user registration and login
including password hashing, credential verification, and JWT generation.
"""

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.repositories.user import UserRepository
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)

logger = logging.getLogger(__name__)


class UserService:
    """Service layer for user operations.

    Encapsulates business rules and orchestrates repository calls.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)

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
        """
        # 1. Check for duplicate email
        existing = await self._repo.get_by_email(request.email)
        if existing is not None:
            raise ValueError(
                f"A user with email '{request.email}' is already registered."
            )

        # 2. Hash the password
        password_hash = get_password_hash(request.password)

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

    async def login(self, request: LoginRequest) -> LoginResponse:
        """Authenticate a user and return JWT tokens with user profile.

        Args:
            request: Validated login payload.

        Returns:
            A LoginResponse combining user profile and JWT tokens.

        Raises:
            ValueError: If credentials are invalid or account is inactive.
        """
        user = await self._repo.get_by_email(request.email)
        if user is None:
            raise ValueError("Invalid email or password.")

        if not user.is_active:
            raise ValueError("Account is inactive. Contact an administrator.")

        if not verify_password(request.password, user.password_hash):
            raise ValueError("Invalid email or password.")

        # Generate tokens
        access_token = create_access_token(
            subject=user.id,
            extra_data={"role": user.role, "email": user.email},
        )
        refresh_token = create_refresh_token(subject=user.id)

        expires_in_seconds = settings.access_token_expire_minutes * 60

        logger.info(
            "User logged in: email=%s role=%s",
            user.email,
            user.role,
        )
        return LoginResponse(
            user=RegisterResponse(
                id=user.id,
                full_name=user.full_name,
                email=user.email,
                role=user.role,
                is_active=user.is_active,
                created_at=user.created_at,
            ),
            tokens=TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=expires_in_seconds,
            ),
        )
