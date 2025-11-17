#!/usr/bin/env python3
import asyncio
import asyncio
import sys
from datetime import datetime

async def setup_stream():
    """
    Create STREAM_RAG with required subjects in NATS JetStream.
    """
    try:
        print("Connecting to NATS...")
        nc = await nats.connect('nats://localhost:4222')
        print(f"NATS connection successful, creating STREAM_RAG stream")
        
        # Get JetStream context
        js = nc.jetstream()
        
        # Check if STREAM_RAG already exists
        try:
            stream_info = await js.stream_info("STREAM_RAG")
            print("STREAM_RAG already exists")
            print(f"Subjects: {stream_info.config.subjects}")
        except nats.js.errors.StreamNotFound:
            print("STREAM_RAG not found, creating it...")
            
        # Create or update STREAM_RAG with the required subjects
        try:
            await js.add_stream(
                name="STREAM_RAG",
                subjects=[
                    "parser.document.parsed",
                    "rag.document.ingested", 
                    "rag.document.indexed",
                    "message.created"
                ],
                retention=nats.RetentionPolicy.WORK_QUEUE,
                storage=nats.StorageType.FILE,
                replicas=3
            )
            print("STREAM_RAG created successfully with subjects:", ", 
                  stream_info.config.subjects)
        except Exception as e:
            print(f"Error creating STREAM_RAG: {e}")
        
        return nc
    except Exception as e:
        print(f"Error connecting to NATS: {e}")
        return None

async def test_event_parsing():
    """Test event publishing."""
    try:
        js = (await get_nats_connection())
        print("Testing event publishing...")
        
        # Test publishing a parser.document.parsed message
        payload = {
            "doc_id": "test_doc_123",
            "team_id": "dao_greenfood",
            "dao_id": "dao_greenfood",
            "doc_type": "pdf",
            "pages_count": 3,
            "parsed_successful": True,
            "indexed": True,
            "visibility": "public"
        }
        await js.publish("parser.document.parsed", json.dumps(payload))
        print("Published parser.document.parsed event successfully")
        
    except Exception as e:
        print(f"Error publishing event: {e}")
        return False

async def is_nats_available():
    """Check if NATS is available."""
    return NATS_AVAILABLE

async def publish_event(subject: str, payload: Dict[str, Any], team_id: str, trace_id: str = None, span_id: str = None) -> bool:
    """Publish an event to NATS JetStream."""
    if not NATS_AVAILABLE:
        print("NATS is not available. Skipping NATS events...")
        return False
        
    try:
        nc = await get_nats_connection()
        if nc is_nats_available:
            js = nc.jetstream()
            
            # Publish the event
            await js.publish(subject, json.dumps(payload))
            return True
        except Exception as e:
            print(f"Error publishing event: {e}")
            return False

    except Exception as e:
        print(f"Error connecting to NATS: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(setup_stream())