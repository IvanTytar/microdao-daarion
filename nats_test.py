#!/usr/bin/env python3
import asyncio
import nats
import sys

async def test_nats_connection():
    try:
        print("Connecting to NATS...")
        nc = await nats.connect('nats://localhost:4222')
        print(f"Connected to NATS JetStream at port 4222")
        
        # Check if STREAM_RAG exists
        js = nc.jetstream()
        try:
            stream_info = await js.stream_info("STREAM_RAG")
            print(f"STREAM_RAG already exists")
            print(f"Subjects: {stream_info.config.subjects}")
        except nats.js.errors.StreamNotFound:
            print("STREAM_RAG not found, creating it...")
            await js.add_stream(
                name="STREAM_RAG",
                subjects=["parser.document.parsed", "rag.document.ingested", "rwa.summary.created"],
                retention=nats.RetentionPolicy.WORK_QUEUE,
                storage=nats.StorageType.FILE,
                replicas=3
            )
            print("STREAM_RAG created successfully")
        except Exception as e:
            print(f"Error creating STREAM_RAG: {e}")
            
        # Test message publishing
        print("\nTesting message publishing...")
        await js.publish("parser.document.parsed", "{}")
        print("Test message published successfully")
        
        await nc.close()
        return True
    except Exception as e:
        print(f"Error connecting to NATS: {e}")
        return False

if __name__ == "__main__":
    # Try to run the test
    if not test_nats_connection():
        print("Falling back to skip NATS integration tests")
        sys.exit(1)
    
    print("\n=== Test completed successfully ===")
    sys.exit(0)