"""
Living Map Service Routes
Phase 9: Living Map
"""
from fastapi import APIRouter, Query, WebSocket
from typing import Optional
from datetime import datetime
from models import (
    LivingMapSnapshot, SnapshotMeta, HistoryResponse,
    HistoryQueryParams, EntitiesQueryParams, EntitySummary
)

router = APIRouter(prefix="/living-map", tags=["living-map"])

# These will be injected from main.py
snapshot_builder = None
history_repo = None
ws_handler = None

@router.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "living-map-service",
        "version": "1.0.0",
        "time": datetime.now().isoformat()
    }

@router.get("/snapshot")
async def get_snapshot():
    """Get complete Living Map snapshot"""
    if not snapshot_builder:
        return {"error": "Snapshot builder not initialized"}
    
    snapshot = await snapshot_builder.build_snapshot()
    return snapshot

@router.get("/entities")
async def list_entities(
    type: Optional[str] = Query(None),
    layer: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    """List entities across all layers"""
    if not snapshot_builder:
        return {"items": []}
    
    snapshot = await snapshot_builder.build_snapshot()
    entities = []
    
    # Extract entities from all layers
    layers_data = snapshot.get("layers", {})
    
    # City layer
    if "city" in layers_data:
        for item in layers_data["city"].get("items", []):
            entities.append({
                "id": item.get("id"),
                "type": "microdao",
                "label": item.get("name"),
                "status": item.get("status"),
                "layer": "city"
            })
    
    # Agents layer
    if "agents" in layers_data:
        for item in layers_data["agents"].get("items", []):
            entities.append({
                "id": item.get("id"),
                "type": "agent",
                "label": item.get("name"),
                "status": item.get("status"),
                "layer": "agents"
            })
    
    # Filter by type/layer
    if type:
        entities = [e for e in entities if e["type"] == type]
    if layer:
        entities = [e for e in entities if e["layer"] == layer]
    
    return {"items": entities[:limit]}

@router.get("/entities/{entity_id}")
async def get_entity(entity_id: str):
    """Get entity details"""
    if not snapshot_builder:
        return {"error": "Snapshot builder not initialized"}
    
    snapshot = await snapshot_builder.build_snapshot()
    layers = snapshot.get("layers", {})
    
    # Search in all layers
    for layer_name, layer_data in layers.items():
        items = layer_data.get("items", [])
        for item in items:
            if item.get("id") == entity_id:
                return {
                    "id": entity_id,
                    "type": "entity",
                    "layer": layer_name,
                    "data": item
                }
    
    return {"error": "Entity not found"}

@router.get("/history")
async def get_history(
    since: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get event history"""
    if not history_repo:
        return {"items": [], "total": 0}
    
    params = HistoryQueryParams(
        since=datetime.fromisoformat(since) if since else None,
        limit=limit,
        offset=offset
    )
    
    items, total = await history_repo.query_history(params)
    
    return {
        "items": [item.model_dump() for item in items],
        "total": total,
        "has_more": (offset + len(items)) < total
    }

@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket stream for real-time events"""
    if not ws_handler or not snapshot_builder:
        await websocket.close(code=1011, reason="Service not ready")
        return
    
    async def get_snapshot():
        return await snapshot_builder.build_snapshot()
    
    await ws_handler(websocket, get_snapshot)

# Helper functions to inject dependencies
def set_snapshot_builder(builder):
    global snapshot_builder
    snapshot_builder = builder

def set_history_repo(repo):
    global history_repo
    history_repo = repo

def set_ws_handler(handler):
    global ws_handler
    ws_handler = handler

