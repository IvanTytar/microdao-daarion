"""
Swapper Service - Dynamic Model Loading Service
Manages loading/unloading LLM models on-demand to optimize memory usage.
Supports single-active model mode (one model loaded at a time).
"""

import os
import asyncio
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import yaml

logger = logging.getLogger(__name__)

# ========== Configuration ==========

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
SWAPPER_CONFIG_PATH = os.getenv("SWAPPER_CONFIG_PATH", "./config/swapper_config.yaml")
SWAPPER_MODE = os.getenv("SWAPPER_MODE", "single-active")  # single-active or multi-active
MAX_CONCURRENT_MODELS = int(os.getenv("MAX_CONCURRENT_MODELS", "1"))
MODEL_SWAP_TIMEOUT = int(os.getenv("MODEL_SWAP_TIMEOUT", "30"))

# ========== Models ==========

class ModelStatus(str, Enum):
    """Model status"""
    LOADED = "loaded"
    LOADING = "loading"
    UNLOADED = "unloaded"
    UNLOADING = "unloading"
    ERROR = "error"

class ModelInfo(BaseModel):
    """Model information"""
    name: str
    ollama_name: str
    type: str  # llm, code, vision, math
    size_gb: float
    priority: str  # high, medium, low
    status: ModelStatus
    loaded_at: Optional[datetime] = None
    unloaded_at: Optional[datetime] = None
    total_uptime_seconds: float = 0.0
    request_count: int = 0

class SwapperStatus(BaseModel):
    """Swapper service status"""
    status: str
    active_model: Optional[str] = None
    available_models: List[str]
    loaded_models: List[str]
    mode: str
    total_models: int

class ModelMetrics(BaseModel):
    """Model usage metrics"""
    model_name: str
    status: str
    loaded_at: Optional[datetime] = None
    uptime_hours: float
    request_count: int
    total_uptime_seconds: float

# ========== Swapper Service ==========

class SwapperService:
    """Swapper Service - manages model loading/unloading"""
    
    def __init__(self):
        self.models: Dict[str, ModelInfo] = {}
        self.active_model: Optional[str] = None
        self.loading_lock = asyncio.Lock()
        self.http_client = httpx.AsyncClient(timeout=300.0)
        self.model_uptime: Dict[str, float] = {}  # Track uptime per model
        self.model_load_times: Dict[str, datetime] = {}  # Track when model was loaded
        
    async def initialize(self):
        """Initialize Swapper Service - load configuration"""
        config = None
        try:
            logger.info(f"🔧 Initializing Swapper Service...")
            logger.info(f"🔧 Config path: {SWAPPER_CONFIG_PATH}")
            logger.info(f"🔧 Config exists: {os.path.exists(SWAPPER_CONFIG_PATH)}")
            
            if os.path.exists(SWAPPER_CONFIG_PATH):
                with open(SWAPPER_CONFIG_PATH, 'r') as f:
                    config = yaml.safe_load(f)
                    models_config = config.get('models', {})
                    logger.info(f"🔧 Found {len(models_config)} models in config")
                    
                    for model_key, model_config in models_config.items():
                        ollama_name = model_config.get('path', '').replace('ollama:', '')
                        logger.info(f"🔧 Adding model: {model_key} -> {ollama_name}")
                        self.models[model_key] = ModelInfo(
                            name=model_key,
                            ollama_name=ollama_name,
                            type=model_config.get('type', 'llm'),
                            size_gb=model_config.get('size_gb', 0),
                            priority=model_config.get('priority', 'medium'),
                            status=ModelStatus.UNLOADED
                        )
                        self.model_uptime[model_key] = 0.0
                    logger.info(f"✅ Loaded {len(self.models)} models into Swapper")
            else:
                logger.warning(f"⚠️ Config file not found: {SWAPPER_CONFIG_PATH}, using defaults")
                # Load default models from Ollama
                await self._load_models_from_ollama()
                
            logger.info(f"✅ Swapper Service initialized with {len(self.models)} models")
            logger.info(f"✅ Model names: {list(self.models.keys())}")
            
            # Завантажити модель за замовчанням, якщо вказано в конфігурації
            if config:
                swapper_config = config.get('swapper', {})
                default_model = swapper_config.get('default_model')
                
                if default_model and default_model in self.models:
                    logger.info(f"🔄 Loading default model: {default_model}")
                    success = await self.load_model(default_model)
                    if success:
                        logger.info(f"✅ Default model loaded: {default_model}")
                    else:
                        logger.warning(f"⚠️ Failed to load default model: {default_model}")
                elif default_model:
                    logger.warning(f"⚠️ Default model '{default_model}' not found in models list")
        except Exception as e:
            logger.error(f"❌ Error initializing Swapper Service: {e}", exc_info=True)
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
    
    async def _load_models_from_ollama(self):
        """Load available models from Ollama"""
        try:
            response = await self.http_client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                for model in data.get('models', []):
                    model_name = model.get('name', '')
                    # Extract base name (remove :latest, :7b, etc.)
                    base_name = model_name.split(':')[0]
                    
                    if base_name not in self.models:
                        size_gb = model.get('size', 0) / (1024**3)  # Convert bytes to GB
                        self.models[base_name] = ModelInfo(
                            name=base_name,
                            ollama_name=model_name,
                            type='llm',  # Default type
                            size_gb=size_gb,
                            priority='medium',
                            status=ModelStatus.UNLOADED
                        )
                        self.model_uptime[base_name] = 0.0
                        
                logger.info(f"✅ Loaded {len(self.models)} models from Ollama")
        except Exception as e:
            logger.error(f"❌ Error loading models from Ollama: {e}")
    
    async def load_model(self, model_name: str) -> bool:
        """Load a model (unload current if in single-active mode)"""
        async with self.loading_lock:
            try:
                # Check if model exists
                if model_name not in self.models:
                    logger.error(f"❌ Model not found: {model_name}")
                    return False
                
                model_info = self.models[model_name]
                
                # If single-active mode and another model is loaded, unload it first
                if SWAPPER_MODE == "single-active" and self.active_model and self.active_model != model_name:
                    await self._unload_model_internal(self.active_model)
                
                # Load the model
                logger.info(f"🔄 Loading model: {model_name}")
                model_info.status = ModelStatus.LOADING
                
                # Check if model is already loaded in Ollama
                response = await self.http_client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": model_info.ollama_name,
                        "prompt": "test",
                        "stream": False
                    },
                    timeout=MODEL_SWAP_TIMEOUT
                )
                
                if response.status_code == 200:
                    model_info.status = ModelStatus.LOADED
                    model_info.loaded_at = datetime.now()
                    model_info.unloaded_at = None
                    self.active_model = model_name
                    self.model_load_times[model_name] = datetime.now()
                    logger.info(f"✅ Model loaded: {model_name}")
                    return True
                else:
                    model_info.status = ModelStatus.ERROR
                    logger.error(f"❌ Failed to load model: {model_name}")
                    return False
                    
            except Exception as e:
                logger.error(f"❌ Error loading model {model_name}: {e}", exc_info=True)
                if model_name in self.models:
                    self.models[model_name].status = ModelStatus.ERROR
                return False
    
    async def _unload_model_internal(self, model_name: str) -> bool:
        """Internal method to unload a model"""
        try:
            if model_name not in self.models:
                return False
            
            model_info = self.models[model_name]
            
            if model_info.status == ModelStatus.LOADED:
                logger.info(f"🔄 Unloading model: {model_name}")
                model_info.status = ModelStatus.UNLOADING
                
                # Calculate uptime
                if model_name in self.model_load_times:
                    load_time = self.model_load_times[model_name]
                    uptime_seconds = (datetime.now() - load_time).total_seconds()
                    self.model_uptime[model_name] = self.model_uptime.get(model_name, 0.0) + uptime_seconds
                    model_info.total_uptime_seconds = self.model_uptime[model_name]
                    del self.model_load_times[model_name]
                
                model_info.status = ModelStatus.UNLOADED
                model_info.unloaded_at = datetime.now()
                
                if self.active_model == model_name:
                    self.active_model = None
                
                logger.info(f"✅ Model unloaded: {model_name}")
                return True
                
        except Exception as e:
            logger.error(f"❌ Error unloading model {model_name}: {e}")
            return False
    
    async def unload_model(self, model_name: str) -> bool:
        """Unload a model"""
        async with self.loading_lock:
            return await self._unload_model_internal(model_name)
    
    async def get_status(self) -> SwapperStatus:
        """Get Swapper service status"""
        # Update uptime for currently loaded model
        if self.active_model and self.active_model in self.model_load_times:
            load_time = self.model_load_times[self.active_model]
            current_uptime = (datetime.now() - load_time).total_seconds()
            self.model_uptime[self.active_model] = self.model_uptime.get(self.active_model, 0.0) + current_uptime
            self.model_load_times[self.active_model] = datetime.now()  # Reset timer
        
        loaded_models = [
            name for name, model in self.models.items()
            if model.status == ModelStatus.LOADED
        ]
        
        return SwapperStatus(
            status="healthy",
            active_model=self.active_model,
            available_models=list(self.models.keys()),
            loaded_models=loaded_models,
            mode=SWAPPER_MODE,
            total_models=len(self.models)
        )
    
    async def get_model_metrics(self, model_name: Optional[str] = None) -> List[ModelMetrics]:
        """Get metrics for model(s)"""
        metrics = []
        
        models_to_check = [model_name] if model_name else list(self.models.keys())
        
        for name in models_to_check:
            if name not in self.models:
                continue
            
            model_info = self.models[name]
            
            # Calculate current uptime
            uptime_seconds = self.model_uptime.get(name, 0.0)
            if name in self.model_load_times:
                load_time = self.model_load_times[name]
                current_uptime = (datetime.now() - load_time).total_seconds()
                uptime_seconds += current_uptime
            
            uptime_hours = uptime_seconds / 3600.0
            
            metrics.append(ModelMetrics(
                model_name=name,
                status=model_info.status.value,
                loaded_at=model_info.loaded_at,
                uptime_hours=uptime_hours,
                request_count=model_info.request_count,
                total_uptime_seconds=uptime_seconds
            ))
        
        return metrics
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()

# ========== FastAPI App ==========

app = FastAPI(
    title="Swapper Service",
    description="Dynamic model loading service for Node #2",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include cabinet API router (import after swapper is created)
try:
    from app.cabinet_api import router as cabinet_router
    app.include_router(cabinet_router)
    logger.info("✅ Cabinet API router included")
except ImportError:
    logger.warning("⚠️ cabinet_api module not found, skipping cabinet router")

# Global Swapper instance
swapper = SwapperService()

@app.on_event("startup")
async def startup():
    """Initialize Swapper on startup"""
    await swapper.initialize()

@app.on_event("shutdown")
async def shutdown():
    """Close Swapper on shutdown"""
    await swapper.close()

# ========== API Endpoints ==========

@app.get("/health")
async def health():
    """Health check endpoint"""
    status = await swapper.get_status()
    return {
        "status": "healthy",
        "service": "swapper-service",
        "active_model": status.active_model,
        "mode": status.mode
    }

@app.get("/status", response_model=SwapperStatus)
async def get_status():
    """Get Swapper service status"""
    return await swapper.get_status()

@app.get("/models")
async def list_models():
    """List all available models"""
    return {
        "models": [
            {
                "name": model.name,
                "ollama_name": model.ollama_name,
                "type": model.type,
                "size_gb": model.size_gb,
                "priority": model.priority,
                "status": model.status.value
            }
            for model in swapper.models.values()
        ]
    }

@app.get("/models/{model_name}")
async def get_model_info(model_name: str):
    """Get information about a specific model"""
    if model_name not in swapper.models:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")
    
    model_info = swapper.models[model_name]
    return {
        "name": model_info.name,
        "ollama_name": model_info.ollama_name,
        "type": model_info.type,
        "size_gb": model_info.size_gb,
        "priority": model_info.priority,
        "status": model_info.status.value,
        "loaded_at": model_info.loaded_at.isoformat() if model_info.loaded_at else None,
        "unloaded_at": model_info.unloaded_at.isoformat() if model_info.unloaded_at else None,
        "total_uptime_seconds": swapper.model_uptime.get(model_name, 0.0)
    }

@app.post("/models/{model_name}/load")
async def load_model_endpoint(model_name: str):
    """Load a model"""
    success = await swapper.load_model(model_name)
    if success:
        return {"status": "success", "model": model_name, "message": f"Model {model_name} loaded"}
    raise HTTPException(status_code=500, detail=f"Failed to load model: {model_name}")

@app.post("/models/{model_name}/unload")
async def unload_model_endpoint(model_name: str):
    """Unload a model"""
    success = await swapper.unload_model(model_name)
    if success:
        return {"status": "success", "model": model_name, "message": f"Model {model_name} unloaded"}
    raise HTTPException(status_code=500, detail=f"Failed to unload model: {model_name}")

@app.get("/metrics")
async def get_metrics(model_name: Optional[str] = None):
    """Get metrics for model(s)"""
    metrics = await swapper.get_model_metrics(model_name)
    return {
        "metrics": [metric.dict() for metric in metrics]
    }

@app.get("/metrics/{model_name}")
async def get_model_metrics(model_name: str):
    """Get metrics for a specific model"""
    metrics = await swapper.get_model_metrics(model_name)
    if not metrics:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")
    return metrics[0].dict()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8890)

