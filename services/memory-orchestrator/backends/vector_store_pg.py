import asyncpg
import json
from datetime import datetime
from uuid import uuid4
from typing import Optional
from models import MemoryItem
from embedding_client import EmbeddingClient

class VectorStoreBackend:
    """
    Mid-term memory backend with vector search (PostgreSQL + pgvector)
    
    For Phase 3: Uses simple stub if pgvector not available
    """
    
    def __init__(self, pool: asyncpg.Pool, embedding_client: EmbeddingClient):
        self.pool = pool
        self.embedding_client = embedding_client
        self.pgvector_available = False
    
    async def initialize(self):
        """Create tables if not exist"""
        async with self.pool.acquire() as conn:
            # Try to enable pgvector extension
            try:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                self.pgvector_available = True
                print("✅ pgvector extension enabled")
            except Exception as e:
                print(f"⚠️  pgvector not available: {e}")
                print("   Will use fallback (simple text search)")
            
            # Create table (with or without vector column)
            if self.pgvector_available:
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS agent_memories_vector (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        agent_id TEXT NOT NULL,
                        microdao_id TEXT NOT NULL,
                        channel_id TEXT,
                        kind TEXT NOT NULL,
                        content TEXT NOT NULL,
                        content_json JSONB,
                        embedding vector(1024),
                        metadata JSONB DEFAULT '{}',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_vector_agent 
                    ON agent_memories_vector (agent_id);
                    
                    CREATE INDEX IF NOT EXISTS idx_vector_embedding 
                    ON agent_memories_vector USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100);
                """)
            else:
                # Fallback table without vector column
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS agent_memories_vector (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        agent_id TEXT NOT NULL,
                        microdao_id TEXT NOT NULL,
                        channel_id TEXT,
                        kind TEXT NOT NULL,
                        content TEXT NOT NULL,
                        content_json JSONB,
                        metadata JSONB DEFAULT '{}',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_vector_agent 
                    ON agent_memories_vector (agent_id);
                """)
            
            print("✅ Vector memory table initialized")
    
    async def store(
        self,
        agent_id: str,
        microdao_id: str,
        kind: str,
        content: dict,
        channel_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """Store a memory with embedding"""
        memory_id = str(uuid4())
        
        # Convert content to text for embedding
        content_text = json.dumps(content)
        
        # Generate embedding
        embedding = await self.embedding_client.embed(content_text)
        
        async with self.pool.acquire() as conn:
            if self.pgvector_available:
                await conn.execute(
                    """
                    INSERT INTO agent_memories_vector 
                    (id, agent_id, microdao_id, channel_id, kind, content, content_json, embedding, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9)
                    """,
                    memory_id, agent_id, microdao_id, channel_id, kind,
                    content_text, json.dumps(content), embedding, json.dumps(metadata or {})
                )
            else:
                # Fallback without embedding
                await conn.execute(
                    """
                    INSERT INTO agent_memories_vector 
                    (id, agent_id, microdao_id, channel_id, kind, content, content_json, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    memory_id, agent_id, microdao_id, channel_id, kind,
                    content_text, json.dumps(content), json.dumps(metadata or {})
                )
        
        return memory_id
    
    async def query(
        self,
        agent_id: str,
        query_text: str,
        limit: int = 5,
        kind_filter: Optional[list[str]] = None
    ) -> list[MemoryItem]:
        """Query memories by semantic similarity"""
        
        if self.pgvector_available:
            # Vector search
            query_embedding = await self.embedding_client.embed(query_text)
            
            query_sql = """
                SELECT id, kind, content, metadata, created_at,
                       1 - (embedding <=> $2::vector) as score
                FROM agent_memories_vector
                WHERE agent_id = $1
            """
            params = [agent_id, query_embedding]
            
            if kind_filter:
                query_sql += f" AND kind = ANY($3)"
                params.append(kind_filter)
            
            query_sql += f" ORDER BY embedding <=> $2::vector LIMIT ${len(params) + 1}"
            params.append(limit)
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query_sql, *params)
        
        else:
            # Fallback: simple text search (ILIKE)
            query_sql = """
                SELECT id, kind, content, metadata, created_at, 0.5 as score
                FROM agent_memories_vector
                WHERE agent_id = $1 AND content ILIKE $2
            """
            params = [agent_id, f"%{query_text}%"]
            
            if kind_filter:
                query_sql += f" AND kind = ANY($3)"
                params.append(kind_filter)
            
            query_sql += f" ORDER BY created_at DESC LIMIT ${len(params) + 1}"
            params.append(limit)
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query_sql, *params)
        
        items = []
        for row in rows:
            items.append(MemoryItem(
                id=str(row['id']),
                kind=row['kind'],
                score=float(row['score']),
                content=row['content'],
                meta=row['metadata'] or {},
                created_at=row['created_at']
            ))
        
        return items





