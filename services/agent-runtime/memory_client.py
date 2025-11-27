import httpx
import os
from typing import List, Dict, Any

AGENT_MEMORY_URL = os.getenv("AGENT_MEMORY_URL", "http://agent-memory:7008")

async def query_memory(
    agent_id: str,
    microdao_id: str,
    query: str,
    k: int = 5
) -> List[Dict[str, Any]]:
    """
    Query agent memory for relevant context
    
    Returns list of memory fragments relevant to the query
    Falls back to empty list if Agent Memory service is not available
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{AGENT_MEMORY_URL}/internal/agent-memory/query",
                headers={
                    "X-Internal-Secret": os.getenv("MEMORY_ORCHESTRATOR_SECRET", "dev-secret-token"),
                    "Content-Type": "application/json"
                },
                json={
                    "agent_id": agent_id,
                    "microdao_id": microdao_id,
                    "query": query,
                    "limit": k
                }
            )
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            print(f"✅ Retrieved {len(results)} memory fragments")
            return results
    except httpx.ConnectError:
        print(f"⚠️ Agent Memory service not available (Phase 2 - OK)")
        return []
    except httpx.HTTPStatusError as e:
        print(f"⚠️ Agent Memory HTTP error: {e.response.status_code}")
        return []
    except Exception as e:
        print(f"⚠️ Agent Memory error: {e}")
        return []

async def store_memory(
    agent_id: str,
    microdao_id: str,
    channel_id: str,
    content: Dict[str, Any]
) -> bool:
    """
    Store interaction in agent memory
    
    Returns True if successful, False otherwise
    Optional in Phase 2 - memory writeback
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{AGENT_MEMORY_URL}/internal/agent-memory/store",
                headers={
                    "X-Internal-Secret": os.getenv("MEMORY_ORCHESTRATOR_SECRET", "dev-secret-token"),
                    "Content-Type": "application/json"
                },
                json={
                    "agent_id": agent_id,
                    "microdao_id": microdao_id,
                    "channel_id": channel_id,
                    "kind": "conversation",
                    "content": content
                }
            )
            response.raise_for_status()
            print(f"✅ Stored memory for {agent_id}")
            return True
    except httpx.ConnectError:
        print(f"⚠️ Agent Memory service not available (Phase 2 - OK)")
        return False
    except Exception as e:
        print(f"⚠️ Error storing memory: {e}")
        return False

