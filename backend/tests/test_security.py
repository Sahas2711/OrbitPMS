"""
Tests for OrbitPMS security utilities.

Covers JWT token generation/verification, password hashing/verification,
get_current_user dependency, and role checker.
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.config import settings
from app.core.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    require_role,
    verify_password,
    verify_token,
)


# ═══════════════════════════════════════════════════════════════
# ── Password Helpers
# ═══════════════════════════════════════════════════════════════


class TestPasswordHelpers:
    """Tests for bcrypt password hashing and verification."""

    def test_get_password_hash_returns_hash(self):
        hashed = get_password_hash("SecureP@ss1")
        assert isinstance(hashed, str)
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")

    def test_verify_password_correct(self):
        hashed = get_password_hash("SecureP@ss1")
        assert verify_password("SecureP@ss1", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = get_password_hash("SecureP@ss1")
        assert verify_password("WrongPassword1", hashed) is False

    def test_verify_password_wrong_case(self):
        hashed = get_password_hash("SecureP@ss1")
        assert verify_password("securep@ss1", hashed) is False

    def test_same_password_different_hashes(self):
        hash1 = get_password_hash("SecureP@ss1")
        hash2 = get_password_hash("SecureP@ss1")
        assert hash1 != hash2


# ═══════════════════════════════════════════════════════════════
# ── JWT Token Helpers
# ═══════════════════════════════════════════════════════════════


class TestJWTHelpers:
    """Tests for JWT access and refresh token generation/verification."""

    def setup_method(self):
        self.user_id = uuid.uuid4()

    # ── Access Tokens ───────────────────────────────────────────

    def test_create_access_token_returns_string(self):
        token = create_access_token(self.user_id)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_create_access_token_contains_subject(self):
        token = create_access_token(self.user_id)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == str(self.user_id)
        assert payload["type"] == ACCESS_TOKEN_TYPE

    def test_create_access_token_expiry(self):
        token = create_access_token(self.user_id)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        issued_at = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_ttl = timedelta(minutes=settings.access_token_expire_minutes)
        actual_ttl = expires_at - issued_at
        assert abs(actual_ttl - expected_ttl) < timedelta(seconds=5)

    def test_create_access_token_with_extra_data(self):
        extra = {"role": "admin", "email": "admin@example.com"}
        token = create_access_token(self.user_id, extra_data=extra)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["role"] == "admin"
        assert payload["email"] == "admin@example.com"

    def test_create_access_token_accepts_string_subject(self):
        token = create_access_token(str(self.user_id))
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == str(self.user_id)

    # ── Refresh Tokens ──────────────────────────────────────────

    def test_create_refresh_token_returns_string(self):
        token = create_refresh_token(self.user_id)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_create_refresh_token_has_correct_type(self):
        token = create_refresh_token(self.user_id)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == str(self.user_id)
        assert payload["type"] == REFRESH_TOKEN_TYPE

    def test_create_refresh_token_longer_expiry(self):
        token = create_refresh_token(self.user_id)
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        issued_at = datetime.fromtimestamp(payload["iat"], tz=timezone.utc)
        expires_at = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        expected_ttl = timedelta(days=settings.refresh_token_expire_days)
        actual_ttl = expires_at - issued_at
        assert abs(actual_ttl - expected_ttl) < timedelta(seconds=5)

    # ── Token Verification ──────────────────────────────────────

    def test_verify_token_valid_access_token(self):
        token = create_access_token(self.user_id)
        payload = verify_token(token)
        assert payload["sub"] == str(self.user_id)
        assert payload["type"] == ACCESS_TOKEN_TYPE

    def test_verify_token_raises_on_invalid_token(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("this.is.not.a.valid.jwt")
        assert exc_info.value.status_code == 401

    def test_verify_token_raises_on_expired_token(self):
        from jose import jwt as jose_jwt

        expired_payload = {
            "sub": str(self.user_id),
            "type": ACCESS_TOKEN_TYPE,
            "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        }
        expired_token = jose_jwt.encode(
            expired_payload, settings.secret_key, algorithm=settings.algorithm
        )
        with pytest.raises(HTTPException) as exc_info:
            verify_token(expired_token)
        assert exc_info.value.status_code == 401

    def test_verify_token_raises_on_tampered_token(self):
        valid_token = create_access_token(self.user_id)
        parts = valid_token.split(".")
        tampered = f"{parts[0]}.{parts[1][:-1]}X.{parts[2]}"
        with pytest.raises(HTTPException) as exc_info:
            verify_token(tampered)
        assert exc_info.value.status_code == 401


# ═══════════════════════════════════════════════════════════════
# ── get_current_user Dependency
# ═══════════════════════════════════════════════════════════════


class TestGetCurrentUser:
    """Tests for the get_current_user FastAPI dependency."""

    def mock_user(self, **kwargs):
        user = MagicMock()
        user.id = kwargs.get("id", uuid.uuid4())
        user.full_name = kwargs.get("full_name", "John Doe")
        user.email = kwargs.get("email", "john@example.com")
        user.role = kwargs.get("role", "staff")
        user.is_active = kwargs.get("is_active", True)
        return user

    async def test_returns_user(self, mock_session):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        mock_user = self.mock_user(id=user_id)

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)

        with patch("app.core.security.UserRepository", return_value=mock_repo):
            result = await get_current_user(token, mock_session)

        assert result == mock_user
        mock_repo.get_by_id.assert_awaited_once_with(user_id)

    async def test_raises_on_invalid_token(self, mock_session):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("not.a.valid.token", mock_session)
        assert exc_info.value.status_code == 401

    async def test_raises_on_refresh_token(self, mock_session):
        user_id = uuid.uuid4()
        refresh_token = create_refresh_token(user_id)
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(refresh_token, mock_session)
        assert exc_info.value.status_code == 401

    async def test_raises_on_missing_subject(self, mock_session):
        from jose import jwt as jose_jwt

        payload = {
            "type": ACCESS_TOKEN_TYPE,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        }
        token = jose_jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token, mock_session)
        assert exc_info.value.status_code == 401
        assert "subject" in str(exc_info.value.detail).lower()

    async def test_raises_on_nonexistent_user(self, mock_session):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=None)

        with patch("app.core.security.UserRepository", return_value=mock_repo):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token, mock_session)

        assert exc_info.value.status_code == 401
        assert "not found" in str(exc_info.value.detail).lower()

    async def test_raises_on_inactive_user(self, mock_session):
        user_id = uuid.uuid4()
        token = create_access_token(user_id)
        mock_user = self.mock_user(id=user_id, is_active=False)

        mock_repo = MagicMock()
        mock_repo.get_by_id = AsyncMock(return_value=mock_user)

        with patch("app.core.security.UserRepository", return_value=mock_repo):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(token, mock_session)

        assert exc_info.value.status_code == 401
        assert "inactive" in str(exc_info.value.detail).lower()

    async def test_raises_on_invalid_uuid(self, mock_session):
        from jose import jwt as jose_jwt

        payload = {
            "sub": "not-a-uuid-at-all",
            "type": ACCESS_TOKEN_TYPE,
            "iat": datetime.now(timezone.utc),
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        }
        token = jose_jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(token, mock_session)
        assert exc_info.value.status_code == 401


# ═══════════════════════════════════════════════════════════════
# ── require_role Dependency
# ═══════════════════════════════════════════════════════════════


class TestRequireRole:
    """Tests for the role-based authorization dependency."""

    def mock_user(self, role: str = "staff"):
        user = MagicMock()
        user.role = role
        return user

    async def test_allows_correct_role(self):
        user = self.mock_user("admin")
        checker = require_role("admin")
        result = await checker(user)
        assert result == user

    async def test_allows_multiple_roles(self):
        user = self.mock_user("receptionist")
        checker = require_role("admin", "receptionist")
        result = await checker(user)
        assert result == user

    async def test_rejects_incorrect_role(self):
        user = self.mock_user("staff")
        checker = require_role("admin")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user)
        assert exc_info.value.status_code == 403

    async def test_rejects_incorrect_role_message_contains_required(self):
        user = self.mock_user("staff")
        checker = require_role("admin", "receptionist")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user)
        assert "admin" in str(exc_info.value.detail)
        assert "receptionist" in str(exc_info.value.detail)
