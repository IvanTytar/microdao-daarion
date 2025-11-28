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
        - room_id
        - color
        - node_id
        - district
        - model
        - role
        - avatar_url
        """
        query = text("""
            SELECT 
                a.id as agent_id,
                a.display_name,
                a.kind,
                a.status,
                COALESCE(cr.id, a.current_room_id) as room_id,
                COALESCE(a.color_hint, a.color, 'cyan') as color,
                a.node_id,
                a.district,
                a.model,
                a.role,
                a.avatar_url,
                a.primary_room_slug
            FROM agents a
            LEFT JOIN city_rooms cr ON cr.slug = a.primary_room_slug
            WHERE a.status IN ('online', 'busy')
              AND (a.is_active = true OR a.is_active IS NULL)
            ORDER BY a.display_name
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
        """Get all active agents (including offline)"""
        query = text("""
            SELECT 
                a.id as agent_id,
                a.display_name,
                a.kind,
                a.status,
                COALESCE(cr.id, a.current_room_id) as room_id,
                COALESCE(a.color_hint, a.color, 'cyan') as color,
                a.node_id,
                a.district,
                a.model,
                a.role,
                a.avatar_url,
                a.primary_room_slug
            FROM agents a
            LEFT JOIN city_rooms cr ON cr.slug = a.primary_room_slug
            WHERE a.is_active = true OR a.is_active IS NULL
            ORDER BY a.display_name
        """)
        
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(query).mappings().all()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Failed to get all agents: {e}")
            return []

