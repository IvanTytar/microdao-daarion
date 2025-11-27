"""
PEP Client for agent-runtime
Policy Enforcement Point - enforces tool execution permissions
"""
import httpx
import os
from typing import Optional, Dict, Any

PDP_SERVICE_URL = os.getenv("PDP_SERVICE_URL", "http://pdp-service:7012")

class PEPClient:
    """Client for Policy Enforcement Point"""
    
    def __init__(self):
        self.pdp_url = PDP_SERVICE_URL
    
    async def check_tool_permission(
        self,
        agent_id: str,
        tool_id: str,
        microdao_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Check if agent has permission to execute tool
        
        Returns True if permitted, False if denied
        """
        actor = {
            "actor_id": agent_id,
            "actor_type": "agent",
            "microdao_ids": [microdao_id] if microdao_id else [],
            "roles": []
        }
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{self.pdp_url}/internal/pdp/evaluate",
                    json={
                        "actor": actor,
                        "action": "exec_tool",
                        "resource": {
                            "type": "tool",
                            "id": tool_id
                        },
                        "context": context or {}
                    }
                )
                response.raise_for_status()
                decision = response.json()
                
                if decision["effect"] == "permit":
                    print(f"✅ PDP: {agent_id} permitted to execute {tool_id}")
                    return True
                else:
                    reason = decision.get("reason", "access_denied")
                    print(f"❌ PDP: {agent_id} denied tool {tool_id}: {reason}")
                    return False
                    
        except httpx.HTTPStatusError as e:
            print(f"⚠️  PDP service error: {e.response.status_code}")
            # Fallback: deny (secure default)
            return False
        except Exception as e:
            print(f"⚠️  PDP service unavailable: {e}")
            # Fallback: allow for Phase 4 testing
            return True

# Global PEP client instance
pep_client = PEPClient()





