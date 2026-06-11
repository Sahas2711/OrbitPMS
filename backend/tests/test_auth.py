"""
Integration tests for the POST /api/v1/auth/register endpoint.

Uses FastAPI TestClient with mocked database session to
verify request handling, validation, and exception mapping.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock
from uuid import UUID

import pytest
from fastapi import status
from httpx import AsyncClient, ASGITransport

from app.core.enums import UserRole
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _fake_user_response(overrides: dict | None = None) -> dict:
    """Build a fake RegisterResponse dict for mocking."""
    defaults = {
        "id": UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6"),
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "role": UserRole.STAFF,
        "is_active": True,
        "created_at": datetime(2026, 6, 10, 12, 0, 0, tzinfo=timezone.utc),
    }
    defaults.update(overrides or {})
    return defaults


@pytest.mark.asyncio
async def test_register_success(monkeypatch):
    """POST /api/v1/auth/register with valid data returns 201."""
    fake_user = _fake_user_response()

    async def mock_register(self, request):
        from app.schemas.user import RegisterResponse

        return RegisterResponse(**fake_user)

    monkeypatch.setattr("app.api.v1.auth.UserService.register", mock_register)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "password": "ValidP@ss1",
            "role": "staff",
        }
        resp = await ac.post("/api/v1/auth/register", json=payload)

    assert resp.status_code == status.HTTP_201_CREATED
    body = resp.json()
    assert body["email"] == "john.doe@example.com"
    assert body["full_name"] == "John Doe"
    assert body["role"] == "staff"
    assert body["is_active"] is True
    assert "id" in body
    assert "created_at" in body
    # Sensitive fields must NOT be present
    assert "password" not in body
    assert "password_hash" not in body


@pytest.mark.asyncio
async def test_register_duplicate_email(monkeypatch):
    """Duplicate email should return 409 Conflict."""
    async def mock_register(self, request):
        raise ValueError(
            "A user with email 'john.doe@example.com' is already registered."
        )

    monkeypatch.setattr("app.api.v1.auth.UserService.register", mock_register)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "password": "ValidP@ss1",
            "role": "staff",
        }
        resp = await ac.post("/api/v1/auth/register", json=payload)

    assert resp.status_code == status.HTTP_409_CONFLICT
    body = resp.json()
    assert "already registered" in body["detail"]["message"]


@pytest.mark.asyncio
async def test_register_internal_error(monkeypatch):
    """Unexpected database errors should return 500."""
    async def mock_register(self, request):
        raise RuntimeError("An unexpected error occurred.")

    monkeypatch.setattr("app.api.v1.auth.UserService.register", mock_register)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "full_name": "John Doe",
            "email": "john.doe@example.com",
            "password": "ValidP@ss1",
            "role": "staff",
        }
        resp = await ac.post("/api/v1/auth/register", json=payload)

    assert resp.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "unexpected error" in resp.json()["detail"]["message"].lower()


@pytest.mark.asyncio
async def test_register_validation_error():
    """Invalid payload should return 422 Unprocessable Entity."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/auth/register",
            json={
                "full_name": "",
                "email": "not-an-email",
                "password": "weak",
                "role": "staff",
            },
        )

    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    body = resp.json()
    assert "detail" in body
