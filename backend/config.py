import os
from typing import List
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    ENV: str = "production"
    DEBUG: bool = False
    PROJECT_NAME: str = "AI-CHD-CDSS"

    # PostgreSQL Configuration
    # Render injects DATABASE_URL automatically for managed Postgres.
    # Fallback to individual parts for local development.
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_chd_secure_pwd"
    POSTGRES_DB: str = "chd_cdss"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = (
        "postgresql://postgres:postgres_chd_secure_pwd@localhost:5432/chd_cdss"
    )

    # Redis Configuration (optional on free tier — Celery tasks will be skipped)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security Configuration
    JWT_SECRET_KEY: str = "generate_a_very_secure_random_key_here_for_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100

    # MIMIC Dataset Paths
    MIMIC_DATA_PATH: str = "/app/data/mimic"
    PROCESSED_DATA_PATH: str = (
        "/app/etl/processed_chd_dataset/processed_20260714_v1.csv"
    )

    # CORS Configuration — include Render URLs
    ALLOWED_ORIGINS: str = (
        "https://chd-frontend.onrender.com,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    @property
    def cors_origins(self) -> List[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    def validate_secrets(self) -> None:
        """Enforces strict security fail-fast validation on startup."""
        if self.ENV == "production":
            insecure_defaults = [
                "your-super-secret-key-change-in-production",
                "generate_a_very_secure_random_key_here_for_prod",
                "change-me-in-production"
            ]
            if self.JWT_SECRET_KEY in insecure_defaults:
                raise RuntimeError(
                    "[SECURITY CRITICAL] Application startup aborted: Insecure JWT_SECRET_KEY default detected in production mode."
                )
            if not self.DATABASE_URL or "sqlite" in self.DATABASE_URL.lower():
                raise RuntimeError(
                    "[SECURITY CRITICAL] Application startup aborted: Production mode requires a valid PostgreSQL DATABASE_URL."
                )


settings = Settings()
settings.validate_secrets()
