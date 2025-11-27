"""
Repository для City Backend (PostgreSQL)
"""

import os
import asyncpg
from typing import Optional, List
from datetime import datetime
import secrets


# Database connection
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Отримати connection pool"""
    global _pool
    
    if _pool is None:
        database_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/daarion")
        _pool = await asyncpg.create_pool(database_url, min_size=2, max_size=10)
    
    return _pool


async def close_pool():
    """Закрити connection pool"""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def generate_id(prefix: str) -> str:
    """Генерувати простий ID"""
    return f"{prefix}_{secrets.token_urlsafe(12)}"


# =============================================================================
# City Rooms Repository
# =============================================================================

async def get_all_rooms(limit: int = 100, offset: int = 0) -> List[dict]:
    """Отримати всі кімнати"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        ORDER BY is_default DESC, created_at DESC
        LIMIT $1 OFFSET $2
    """
    
    rows = await pool.fetch(query, limit, offset)
    return [dict(row) for row in rows]


async def get_room_by_id(room_id: str) -> Optional[dict]:
    """Отримати кімнату по ID"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE id = $1
    """
    
    row = await pool.fetchrow(query, room_id)
    return dict(row) if row else None


async def get_room_by_slug(slug: str) -> Optional[dict]:
    """Отримати кімнату по slug"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE slug = $1
    """
    
    row = await pool.fetchrow(query, slug)
    return dict(row) if row else None


async def create_room(
    slug: str, 
    name: str, 
    description: Optional[str], 
    created_by: Optional[str],
    matrix_room_id: Optional[str] = None,
    matrix_room_alias: Optional[str] = None
) -> dict:
    """Створити кімнату"""
    pool = await get_pool()
    
    room_id = f"room_city_{slug}"
    
    query = """
        INSERT INTO city_rooms (id, slug, name, description, created_by, matrix_room_id, matrix_room_alias)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, slug, name, description, is_default, created_at, created_by, matrix_room_id, matrix_room_alias
    """
    
    row = await pool.fetchrow(query, room_id, slug, name, description, created_by, matrix_room_id, matrix_room_alias)
    return dict(row)


async def update_room_matrix(room_id: str, matrix_room_id: str, matrix_room_alias: str) -> Optional[dict]:
    """Оновити Matrix поля кімнати"""
    pool = await get_pool()
    
    query = """
        UPDATE city_rooms
        SET matrix_room_id = $2, matrix_room_alias = $3
        WHERE id = $1
        RETURNING id, slug, name, description, is_default, created_at, created_by, matrix_room_id, matrix_room_alias
    """
    
    row = await pool.fetchrow(query, room_id, matrix_room_id, matrix_room_alias)
    return dict(row) if row else None


async def get_rooms_without_matrix() -> List[dict]:
    """Отримати кімнати без Matrix інтеграції"""
    pool = await get_pool()
    
    query = """
        SELECT id, slug, name, description, is_default, created_at, created_by,
               matrix_room_id, matrix_room_alias
        FROM city_rooms
        WHERE matrix_room_id IS NULL
        ORDER BY created_at
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


# =============================================================================
# City Room Messages Repository
# =============================================================================

async def get_room_messages(room_id: str, limit: int = 50) -> List[dict]:
    """Отримати повідомлення кімнати"""
    pool = await get_pool()
    
    query = """
        SELECT id, room_id, author_user_id, author_agent_id, body, created_at
        FROM city_room_messages
        WHERE room_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    """
    
    rows = await pool.fetch(query, room_id, limit)
    # Reverse для правильного порядку (старі → нові)
    return [dict(row) for row in reversed(rows)]


async def create_room_message(
    room_id: str,
    body: str,
    author_user_id: Optional[str] = None,
    author_agent_id: Optional[str] = None
) -> dict:
    """Створити повідомлення в кімнаті"""
    pool = await get_pool()
    
    message_id = generate_id("m_city")
    
    query = """
        INSERT INTO city_room_messages (id, room_id, author_user_id, author_agent_id, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, room_id, author_user_id, author_agent_id, body, created_at
    """
    
    row = await pool.fetchrow(query, message_id, room_id, author_user_id, author_agent_id, body)
    return dict(row)


# =============================================================================
# City Feed Events Repository
# =============================================================================

async def get_feed_events(limit: int = 20, offset: int = 0) -> List[dict]:
    """Отримати події feed"""
    pool = await get_pool()
    
    query = """
        SELECT id, kind, room_id, user_id, agent_id, payload, created_at
        FROM city_feed_events
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    """
    
    rows = await pool.fetch(query, limit, offset)
    return [dict(row) for row in rows]


async def create_feed_event(
    kind: str,
    payload: dict,
    room_id: Optional[str] = None,
    user_id: Optional[str] = None,
    agent_id: Optional[str] = None
) -> dict:
    """Створити подію в feed"""
    pool = await get_pool()
    
    event_id = generate_id("evt_city")
    
    query = """
        INSERT INTO city_feed_events (id, kind, room_id, user_id, agent_id, payload)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING id, kind, room_id, user_id, agent_id, payload, created_at
    """
    
    import json
    payload_json = json.dumps(payload)
    
    row = await pool.fetchrow(query, event_id, kind, room_id, user_id, agent_id, payload_json)
    return dict(row)


# =============================================================================
# City Map Repository
# =============================================================================

async def get_map_config() -> dict:
    """Отримати конфігурацію мапи міста"""
    pool = await get_pool()
    
    query = """
        SELECT id, grid_width, grid_height, cell_size, background_url, updated_at
        FROM city_map_config
        WHERE id = 'default'
    """
    
    row = await pool.fetchrow(query)
    if row:
        return dict(row)
    
    # Повернути дефолтні значення якщо немає запису
    return {
        "id": "default",
        "grid_width": 6,
        "grid_height": 3,
        "cell_size": 100,
        "background_url": None
    }


async def get_rooms_for_map() -> List[dict]:
    """Отримати кімнати з координатами для 2D мапи"""
    pool = await get_pool()
    
    query = """
        SELECT 
            id, slug, name, description,
            room_type, zone, icon, color,
            map_x, map_y, map_w, map_h,
            matrix_room_id
        FROM city_rooms
        ORDER BY map_y, map_x
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


# =============================================================================
# Agents Repository
# =============================================================================

async def get_all_agents() -> List[dict]:
    """Отримати всіх агентів"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities, created_at, updated_at
        FROM agents
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def get_agents_by_room(room_id: str) -> List[dict]:
    """Отримати агентів у конкретній кімнаті"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities
        FROM agents
        WHERE current_room_id = $1 AND status != 'offline'
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query, room_id)
    return [dict(row) for row in rows]


async def get_online_agents() -> List[dict]:
    """Отримати всіх онлайн агентів"""
    pool = await get_pool()
    
    query = """
        SELECT id, display_name, kind, avatar_url, color, status, 
               current_room_id, capabilities
        FROM agents
        WHERE status IN ('online', 'busy')
        ORDER BY display_name
    """
    
    rows = await pool.fetch(query)
    return [dict(row) for row in rows]


async def update_agent_status(agent_id: str, status: str, room_id: Optional[str] = None) -> Optional[dict]:
    """Оновити статус агента"""
    pool = await get_pool()
    
    if room_id:
        query = """
            UPDATE agents
            SET status = $2, current_room_id = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING id, display_name, kind, status, current_room_id
        """
        row = await pool.fetchrow(query, agent_id, status, room_id)
    else:
        query = """
            UPDATE agents
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, display_name, kind, status, current_room_id
        """
        row = await pool.fetchrow(query, agent_id, status)
    
    return dict(row) if row else None

