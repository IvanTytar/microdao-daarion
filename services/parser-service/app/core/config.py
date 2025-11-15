"""
Configuration for PARSER Service
"""

import os
from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 9400
    
    # PARSER Model
    PARSER_MODEL_NAME: str = os.getenv("PARSER_MODEL_NAME", "rednote-hilab/dots.ocr")
    PARSER_DEVICE: Literal["cuda", "cpu", "mps"] = os.getenv("PARSER_DEVICE", "cpu")
    PARSER_MAX_PAGES: int = int(os.getenv("PARSER_MAX_PAGES", "100"))
    PARSER_MAX_RESOLUTION: str = os.getenv("PARSER_MAX_RESOLUTION", "4096x4096")
    PARSER_BATCH_SIZE: int = int(os.getenv("PARSER_BATCH_SIZE", "1"))
    
    # File handling
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    TEMP_DIR: str = os.getenv("TEMP_DIR", "/tmp/parser")
    
    # Runtime
    RUNTIME_TYPE: Literal["local", "remote"] = os.getenv("RUNTIME_TYPE", "local")
    RUNTIME_URL: str = os.getenv("RUNTIME_URL", "http://parser-runtime:11435")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

