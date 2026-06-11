"""
Unit tests for user Pydantic schemas (RegisterRequest, RegisterResponse).

Tests cover:
    - Valid input produces a valid model
    - Password strength validation
    - Email format validation
    - Role defaults and values
    - Whitespace handling
"""

import uuid
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.core.enums import UserRole
from app.schemas.user import RegisterRequest, RegisterResponse


class TestRegisterRequest:
    """Tests for the RegisterRequest schema."""

    VALID_PAYLOAD = {
        "full_name": "John Doe",
        "email": "john.doe@example.com",
        "password": "StrongP@ss1",
        "role": "receptionist",
    }

    def test_valid_request(self):
        """A fully valid payload should produce a valid model."""
        req = RegisterRequest(**self.VALID_PAYLOAD)
        assert req.full_name == "John Doe"
        assert req.email == "john.doe@example.com"
        assert req.password == "StrongP@ss1"
        assert req.role == UserRole.RECEPTIONIST

    def test_default_role_is_staff(self):
        """Omitting role should default to staff."""
        payload = {k: v for k, v in self.VALID_PAYLOAD.items() if k != "role"}
        req = RegisterRequest(**payload)
        assert req.role == UserRole.STAFF

    # ── Password validation ─────────────────────────────────

    @pytest.mark.parametrize(
        "password,expected_substring",
        [
            ("short1A", "at least 8 characters"),
            ("nouppercase1", "uppercase letter"),
            ("NOLOWERCASE1", "lowercase letter"),
            ("NoDigits!!", "at least one digit"),
        ],
    )
    def test_invalid_password(self, password: str, expected_substring: str):
        """Weak passwords should be rejected with a descriptive error."""
        payload = {**self.VALID_PAYLOAD, "password": password}
        with pytest.raises(ValidationError) as exc:
            RegisterRequest(**payload)
        assert expected_substring.lower() in str(exc.value).lower()

    # ── Email validation ────────────────────────────────────

    @pytest.mark.parametrize(
        "invalid_email",
        [
            "not-an-email",
            "@missing-local.com",
            "missing-domain@",
            "",
        ],
    )
    def test_invalid_email(self, invalid_email: str):
        """Malformed emails should be rejected."""
        payload = {**self.VALID_PAYLOAD, "email": invalid_email}
        with pytest.raises(ValidationError):
            RegisterRequest(**payload)

    # ── Full name validation ────────────────────────────────

    def test_whitespace_name_stripped(self):
        """Leading/trailing whitespace should be stripped."""
        payload = {**self.VALID_PAYLOAD, "full_name": "  Jane Doe  "}
        req = RegisterRequest(**payload)
        assert req.full_name == "Jane Doe"

    def test_empty_name_rejected(self):
        """An empty or whitespace-only name should be rejected."""
        payload = {**self.VALID_PAYLOAD, "full_name": "   "}
        with pytest.raises(ValidationError):
            RegisterRequest(**payload)

    def test_name_equal_to_email_rejected(self):
        """Using the email address as the display name should be rejected."""
        payload = {
            **self.VALID_PAYLOAD,
            "full_name": "jane@example.com",
            "email": "jane@example.com",
        }
        with pytest.raises(ValidationError):
            RegisterRequest(**payload)


class TestRegisterResponse:
    """Tests for the RegisterResponse schema."""

    def test_from_attributes(self):
        """RegisterResponse should support ORM attribute-based creation."""
        now = datetime.now(timezone.utc)
        response = RegisterResponse(
            id=uuid.uuid4(),
            full_name="Alice Smith",
            email="alice@example.com",
            role=UserRole.ADMIN,
            is_active=True,
            created_at=now,
        )
        assert response.full_name == "Alice Smith"
        assert response.role == UserRole.ADMIN
        assert response.is_active is True
        assert response.created_at == now

    def test_json_serialization(self):
        """RegisterResponse should serialize to JSON without errors."""
        response = RegisterResponse(
            id=uuid.uuid4(),
            full_name="Bob",
            email="bob@example.com",
            role=UserRole.STAFF,
            is_active=True,
            created_at=datetime.now(timezone.utc),
        )
        data = response.model_dump()
        assert data["full_name"] == "Bob"
        assert data["role"] == "staff"
        assert "id" in data
        assert "created_at" in data
