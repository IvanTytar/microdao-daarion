"""
DAGI Router - FastAPI Application

Main entry point for DAGI Router HTTP API
"""

import argparse
import logging
import sys

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config_loader import load_config, ConfigError
from router_app import RouterApp
from http_api import build_router_http

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="DAGI Router - Decentralized Agent Gateway Interface"
    )
    parser.add_argument(
        "--config", "-c",
        default=None,
        help="Path to router-config.yml (default: /opt/dagi-router/router-config.yml)"
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host to bind to (default: 0.0.0.0)"
    )
    parser.add_argument(
        "--port", "-p",
        type=int,
        default=9101,
        help="Port to bind to (default: 9101)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    return parser.parse_args()


def create_app(config_path: str = None) -> FastAPI:
    """
    Create and configure FastAPI application.
    
    Args:
        config_path: Path to config file (optional)
    
    Returns:
        Configured FastAPI app
    
    Raises:
        RuntimeError: If config loading fails
    """
    logger.info("Starting DAGI Router...")
    
    # Load config
    try:
        config = load_config(config_path)
        logger.info(f"Config loaded: node={config.node.id}")
    except ConfigError as e:
        logger.error(f"Failed to load config: {e}")
        raise RuntimeError(f"Config error: {e}")
    
    # Initialize RouterApp
    try:
        app_core = RouterApp(config)
        logger.info("RouterApp initialized")
    except Exception as e:
        logger.error(f"Failed to initialize RouterApp: {e}")
        raise RuntimeError(f"RouterApp initialization failed: {e}")
    
    # Create FastAPI app
    app = FastAPI(
        title="DAGI Router",
        description="Decentralized Agent Gateway Interface - Multi-provider AI router",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include router endpoints
    api_router = build_router_http(app_core)
    app.include_router(api_router)
    
    # Root endpoint
    @app.get("/")
    async def root():
        return {
            "service": "DAGI Router",
            "version": "1.0.0",
            "node": config.node.id,
            "status": "operational",
            "endpoints": {
                "route": "POST /route",
                "health": "GET /health",
                "info": "GET /info",
                "providers": "GET /providers",
                "routing": "GET /routing",
                "docs": "GET /docs",
            }
        }
    
    logger.info("FastAPI app created")
    
    return app


def main():
    """Main entry point"""
    args = parse_args()
    
    try:
        app = create_app(args.config)
    except RuntimeError as e:
        logger.error(f"Failed to start: {e}")
        sys.exit(1)
    
    logger.info(f"Starting server on {args.host}:{args.port}")
    
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
