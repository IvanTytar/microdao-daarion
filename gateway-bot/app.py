"""
FastAPI app instance for Gateway Bot
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from http_api import router as gateway_router
from http_api_doc import router as doc_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

app = FastAPI(
    title="Bot Gateway with DAARWIZZ",
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
app.include_router(doc_router, prefix="", tags=["docs"])

@app.get("/")
async def root():
    return {
        "service": "bot-gateway",
        "version": "1.0.0",
        "agent": "DAARWIZZ",
        "endpoints": [
            "POST /telegram/webhook",
            "POST /discord/webhook",
            "POST /api/doc/parse",
            "POST /api/doc/ingest",
            "POST /api/doc/ask",
            "GET /api/doc/context/{session_id}",
            "GET /health"
        ]
    }
