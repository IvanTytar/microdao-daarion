"""
Event worker for rag-service
Consumes events from NATS JetStream STREAM_RAG
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional

from app.core.config import settings
from app.ingest_pipeline import ingest_parsed_document
from app.document_store import DocumentStore
import nats
from nats.js.errors import NotFoundError

logger = logging.getLogger(__name__)

# Connection to NATS
_nats_conn: Optional[nats.NATS] = None
_subscriptions: list = []


async def get_nats_connection():
    """Initialize or return existing NATS connection"""
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


async def handle_parser_document_parsed(msg):
    """Handle parser.document.parsed events"""
    try:
        event_data = json.loads(msg.data)
        payload = event_data.get("payload", {})
        
        doc_id = payload.get("doc_id")
        team_id = event_data.get("meta", {}).get("team_id")
        dao_id = payload.get("dao_id")
        indexed = payload.get("indexed", True)
        
        logger.info(f"Processing parser.document.parsed: doc_id={doc_id}, team_id={team_id}")
        
        # If not indexed, skip processing
        if not indexed:
            logger.info(f"Skipping non-indexed document: doc_id={doc_id}")
            await msg.ack()
            return
        
        # For now, we'll assume the document is already parsed and ready to ingest
        # In a real implementation, we might need to retrieve the parsed content from a storage service
        # For this test, we'll create a mock parsed document payload
        mock_parsed_json = {
            "doc_id": doc_id,
            "title": "Sample Document",
            "pages": ["Sample page 1", "Sample page 2"],
            "metadata": payload.get("metadata", {})
        }
        
        # Ingest the document
        result = ingest_parsed_document(
            dao_id=dao_id or team_id,
            doc_id=doc_id,
            parsed_json=mock_parsed_json,
            user_id=None  # TODO: get from event if available
        )
        
        logger.info(f"Ingested document: doc_id={doc_id}, chunks={result.get('doc_count', 0)}")
        await msg.ack()
    except Exception as e:
        logger.error(f"Error processing parser.document.parsed event: {e}", exc_info=True)
        # In production, decide whether to ack or nak based on error type
        await msg.nak()


async def handle_rag_document_ingested(msg):
    """Handle rag.document.ingested events"""
    try:
        event_data = json.loads(msg.data)
        payload = event_data.get("payload", {})
        
        doc_id = payload.get("doc_id")
        team_id = event_data.get("meta", {}).get("team_id")
        
        logger.info(f"Processing rag.document.ingested: doc_id={doc_id}, team_id={team_id}")
        
        # This event is already processed by the ingestion pipeline
        # We could trigger indexing here if needed
        
        await msg.ack()
    except Exception as e:
        logger.error(f"Error processing rag.document.ingested event: {e}", exc_info=True)
        await msg.nak()


async def handle_rag_document_indexed(msg):
    """Handle rag.document.indexed events"""
    try:
        event_data = json.loads(msg.data)
        payload = event_data.get("payload", {})
        
        doc_id = payload.get("doc_id")
        team_id = event_data.get("meta", {}).get("team_id")
        
        logger.info(f"Processing rag.document.indexed: doc_id={doc_id}, team_id={team_id}")
        
        # This event is already processed by the indexing pipeline
        # We could trigger additional actions here if needed
        
        await msg.ack()
    except Exception as e:
        logger.error(f"Error processing rag.document.indexed event: {e}", exc_info=True)
        await msg.nak()


async def subscribe_to_stream():
    """Subscribe to STREAM_RAG and handle events"""
    try:
        conn = await get_nats_connection()
        js = conn.jetstream()
        
        # Define subscriptions for each subject
        async def create_subscription(subject, handler):
            try:
                # Create or get consumer
                durable_name = f"rag-service-{subject.replace('.', '_')}"
                try:
                    await js.add_consumer(
                        "STREAM_RAG",
                        durable_name=durable_name,
                        filter_subject=subject,
                        ack_policy="explicit"
                    )
                    logger.info(f"Created consumer for {subject}: {durable_name}")
                except nats.js.errors.ConsumerAlreadyExistsError:
                    logger.info(f"Consumer for {subject} already exists: {durable_name}")
                
                # Subscribe
                sub = await js.subscribe(
                    subject="parser.document.parsed",
                    config=nats.js.api.ConsumerConfig(
                        deliver_policy="all",
                        ack_policy="explicit"
                    ),
                    cb=handler
                )
                logger.info(f"Subscribed to {subject}")
                return sub
            except Exception as e:
                logger.error(f"Failed to subscribe to {subject}: {e}")
                return None
        
        # Subscribe to all relevant subjects
        subscriptions = []
        
        # Subscribe to parser.document.parsed
        sub1 = await create_subscription("parser.document.parsed", handle_parser_document_parsed)
        if sub1:
            subscriptions.append(sub1)
        
        # Subscribe to rag.document.ingested (for potential handling)
        sub2 = await create_subscription("rag.document.ingested", handle_rag_document_ingested)
        if sub2:
            subscriptions.append(sub2)
        
        # Subscribe to rag.document.indexed (for potential handling)
        sub3 = await create_subscription("rag.document.indexed", handle_rag_document_indexed)
        if sub3:
            subscriptions.append(sub3)
        
        # Store subscriptions globally for cleanup
        import sys
        sys.modules[__name__]._subscriptions = subscriptions
        
        logger.info(f"Subscribed to {len(subscriptions)} STREAM_RAG subjects")
        return True
    except Exception as e:
        logger.error(f"Failed to subscribe to STREAM_RAG: {e}")
        return False


async def close_subscriptions():
    """Close all subscriptions and cleanup"""
    try:
        for sub in _subscriptions:
            await sub.unsubscribe()
        _subscriptions.clear()
        
        if _nats_conn:
            await _nats_conn.drain()
            await _nats_conn.close()
            _nats_conn = None
            logger.info("NATS connection closed")
    except Exception as e:
        logger.error(f"Error closing subscriptions: {e}")


async def event_worker():
    """Main function to start the event worker"""
    logger.info("Starting RAG event worker...")
    
    # Subscribe to event streams
    if await subscribe_to_stream():
        logger.info("RAG event worker started successfully")
        
        # Keep the worker running
        try:
            while True:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("RAG event worker shutting down...")
            await close_subscriptions()
    else:
        logger.error("Failed to start RAG event worker")


if __name__ == "__main__":
    asyncio.run(event_worker())