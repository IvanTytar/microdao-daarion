"""
Repository для Second Me Service
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
# Second Me Sessions
# =============================================================================

async def get_or_create_session(user_id: str, agent_id: Optional[str] = None) -> dict:
    """
    Отримати або створити сесію для користувача
    Для MVP: одна активна сесія на користувача
    """
    pool = await get_pool()
    
    # Спробувати знайти останню сесію
    query_find = """
        SELECT id, user_id, agent_id, created_at, last_interaction_at
        FROM secondme_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
    """
    
    existing = await pool.fetchrow(query_find, user_id)
    
    if existing:
        return dict(existing)
    
    # Створити нову
    session_id = generate_id("smsess")
    
    query_create = """
        INSERT INTO secondme_sessions (id, user_id, agent_id)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, agent_id, created_at, last_interaction_at
    """
    
    new_session = await pool.fetchrow(query_create, session_id, user_id, agent_id)
    return dict(new_session)


async def update_session_interaction(session_id: str):
    """Оновити час останньої взаємодії"""
    pool = await get_pool()
    
    query = """
        UPDATE secondme_sessions
        SET last_interaction_at = NOW()
        WHERE id = $1
    """
    
    await pool.execute(query, session_id)


# =============================================================================
# Second Me Messages
# =============================================================================

async def get_session_messages(session_id: str, limit: int = 5) -> List[dict]:
    """Отримати останні N повідомлень сесії"""
    pool = await get_pool()
    
    query = """
        SELECT id, session_id, user_id, role, content, tokens_used, latency_ms, created_at
        FROM secondme_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
    """
    
    rows = await pool.fetch(query, session_id, limit)
    # Reverse для правильного порядку
    return [dict(row) for row in reversed(rows)]


async def get_user_messages(user_id: str, limit: int = 5) -> List[dict]:
    """Отримати останні N повідомлень користувача з всіх сесій"""
    pool = await get_pool()
    
    query = """
        SELECT sm.id, sm.session_id, sm.user_id, sm.role, sm.content, sm.tokens_used, sm.latency_ms, sm.created_at
        FROM secondme_messages sm
        JOIN secondme_sessions ss ON sm.session_id = ss.id
        WHERE ss.user_id = $1
        ORDER BY sm.created_at DESC
        LIMIT $2
    """
    
    rows = await pool.fetch(query, user_id, limit)
    # Reverse для правильного порядку
    return [dict(row) for row in reversed(rows)]


async def create_message(
    session_id: str,
    user_id: str,
    role: str,
    content: str,
    tokens_used: Optional[int] = None,
    latency_ms: Optional[int] = None
) -> dict:
    """Створити повідомлення"""
    pool = await get_pool()
    
    message_id = generate_id("smmsg")
    
    query = """
        INSERT INTO secondme_messages (id, session_id, user_id, role, content, tokens_used, latency_ms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, session_id, user_id, role, content, tokens_used, latency_ms, created_at
    """
    
    row = await pool.fetchrow(query, message_id, session_id, user_id, role, content, tokens_used, latency_ms)
    return dict(row)


async def get_user_stats(user_id: str) -> dict:
    """Отримати статистику користувача"""
    pool = await get_pool()
    
    query = """
        SELECT 
            COUNT(DISTINCT ss.id) as total_sessions,
            COUNT(sm.id) as total_messages,
            MAX(sm.created_at) as last_interaction
        FROM secondme_sessions ss
        LEFT JOIN secondme_messages sm ON ss.id = sm.session_id
        WHERE ss.user_id = $1
    """
    
    row = await pool.fetchrow(query, user_id)
    return dict(row) if row else {"total_sessions": 0, "total_messages": 0, "last_interaction": None}


async def clear_user_history(user_id: str):
    """Очистити історію користувача"""
    pool = await get_pool()
    
    # Видалити всі сесії (каскадно видаляться повідомлення)
    query = """
        DELETE FROM secondme_sessions
        WHERE user_id = $1
    """
    
    await pool.execute(query, user_id)

