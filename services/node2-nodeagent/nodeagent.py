#!/usr/bin/env python3
"""
NodeAgent - Coordinator for microDAO Node-2
Manages Swoper, RAG, memory, logging, and self-healing
"""

import asyncio
import logging
import json
import httpx
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import yaml

logger = logging.getLogger(__name__)

class ServiceStatus(str, Enum):
    """Service status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STOPPED = "stopped"

class NodeAgent:
    """
    NodeAgent - Brain of microDAO Node-2
    
    Responsibilities:
    - Manage Swoper (load/unload models)
    - Control memory (Qdrant, Milvus, Neo4j)
    - Log events (NATS JetStream)
    - Self-healing (restart services)
    - Health checks
    - Resource management
    """
    
    def __init__(self, config_path: str = "~/node2/nodeagent/config.yaml"):
        self.config_path = Path(config_path).expanduser()
        self.config = self._load_config()
        
        # Service URLs
        self.swoper_url = self.config.get("swoper", {}).get("url", "http://localhost:8890")
        self.qdrant_url = self.config.get("memory", {}).get("qdrant", "http://localhost:6333")
        self.milvus_url = self.config.get("memory", {}).get("milvus", "http://localhost:19530")
        self.neo4j_url = self.config.get("memory", {}).get("neo4j", "http://localhost:7474")
        self.nats_url = self.config.get("event_store", {}).get("url", "nats://localhost:4222")
        self.rag_router_url = self.config.get("rag_router", {}).get("url", "http://localhost:9401")
        
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        # State
        self.services_status: Dict[str, ServiceStatus] = {}
        self.active_model: Optional[str] = None
        self.memory_stats: Dict[str, Any] = {}
        
    def _load_config(self) -> Dict[str, Any]:
        """Load NodeAgent configuration"""
        if self.config_path.exists():
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        return self._default_config()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default configuration"""
        return {
            "microdao_id": "microdao-node2",
            "swoper": {
                "url": "http://localhost:8890",
                "config_path": "~/node2/swoper/config_node2.yaml"
            },
            "memory": {
                "qdrant": "http://localhost:6333",
                "milvus": "http://localhost:19530",
                "neo4j": "http://localhost:7474"
            },
            "rag_router": {
                "url": "http://localhost:9401"
            },
            "event_store": {
                "url": "nats://localhost:4222"
            },
            "health_check_interval": 30,
            "self_healing": {
                "enabled": True,
                "max_restarts": 3
            }
        }
    
    async def check_swoper_health(self) -> ServiceStatus:
        """Check Swoper service health"""
        try:
            response = await self.http_client.get(f"{self.swoper_url}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.active_model = data.get("active_model")
                    return ServiceStatus.HEALTHY
                return ServiceStatus.DEGRADED
            return ServiceStatus.UNHEALTHY
        except Exception as e:
            logger.error(f"Error checking Swoper health: {e}")
            return ServiceStatus.UNHEALTHY
    
    async def check_memory_health(self) -> Dict[str, ServiceStatus]:
        """Check memory services health"""
        status = {}
        
        # Qdrant
        try:
            response = await self.http_client.get(f"{self.qdrant_url}/health")
            status["qdrant"] = ServiceStatus.HEALTHY if response.status_code == 200 else ServiceStatus.UNHEALTHY
        except:
            status["qdrant"] = ServiceStatus.UNHEALTHY
        
        # Milvus
        try:
            response = await self.http_client.get(f"{self.milvus_url}/healthz")
            status["milvus"] = ServiceStatus.HEALTHY if response.status_code == 200 else ServiceStatus.UNHEALTHY
        except:
            status["milvus"] = ServiceStatus.UNHEALTHY
        
        # Neo4j
        try:
            response = await self.http_client.get(f"{self.neo4j_url}")
            status["neo4j"] = ServiceStatus.HEALTHY if response.status_code == 200 else ServiceStatus.UNHEALTHY
        except:
            status["neo4j"] = ServiceStatus.UNHEALTHY
        
        return status
    
    async def check_rag_router_health(self) -> ServiceStatus:
        """Check RAG Router health"""
        try:
            response = await self.http_client.get(f"{self.rag_router_url}/health")
            if response.status_code == 200:
                return ServiceStatus.HEALTHY
            return ServiceStatus.DEGRADED
        except:
            return ServiceStatus.UNHEALTHY
    
    async def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory statistics"""
        stats = {
            "qdrant": {},
            "milvus": {},
            "neo4j": {}
        }
        
        # Qdrant stats
        try:
            response = await self.http_client.get(f"{self.qdrant_url}/collections")
            if response.status_code == 200:
                collections = response.json().get("result", {}).get("collections", [])
                stats["qdrant"] = {
                    "collections_count": len(collections),
                    "collections": [c.get("name") for c in collections]
                }
        except Exception as e:
            logger.error(f"Error getting Qdrant stats: {e}")
        
        # Milvus stats (placeholder)
        stats["milvus"] = {"status": "checking"}
        
        # Neo4j stats (placeholder)
        stats["neo4j"] = {"status": "checking"}
        
        return stats
    
    async def manage_swoper_model(self, model_name: str, action: str = "load") -> bool:
        """Manage Swoper model (load/unload)"""
        try:
            if action == "load":
                response = await self.http_client.post(
                    f"{self.swoper_url}/models/{model_name}/load"
                )
            elif action == "unload":
                response = await self.http_client.post(
                    f"{self.swoper_url}/models/{model_name}/unload"
                )
            else:
                return False
            
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error managing Swoper model: {e}")
            return False
    
    async def log_event(self, event_type: str, data: Dict[str, Any]):
        """Log event to NATS JetStream"""
        event = {
            "timestamp": datetime.now().isoformat(),
            "microdao_id": self.config.get("microdao_id"),
            "event_type": event_type,
            "data": data
        }
        
        # TODO: Implement NATS JetStream publishing
        logger.info(f"Event logged: {event_type} - {data}")
    
    async def health_check_all(self) -> Dict[str, ServiceStatus]:
        """Check health of all services"""
        health = {}
        
        # Swoper
        health["swoper"] = await self.check_swoper_health()
        
        # Memory services
        memory_health = await self.check_memory_health()
        health.update(memory_health)
        
        # RAG Router
        health["rag_router"] = await self.check_rag_router_health()
        
        self.services_status = health
        return health
    
    async def self_heal(self):
        """Self-healing: restart unhealthy services"""
        if not self.config.get("self_healing", {}).get("enabled", True):
            return
        
        health = await self.health_check_all()
        
        for service, status in health.items():
            if status == ServiceStatus.UNHEALTHY:
                logger.warning(f"Service {service} is unhealthy, attempting restart...")
                # TODO: Implement service restart logic
                await self.log_event("self_healing", {
                    "service": service,
                    "action": "restart_attempted"
                })
    
    async def run_health_monitor(self):
        """Run continuous health monitoring"""
        interval = self.config.get("health_check_interval", 30)
        
        while True:
            try:
                health = await self.health_check_all()
                stats = await self.get_memory_stats()
                self.memory_stats = stats
                
                await self.log_event("health_check", {
                    "services": {k: v.value for k, v in health.items()},
                    "memory_stats": stats,
                    "active_model": self.active_model
                })
                
                # Self-healing
                await self.self_heal()
                
            except Exception as e:
                logger.error(f"Error in health monitor: {e}")
            
            await asyncio.sleep(interval)
    
    async def get_status(self) -> Dict[str, Any]:
        """Get NodeAgent status"""
        health = await self.health_check_all()
        stats = await self.get_memory_stats()
        
        return {
            "microdao_id": self.config.get("microdao_id"),
            "status": "active",
            "services": {k: v.value for k, v in health.items()},
            "memory_stats": stats,
            "active_model": self.active_model,
            "timestamp": datetime.now().isoformat()
        }
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()

# FastAPI integration
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI(title="NodeAgent - microDAO Node-2 Coordinator")

# Global NodeAgent instance
nodeagent: Optional[NodeAgent] = None

@app.on_event("startup")
async def startup():
    """Initialize NodeAgent on startup"""
    global nodeagent
    nodeagent = NodeAgent()
    # Start health monitor in background
    asyncio.create_task(nodeagent.run_health_monitor())

@app.on_event("shutdown")
async def shutdown():
    """Close NodeAgent on shutdown"""
    global nodeagent
    if nodeagent:
        await nodeagent.close()

@app.get("/health")
async def health_endpoint():
    """Health check endpoint"""
    if not nodeagent:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "reason": "NodeAgent not initialized"}
        )
    
    status = await nodeagent.get_status()
    all_healthy = all(
        s == "healthy" for s in status["services"].values()
    )
    
    return JSONResponse(
        status_code=200 if all_healthy else 503,
        content=status
    )

@app.get("/status")
async def status_endpoint():
    """Get full status"""
    if not nodeagent:
        raise HTTPException(status_code=503, detail="NodeAgent not initialized")
    
    status = await nodeagent.get_status()
    return JSONResponse(content=status)

@app.post("/swoper/models/{model_name}/load")
async def load_model(model_name: str):
    """Load model in Swoper"""
    if not nodeagent:
        raise HTTPException(status_code=503, detail="NodeAgent not initialized")
    
    success = await nodeagent.manage_swoper_model(model_name, "load")
    if success:
        return JSONResponse(content={"status": "success", "model": model_name})
    raise HTTPException(status_code=500, detail="Failed to load model")

@app.post("/swoper/models/{model_name}/unload")
async def unload_model(model_name: str):
    """Unload model from Swoper"""
    if not nodeagent:
        raise HTTPException(status_code=503, detail="NodeAgent not initialized")
    
    success = await nodeagent.manage_swoper_model(model_name, "unload")
    if success:
        return JSONResponse(content={"status": "success", "model": model_name})
    raise HTTPException(status_code=500, detail="Failed to unload model")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9600)



