"""
Alembic environment configuration for OrbitPMS.

Supports both offline (SQL script) and online (direct database)
migration modes using async PostgreSQL via asyncpg.
"""

import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from alembic import context

# Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import all models so Alembic can detect them
from app.core.config import settings  # noqa: E402
from app.models import Base  # noqa: E402

# Set target metadata for autogenerate support
target_metadata = Base.metadata

# Read the database URL from application settings (loaded from .env)
database_url = settings.database_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Generates SQL statements as a script without connecting
    to the database. Useful for review and CI.
    """
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    """Configure the migration context with a live connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations asynchronously using asyncpg."""
    connectable = create_async_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an async engine and runs the migration within
    an async context.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
