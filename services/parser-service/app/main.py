"""
PARSER Service - Document Ingestion & Structuring Agent
FastAPI сервіс для розпізнавання та структурування документів через dots.ocr
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.endpoints import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events: startup and shutdown"""
    # Startup
    logger.info("Starting PARSER Service...")
    logger.info(f"Model: {settings.PARSER_MODEL_NAME}")
    logger.info(f"Device: {settings.PARSER_DEVICE}")
    logger.info(f"Max pages: {settings.PARSER_MAX_PAGES}")
    
    # TODO: Initialize model loader here
    # from app.runtime.model_loader import load_model
    # app.state.model = await load_model()
    
    yield
    
    # Shutdown
    logger.info("Shutting down PARSER Service...")


app = FastAPI(
    title="PARSER Service",
    description="Document Ingestion & Structuring Agent using dots.ocr",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/ocr", tags=["OCR"])


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "parser-service",
        "model": settings.PARSER_MODEL_NAME,
        "device": settings.PARSER_DEVICE,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=9400,
        reload=True
    )

