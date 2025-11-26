"""
Database connection and operations for Auth Service
"""
import asyncpg
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager

from config import get_settings

settings = get_settings()

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10
        )
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_connection():
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn


# User operations
async def create_user(
    email: str,
    password_hash: str,
    display_name: Optional[str] = None
) -> Dict[str, Any]:
    async with get_connection() as conn:
        # Create user
        user = await conn.fetchrow(
            """
            INSERT INTO auth_users (email, password_hash, display_name)
            VALUES ($1, $2, $3)
            RETURNING id, email, display_name, avatar_url, is_active, is_admin, created_at
            """,
            email, password_hash, display_name
        )
        
        user_id = user['id']
        
        # Assign default 'user' role
        await conn.execute(
            """
            INSERT INTO auth_user_roles (user_id, role_id)
            VALUES ($1, 'user')
            """,
            user_id
        )
        
        return dict(user)


async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, email, password_hash, display_name, avatar_url, 
                   is_active, is_admin, created_at, updated_at
            FROM auth_users
            WHERE email = $1
            """,
            email
        )
        return dict(user) if user else None


async def get_user_by_id(user_id: UUID) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        user = await conn.fetchrow(
            """
            SELECT id, email, display_name, avatar_url, 
                   is_active, is_admin, created_at, updated_at
            FROM auth_users
            WHERE id = $1
            """,
            user_id
        )
        return dict(user) if user else None


async def get_user_roles(user_id: UUID) -> List[str]:
    async with get_connection() as conn:
        rows = await conn.fetch(
            """
            SELECT role_id FROM auth_user_roles
            WHERE user_id = $1
            """,
            user_id
        )
        return [row['role_id'] for row in rows]


# Session operations
async def create_session(
    user_id: UUID,
    user_agent: Optional[str] = None,
    ip_address: Optional[str] = None,
    ttl_seconds: int = 604800
) -> UUID:
    async with get_connection() as conn:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
        
        row = await conn.fetchrow(
            """
            INSERT INTO auth_sessions (user_id, user_agent, ip_address, expires_at)
            VALUES ($1, $2, $3::inet, $4)
            RETURNING id
            """,
            user_id, user_agent, ip_address, expires_at
        )
        return row['id']


async def get_session(session_id: UUID) -> Optional[Dict[str, Any]]:
    async with get_connection() as conn:
        session = await conn.fetchrow(
            """
            SELECT id, user_id, expires_at, revoked_at
            FROM auth_sessions
            WHERE id = $1
            """,
            session_id
        )
        return dict(session) if session else None


async def revoke_session(session_id: UUID) -> bool:
    async with get_connection() as conn:
        result = await conn.execute(
            """
            UPDATE auth_sessions
            SET revoked_at = now()
            WHERE id = $1 AND revoked_at IS NULL
            """,
            session_id
        )
        return result == "UPDATE 1"


async def is_session_valid(session_id: UUID) -> bool:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1 FROM auth_sessions
            WHERE id = $1 
              AND revoked_at IS NULL 
              AND expires_at > now()
            """,
            session_id
        )
        return row is not None


async def cleanup_expired_sessions():
    """Remove expired sessions (can be run periodically)"""
    async with get_connection() as conn:
        await conn.execute(
            """
            DELETE FROM auth_sessions
            WHERE expires_at < now() - INTERVAL '7 days'
            """
        )

