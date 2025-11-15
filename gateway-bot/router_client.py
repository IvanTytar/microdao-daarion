"""
DAGI Router Client
Sends requests to DAGI Router from Bot Gateway
"""
import logging
import os
import httpx
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Router configuration from environment
ROUTER_URL = os.getenv("ROUTER_URL", "http://127.0.0.1:9102") + "/route"
ROUTER_TIMEOUT = 30.0


async def send_to_router(body: Dict[str, Any]) -> Dict[str, Any]:
    """
    Send request to DAGI Router.
    
    Args:
        body: Request payload with mode, message, dao_id, etc.
    
    Returns:
        Router response as dict
    
    Raises:
        httpx.HTTPError: if router request fails
    """
    logger.info(f"Sending to Router ({ROUTER_URL}): mode={body.get('mode')}, dao_id={body.get('dao_id')}")
    
    try:
        async with httpx.AsyncClient(timeout=ROUTER_TIMEOUT) as client:
            response = await client.post(ROUTER_URL, json=body)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Router response: ok={result.get('ok')}")
            return result
    
    except httpx.HTTPError as e:
        logger.error(f"Router request failed: {e}")
        raise
