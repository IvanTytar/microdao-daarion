"""
Auth Client — Get actor identity from auth-service
Phase 8: DAO Dashboard
"""
from fastapi import HTTPException, Header
from typing import Optional
import httpx
import os

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:7011")

async def get_actor_from_token(authorization: Optional[str] = Header(None)) -> dict:
    """
    Get ActorIdentity from auth-service
    Returns actor dict or raises 401
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{AUTH_SERVICE_URL}/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

