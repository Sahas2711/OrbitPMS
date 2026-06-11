"""
User schemas for OrbitPMS.

Provides Pydantic models for user registration, authentication,
and API response serialization with full input validation.
"""

import uuid
from datetime import datetime

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.enums import UserRole


# ═══════════════════════════════════════════════════════════════
# ── Request Schemas
# ═══════════════════════════════════════════════════════════════


class LoginRequest(BaseModel):
    """Request schema for user login."""

    email: EmailStr = Field(
        ...,
        description="Registered email address",
        examples=["john.doe@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Account password",
        examples=["SecureP@ss1"],
    )


class RegisterRequest(BaseModel):
    """Request schema for user registration.

    Validates all required fields including email format,
    password strength, and role assignment.
    """

    full_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Full name of the user",
        examples=["John Doe"],
    )
    email: EmailStr = Field(
        ...,
        description="Email address (must be unique in the system)",
        examples=["john.doe@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (minimum 8 characters)",
        examples=["SecureP@ss1"],
    )
    role: UserRole = Field(
        default=UserRole.STAFF,
        description="User role for RBAC",
    )

    # ── Field-level validators ──────────────────────────────────

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Validate password meets minimum complexity requirements.

        Requirements:
            - At least 8 characters (enforced by Field min_length)
            - Contains at least one uppercase letter
            - Contains at least one lowercase letter
            - Contains at least one digit
        """
        if not any(c.isupper() for c in value):
            raise ValueError(
                "Password must contain at least one uppercase letter"
            )
        if not any(c.islower() for c in value):
            raise ValueError(
                "Password must contain at least one lowercase letter"
            )
        if not any(c.isdigit() for c in value):
            raise ValueError("Password must contain at least one digit")

        return value

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        """Ensure full_name is not just whitespace."""
        stripped = value.strip()
        if not stripped:
            raise ValueError("full_name cannot be empty or whitespace only")
        return stripped

    # ── Model-level validators ──────────────────────────────────

    @model_validator(mode="after")
    def check_name_not_email(self) -> "RegisterRequest":
        """Prevent users from using their email as their display name."""
        if self.full_name.lower().strip() == self.email.lower().strip():
            raise ValueError("full_name cannot be the same as email")
        return self


# ═══════════════════════════════════════════════════════════════
# ── Response Schemas
# ═══════════════════════════════════════════════════════════════


class RegisterResponse(BaseModel):
    """Response schema returned after successful registration.

    Excludes sensitive fields like password_hash.
    """

    id: uuid.UUID = Field(
        ...,
        description="Unique user identifier",
    )
    full_name: str = Field(
        ...,
        description="Full name of the registered user",
    )
    email: str = Field(
        ...,
        description="Email address of the registered user",
    )
    role: UserRole = Field(
        ...,
        description="Assigned user role",
    )
    is_active: bool = Field(
        ...,
        description="Whether the user account is active",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp of account creation",
    )

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "full_name": "John Doe",
                "email": "john.doe@example.com",
                "role": "staff",
                "is_active": True,
                "created_at": "2026-06-10T12:00:00Z",
            }
        },
    }


class TokenResponse(BaseModel):
    """JWT token payload returned after successful authentication."""

    access_token: str = Field(
        ...,
        description="JWT access token (short-lived)",
    )
    refresh_token: str = Field(
        ...,
        description="JWT refresh token (long-lived)",
    )
    token_type: str = Field(
        default="bearer",
        description="Token type for Authorization header",
    )
    expires_in: int = Field(
        ...,
        description="Access token TTL in seconds",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOi...",
                "refresh_token": "eyJhbGciOi...",
                "token_type": "bearer",
                "expires_in": 1800,
            }
        },
    }


class LoginResponse(BaseModel):
    """Response schema returned after successful login.

    Combines the authenticated user profile with JWT tokens
    so the client has everything needed in one response.
    """

    user: RegisterResponse = Field(
        ...,
        description="Authenticated user profile",
    )
    tokens: TokenResponse = Field(
        ...,
        description="JWT access and refresh tokens",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "user": {
                    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "full_name": "John Doe",
                    "email": "john.doe@example.com",
                    "role": "staff",
                    "is_active": True,
                    "created_at": "2026-06-10T12:00:00Z",
                },
                "tokens": {
                    "access_token": "eyJhbGciOi...",
                    "refresh_token": "eyJhbGciOi...",
                    "token_type": "bearer",
                    "expires_in": 1800,
                },
            }
        },
    }


# ═══════════════════════════════════════════════════════════════
# ── Duplicate Email Validation
# ═══════════════════════════════════════════════════════════════


async def validate_unique_email(
    email: str,
    session,
) -> None:
    """Check that no existing user has the given email.

    This function is intended to be called from the service/repository
    layer during registration, *after* RegisterRequest passes schema
    validation.

    Args:
        email: The email address to check.
        session: An active SQLAlchemy AsyncSession.

    Raises:
        ValueError: If a user with this email already exists.
    """
    from sqlalchemy import select

    from app.models.user import User

    result = await session.execute(
        select(User).where(User.email == email)
    )
    existing_user = result.scalars().first()

    if existing_user is not None:
        raise ValueError(
            f"A user with email '{email}' is already registered."
        )
