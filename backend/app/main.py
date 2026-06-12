"""
OrbitPMS - Hotel Property Management System API.

FastAPI application entry point with database dependency injection,
health checks, and route registration.
"""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import router as auth_router
from app.api.v1.bookings import router as bookings_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.rooms import router as rooms_router
from app.api.v1.users import router as users_router
from app.database.session import engine, get_session

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.

    Manages startup and shutdown events.
    Currently handles database engine disposal on shutdown.
    """

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

# ── CORS Middleware ─────────────────────────────────────────────
# Allow the Vite dev server and production frontend origins.
# CORS_ORIGINS env var supports comma-separated origins.

_cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
_cors_origins = [
    o.strip()
    for o in _cors_origins_str.split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route Registration ──────────────────────────────────────────

app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(bookings_router)
app.include_router(invoices_router)
app.include_router(users_router)

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
