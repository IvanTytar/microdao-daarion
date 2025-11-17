"""
Events module for rag-service
Publishes RAG events to NATS JetStream STREAM_RAG
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import asyncio

from app.core.config import settings
try:
    import nats
    NATS_AVAILABLE = True
except ImportError:
    NATS_AVAILABLE = False
    nats = None

logger = logging.getLogger(__name__)

# Connection to NATS
_nats_conn: Optional[nats.NATS] = None


async def is_nats_available():
    """Check if NATS is available"""
    return NATS_AVAILABLE

async def get_nats_connection():
    """Initialize or return existing NATS connection"""
    if not NATS_AVAILABLE:
        logger.warning("NATS not available, events will be skipped")
        return None
        
    global _nats_conn
    if _nats_conn is None:
        _nats_conn = await nats.connect(settings.NATS_URL)
        # Initialize JetStream context
        js = _nats_conn.jetstream()
        # Ensure STREAM_RAG exists
        try:
            await js.add_stream(
                name="STREAM_RAG",
                subjects=[
                    "parser.document.parsed",
                    "rag.document.ingested",
                    "rag.document.indexed"
                ],
                retention=nats.RetentionPolicy.WORK_QUEUE,
                storage=nats.StorageType.FILE,
                replicas=3
            )
            logger.info("STREAM_RAG created or already exists")
        except nats.js.errors.StreamAlreadyExists:
            logger.info("STREAM_RAG already exists")
        except Exception as e:
            logger.error(f"Failed to create STREAM_RAG: {e}")
            raise
    return _nats_conn


async def publish_event(
    subject: str,
    payload: Dict[str, Any],
    team_id: str,
    trace_id: Optional[str] = None,
    span_id: Optional[str] = None
):
    """Publish an event to NATS JetStream"""
    try:
        conn = await get_nats_connection()
        
        event_envelope = {
            "event_id": f"evt_{uuid.uuid4().hex[:8]}",
            "ts": datetime.utcnow().isoformat() + "Z",
            "domain": "rag",
            "type": subject,
            "version": 1,
            "actor": {
                "id": "rag-service",
                "kind": "service"
            },
            "payload": payload,
            "meta": {
                "team_id": team_id,
                "trace_id": trace_id or uuid.uuid4().hex[:8],
                "span_id": span_id or uuid.uuid4().hex[:8]
            }
        }
        
        # Publish to JetStream
        js = conn.jetstream()
        ack = await js.publish(subject, json.dumps(event_envelope))
        logger.info(f"Event published to {subject}: {seq={ack.sequence}, stream_seq={ack.stream_seq}")
        
        return ack
    except Exception as e:
        logger.error(f"Failed to publish event {subject}: {e}", exc_info=True)
        raise


async def publish_document_ingested(
    doc_id: str,
    team_id: str,
    dao_id: str,
    chunk_count: int,
    indexed: bool = True,
    visibility: str = "public",
    metadata: Optional[Dict[str, Any]] = None,
    trace_id: Optional[str] = None,
    span_id: Optional[str] = None
):
    """Publish rag.document.ingested event"""
    payload = {
        "doc_id": doc_id,
        "team_id": team_id,
        "dao_id": dao_id,
        "chunk_count": chunk_count,
        "indexed": indexed,
        "visibility": visibility,
        "metadata": metadata or {}
    }
    
    return await publish_event(
        subject="rag.document.ingested",
        payload=payload,
        team_id=team_id,
        trace_id=trace_id,
        span_id=span_id
    )


async def publish_document_indexed(
    doc_id: str,
    team_id: str,
    dao_id: str,
    chunk_ids: list[str],
    indexed: bool = True,
    visibility: str = "public",
    metadata: Optional[Dict[str, Any]] = None,
    trace_id: Optional[str] = None,
    span_id: Optional[str] = None
):
    """Publish rag.document.indexed event"""
    payload = {
        "doc_id": doc_id,
        "team_id": team_id,
        "dao_id": dao_id,
        "chunk_ids": chunk_ids,
        "indexed": indexed,
        "visibility": visibility,
        "metadata": metadata or {}
    }
    
    return await publish_event(
        subject="rag.document.indexed",
        payload=payload,
        team_id=team_id,
        trace_id=trace_id,
        span_id=span_id
    )


async def close_nats():
    """Close NATS connection"""
    global _nats_conn
    if _nats_conn:
        await _nats_conn.drain()
        await _nats_conn.close()
        _nats_conn = None
        logger.info("NATS connection closed")