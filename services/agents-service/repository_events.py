"""
Agent Events Repository — Database operations for agent_events
Phase 6: Event Store
"""
import uuid
from typing import List, Optional
from datetime import datetime
import asyncpg
from models import AgentEvent, AgentEventCreate, EventKind

class EventRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    # ========================================================================
    # Events — CRUD
    # ========================================================================
    
    async def create_event(
        self,
        agent_db_id: str,
        event: AgentEventCreate
    ) -> AgentEvent:
        """Log new event"""
        event_id = uuid.uuid4()
        
        row = await self.db.fetchrow(
            """
            INSERT INTO agent_events (
                id, agent_id, ts, kind, channel_id, payload
            )
            VALUES ($1, $2, NOW(), $3, $4, $5)
            RETURNING id, agent_id, ts, kind, channel_id, payload
            """,
            event_id,
            uuid.UUID(agent_db_id),
            event.kind.value,
            event.channel_id,
            event.payload or {}
        )
        
        return self._row_to_event(row, event.agent_id)
    
    async def log_event(
        self,
        agent_external_id: str,
        kind: str,
        payload: Optional[dict] = None,
        channel_id: Optional[str] = None
    ) -> None:
        """
        Log event (simplified version)
        Looks up agent by external_id and inserts event
        """
        # Get agent DB ID
        agent_row = await self.db.fetchrow(
            "SELECT id FROM agents WHERE external_id = $1",
            agent_external_id
        )
        
        if not agent_row:
            print(f"⚠️  Agent {agent_external_id} not found, skipping event {kind}")
            return
        
        event_id = uuid.uuid4()
        
        await self.db.execute(
            """
            INSERT INTO agent_events (id, agent_id, ts, kind, channel_id, payload)
            VALUES ($1, $2, NOW(), $3, $4, $5)
            """,
            event_id,
            agent_row['id'],
            kind,
            channel_id,
            payload or {}
        )
        
        print(f"✅ Event logged: {agent_external_id} → {kind}")
    
    async def list_events(
        self,
        agent_external_id: str,
        limit: int = 50,
        before_ts: Optional[datetime] = None
    ) -> List[AgentEvent]:
        """List events for agent"""
        # Get agent DB ID
        agent_row = await self.db.fetchrow(
            "SELECT id FROM agents WHERE external_id = $1",
            agent_external_id
        )
        
        if not agent_row:
            return []
        
        query = """
            SELECT id, agent_id, ts, kind, channel_id, payload
            FROM agent_events
            WHERE agent_id = $1
        """
        
        values = [agent_row['id']]
        param_idx = 2
        
        if before_ts:
            query += f" AND ts < ${param_idx}"
            values.append(before_ts)
            param_idx += 1
        
        query += f" ORDER BY ts DESC LIMIT ${param_idx}"
        values.append(limit)
        
        rows = await self.db.fetch(query, *values)
        
        return [self._row_to_event(row, agent_external_id) for row in rows]
    
    async def list_recent_events(
        self,
        limit: int = 100,
        since_ts: Optional[datetime] = None
    ) -> List[AgentEvent]:
        """
        List recent events across all agents
        Used for WebSocket streaming
        """
        query = """
            SELECT 
                e.id, e.agent_id, e.ts, e.kind, e.channel_id, e.payload,
                a.external_id as agent_external_id
            FROM agent_events e
            JOIN agents a ON e.agent_id = a.id
            WHERE 1=1
        """
        
        values = []
        param_idx = 1
        
        if since_ts:
            query += f" AND e.ts > ${param_idx}"
            values.append(since_ts)
            param_idx += 1
        
        query += f" ORDER BY e.ts DESC LIMIT ${param_idx}"
        values.append(limit)
        
        rows = await self.db.fetch(query, *values)
        
        return [self._row_to_event(row, row['agent_external_id']) for row in rows]
    
    # ========================================================================
    # Helpers
    # ========================================================================
    
    def _row_to_event(self, row, agent_external_id: str) -> AgentEvent:
        """Convert DB row to AgentEvent"""
        return AgentEvent(
            id=str(row['id']),
            agent_id=agent_external_id,
            kind=EventKind(row['kind']),
            ts=row['ts'],
            channel_id=row['channel_id'],
            tool_id=row.get('tool_id'),
            content=row.get('content'),
            payload=row['payload']
        )

