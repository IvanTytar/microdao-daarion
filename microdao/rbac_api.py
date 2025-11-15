"""
microDAO RBAC Service
Manages roles and entitlements for microDAO members
"""
import logging
from typing import List, Dict, Any
from datetime import datetime

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="microDAO RBAC Service",
    version="1.0.0",
    description="Role-Based Access Control for microDAO ecosystem"
)


# ========================================
# Models
# ========================================

class RBACResponse(BaseModel):
    """RBAC resolution response"""
    dao_id: str
    user_id: str
    roles: List[str]
    entitlements: List[str]
    metadata: Dict[str, Any] = {}


# ========================================
# Mock Database
# ========================================

# In production: replace with real database (PostgreSQL, MongoDB, etc.)
USER_ROLES = {
    # Format: "dao_id:user_id": ["role1", "role2"]
    "greenfood-dao:tg:admin001": ["admin", "member"],
    "greenfood-dao:tg:12345": ["member"],
    "greenfood-dao:dc:alice": ["member", "contributor"],
    
    # Default role for unknown users
    "default": ["guest"],
}

ROLE_ENTITLEMENTS = {
    "admin": [
        "chat.read",
        "chat.write",
        "agent.devtools",
        "agent.crew",
        "proposal.create",
        "proposal.vote",
        "proposal.execute",
        "member.invite",
        "member.remove",
        "config.update"
    ],
    "member": [
        "chat.read",
        "chat.write",
        "proposal.create",
        "proposal.vote",
    ],
    "contributor": [
        "chat.read",
        "chat.write",
        "agent.devtools",
        "proposal.create",
    ],
    "guest": [
        "chat.read",
    ],
}


def get_user_roles(dao_id: str, user_id: str) -> List[str]:
    """Get roles for user in DAO"""
    key = f"{dao_id}:{user_id}"
    
    # Check direct mapping
    if key in USER_ROLES:
        return USER_ROLES[key]
    
    # Check if user_id contains role indicator
    if "admin" in user_id.lower():
        return ["admin", "member"]
    
    # Default role
    return USER_ROLES["default"]


def get_entitlements(roles: List[str]) -> List[str]:
    """Get entitlements from roles"""
    entitlements = set()
    
    for role in roles:
        if role in ROLE_ENTITLEMENTS:
            entitlements.update(ROLE_ENTITLEMENTS[role])
    
    return sorted(list(entitlements))


# ========================================
# Endpoints
# ========================================

@app.get("/")
async def root():
    return {
        "service": "microdao-rbac",
        "version": "1.0.0",
        "endpoints": [
            "GET /rbac/resolve",
            "GET /roles",
            "GET /health"
        ]
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "microdao-rbac"
    }


@app.get("/rbac/resolve", response_model=RBACResponse)
async def resolve_rbac(
    dao_id: str = Query(..., description="DAO ID"),
    user_id: str = Query(..., description="User ID")
):
    """
    Resolve RBAC for user in DAO.
    
    Returns:
        - roles: list of role names
        - entitlements: list of permission strings
    
    Example:
        GET /rbac/resolve?dao_id=greenfood-dao&user_id=tg:12345
    """
    try:
        logger.info(f"RBAC resolve: dao_id={dao_id}, user_id={user_id}")
        
        # Get roles
        roles = get_user_roles(dao_id, user_id)
        
        # Get entitlements from roles
        entitlements = get_entitlements(roles)
        
        logger.info(f"  → roles={roles}, entitlements={len(entitlements)}")
        
        return RBACResponse(
            dao_id=dao_id,
            user_id=user_id,
            roles=roles,
            entitlements=entitlements,
            metadata={
                "resolved_at": datetime.now().isoformat(),
                "source": "mock_database"
            }
        )
    
    except Exception as e:
        logger.error(f"RBAC resolve error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/roles")
async def list_roles():
    """List all available roles and their entitlements"""
    return {
        "roles": {
            role: ROLE_ENTITLEMENTS.get(role, [])
            for role in ROLE_ENTITLEMENTS.keys()
        }
    }


# ========================================
# Main
# ========================================

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    parser = argparse.ArgumentParser(description="microDAO RBAC Service")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=9200, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    args = parser.parse_args()
    
    logger.info(f"Starting microDAO RBAC on {args.host}:{args.port}")
    
    uvicorn.run(
        "rbac_api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )
