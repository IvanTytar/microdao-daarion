#!/usr/bin/env python3
"""
Node Registry Service
Central registry for DAGI network nodes (Node #1, Node #2, Node #N)

Full implementation with database integration
"""

import os
import time
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import logging

# Import our modules
from .database import get_db, get_db_info, check_db_connection, engine
from .models import Base, Node
from .schemas import (
    NodeRegister, NodeResponse, NodeListResponse,
    HeartbeatRequest, HeartbeatResponse,
    NodeDiscoveryQuery, NodeDiscoveryResponse
)
from . import crud
from .system_metrics import get_all_metrics
from .agents_data import get_agents_by_node, get_agents_by_team
from .services_data import get_services_by_node
from .monitoring_api import (
    get_agent_profile,
    get_agents_registry,
    get_alerts_payload,
    get_ai_usage_metrics,
    get_events_payload,
    get_global_kpis,
    get_infrastructure_metrics,
    get_stack_models,
    get_stack_services,
)
from .node1_prometheus import get_node1_metrics
from .node_connector import get_node_connector_report

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment configuration
HTTP_PORT = int(os.getenv("NODE_REGISTRY_HTTP_PORT", "9205"))
ENV = os.getenv("NODE_REGISTRY_ENV", "development")
LOG_LEVEL = os.getenv("NODE_REGISTRY_LOG_LEVEL", "info")

# Service metadata
SERVICE_NAME = "node-registry"
VERSION = "1.0.0"
START_TIME = time.time()

# Create FastAPI app
app = FastAPI(
    title="Node Registry Service",
    description="Central registry for DAGI network nodes - Full Implementation",
    version=VERSION,
    docs_url="/docs" if ENV == "development" else None,
    redoc_url="/redoc" if ENV == "development" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Startup/Shutdown Events
# ============================================================================

@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    logger.info(f"🚀 Starting {SERVICE_NAME} v{VERSION}")
    logger.info(f"📊 Environment: {ENV}")
    logger.info(f"🔌 Port: {HTTP_PORT}")
    
    # Create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables initialized")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
    
    # Check database connection
    if check_db_connection():
        logger.info("✅ Database connection successful")
    else:
        logger.warning("⚠️ Database connection failed - service may not work correctly")


@app.on_event("shutdown")
async def shutdown():
    """Cleanup on shutdown"""
    logger.info("👋 Shutting down Node Registry Service")


# ============================================================================
# Health & Metrics Endpoints
# ============================================================================

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint for monitoring systems"""
    uptime = time.time() - START_TIME
    db_info = get_db_info()
    
    # Check database and get stats
    try:
        stats = crud.get_network_stats(db)
    except Exception as e:
        logger.error(f"Failed to get network stats: {e}")
        stats = {"total_nodes": 0, "online_nodes": 0}
    
    return {
        "status": "healthy" if db_info["connected"] else "degraded",
        "service": SERVICE_NAME,
        "version": VERSION,
        "environment": ENV,
        "uptime_seconds": uptime,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "database": db_info,
        "network_stats": stats,
    }


@app.get("/metrics")
async def metrics(db: Session = Depends(get_db)):
    """Metrics endpoint for monitoring"""
    uptime = time.time() - START_TIME
    
    try:
        stats = crud.get_network_stats(db)
    except Exception:
        stats = {"total_nodes": 0, "online_nodes": 0, "offline_nodes": 0}
    
    return {
        "service": SERVICE_NAME,
        "uptime_seconds": uptime,
        **stats,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.get("/api/node-metrics")
async def get_node_metrics() -> Dict[str, Any]:
    """
    Get real-time system metrics for NODE2 (this machine)
    Returns: CPU, RAM, Disk, GPU, Network metrics
    """
    try:
        metrics = get_all_metrics()
        return {
            "success": True,
            "node_id": "node-2-local",
            **metrics
        }
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


@app.get("/api/node1-metrics")
async def get_node1_metrics_endpoint():
    """Returns NODE1 metrics via Prometheus tunnel."""
    try:
        data = get_node1_metrics()
        if not data.get("success"):
            raise HTTPException(status_code=502, detail="Prometheus tunnel unavailable")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get NODE1 metrics: {e}")
        raise HTTPException(status_code=502, detail="Failed to query NODE1 Prometheus")


@app.get("/api/node-agents/{node_id}")
async def get_node_agents(node_id: str) -> Dict[str, Any]:
    """
    Get list of agents for specific node
    Returns: List of agents grouped by teams
    """
    try:
        agents_by_team = get_agents_by_team(node_id)
        all_agents = get_agents_by_node(node_id)
        
        return {
            "success": True,
            "node_id": node_id,
            "total": len(all_agents),
            "teams": agents_by_team,
            "agents": all_agents
        }
    except Exception as e:
        logger.error(f"Failed to get agents for {node_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "node_id": node_id
        }


@app.get("/api/node-services/{node_id}")
async def get_node_services(node_id: str) -> Dict[str, Any]:
    """
    Get list of services for specific node
    Returns: List of running services
    """
    try:
        services = get_services_by_node(node_id)
        running = [s for s in services if s.get("status") == "running"]
        
        return {
            "success": True,
            "node_id": node_id,
            "total": len(services),
            "running": len(running),
            "services": services
        }
    except Exception as e:
        logger.error(f"Failed to get services for {node_id}: {e}")
        return {
            "success": False,
            "error": str(e),
            "node_id": node_id
        }


# ============================================================================
# Monitoring API (Global dashboards)
# ============================================================================


@app.get("/api/monitoring/global-kpis")
async def monitoring_global_kpis():
    """Cluster-wide KPIs for System Overview dashboard."""
    return get_global_kpis()


@app.get("/api/monitoring/infrastructure")
async def monitoring_infrastructure():
    """Infrastructure metrics (API, WS, NATS, DB)."""
    return get_infrastructure_metrics()


@app.get("/api/monitoring/ai-usage")
async def monitoring_ai_usage():
    """AI usage summary (tokens, latency, quota)."""
    return get_ai_usage_metrics()


@app.get("/api/monitoring/events/{node_id}")
async def monitoring_events(node_id: str, limit: int = Query(10, ge=1, le=50)):
    """Recent events for a node."""
    return get_events_payload(node_id, limit)


@app.get("/api/monitoring/alerts")
async def monitoring_alerts(node_id: Optional[str] = Query(None)):
    """Active alerts (optionally filtered by node)."""
    return get_alerts_payload(node_id)


@app.get("/api/agents")
async def list_agents():
    """Return registry of all agents across nodes."""
    return get_agents_registry()


@app.get("/api/agents/{agent_id}")
async def agent_detail(agent_id: str):
    """Detailed profile for a single agent."""
    profile = get_agent_profile(agent_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
    return profile


@app.get("/api/stack/services")
async def stack_services():
    """Catalog of services per node."""
    return get_stack_services()


@app.get("/api/stack/models")
async def stack_models():
    """Catalog of models per node."""
    return get_stack_models()


@app.get("/api/node-connector/report")
async def node_connector_report():
    """Return readiness report for connecting new nodes."""
    return get_node_connector_report()


@app.get("/")
async def root():
    """Root endpoint - service information"""
    return {
        "service": SERVICE_NAME,
        "version": VERSION,
        "status": "running",
        "environment": ENV,
        "message": "Node Registry Service - Full Implementation",
        "endpoints": {
            "health": "/health",
            "metrics": "/metrics",
            "docs": "/docs" if ENV == "development" else "disabled",
            "bootstrap": "/bootstrap/node_bootstrap.py",
            "api": {
                "register": "POST /api/v1/nodes/register",
                "heartbeat": "POST /api/v1/nodes/heartbeat",
                "list": "GET /api/v1/nodes",
                "get": "GET /api/v1/nodes/{node_id}",
                "discover": "POST /api/v1/nodes/discover",
            }
        }
    }


# ============================================================================
# Bootstrap Download Endpoint
# ============================================================================

@app.get("/bootstrap/node_bootstrap.py")
async def download_bootstrap():
    """
    Download Bootstrap Agent script
    
    Users can download and run this script to connect their node
    """
    import os
    
    bootstrap_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "bootstrap",
        "node_bootstrap.py"
    )
    
    try:
        with open(bootstrap_path, 'r') as f:
            content = f.read()
        
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type="text/x-python",
            headers={
                "Content-Disposition": "attachment; filename=node_bootstrap.py"
            }
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Bootstrap script not found")


# ============================================================================
# Node Registration API
# ============================================================================

@app.post("/api/v1/nodes/register", response_model=NodeResponse)
async def register_node(node_data: NodeRegister, db: Session = Depends(get_db)):
    """
    Register a new node or update existing one
    
    This endpoint automatically generates a unique node_id based on hostname
    and registers the node in the network.
    """
    try:
        node = crud.register_node(db, node_data)
        logger.info(f"✅ Node registered: {node.node_id}")
        return node.to_dict()
    except Exception as e:
        logger.error(f"❌ Failed to register node: {e}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


# ============================================================================
# Heartbeat API
# ============================================================================

@app.post("/api/v1/nodes/heartbeat", response_model=HeartbeatResponse)
async def update_heartbeat(heartbeat: HeartbeatRequest, db: Session = Depends(get_db)):
    """
    Update node heartbeat (keep-alive)
    
    Nodes should send heartbeat every 30 seconds to maintain "online" status.
    """
    try:
        success = crud.update_heartbeat(db, heartbeat)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Node not found: {heartbeat.node_id}")
        
        return HeartbeatResponse(
            success=True,
            node_id=heartbeat.node_id,
            timestamp=datetime.utcnow(),
            message="Heartbeat updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Heartbeat update failed: {e}")
        raise HTTPException(status_code=500, detail=f"Heartbeat failed: {str(e)}")


# ============================================================================
# Node Query API
# ============================================================================

@app.get("/api/v1/nodes", response_model=NodeListResponse)
async def list_nodes(
    role: Optional[str] = Query(None, description="Filter by role"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Results offset"),
    db: Session = Depends(get_db)
):
    """List all registered nodes with optional filters"""
    try:
        nodes = crud.list_nodes(db, role=role, status=status, limit=limit, offset=offset)
        return NodeListResponse(
            nodes=[node.to_dict() for node in nodes],
            total=len(nodes)
        )
    except Exception as e:
        logger.error(f"❌ Failed to list nodes: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/api/v1/nodes/{node_id}", response_model=NodeResponse)
async def get_node(node_id: str, db: Session = Depends(get_db)):
    """Get specific node information"""
    try:
        node = crud.get_node(db, node_id)
        
        if not node:
            raise HTTPException(status_code=404, detail=f"Node not found: {node_id}")
        
        return node.to_dict()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get node: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ============================================================================
# Node Discovery API
# ============================================================================

@app.post("/api/v1/nodes/discover", response_model=NodeDiscoveryResponse)
async def discover_nodes(query: NodeDiscoveryQuery, db: Session = Depends(get_db)):
    """
    Discover nodes based on criteria
    
    Search for nodes with specific capabilities, roles, or status.
    Useful for finding the right node for a specific task.
    """
    try:
        nodes = crud.discover_nodes(db, query)
        
        return NodeDiscoveryResponse(
            nodes=[node.to_dict() for node in nodes],
            query=query,
            total=len(nodes)
        )
    except Exception as e:
        logger.error(f"❌ Node discovery failed: {e}")
        raise HTTPException(status_code=500, detail=f"Discovery failed: {str(e)}")


# ============================================================================
# Node Profile Endpoints (Standard v1)
# ============================================================================

from app.dashboard import build_dashboard


@app.get("/api/v1/nodes/self/dashboard")
async def get_self_dashboard(db: Session = Depends(get_db)):
    """
    Get dashboard for current node (self).
    
    Uses the first node in registry as "self" for now.
    In production, this would use JWT claims to identify the node.
    """
    try:
        from sqlalchemy import text
        
        # Get first node as "self" (simplified for v1)
        result = db.execute(text("""
            SELECT node_id FROM nodes ORDER BY registered_at LIMIT 1
        """))
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No nodes registered")
        
        # Delegate to node dashboard
        return await get_node_dashboard(row[0], db)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get self dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Dashboard failed: {str(e)}")


@app.get("/api/v1/nodes/{node_id}/dashboard")
async def get_node_dashboard(node_id: str, db: Session = Depends(get_db)):
    """
    Get complete node dashboard with live status.
    
    Aggregates:
    - Node profile (roles, modules, GPU)
    - Infrastructure metrics (CPU, RAM, Disk, GPU)
    - AI services status (Swapper, Router, STT, Vision, OCR)
    - Agents summary
    - Matrix integration status
    - Monitoring status
    """
    try:
        from sqlalchemy import text
        
        # Get node profile
        result = db.execute(text("""
            SELECT node_id, node_name, node_role, node_type, ip_address, hostname,
                   status, roles, gpu, modules, version, vpn_ip
            FROM nodes
            WHERE node_id = :node_id
        """), {"node_id": node_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Node not found: {node_id}")
        
        profile = {
            "node_id": row[0],
            "name": row[1],
            "role": row[2],
            "type": row[3],
            "ip_address": row[4],
            "hostname": row[5],
            "status": row[6],
            "roles": list(row[7]) if row[7] else [],
            "gpu": row[8],
            "modules": row[9] if row[9] else [],
            "version": row[10] or "1.0.0",
        }
        
        # Build dashboard with probes
        # For Docker network, use gateway IP to access host services
        import os
        
        # Default to Docker gateway for dagi-network
        node_ip = os.getenv("PROBE_HOST", "172.21.0.1")
        
        # For NODE2, use its actual IP (for remote probing)
        if node_id == "node-2-macbook-m4max":
            node_ip = row[4] or "192.168.1.33"
        
        dashboard = await build_dashboard(profile, node_ip)
        
        return dashboard
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get node dashboard: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard failed: {str(e)}")


@app.get("/api/v1/nodes/{node_id}/profile")
async def get_node_profile(node_id: str, db: Session = Depends(get_db)):
    """
    Get full node profile including modules, GPU, roles.
    Node Profile Standard v1.
    """
    try:
        from sqlalchemy import text
        
        result = db.execute(text("""
            SELECT node_id, node_name, node_role, node_type, ip_address, hostname,
                   status, roles, gpu, modules, version, vpn_ip
            FROM nodes
            WHERE node_id = :node_id
        """), {"node_id": node_id})
        
        row = result.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Node not found: {node_id}")
        
        return {
            "node_id": row[0],
            "name": row[1],
            "role": row[2],
            "type": row[3],
            "ip_address": row[4],
            "hostname": row[5],
            "status": row[6],
            "roles": list(row[7]) if row[7] else [],
            "gpu": row[8],
            "modules": row[9] if row[9] else [],
            "version": row[10] or "1.0.0",
            "vpn_ip": str(row[11]) if row[11] else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get node profile: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.get("/api/v1/nodes/profiles")
async def get_all_node_profiles(db: Session = Depends(get_db)):
    """
    Get all node profiles with modules.
    """
    try:
        from sqlalchemy import text
        
        result = db.execute(text("""
            SELECT node_id, node_name, node_role, node_type, ip_address, hostname,
                   status, roles, gpu, modules, version, vpn_ip
            FROM nodes
            ORDER BY node_id
        """))
        
        nodes = []
        for row in result.fetchall():
            nodes.append({
                "node_id": row[0],
                "name": row[1],
                "role": row[2],
                "type": row[3],
                "ip_address": row[4],
                "hostname": row[5],
                "status": row[6],
                "roles": list(row[7]) if row[7] else [],
                "gpu": row[8],
                "modules": row[9] if row[9] else [],
                "version": row[10] or "1.0.0",
            })
        
        return {"nodes": nodes, "total": len(nodes)}
    except Exception as e:
        logger.error(f"❌ Failed to get node profiles: {e}")
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


# ============================================================================
# Maintenance Endpoints
# ============================================================================

@app.post("/api/v1/maintenance/cleanup")
async def cleanup_stale_nodes(
    timeout_minutes: int = Query(5, ge=1, le=60),
    db: Session = Depends(get_db)
):
    """
    Mark nodes as offline if no heartbeat received
    
    Admin endpoint for maintenance
    """
    try:
        count = crud.cleanup_stale_nodes(db, timeout_minutes)
        return {
            "success": True,
            "nodes_marked_offline": count,
            "timeout_minutes": timeout_minutes
        }
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Cleanup failed: {str(e)}")


if __name__ == "__main__":
    print(f"🚀 Starting {SERVICE_NAME} v{VERSION}")
    print(f"📊 Environment: {ENV}")
    print(f"🔌 Port: {HTTP_PORT}")
    print(f"🗄️  Database: {os.getenv('DATABASE_URL', 'not configured')}")
    print(f"📝 Log level: {LOG_LEVEL}")
    print()
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=HTTP_PORT,
        log_level=LOG_LEVEL.lower(),
        access_log=True,
    )
