"""
Integration tests for OrbitPMS authentication endpoints.

Tests both /api/v1/auth/register and /api/v1/auth/login using
mocked UserService to avoid database dependency.
"""

import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.schemas.user import LoginResponse, RegisterResponse, TokenResponse


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ═══════════════════════════════════════════════════════════════
# ── Register Endpoint Tests
# ═══════════════════════════════════════════════════════════════


class TestRegister:
    """Tests for POST /api/v1/auth/register."""

    @pytest.fixture(autouse=True)
    def mock_user_service(self):
        """Mock UserService to avoid database dependency."""
        with patch("app.api.v1.auth.UserService") as mock:
            self._service_instance = AsyncMock()
            self._service_instance.register = AsyncMock()
            mock.return_value = self._service_instance
            yield mock

    VALID_PAYLOAD = {
        "full_name": "John Doe",
        "email": "john@example.com",
        "password": "SecureP@ss1",
        "role": "staff",
    }

    async def test_register_success(self):
        """A valid registration should return 201 with user data."""
        user_id = uuid.uuid4()
        self._service_instance.register.return_value = RegisterResponse(
            id=user_id,
            full_name="John Doe",
            email="john@example.com",
            role="staff",
            is_active=True,
            created_at="2026-06-10T12:00:00Z",
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/auth/register", json=self.VALID_PAYLOAD)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "john@example.com"
        assert data["full_name"] == "John Doe"
        assert data["role"] == "staff"
        assert data["is_active"] is True
        # Sensitive fields must not be present
        assert "password" not in data
        assert "password_hash" not in data

    async def test_register_duplicate_email(self):
        """A duplicate email should return 409."""
        self._service_instance.register.side_effect = ValueError(
            "A user with email 'john@example.com' is already registered."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/auth/register", json=self.VALID_PAYLOAD)

        assert response.status_code == 409
        assert "already registered" in response.text.lower()

    async def test_register_validation_error(self):
        """Invalid payload should return 422."""
        invalid_payload = {
            "full_name": "J",
            "email": "not-an-email",
            "password": "short",
            "role": "invalid_role",
        }

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register", json=invalid_payload
            )

        assert response.status_code == 422


# ═══════════════════════════════════════════════════════════════
# ── Login Endpoint Tests
# ═══════════════════════════════════════════════════════════════


class TestLogin:
    """Tests for POST /api/v1/auth/login."""

    @pytest.fixture(autouse=True)
    def mock_user_service(self):
        """Mock UserService to avoid database dependency."""
        with patch("app.api.v1.auth.UserService") as mock:
            self._service_instance = AsyncMock()
            self._service_instance.login = AsyncMock()
            mock.return_value = self._service_instance
            yield mock

    VALID_PAYLOAD = {
        "email": "john@example.com",
        "password": "SecureP@ss1",
    }

    async def test_login_success(self):
        """Valid credentials should return 200 with user profile and tokens."""
        user_id = uuid.uuid4()
        self._service_instance.login.return_value = LoginResponse(
            user=RegisterResponse(
                id=user_id,
                full_name="John Doe",
                email="john@example.com",
                role="staff",
                is_active=True,
                created_at="2026-06-10T12:00:00Z",
            ),
            tokens=TokenResponse(
                access_token="eyJhbGciOiJIUzI1NiIs...",
                refresh_token="eyJhbGciOiJIUzI1NiIs...",
                token_type="bearer",
                expires_in=1800,
            ),
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/auth/login", json=self.VALID_PAYLOAD)

        assert response.status_code == 200
        data = response.json()
        # User profile assertions
        assert "user" in data
        assert data["user"]["email"] == "john@example.com"
        assert data["user"]["full_name"] == "John Doe"
        assert data["user"]["role"] == "staff"
        assert "password" not in str(data)
        assert "password_hash" not in str(data)
        # Token assertions
        assert "tokens" in data
        assert data["tokens"]["access_token"] == "eyJhbGciOiJIUzI1NiIs..."
        assert data["tokens"]["token_type"] == "bearer"
        assert data["tokens"]["expires_in"] == 1800

    async def test_login_invalid_credentials(self):
        """Invalid credentials should return 401."""
        self._service_instance.login.side_effect = ValueError(
            "Invalid email or password."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/auth/login", json=self.VALID_PAYLOAD)

        assert response.status_code == 401
        assert "invalid" in response.text.lower()

    async def test_login_inactive_account(self):
        """Inactive account should return 403."""
        self._service_instance.login.side_effect = ValueError(
            "Account is inactive. Contact an administrator."
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post("/api/v1/auth/login", json=self.VALID_PAYLOAD)

        assert response.status_code == 403
        assert "inactive" in response.text.lower()

    async def test_login_validation_error(self):
        """Invalid payload should return 422."""
        invalid_payload = {"email": "not-an-email", "password": "short"}

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/login", json=invalid_payload
            )

        assert response.status_code == 422
