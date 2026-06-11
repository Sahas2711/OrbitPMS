"""
OrbitPMS - Hotel Property Management System API.

FastAPI application entry point with database dependency injection,
health checks, and route registration.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import router as auth_router
from app.database.session import engine, get_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("OrbitPMS starting up...")
    yield
    logger.info("OrbitPMS shutting down...")
    await engine.dispose()


app = FastAPI(
    title="OrbitPMS",
    description="Hotel Property Management System API",
    version="0.1.0",
    lifespan=lifespan,
)

# ── Route Registration ──────────────────────────────────────────

app.include_router(auth_router)

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
