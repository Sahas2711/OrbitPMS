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

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
