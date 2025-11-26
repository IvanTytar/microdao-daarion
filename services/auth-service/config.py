"""
Auth Service Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Service
    service_name: str = "auth-service"
    service_version: str = "1.0.0"
    port: int = 7020
    debug: bool = False

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/daarion"

    # JWT
    jwt_secret: str = "your-very-long-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_ttl: int = 1800  # 30 minutes
    refresh_token_ttl: int = 604800  # 7 days

    # Security
    bcrypt_rounds: int = 12

    class Config:
        env_prefix = "AUTH_"
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

