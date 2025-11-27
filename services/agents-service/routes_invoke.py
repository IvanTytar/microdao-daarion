"""
Routes — Agent Invocation & Filtering
New routes for Phase 2: Agents Core
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import uuid

from agent_filter import filter_message, FilterResult
from agent_router import AgentRouter
from agent_executor import AgentExecutor, AgentExecutionError
from quotas import get_quota_tracker, DEFAULT_QUOTAS

router = APIRouter(prefix="/agents", tags=["agents-invoke"])

# ============================================================================
# Request/Response Models
# ============================================================================

class InvokeRequest(BaseModel):
    """Запит на виклик агента"""
    agent_id: str
    message_text: str
    channel_id: str
    user_id: Optional[str] = None
    context: Optional[dict] = None

class InvokeResponse(BaseModel):
    """Відповідь на виклик агента"""
    success: bool
    message: str
    run_id: Optional[str] = None
    response_text: Optional[str] = None
    tokens_used: Optional[int] = None
    latency_ms: Optional[int] = None

class FilterRequest(BaseModel):
    """Запит на фільтрацію повідомлення"""
    message_text: str
    user_id: str
    channel_id: str
    channel_agents: Optional[List[str]] = None

class FilterResponse(BaseModel):
    """Відповідь фільтрації"""
    action: str  # "allow" | "deny" | "agent"
    reason: Optional[str] = None
    agent_id: Optional[str] = None
    command: Optional[dict] = None
    intent: Optional[str] = None

class QuotaStatsResponse(BaseModel):
    """Статистика використання квот"""
    agent_id: str
    tokens_minute: int
    runs_today: int
    users_today: int
    concurrent_runs: int

# ============================================================================
# Global instances (будуть ініціалізовані в main.py)
# ============================================================================

agent_router: Optional[AgentRouter] = None
agent_executor: Optional[AgentExecutor] = None

def init_agents_core(router_instance: AgentRouter, executor_instance: AgentExecutor):
    """
    Ініціалізувати Agents Core компоненти
    Викликається з main.py при старті
    """
    global agent_router, agent_executor
    agent_router = router_instance
    agent_executor = executor_instance

# ============================================================================
# Routes
# ============================================================================

@router.post("/filter", response_model=FilterResponse)
async def filter_message_endpoint(request: FilterRequest):
    """
    Фільтрувати повідомлення
    
    Використання:
    - Перевірка на spam
    - Виявлення команд
    - Виявлення згадувань агентів
    - Визначення intent
    
    Returns:
        FilterResponse з рішенням про обробку
    """
    result: FilterResult = filter_message(
        text=request.message_text,
        user_id=request.user_id,
        channel_agents=request.channel_agents
    )
    
    return FilterResponse(
        action=result.action,
        reason=result.reason,
        agent_id=result.agent_id,
        command=result.command,
        intent=result.intent
    )

@router.post("/invoke", response_model=InvokeResponse)
async def invoke_agent(request: InvokeRequest, background_tasks: BackgroundTasks):
    """
    Викликати агента
    
    Flow:
    1. Перевірити квоти
    2. Маршрутизувати через NATS (agents.invoke)
    3. Виконати LLM запит
    4. Опублікувати відповідь (agents.reply)
    
    Returns:
        InvokeResponse з результатом
    """
    if not agent_router or not agent_executor:
        raise HTTPException(status_code=500, detail="Agents Core not initialized")
    
    # Get quota config (default: free tier)
    quota = DEFAULT_QUOTAS["free"]
    tracker = get_quota_tracker()
    
    # Check quotas
    if not tracker.check_concurrent_runs(request.agent_id, quota):
        raise HTTPException(status_code=429, detail="Too many concurrent runs")
    
    if not tracker.check_runs_quota(request.agent_id, quota):
        raise HTTPException(status_code=429, detail="Daily runs quota exceeded")
    
    if request.user_id and not tracker.check_users_quota(request.agent_id, request.user_id, quota):
        raise HTTPException(status_code=429, detail="Daily users quota exceeded")
    
    # Generate run ID
    run_id = f"run:{uuid.uuid4()}"
    
    # Start run tracking
    tracker.start_run(request.agent_id)
    tracker.record_run(request.agent_id, request.user_id)
    
    try:
        # Route to agent через NATS
        await agent_router.route_to_agent(
            agent_id=request.agent_id,
            channel_id=request.channel_id,
            message_text=request.message_text,
            user_id=request.user_id,
            context=request.context
        )
        
        # Execute LLM
        result = await agent_executor.execute(
            agent_id=request.agent_id,
            prompt=request.message_text,
            system_prompt=f"You are {request.agent_id}, a helpful AI assistant."
        )
        
        # Check token quota
        if not tracker.check_tokens_quota(request.agent_id, result["tokens_used"], quota):
            raise HTTPException(status_code=429, detail="Token quota exceeded")
        
        # Record tokens
        tracker.record_tokens(request.agent_id, result["tokens_used"])
        
        # Publish reply через NATS (у фоні)
        async def publish_reply():
            from nats_helpers.publisher import NATSPublisher
            # TODO: Use actual NATS connection from main.py
            # await publisher.publish_agent_reply(...)
            pass
        
        background_tasks.add_task(publish_reply)
        
        return InvokeResponse(
            success=True,
            message="Agent invoked successfully",
            run_id=run_id,
            response_text=result["response_text"],
            tokens_used=result["tokens_used"],
            latency_ms=result["latency_ms"]
        )
    
    except AgentExecutionError as e:
        raise HTTPException(status_code=500, detail=f"Agent execution failed: {str(e)}")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    finally:
        # Finish run tracking
        tracker.finish_run(request.agent_id)

@router.get("/{agent_id}/quota", response_model=QuotaStatsResponse)
async def get_agent_quota_stats(agent_id: str):
    """
    Отримати статистику використання квот для агента
    
    Returns:
        QuotaStatsResponse з поточною статистикою
    """
    tracker = get_quota_tracker()
    stats = tracker.get_usage_stats(agent_id)
    
    return QuotaStatsResponse(
        agent_id=agent_id,
        **stats
    )

