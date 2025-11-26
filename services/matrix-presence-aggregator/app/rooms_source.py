"""Room source - reads rooms from database or static config"""
from sqlalchemy import create_engine, text
from typing import List, Dict
import logging
import yaml

logger = logging.getLogger(__name__)


class RoomsSource:
    """Reads room list from PostgreSQL database"""
    
    def __init__(self, db_dsn: str):
        self.engine = create_engine(db_dsn)

    def get_rooms(self) -> List[Dict]:
        """
        Get all rooms with matrix_room_id set.
        
        Expected table structure:
        - id (text)
        - slug (text) 
        - name (text)
        - matrix_room_id (text, nullable)
        """
        query = text(
            """
            SELECT id, slug, name, matrix_room_id
            FROM city_rooms
            WHERE matrix_room_id IS NOT NULL
            """
        )
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(query).mappings().all()

            return [
                {
                    "room_id": str(r["id"]),
                    "slug": r["slug"],
                    "title": r["name"],
                    "matrix_room_id": r["matrix_room_id"],
                }
                for r in rows
            ]
        except Exception as e:
            logger.error(f"Failed to get rooms from database: {e}")
            return []


class StaticRoomsSource:
    """Reads room list from YAML config file"""
    
    def __init__(self, config_path: str):
        self.config_path = config_path
        self._rooms = self._load_config()

    def _load_config(self) -> List[Dict]:
        try:
            with open(self.config_path, 'r') as f:
                data = yaml.safe_load(f)
                return data.get('rooms', [])
        except Exception as e:
            logger.error(f"Failed to load rooms config: {e}")
            return []

    def get_rooms(self) -> List[Dict]:
        return self._rooms

