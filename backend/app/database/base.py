"""
SQLAlchemy 2.0 Declarative Base Configuration.

Provides the central DeclarativeBase for all ORM models
and a reusable TimestampMixin for audit logging.
"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Centralized declarative base for all OrbitPMS models.

    Compatible with Alembic autogeneration.
    All ORM models must inherit from this class.
    """

    pass


class TimestampMixin:
    """Mixin that adds a timezone-aware created_at column.

    Uses database-side default (CURRENT_TIMESTAMP) for consistency
    across distributed systems and future audit logging.
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
