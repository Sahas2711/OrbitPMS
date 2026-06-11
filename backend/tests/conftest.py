"""
Test fixtures for OrbitPMS.

Provides reusable mock fixtures for database sessions,
repositories, and services used across test modules.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.fixture
def mock_session() -> AsyncMock:
    """Create a mock AsyncSession for service/repository tests."""
    session = AsyncMock(spec=AsyncSession)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.add = MagicMock()
    return session


@pytest.fixture
def mock_user_repo(mock_session):
    """Patch UserRepository to return a controllable mock."""
    with patch("app.core.security.UserRepository") as mock_repo_cls, \
         patch("app.services.user.UserRepository") as mock_repo_cls2:
        mock_repo = MagicMock()
        mock_repo.get_by_email = AsyncMock()
        mock_repo.get_by_id = AsyncMock()
        mock_repo.create = AsyncMock()
        mock_repo_cls.return_value = mock_repo
        mock_repo_cls2.return_value = mock_repo

        yield mock_repo
