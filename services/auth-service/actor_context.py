"""
Actor Context Builder

Extracts ActorIdentity from request (session token or API key)
"""
import asyncpg
from fastapi import Header, HTTPException, Cookie
from typing import Optional
from models import ActorIdentity, ActorType
import json

async def build_actor_context(
    db_pool: asyncpg.Pool,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> ActorIdentity:
    """
    Build ActorIdentity from request
    
    Priority:
    1. X-API-Key header
    2. Authorization header (Bearer token)
    3. session_token cookie
    
    Raises HTTPException(401) if no valid credentials
    """
    
    # Try API Key first
    if x_api_key:
        actor = await get_actor_from_api_key(db_pool, x_api_key)
        if actor:
            return actor
    
    # Try Authorization header
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        actor = await get_actor_from_session(db_pool, token)
        if actor:
            return actor
    
    # Try session cookie
    if session_token:
        actor = await get_actor_from_session(db_pool, session_token)
        if actor:
            return actor
    
    raise HTTPException(
        status_code=401,
        detail="Unauthorized: No valid session token or API key"
    )

async def get_actor_from_session(db_pool: asyncpg.Pool, token: str) -> Optional[ActorIdentity]:
    """Get ActorIdentity from session token"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT actor_id, actor_data, expires_at
            FROM sessions
            WHERE token = $1 AND is_valid = true
            """,
            token
        )
        
        if not row:
            return None
        
        # Check expiration
        from datetime import datetime, timezone
        if row['expires_at'] < datetime.now(timezone.utc):
            # Expired
            await conn.execute("UPDATE sessions SET is_valid = false WHERE token = $1", token)
            return None
        
        # Parse actor data
        actor_data = row['actor_data']
        return ActorIdentity(**actor_data)

async def get_actor_from_api_key(db_pool: asyncpg.Pool, key: str) -> Optional[ActorIdentity]:
    """Get ActorIdentity from API key"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT actor_id, actor_data, expires_at, last_used
            FROM api_keys
            WHERE key = $1 AND is_active = true
            """,
            key
        )
        
        if not row:
            return None
        
        # Check expiration
        from datetime import datetime, timezone
        if row['expires_at'] and row['expires_at'] < datetime.now(timezone.utc):
            # Expired
            await conn.execute("UPDATE api_keys SET is_active = false WHERE key = $1", key)
            return None
        
        # Update last_used
        await conn.execute(
            "UPDATE api_keys SET last_used = NOW() WHERE key = $1",
            key
        )
        
        # Parse actor data
        actor_data = row['actor_data']
        return ActorIdentity(**actor_data)

async def require_actor(
    db_pool: asyncpg.Pool,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> ActorIdentity:
    """
    Dependency for routes that require authentication
    
    Usage:
        @app.get("/protected")
        async def protected_route(actor: ActorIdentity = Depends(require_actor)):
            ...
    """
    return await build_actor_context(db_pool, authorization, session_token, x_api_key)




