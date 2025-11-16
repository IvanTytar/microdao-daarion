"""
Configuration for PARSER Service
"""

import os
from typing import Literal, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 9400
    
    # PARSER Model
    PARSER_MODEL_NAME: str = os.getenv("PARSER_MODEL_NAME", os.getenv("DOTS_OCR_MODEL_ID", "rednote-hilab/dots.ocr"))
    PARSER_DEVICE: Literal["cuda", "cpu", "mps"] = os.getenv("PARSER_DEVICE", os.getenv("DEVICE", "cpu"))
    PARSER_MAX_PAGES: int = int(os.getenv("PARSER_MAX_PAGES", "100"))
    PARSER_MAX_RESOLUTION: str = os.getenv("PARSER_MAX_RESOLUTION", "4096x4096")
    PARSER_BATCH_SIZE: int = int(os.getenv("PARSER_BATCH_SIZE", "1"))
    
    # File handling
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    TEMP_DIR: str = os.getenv("TEMP_DIR", "/tmp/parser")
    
    # PDF processing
    PDF_DPI: int = int(os.getenv("PDF_DPI", "200"))
    PAGE_RANGE: Optional[str] = os.getenv("PAGE_RANGE", None)  # e.g., "1-20" for pages 1-20
    
    # Image processing
    IMAGE_MAX_SIZE: int = int(os.getenv("IMAGE_MAX_SIZE", "2048"))  # Max size for longest side
    
    # Parser mode
    USE_DUMMY_PARSER: bool = os.getenv("USE_DUMMY_PARSER", "false").lower() == "true"
    ALLOW_DUMMY_FALLBACK: bool = os.getenv("ALLOW_DUMMY_FALLBACK", "true").lower() == "true"
    
    # Runtime
    RUNTIME_TYPE: Literal["local", "remote", "ollama"] = os.getenv("RUNTIME_TYPE", "local")
    RUNTIME_URL: str = os.getenv("RUNTIME_URL", "http://parser-runtime:11435")
    
    # Ollama configuration (if RUNTIME_TYPE=ollama)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # DAGI Router configuration (for qa_pairs 2-stage pipeline)
    ROUTER_BASE_URL: str = os.getenv("ROUTER_BASE_URL", "http://router:9102")
    ROUTER_TIMEOUT: int = int(os.getenv("ROUTER_TIMEOUT", "60"))
    
    # RAG Service configuration (for ingest pipeline)
    RAG_BASE_URL: str = os.getenv("RAG_BASE_URL", "http://rag-service:9500")
    RAG_TIMEOUT: int = int(os.getenv("RAG_TIMEOUT", "120"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

