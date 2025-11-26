"""
Matrix Gateway Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Service
    service_name: str = "matrix-gateway"
    service_version: str = "1.0.0"
    port: int = 7025
    
    # Synapse
    synapse_url: str = "http://daarion-synapse:8008"
    synapse_admin_token: str = ""
    matrix_server_name: str = "daarion.space"
    
    # Registration secret (for creating rooms as admin)
    synapse_registration_secret: str = "daarion_reg_secret_2024"
    
    class Config:
        env_prefix = "MATRIX_GATEWAY_"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

