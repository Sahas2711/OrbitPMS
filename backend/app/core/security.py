"""
Security utilities for OrbitPMS.

Provides JWT token management (access & refresh tokens), password
hashing/verification, and FastAPI dependency injection for
authenticated and role-protected routes.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_session
from app.models.user import User
from app.repositories.user import UserRepository

# ── OAuth2 scheme ───────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

# ── Token type constants ────────────────────────────────────────

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"

# ── JWT Helpers ─────────────────────────────────────────────────


def _build_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """Build and sign a JWT token."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_data:
        payload.update(extra_data)

    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(
    subject: str | uuid.UUID,
    extra_data: dict[str, Any] | None = None,
) -> str:
    """Generate a short-lived access token (default 30 minutes)."""
    sub = str(subject)
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    return _build_token(sub, ACCESS_TOKEN_TYPE, expires_delta, extra_data)


def create_refresh_token(
    subject: str | uuid.UUID,
) -> str:
    """Generate a long-lived refresh token (default 7 days)."""
    sub = str(subject)
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    return _build_token(sub, REFRESH_TOKEN_TYPE, expires_delta)


def verify_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token.

    Raises HTTPException(401) if the token is invalid or expired.
    """
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Password Helpers ────────────────────────────────────────────


def get_password_hash(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ── FastAPI Dependencies ───────────────────────────────────────


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    """FastAPI dependency that extracts and validates the current user.

    Decodes the Bearer token, fetches the user from the database,
    and verifies the account is active.

    Raises HTTPException(401) on any validation failure.
    """
    payload = verify_token(token)

    subject: str | None = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    token_type: str | None = payload.get("type")
    if token_type != ACCESS_TOKEN_TYPE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type for this endpoint",
        )

    try:
        user_id = uuid.UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject format",
        )

    repo = UserRepository(session)
    user = await repo.get_by_id(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user account",
        )

    return user


def require_role(*roles: str):
    """Factory that returns a dependency requiring one of the given roles.

    Usage::

        @router.get("/admin-only")
        async def admin_route(
            current_user: User = Depends(require_role("admin")),
        ):
            ...
    """
    async def _role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role '{current_user.role}' is not authorized. "
                    f"Required one of: {', '.join(roles)}"
                ),
            )
        return current_user

    return _role_checker
