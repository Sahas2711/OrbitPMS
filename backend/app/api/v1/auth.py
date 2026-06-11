"""
Authentication routes for OrbitPMS API v1.

Handles user registration and future authentication endpoints
(login, token refresh, etc.).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.schemas.error import ErrorDetail, ErrorResponse
from app.schemas.user import RegisterRequest, RegisterResponse
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
