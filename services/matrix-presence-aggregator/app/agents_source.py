"""Agents data source from PostgreSQL"""
from sqlalchemy import create_engine, text
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class AgentsSource:
    """Fetches agent data from PostgreSQL"""
    
    def __init__(self, db_dsn: str):
        self.engine = create_engine(db_dsn)
    
    def get_online_agents(self) -> List[Dict]:
        """
        Get all online/busy agents.
        
        Returns list of dicts with:
        - agent_id
        - display_name
        - kind
        - status
        - room_id (current_room_id)
        - color
        """
        query = text("""
            SELECT 
                id as agent_id,
                display_name,
                kind,
                status,
                current_room_id as room_id,
                color
            FROM agents
            WHERE status IN ('online', 'busy')
            ORDER BY display_name
        """)
        
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(query).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to get online agents: {e}")
            return []
    
    def get_agents_by_room(self, room_id: str) -> List[Dict]:
        """Get agents in a specific room"""
        query = text("""
            SELECT 
                id as agent_id,
                display_name,
                kind,
                status,
                current_room_id as room_id,
                color
            FROM agents
            WHERE current_room_id = :room_id AND status != 'offline'
            ORDER BY display_name
        """)
        
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(query, {"room_id": room_id}).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to get agents for room {room_id}: {e}")
            return []
    
    def get_all_agents(self) -> List[Dict]:
        """Get all agents (including offline)"""
        query = text("""
            SELECT 
                id as agent_id,
                display_name,
                kind,
                status,
                current_room_id as room_id,
                color
            FROM agents
            ORDER BY display_name
        """)
        
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(query).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to get all agents: {e}")
            return []

