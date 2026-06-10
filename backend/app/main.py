"""
OrbitPMS - Hotel Property Management System API.

FastAPI application entry point with database dependency injection,
health checks, and middleware configuration.
"""

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import engine, get_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.

    Manages startup and shutdown events.
    Currently handles database engine disposal on shutdown.
    """
    # Startup
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title="OrbitPMS",
    description="Hotel Property Management System API",
    version="0.1.0",
    lifespan=lifespan,
)


# ── Health Check ────────────────────────────────────────────────


@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_session)) -> dict:
    """Health check endpoint that verifies database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "unreachable",
    }
