"""
Configuration for RAG Service
"""

import os
from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Service
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 9500
    
    # PostgreSQL + pgvector
    PG_DSN: str = os.getenv(
        "PG_DSN",
        "postgresql+psycopg2://postgres:postgres@city-db:5432/daarion_city"
    )
    
    # Embedding model
    EMBED_MODEL_NAME: str = os.getenv("EMBED_MODEL_NAME", "BAAI/bge-m3")
    EMBED_DEVICE: Literal["cuda", "cpu", "mps"] = os.getenv("EMBED_DEVICE", "cpu")
    EMBED_DIM: int = int(os.getenv("EMBED_DIM", "1024"))  # BAAI/bge-m3 = 1024
    
    # Document Store
    RAG_TABLE_NAME: str = os.getenv("RAG_TABLE_NAME", "rag_documents")
    SEARCH_STRATEGY: Literal["approximate", "exact"] = os.getenv("SEARCH_STRATEGY", "approximate")
    
    # Chunking
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "500"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))
    
    # Retrieval
    TOP_K: int = int(os.getenv("TOP_K", "5"))
    
    # LLM (for query pipeline)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "router")  # router, openai, local
    ROUTER_BASE_URL: str = os.getenv("ROUTER_BASE_URL", "http://router:9102")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # NATS JetStream configuration
    NATS_URL: str = os.getenv("NATS_URL", "nats://localhost:4222")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

