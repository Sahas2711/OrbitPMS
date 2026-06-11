"""
Authentication routes for OrbitPMS API v1.

Handles user registration and login with JWT token generation.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas.error import ErrorDetail, ErrorResponse
from app.schemas.user import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
)
from app.services.user import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description=(
        "Creates a new user account. Validates email uniqueness, "
        "password strength, and returns the sanitized user profile."
    ),
    responses={
        201: {"description": "User registered successfully"},
        409: {
            "model": ErrorResponse,
            "description": "Email already registered",
        },
        422: {
            "model": ErrorResponse,
            "description": "Validation error (invalid input)",
        },
        500: {
            "model": ErrorResponse,
            "description": "Internal server error",
        },
    },
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_session),
) -> RegisterResponse:
    """Register a new system user.

    The password is validated for minimum complexity, hashed with
    bcrypt, and the user record is persisted to the database.
    """
    service = UserService(session=db)

    try:
        response = await service.register(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(
                field="email",
                message=str(exc),
            ).model_dump(),
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorDetail(
                field=None,
                message=str(exc),
            ).model_dump(),
        )

    logger.info(
        "User registered: email=%s role=%s",
        response.email,
        response.role,
    )
    return response


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user",
    description="Validates credentials and returns the user profile with JWT tokens.",
    responses={
        200: {"description": "Login successful, user profile and tokens returned"},
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Inactive account"},
        422: {"model": ErrorResponse, "description": "Validation error"},
    },
)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_session),
) -> LoginResponse:
    """Authenticate a user and return JWT tokens with user profile."""
    service = UserService(session=db)

    try:
        tokens = await service.login(request)
    except ValueError as exc:
        message = str(exc)

        if "inactive" in message.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorDetail(
                    field=None,
                    message=message,
                ).model_dump(),
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ErrorDetail(
                field=None,
                message=message,
            ).model_dump(),
        )

    return tokens
