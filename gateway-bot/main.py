"""
Bot Gateway Service
Entry point for Telegram/Discord webhook handling
"""
import logging
import argparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .http_api import router as gateway_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create FastAPI application"""
    app = FastAPI(
        title="Bot Gateway",
        version="1.0.0",
        description="Gateway service for Telegram/Discord bots → DAGI Router"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include gateway routes
    app.include_router(gateway_router, prefix="", tags=["gateway"])
    
    @app.get("/")
    async def root():
        return {
            "service": "bot-gateway",
            "version": "1.0.0",
            "endpoints": [
                "POST /telegram/webhook",
                "POST /discord/webhook",
                "GET /health"
            ]
        }
    
    return app


def main():
    parser = argparse.ArgumentParser(description="Bot Gateway Service")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=9300, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    args = parser.parse_args()
    
    logger.info(f"Starting Bot Gateway on {args.host}:{args.port}")
    
    app = create_app()
    
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )


if __name__ == "__main__":
    main()
