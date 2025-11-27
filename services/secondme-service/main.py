"""
Second Me Service — Персональний агент користувача
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

import routes
import repository

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="DAARION Second Me Service",
    version="1.0.0",
    description="Персональний цифровий двійник користувача"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(routes.router)

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "secondme-service"}


@app.on_event("startup")
async def startup():
    """Startup event"""
    logger.info("🚀 Second Me Service starting...")
    logger.info(f"SECONDME_AGENT_ID: {os.getenv('SECONDME_AGENT_ID', 'ag_secondme_global')}")
    logger.info(f"AGENTS_SERVICE_URL: {os.getenv('AGENTS_SERVICE_URL', 'http://agents-service:7002')}")


@app.on_event("shutdown")
async def shutdown():
    """Shutdown event"""
    logger.info("🛑 Second Me Service shutting down...")
    await repository.close_pool()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7003)

