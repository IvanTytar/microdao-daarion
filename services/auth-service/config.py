"""
Auth Service Configuration
"""
from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Settings loader that supports both the new AUTH_* env vars and the legacy
    ones used in docker-compose files (e.g. DATABASE_URL, JWT_SECRET).
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Service
    service_name: str = Field(
        default="auth-service",
        validation_alias=AliasChoices("AUTH_SERVICE_NAME", "SERVICE_NAME"),
    )
    service_version: str = Field(
        default="1.0.0",
        validation_alias=AliasChoices("AUTH_SERVICE_VERSION", "SERVICE_VERSION"),
    )
    port: int = Field(
        default=7020,
        validation_alias=AliasChoices("AUTH_PORT", "PORT", "AUTH_SERVICE_PORT"),
    )
    debug: bool = Field(
        default=False,
        validation_alias=AliasChoices("AUTH_DEBUG", "DEBUG"),
    )

    # Database
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/daarion",
        validation_alias=AliasChoices("AUTH_DATABASE_URL", "DATABASE_URL"),
    )

    # JWT
    jwt_secret: str = Field(
        default="your-very-long-secret-key-change-in-production",
        validation_alias=AliasChoices("AUTH_JWT_SECRET", "JWT_SECRET"),
    )
    jwt_algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices(
            "AUTH_JWT_ALGORITHM", "JWT_ALGO", "JWT_ALGORITHM"
        ),
    )
    access_token_ttl: int = Field(
        default=1800,
        validation_alias=AliasChoices("AUTH_ACCESS_TOKEN_TTL", "ACCESS_TOKEN_TTL"),
    )
    refresh_token_ttl: int = Field(
        default=604800,
        validation_alias=AliasChoices("AUTH_REFRESH_TOKEN_TTL", "REFRESH_TOKEN_TTL"),
    )

    # Security
    bcrypt_rounds: int = Field(
        default=12,
        validation_alias=AliasChoices("AUTH_BCRYPT_ROUNDS", "BCRYPT_ROUNDS"),
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()

