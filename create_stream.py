import asyncio
import nats
import json

async def main():
    # Connect to NATS
    nc = await nats.connect('nats://localhost:4222')
    print("Connected to NATS")
    
    # Get JetStream context
    js = nc.jetstream()
    print("Got JetStream context")
    
    # Create STREAM_RAG
    try:
        stream_config = {
            "name": "STREAM_RAG",
            "description": "Stream for RAG ingestion events",
            "subjects": ["parser.document.parsed", "rag.document.ingested", "rag.document.indexed"],
            "retention": "workqueue",
            "storage": "file",
            "replicas": 3,
            "max_bytes": -1,
            "max_age": 0,
            "max_msgs": -1
        }
        
        await js.add_stream(
            name="STREAM_RAG",
            subjects=stream_config["subjects"],
            retention=nats.RetentionPolicy.WORK_QUEUE,
            storage=nats.StorageType.FILE,
            replicas=3
        )
        print("STREAM_RAG created successfully")
        
        # Verify stream exists
        streams = await js.streams_info()
        for stream in streams:
            if stream.config.name == "STREAM_RAG":
                print(f"Verified STREAM_RAG: {stream.config.name}")
                print(f"Subjects: {stream.config.subjects}")
                return
        
        print("STREAM_RAG created but not verified")
    except Exception as e:
        print(f"Error creating stream: {e}")
    
    # Close connection
    await nc.close()

if __name__ == "__main__":
    asyncio.run(main())