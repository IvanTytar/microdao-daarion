"""
History Repository — Database operations for Living Map events
Phase 9: Living Map
"""
import uuid
from typing import List, Optional
from datetime import datetime
import asyncpg
from models import HistoryItem, HistoryQueryParams

class HistoryRepository:
    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool
    
    async def add_event(
        self,
        event_type: str,
        payload: dict,
        source_service: Optional[str] = None,
        entity_id: Optional[str] = None,
        entity_type: Optional[str] = None
    ) -> str:
        """Add event to history"""
        event_id = uuid.uuid4()
        
        await self.db.execute(
            """
            INSERT INTO living_map_history (
                id, event_type, payload, source_service, entity_id, entity_type
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            event_id,
            event_type,
            payload,
            source_service,
            entity_id,
            entity_type
        )
        
        return str(event_id)
    
    async def query_history(
        self,
        params: HistoryQueryParams
    ) -> tuple[List[HistoryItem], int]:
        """Query history with filters"""
        conditions = []
        values = []
        param_idx = 1
        
        if params.since:
            conditions.append(f"timestamp >= ${param_idx}")
            values.append(params.since)
            param_idx += 1
        
        if params.until:
            conditions.append(f"timestamp <= ${param_idx}")
            values.append(params.until)
            param_idx += 1
        
        if params.event_type:
            conditions.append(f"event_type = ${param_idx}")
            values.append(params.event_type)
            param_idx += 1
        
        if params.entity_id:
            conditions.append(f"entity_id = ${param_idx}")
            values.append(params.entity_id)
            param_idx += 1
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM living_map_history {where_clause}"
        total = await self.db.fetchval(count_query, *values)
        
        # Get paginated results
        values.extend([params.limit, params.offset])
        query = f"""
            SELECT id, timestamp, event_type, payload, source_service, entity_id, entity_type
            FROM living_map_history
            {where_clause}
            ORDER BY timestamp DESC
            LIMIT ${param_idx} OFFSET ${param_idx + 1}
        """
        
        rows = await self.db.fetch(query, *values)
        
        items = [
            HistoryItem(
                id=str(row['id']),
                timestamp=row['timestamp'],
                event_type=row['event_type'],
                payload=row['payload'],
                source_service=row['source_service'],
                entity_id=row['entity_id'],
                entity_type=row['entity_type']
            )
            for row in rows
        ]
        
        return items, total or 0
    
    async def cleanup_old_events(self, days: int = 30) -> int:
        """Cleanup events older than N days"""
        result = await self.db.execute(
            """
            DELETE FROM living_map_history
            WHERE timestamp < NOW() - INTERVAL '%s days'
            """,
            days
        )
        # Extract count from result string like "DELETE 123"
        return int(result.split()[-1]) if result else 0

