"""
API Key management routes
"""
from fastapi import APIRouter, HTTPException, Depends
import asyncpg
from datetime import datetime, timedelta, timezone
import secrets
from models import ApiKeyCreateRequest, ApiKey, ApiKeyResponse, ActorIdentity
from actor_context import require_actor
import json

router = APIRouter(prefix="/auth/api-keys", tags=["api_keys"])

def get_db_pool(request) -> asyncpg.Pool:
    """Get database pool from app state"""
    return request.app.state.db_pool

@router.post("", response_model=ApiKey)
async def create_api_key(
    request: ApiKeyCreateRequest,
    actor: ActorIdentity = Depends(require_actor),
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """
    Create new API key for current actor
    
    Returns full key only once (on creation)
    """
    
    # Generate key
    key = f"dk_{secrets.token_urlsafe(32)}"
    key_id = secrets.token_urlsafe(16)
    
    # Calculate expiration
    expires_at = None
    if request.expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=request.expires_days)
    
    # Store in database
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO api_keys (id, key, actor_id, actor_data, description, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            key_id,
            key,
            actor.actor_id,
            json.dumps(actor.model_dump()),
            request.description,
            expires_at
        )
    
    return ApiKey(
        id=key_id,
        key=key,  # Full key shown only once
        actor_id=actor.actor_id,
        actor=actor,
        description=request.description,
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        last_used=None,
        is_active=True
    )

@router.get("", response_model=list[ApiKeyResponse])
async def list_api_keys(
    actor: ActorIdentity = Depends(require_actor),
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """List all API keys for current actor"""
    
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, key, description, created_at, expires_at, last_used, is_active
            FROM api_keys
            WHERE actor_id = $1
            ORDER BY created_at DESC
            """,
            actor.actor_id
        )
    
    keys = []
    for row in rows:
        # Show only preview of key
        key_preview = row['key'][:8] + "..." if len(row['key']) > 8 else row['key']
        
        keys.append(ApiKeyResponse(
            id=row['id'],
            key_preview=key_preview,
            description=row['description'],
            created_at=row['created_at'],
            expires_at=row['expires_at'],
            last_used=row['last_used'],
            is_active=row['is_active']
        ))
    
    return keys

@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    actor: ActorIdentity = Depends(require_actor),
    db_pool: asyncpg.Pool = Depends(get_db_pool)
):
    """Delete (deactivate) API key"""
    
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE api_keys
            SET is_active = false
            WHERE id = $1 AND actor_id = $2
            """,
            key_id,
            actor.actor_id
        )
        
        if result == "UPDATE 0":
            raise HTTPException(404, "API key not found")
    
    return {"status": "deleted", "key_id": key_id}





