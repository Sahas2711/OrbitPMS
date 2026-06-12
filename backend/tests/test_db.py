"""
Database connectivity test for OrbitPMS.

Tests that the database engine can establish a connection and execute
a simple query.  Can be run either via pytest or directly as a script:

    pytest backend/tests/test_db.py -v

    python backend/tests/test_db.py
"""

import asyncio
import sys

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings


# ═══════════════════════════════════════════════════════════════
# ── Helpers
# ═══════════════════════════════════════════════════════════════


def _normalise_url(url: str) -> str:
    """Ensure the database URL uses an async driver (asyncpg).

    The settings object may hold ``postgresql://…`` (sync style), but
    ``create_async_engine`` requires ``postgresql+asyncpg://…``.
    """
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql+asyncpg://"):
        return url
    # For other schemes (e.g. sqlite) just return as-is.
    return url


# ═══════════════════════════════════════════════════════════════
# ── Async connection helper  (shared by pytest + script)
# ═══════════════════════════════════════════════════════════════


async def _check_connection(url: str | None = None) -> dict:
    """Try to connect to *url* (or *settings.database_url*) and run
    ``SELECT 1``.

    Returns a dict with keys ``success``, ``message``, and optionally
    ``db_version``.
    """
    dsn = _normalise_url(url or settings.database_url)
    engine = create_async_engine(dsn, future=True, pool_pre_ping=True)

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1 AS ok"))
            row = result.one_or_none()

            # Also grab PostgreSQL version for a nicer message
            version_result = await conn.execute(text("SELECT version()"))
            version_row = version_result.one_or_none()
            db_version = version_row[0] if version_row else "unknown"

        return {
            "success": row is not None and row[0] == 1,
            "message": (
                f"Database connection successful — {db_version}"
                if row is not None and row[0] == 1
                else "SELECT 1 did not return expected value"
            ),
            "db_version": db_version if row is not None and row[0] == 1 else None,
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"Connection failed: {exc}",
        }
    finally:
        await engine.dispose()


# ═══════════════════════════════════════════════════════════════
# ── Pytest tests
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_database_connection():
    """Verify that the database is reachable and responds to a basic query."""
    result = await _check_connection()
    assert result["success"], result["message"]
    assert result["db_version"] is not None


@pytest.mark.asyncio
async def test_database_connection_fails_with_bad_url():
    """Verify that an unreachable URL raises a meaningful error."""
    result = await _check_connection(
        "postgresql+asyncpg://invalid:invalid@localhost:9999/nonexistent"
    )
    assert not result["success"]
    assert "Connection failed" in result["message"] or "failed" in result["message"].lower()


# ═══════════════════════════════════════════════════════════════
# ── Standalone entry point
# ═══════════════════════════════════════════════════════════════


def main():
    """Run the connectivity check and print a human-readable result."""
    result = asyncio.run(_check_connection())

    if result["success"]:
        print(f"✔  {result['message']}")
        sys.exit(0)
    else:
        print(f"✘  {result['message']}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
