"""
OrbitPMS - Vercel Serverless Entry Point.

This file is the entry point for Vercel's Python runtime.
It adds the backend directory to sys.path and re-exports
the FastAPI application from the main module.
"""

import sys
from pathlib import Path

# Add the backend directory to the Python path so that
# imports like "from app.main import app" resolve correctly.
_backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# ── Re-export the FastAPI app ───────────────────────────────────
# Vercel looks for a module-level `app` variable.

from app.main import app  # noqa: E402
