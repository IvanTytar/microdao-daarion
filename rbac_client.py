"""
RBAC Client
Fetches role-based access control information from microDAO RBAC service
"""
from typing import List
import httpx
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# RBAC service configuration
RBAC_BASE_URL = "http://127.0.0.1:9200"
RBAC_RESOLVE_PATH = "/rbac/resolve"


class RBACInfo(BaseModel):
    """RBAC information for a user in a DAO"""
    dao_id: str
    user_id: str
    roles: List[str]
    entitlements: List[str]


async def fetch_rbac(dao_id: str, user_id: str) -> RBACInfo:
    """
    Fetch RBAC information from microDAO RBAC service.
    
    Args:
        dao_id: DAO identifier
        user_id: User identifier
    
    Returns:
        RBACInfo with roles and entitlements
    
    Raises:
        httpx.HTTPError: if RBAC service request fails
    """
    url = f"{RBAC_BASE_URL}{RBAC_RESOLVE_PATH}"
    params = {"dao_id": dao_id, "user_id": user_id}
    
    logger.debug(f"Fetching RBAC: dao_id={dao_id}, user_id={user_id}")
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
        
        rbac_info = RBACInfo(**data)
        logger.info(f"RBAC resolved: roles={rbac_info.roles}, entitlements={len(rbac_info.entitlements)}")
        return rbac_info
    
    except httpx.HTTPError as e:
        logger.error(f"RBAC fetch failed: {e}")
        # Return default guest role on error
        return RBACInfo(
            dao_id=dao_id,
            user_id=user_id,
            roles=["guest"],
            entitlements=["chat.read"]
        )
