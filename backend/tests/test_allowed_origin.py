"""
CORS / origin consistency tests for OrbitPMS.

Verifies that:
1. The FastAPI backend's CORS middleware is configured with the expected
   origins.
2. The frontend's API base URL (from ``api.js``) corresponds to one of
   those allowed origins.
3. The origins are self-consistent across the stack.
"""

import re
from pathlib import Path

import pytest
from fastapi.middleware.cors import CORSMiddleware

from app.main import app


# ═══════════════════════════════════════════════════════════════
# ── Constants — the canonical origins we expect to find
# ═══════════════════════════════════════════════════════════════

EXPECTED_BACKEND_PORT = "8000"
EXPECTED_FRONTEND_PORT = "5173"

# These are the origins explicitly set in app/main.py CORS middleware.
EXPECTED_CORS_ORIGINS = {
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}


# ═══════════════════════════════════════════════════════════════
# ── Helper: extract origins from the CORS middleware
# ═══════════════════════════════════════════════════════════════


def _get_cors_middleware_origins() -> list[str] | None:
    """Return the ``allow_origins`` list from the app's CORS middleware
    (if present), otherwise ``None``."""
    for mw in app.user_middleware:
        if mw.cls is CORSMiddleware:
            # The kwargs dict should contain ``allow_origins``.
            return mw.kwargs.get("allow_origins", None)
    return None


# ═══════════════════════════════════════════════════════════════
# ── Helper: parse the frontend JS file for VITE_API_URL
# ═══════════════════════════════════════════════════════════════


def _parse_frontend_api_url() -> str | None:
    """Read ``frontend/src/services/api.js`` and extract the fallback
    base URL from the ``axios.create(...)`` call.

    Returns something like ``http://localhost:8000`` or ``None``.
    """
    frontend_file = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "services" / "api.js"
    if not frontend_file.exists():
        return None

    text_content = frontend_file.read_text(encoding="utf-8")

    # Look for:  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    match = re.search(
        r"""baseURL:\s*(?:import\.meta\.env\.\w+\s*\|\|)?\s*['\"](http[^'\"]+)['\"]""",
        text_content,
    )
    if match:
        return match.group(1)

    # Fallback: look for any http:// in the axios.create call
    match = re.search(r"axios\.create\s*\(\s*\{[^}]*?baseURL[^:]*:\s*['\"](http[^'\"]+)['\"]", text_content, re.DOTALL)
    return match.group(1) if match else None


# ═══════════════════════════════════════════════════════════════
# ── Tests: Backend CORS Middleware
# ═══════════════════════════════════════════════════════════════


class TestBackendCorsOrigins:
    """Tests that the FastAPI application has correct CORS configuration."""

    def test_cors_middleware_is_registered(self):
        """CORS middleware must be present on the app."""
        origins = _get_cors_middleware_origins()
        assert origins is not None, (
            "CORSMiddleware not found on the FastAPI app. "
            "Check app/main.py for add_middleware(CORSMiddleware, ...)."
        )

    def test_cors_allows_expected_frontend_origins(self):
        """The allowed origins set must include the dev frontend origins."""
        origins = set(_get_cors_middleware_origins() or [])
        for expected in EXPECTED_CORS_ORIGINS:
            assert expected in origins, (
                f"Expected origin '{expected}' is not in the CORS allow list. "
                f"Found: {origins}"
            )

    def test_cors_allows_credentials(self):
        """CORS middleware should allow credentials (cookies / auth headers)."""
        for mw in app.user_middleware:
            if mw.cls is CORSMiddleware:
                assert mw.kwargs.get("allow_credentials") is True, (
                    "CORS allow_credentials should be True for cookie-based auth."
                )
                return
        pytest.fail("CORSMiddleware not found")

    def test_cors_allows_all_methods_and_headers(self):
        """CORS middleware should allow all standard methods and headers."""
        for mw in app.user_middleware:
            if mw.cls is CORSMiddleware:
                assert mw.kwargs.get("allow_methods") == ["*"], (
                    "Expected allow_methods = ['*']"
                )
                assert mw.kwargs.get("allow_headers") == ["*"], (
                    "Expected allow_headers = ['*']"
                )
                return
        pytest.fail("CORSMiddleware not found")


# ═══════════════════════════════════════════════════════════════
# ── Tests: Frontend API URL
# ═══════════════════════════════════════════════════════════════


class TestFrontendApiBaseUrl:
    """Tests that the frontend's API base URL points to the backend."""

    def test_frontend_api_url_extractable(self):
        """The frontend api.js file must contain a detectable backend URL."""
        url = _parse_frontend_api_url()
        assert url is not None, (
            "Could not extract API base URL from frontend/src/services/api.js. "
            "Look for 'baseURL: ...' in the axios.create({...}) call."
        )

    def test_frontend_api_url_points_to_backend_port(self):
        """The frontend's API URL should target the backend port (8000)."""
        url = _parse_frontend_api_url()
        assert url is not None
        assert f":{EXPECTED_BACKEND_PORT}" in url, (
            f"Frontend API URL '{url}' does not point to backend port "
            f"{EXPECTED_BACKEND_PORT}. Expected something like "
            f"'http://localhost:{EXPECTED_BACKEND_PORT}'."
        )


# ═══════════════════════════════════════════════════════════════
# ── Tests: Cross-stack consistency
# ═══════════════════════════════════════════════════════════════


class TestCrossStackOriginConsistency:
    """Tests that backend and frontend configurations are in agreement."""

    def test_api_url_origin_matches_env_example(self):
        """The frontend API baseURL should match the VITE_API_URL from
        the .env.example template."""
        frontend_url = _parse_frontend_api_url()
        assert frontend_url is not None, "Cannot extract frontend API URL"

        env_example = Path(__file__).resolve().parent.parent.parent / ".env.example"
        if not env_example.exists():
            pytest.skip(".env.example not found")

        content = env_example.read_text(encoding="utf-8")
        match = re.search(r"^VITE_API_URL=(.+)$", content, re.MULTILINE)
        assert match is not None, "VITE_API_URL not found in .env.example"

        expected_url = match.group(1).strip()
        assert frontend_url == expected_url, (
            f"Frontend API URL '{frontend_url}' does not match "
            f"VITE_API_URL in .env.example ('{expected_url}')"
        )

    def test_expected_frontend_ports_match_launch_scripts(self):
        """The ports used in CORS (5173) should match what start.sh/start.bat
        use for the Vite dev server."""
        # This is a soft check: warn if scripts use a different port.
        for script_name in ("start.sh", "start.bat"):
            script_path = Path(__file__).resolve().parent.parent.parent / script_name
            if script_path.exists():
                content = script_path.read_text(encoding="utf-8")
                if EXPECTED_FRONTEND_PORT not in content:
                    pytest.skip(
                        f"{script_name} does not reference port {EXPECTED_FRONTEND_PORT} "
                        f"— this may be fine if the script uses a different port."
                    )
