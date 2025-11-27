"""
Agent Cabinet Service - FastAPI сервіс для кабінетів агентів
Надає API для метрик, CrewAI команд та управління оркестраторами
"""
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Налаштування логування
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Pydantic Models
# ============================================================================

class AgentMetrics(BaseModel):
    agent_id: str
    agent_name: str
    status: str  # 'active' | 'inactive' | 'error'
    uptime_hours: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    last_active: str
    model: str
    model_backend: str
    node: str
    is_orchestrator: bool
    team_size: int
    workspace: Optional[str] = None
    workspace_info: Optional[Dict[str, Any]] = None
    sub_agents: Optional[List[Dict[str, str]]] = None

class CrewAICrew(BaseModel):
    id: str
    name: str
    agents: List[Dict[str, str]]
    tasks: List[Dict[str, str]]
    status: str  # 'active' | 'inactive'
    created_at: str

class BecomeOrchestratorRequest(BaseModel):
    agent_id: str

class BecomeOrchestratorResponse(BaseModel):
    status: str
    agent_id: str
    is_orchestrator: bool

# ============================================================================
# FastAPI App
# ============================================================================

app = FastAPI(
    title="Agent Cabinet Service",
    description="API для кабінетів агентів, метрик та CrewAI команд",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Data Storage (in-memory, можна замінити на базу даних)
# ============================================================================

# Зберігаємо метрики агентів
agent_metrics_store: Dict[str, AgentMetrics] = {}

# Зберігаємо CrewAI команди
agent_crews_store: Dict[str, List[CrewAICrew]] = {}

# Зберігаємо інформацію про оркестраторів
orchestrators_store: Dict[str, bool] = {}

# ============================================================================
# Helper Functions
# ============================================================================

def get_agent_from_router(agent_id: str) -> Optional[Dict[str, Any]]:
    """
    Отримати інформацію про агента з DAGI Router
    """
    try:
        import httpx
        router_url = os.getenv("ROUTER_URL", "http://localhost:9102")
        
        # Спробувати отримати інформацію про агента
        # Це залежить від API Router
        # Поки що повертаємо None
        return None
    except Exception as e:
        logger.error(f"Error getting agent from router: {e}")
        return None

def get_agent_metrics_from_system(agent_id: str) -> Dict[str, Any]:
    """
    Зібрати метрики агента з системи
    """
    # Отримати базову інформацію про агента
    agent_info = get_agent_from_router(agent_id)
    
    # Якщо агент вже є в store, використовуємо його метрики
    if agent_id in agent_metrics_store:
        metrics = agent_metrics_store[agent_id]
        # Оновлюємо last_active
        metrics.last_active = datetime.utcnow().isoformat()
        return metrics.dict()
    
    # Створюємо базові метрики для нового агента
    default_metrics = {
        "agent_id": agent_id,
        "agent_name": agent_id.replace("_", " ").title(),
        "status": "active",
        "uptime_hours": 0.0,
        "total_requests": 0,
        "successful_requests": 0,
        "failed_requests": 0,
        "avg_response_time_ms": 0.0,
        "last_active": datetime.utcnow().isoformat(),
        "model": "qwen3:8b",
        "model_backend": "ollama",
        "node": "node-1",
        "is_orchestrator": orchestrators_store.get(agent_id, False),
        "team_size": 0,
        "sub_agents": [],
    }
    
    # Зберігаємо метрики
    agent_metrics_store[agent_id] = AgentMetrics(**default_metrics)
    
    return default_metrics

def get_crews_for_agent(agent_id: str) -> List[Dict[str, Any]]:
    """
    Отримати CrewAI команди для агента
    """
    if agent_id not in agent_crews_store:
        return []
    
    return [crew.dict() for crew in agent_crews_store[agent_id]]

def create_crew_for_agent(agent_id: str, crew_name: str, agents: List[Dict], tasks: List[Dict]) -> CrewAICrew:
    """
    Створити нову CrewAI команду для агента
    """
    crew_id = f"crew-{agent_id}-{len(agent_crews_store.get(agent_id, [])) + 1}"
    
    crew = CrewAICrew(
        id=crew_id,
        name=crew_name,
        agents=agents,
        tasks=tasks,
        status="active",
        created_at=datetime.utcnow().isoformat()
    )
    
    if agent_id not in agent_crews_store:
        agent_crews_store[agent_id] = []
    
    agent_crews_store[agent_id].append(crew)
    
    return crew

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "agent-cabinet-service"}

@app.get("/api/agent/{agent_id}/metrics", response_model=AgentMetrics)
async def get_agent_metrics(agent_id: str):
    """
    Отримати метрики агента
    
    Повертає детальні метрики агента включаючи:
    - Uptime, запити, успішність
    - Статус, модель, backend
    - Інформацію про команду (якщо оркестратор)
    """
    try:
        metrics_data = get_agent_metrics_from_system(agent_id)
        
        # Оновлюємо інформацію про команду якщо агент оркестратор
        if orchestrators_store.get(agent_id, False):
            crews = get_crews_for_agent(agent_id)
            if crews:
                # Отримуємо всіх агентів з команд
                all_sub_agents = []
                for crew in crews:
                    all_sub_agents.extend(crew.get("agents", []))
                metrics_data["sub_agents"] = all_sub_agents
                metrics_data["team_size"] = len(all_sub_agents)
        
        return AgentMetrics(**metrics_data)
    except Exception as e:
        logger.error(f"Error getting metrics for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agent/{agent_id}/crews", response_model=List[CrewAICrew])
async def get_agent_crews(agent_id: str):
    """
    Отримати CrewAI команди для агента
    
    Повертає список всіх створених CrewAI команд для оркестратора
    """
    if not orchestrators_store.get(agent_id, False):
        raise HTTPException(
            status_code=403,
            detail="Agent is not an orchestrator. Use /become-orchestrator endpoint first."
        )
    
    try:
        crews = get_crews_for_agent(agent_id)
        return [CrewAICrew(**crew) for crew in crews]
    except Exception as e:
        logger.error(f"Error getting crews for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/{agent_id}/become-orchestrator", response_model=BecomeOrchestratorResponse)
async def become_orchestrator(agent_id: str):
    """
    Перетворити агента на оркестратора
    
    Дозволяє агенту:
    - Додавати агентів до команди
    - Створювати CrewAI команди
    - Делегувати завдання
    """
    try:
        # Перевіряємо чи агент існує
        metrics = get_agent_metrics_from_system(agent_id)
        
        # Встановлюємо статус оркестратора
        orchestrators_store[agent_id] = True
        
        # Оновлюємо метрики
        if agent_id in agent_metrics_store:
            agent_metrics_store[agent_id].is_orchestrator = True
        
        # Створюємо workspace для CrewAI (якщо потрібно)
        workspace_id = f"workspace-{agent_id}"
        if agent_id in agent_metrics_store:
            agent_metrics_store[agent_id].workspace = workspace_id
        
        logger.info(f"Agent {agent_id} became orchestrator")
        
        return BecomeOrchestratorResponse(
            status="success",
            agent_id=agent_id,
            is_orchestrator=True
        )
    except Exception as e:
        logger.error(f"Error making agent {agent_id} orchestrator: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CreateCrewRequest(BaseModel):
    crew_name: str
    agents: List[Dict[str, str]]
    tasks: List[Dict[str, str]] = []

@app.post("/api/agent/{agent_id}/crews/create")
async def create_crew(
    agent_id: str,
    request: CreateCrewRequest
):
    """
    Створити нову CrewAI команду для оркестратора
    """
    if not orchestrators_store.get(agent_id, False):
        raise HTTPException(
            status_code=403,
            detail="Agent is not an orchestrator"
        )
    
    try:
        crew = create_crew_for_agent(agent_id, request.crew_name, request.agents, request.tasks)
        return {"status": "success", "crew": crew.dict()}
    except Exception as e:
        logger.error(f"Error creating crew for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AddSubAgentRequest(BaseModel):
    id: str
    name: str
    role: str

@app.post("/api/agent/{agent_id}/add-sub-agent")
async def add_sub_agent(
    agent_id: str,
    sub_agent: AddSubAgentRequest
):
    """
    Додати агента до команди оркестратора
    """
    if not orchestrators_store.get(agent_id, False):
        raise HTTPException(
            status_code=403,
            detail="Agent is not an orchestrator"
        )
    
    try:
        if agent_id not in agent_metrics_store:
            get_agent_metrics_from_system(agent_id)
        
        metrics = agent_metrics_store[agent_id]
        
        if not metrics.sub_agents:
            metrics.sub_agents = []
        
        # Перевіряємо чи агент вже в команді
        if any(agent["id"] == sub_agent.id for agent in metrics.sub_agents):
            raise HTTPException(
                status_code=400,
                detail="Agent already in team"
            )
        
        metrics.sub_agents.append({
            "id": sub_agent.id,
            "name": sub_agent.name,
            "role": sub_agent.role
        })
        metrics.team_size = len(metrics.sub_agents)
        
        return {"status": "success", "team_size": metrics.team_size}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding sub-agent to {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agent/{agent_id}/remove-sub-agent")
async def remove_sub_agent(
    agent_id: str,
    sub_agent_id: str = Query(..., description="ID агента для видалення")
):
    """
    Видалити агента з команди оркестратора
    """
    if not orchestrators_store.get(agent_id, False):
        raise HTTPException(
            status_code=403,
            detail="Agent is not an orchestrator"
        )
    
    try:
        if agent_id not in agent_metrics_store:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        metrics = agent_metrics_store[agent_id]
        
        if not metrics.sub_agents:
            raise HTTPException(status_code=400, detail="Team is empty")
        
        # Видаляємо агента
        metrics.sub_agents = [
            agent for agent in metrics.sub_agents
            if agent.get("id") != sub_agent_id
        ]
        metrics.team_size = len(metrics.sub_agents)
        
        return {"status": "success", "team_size": metrics.team_size}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing sub-agent from {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str

@app.post("/api/agent/{agent_id}/chat")
async def chat_with_agent(
    agent_id: str,
    request: ChatRequest
):
    """
    Надіслати повідомлення агенту через DAGI Router
    """
    try:
        import httpx
        
        router_url = os.getenv("ROUTER_URL", "http://localhost:9102")
        
        # Формуємо запит до DAGI Router
        payload = {
            "agent": agent_id,
            "mode": "chat",
            "message": request.message,
            "payload": {
                "message": request.message
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{router_url}/v1/chat/completions",
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            # Оновлюємо метрики
            if agent_id in agent_metrics_store:
                metrics = agent_metrics_store[agent_id]
                metrics.total_requests += 1
                metrics.successful_requests += 1
                metrics.last_active = datetime.utcnow().isoformat()
            
            return {
                "status": "success",
                "reply": data.get("content", ""),
                "agent_id": agent_id
            }
    except httpx.HTTPStatusError as e:
        # Оновлюємо метрики (помилка)
        if agent_id in agent_metrics_store:
            metrics = agent_metrics_store[agent_id]
            metrics.total_requests += 1
            metrics.failed_requests += 1
        
        logger.error(f"Router HTTP error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Router error: {e.response.text}"
        )
    except Exception as e:
        logger.error(f"Error chatting with agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Initialization
# ============================================================================

@app.on_event("startup")
async def startup():
    """Ініціалізація при запуску"""
    logger.info("Agent Cabinet Service starting up...")
    
    # Завантажуємо збережені дані (якщо є)
    # Можна додати завантаження з бази даних
    
    logger.info("Agent Cabinet Service ready")

@app.on_event("shutdown")
async def shutdown():
    """Очищення при зупинці"""
    logger.info("Agent Cabinet Service shutting down...")
    
    # Зберігаємо дані (якщо потрібно)
    # Можна додати збереження в базу даних

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8898)

