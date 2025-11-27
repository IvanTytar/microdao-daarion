"""
Cabinet API endpoints for Swapper Service
Provides data for Node #1 and Node #2 admin consoles
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime

# Import will be done after swapper is initialized

router = APIRouter(prefix="/api/cabinet", tags=["cabinet"])

def get_swapper():
    """Get swapper instance (lazy import to avoid circular dependency)"""
    from app.main import swapper
    return swapper

@router.get("/swapper/status")
async def get_swapper_status_for_cabinet() -> Dict[str, Any]:
    """
    Get Swapper Service status for admin console display
    Returns data formatted for Node #1 and Node #2 cabinets
    """
    try:
        swapper = get_swapper()
        status = await swapper.get_status()
        metrics = await swapper.get_model_metrics()
        
        # Format active model info
        active_model_info = None
        if status.active_model:
            active_metrics = next(
                (m for m in metrics if m.model_name == status.active_model),
                None
            )
            if active_metrics:
                active_model_info = {
                    "name": status.active_model,
                    "uptime_hours": round(active_metrics.uptime_hours, 2),
                    "request_count": active_metrics.request_count,
                    "loaded_at": active_metrics.loaded_at.isoformat() if active_metrics.loaded_at else None
                }
        
        # Format all models with their status
        swapper = get_swapper()
        models_info = []
        for model_name in status.available_models:
            model_metrics = next(
                (m for m in metrics if m.model_name == model_name),
                None
            )
            model_data = swapper.models.get(model_name)
            
            if model_data:
                models_info.append({
                    "name": model_name,
                    "ollama_name": model_data.ollama_name,
                    "type": model_data.type,
                    "size_gb": model_data.size_gb,
                    "priority": model_data.priority,
                    "status": model_data.status.value,
                    "is_active": model_name == status.active_model,
                    "uptime_hours": round(model_metrics.uptime_hours, 2) if model_metrics else 0.0,
                    "request_count": model_metrics.request_count if model_metrics else 0,
                    "total_uptime_seconds": model_metrics.total_uptime_seconds if model_metrics else 0.0
                })
        
        return {
            "service": "swapper-service",
            "status": status.status,
            "mode": status.mode,
            "active_model": active_model_info,
            "total_models": status.total_models,
            "available_models": status.available_models,
            "loaded_models": status.loaded_models,
            "models": models_info,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting Swapper status: {str(e)}")

@router.get("/swapper/models")
async def get_swapper_models_for_cabinet() -> Dict[str, Any]:
    """
    Get all models with detailed information for cabinet display
    """
    try:
        swapper = get_swapper()
        status = await swapper.get_status()
        metrics = await swapper.get_model_metrics()
        
        models_detail = []
        for model_name in status.available_models:
            model_data = swapper.models.get(model_name)
            model_metrics = next(
                (m for m in metrics if m.model_name == model_name),
                None
            )
            
            if model_data:
                models_detail.append({
                    "name": model_name,
                    "ollama_name": model_data.ollama_name,
                    "type": model_data.type,
                    "size_gb": model_data.size_gb,
                    "priority": model_data.priority,
                    "status": model_data.status.value,
                    "is_active": model_name == status.active_model,
                    "can_load": model_data.status.value in ["unloaded", "error"],
                    "can_unload": model_data.status.value == "loaded",
                    "uptime_hours": round(model_metrics.uptime_hours, 2) if model_metrics else 0.0,
                    "request_count": model_metrics.request_count if model_metrics else 0,
                    "total_uptime_seconds": model_metrics.total_uptime_seconds if model_metrics else 0.0,
                    "loaded_at": model_metrics.loaded_at.isoformat() if model_metrics and model_metrics.loaded_at else None
                })
        
        return {
            "models": models_detail,
            "total": len(models_detail),
            "active_count": len(status.loaded_models),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting models: {str(e)}")

@router.get("/swapper/metrics/summary")
async def get_swapper_metrics_summary() -> Dict[str, Any]:
    """
    Get summary metrics for cabinet dashboard
    """
    try:
        swapper = get_swapper()
        status = await swapper.get_status()
        metrics = await swapper.get_model_metrics()
        
        # Calculate totals
        total_uptime_hours = sum(m.uptime_hours for m in metrics)
        total_requests = sum(m.request_count for m in metrics)
        
        # Most used model
        most_used = max(metrics, key=lambda m: m.total_uptime_seconds) if metrics else None
        
        return {
            "summary": {
                "total_models": status.total_models,
                "active_models": len(status.loaded_models),
                "available_models": len(status.available_models),
                "total_uptime_hours": round(total_uptime_hours, 2),
                "total_requests": total_requests
            },
            "most_used_model": {
                "name": most_used.model_name,
                "uptime_hours": round(most_used.uptime_hours, 2),
                "request_count": most_used.request_count
            } if most_used else None,
            "active_model": {
                "name": status.active_model,
                "uptime_hours": round(
                    next((m.uptime_hours for m in metrics if m.model_name == status.active_model), 0.0),
                    2
                ) if status.active_model else None
            } if status.active_model else None,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting metrics summary: {str(e)}")

