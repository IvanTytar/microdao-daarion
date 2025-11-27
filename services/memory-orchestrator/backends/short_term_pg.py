import asyncpg
import json
from datetime import datetime
from uuid import uuid4
from typing import Optional
from models import MemoryItem

class ShortTermBackend:
    """
    Short-term memory backend (PostgreSQL)
    
    Stores recent conversations and events for quick retrieval
    """
    
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
    
    async def initialize(self):
        """Create tables if not exist"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_memories_short (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    agent_id TEXT NOT NULL,
                    microdao_id TEXT NOT NULL,
                    channel_id TEXT,
                    kind TEXT NOT NULL,
                    content JSONB NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
                
                CREATE INDEX IF NOT EXISTS idx_short_agent_time 
                ON agent_memories_short (agent_id, created_at DESC);
                
                CREATE INDEX IF NOT EXISTS idx_short_microdao 
                ON agent_memories_short (microdao_id);
            """)
            print("✅ Short-term memory table initialized")
    
    async def store(
        self,
        agent_id: str,
        microdao_id: str,
        kind: str,
        content: dict,
        channel_id: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """Store a memory entry"""
        memory_id = str(uuid4())
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO agent_memories_short 
                (id, agent_id, microdao_id, channel_id, kind, content, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                memory_id, agent_id, microdao_id, channel_id, kind,
                json.dumps(content), json.dumps(metadata or {}), datetime.now()
            )
        
        return memory_id
    
    async def query(
        self,
        agent_id: str,
        limit: int = 10,
        kind_filter: Optional[list[str]] = None
    ) -> list[MemoryItem]:
        """Query recent memories (simple time-based retrieval)"""
        query = """
            SELECT id, kind, content, metadata, created_at
            FROM agent_memories_short
            WHERE agent_id = $1
        """
        params = [agent_id]
        
        if kind_filter:
            query += f" AND kind = ANY($2)"
            params.append(kind_filter)
        
        query += " ORDER BY created_at DESC LIMIT $" + str(len(params) + 1)
        params.append(limit)
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
        
        items = []
        for row in rows:
            content_dict = row['content']
            # Convert content dict to string for MemoryItem
            content_str = json.dumps(content_dict) if isinstance(content_dict, dict) else str(content_dict)
            
            items.append(MemoryItem(
                id=str(row['id']),
                kind=row['kind'],
                score=1.0,  # Time-based, no relevance score
                content=content_str,
                meta=row['metadata'] or {},
                created_at=row['created_at']
            ))
        
        return items




