"""Configuration for Matrix Presence Aggregator"""
from pydantic import BaseModel
import os


class Settings(BaseModel):
    matrix_base_url: str
    matrix_access_token: str
    matrix_homeserver_domain: str = "daarion.space"
    poll_interval_seconds: int = 5

    rooms_source: str = "database"  # "database" | "static"
    db_dsn: str | None = None
    rooms_config_path: str | None = None

    http_host: str = "0.0.0.0"
    http_port: int = 8085
    
    # Filter out presence daemon from member lists
    presence_daemon_user: str = "@presence_daemon:daarion.space"


def load_settings() -> Settings:
    return Settings(
        matrix_base_url=os.getenv("MATRIX_BASE_URL", "https://app.daarion.space"),
        matrix_access_token=os.getenv("MATRIX_ACCESS_TOKEN", ""),
        matrix_homeserver_domain=os.getenv("MATRIX_HOMESERVER_DOMAIN", "daarion.space"),
        poll_interval_seconds=int(os.getenv("POLL_INTERVAL_SECONDS", "5")),
        rooms_source=os.getenv("ROOMS_SOURCE", "database"),
        db_dsn=os.getenv("DB_DSN"),
        rooms_config_path=os.getenv("ROOMS_CONFIG"),
        http_host=os.getenv("PRESENCE_HTTP_HOST", "0.0.0.0"),
        http_port=int(os.getenv("PRESENCE_HTTP_PORT", "8085")),
        presence_daemon_user=os.getenv("PRESENCE_DAEMON_USER", "@presence_daemon:daarion.space"),
    )

