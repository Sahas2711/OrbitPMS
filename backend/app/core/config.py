"""
Application configuration for OrbitPMS.

Reads settings from environment variables with sensible defaults
for local development.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/orbitpms"
    )
    debug: bool = False
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # ── Hotel configuration (for invoice PDFs) ──────────────────────

    hotel_name: str = "OrbitPMS Hotel & Suites"
    hotel_address: str = "123 Hospitality Drive"
    hotel_city_state_zip: str = "San Francisco, CA 94105"
    hotel_phone: str = "+1-555-ORBIT (67248)"
    hotel_email: str = "stay@orbitpms.com"
    hotel_website: str = "www.orbitpms.com"

    # ── Tax configuration ────────────────────────────────────────────

    default_tax_rate: float = 0.10

    # ── Invoice / PDF storage ───────────────────────────────────────

    invoice_storage_path: str = "storage/invoices"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
