"""
Users management routes for OrbitPMS API v1.

Admin-only endpoints for managing system users.
"""

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.error import ErrorDetail
from app.schemas.user import RegisterRequest, RegisterResponse
from app.services.user import UserService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get(
    "",
    response_model=list[RegisterResponse],
    summary="List all users",
    description="Retrieve all registered users (admin only).",
)
async def list_users(
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all users. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorDetail(field=None, message="Admin access required").model_dump(),
        )
    service = UserService(session=db)
    return await service.list_users()


@router.post(
    "",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Create a new user with specified role (admin only).",
)
async def create_user(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new user. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorDetail(field=None, message="Admin access required").model_dump(),
        )
    service = UserService(session=db)
    try:
        return await service.create_user(
            full_name=request.full_name,
            email=request.email,
            password=request.password,
            role=request.role.value,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=ErrorDetail(field="email", message=str(exc)).model_dump(),
        )


@router.patch(
    "/{user_id}/status",
    response_model=RegisterResponse,
    summary="Toggle user active status",
    description="Enable or disable a user account (admin only).",
)
async def toggle_user_status(
    user_id: uuid.UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Toggle user active status. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorDetail(field=None, message="Admin access required").model_dump(),
        )
    service = UserService(session=db)
    try:
        return await service.toggle_user_status(user_id, is_active)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(field=None, message=str(exc)).model_dump(),
        )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a user",
    description="Delete a user account (admin only).",
)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Delete a user. Requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ErrorDetail(field=None, message="Admin access required").model_dump(),
        )
    service = UserService(session=db)
    try:
        await service.delete_user(user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ErrorDetail(field=None, message=str(exc)).model_dump(),
        )
