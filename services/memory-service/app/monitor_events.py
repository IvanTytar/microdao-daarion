"""
Monitor Events API - Автоматичне збереження подій Monitor Agent
Підтримує батчинг для оптимізації
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.crud import create_agent_memory_event
from app.schemas import AgentMemoryEventCreate, AgentMemoryEventResponse

# ========== Schemas ==========

class MonitorEventBatch(BaseModel):
    """Батч подій для збереження"""
    node_id: str
    events: List[Dict[str, Any]]
    batch_size: Optional[int] = None

class MonitorEventResponse(BaseModel):
    """Відповідь на збереження подій"""
    saved: int
    failed: int
    node_id: str
    timestamp: str

# ========== Functions ==========

async def save_monitor_events_batch(
    batch: MonitorEventBatch,
    db: Session,
    authorization: Optional[str] = None
) -> MonitorEventResponse:
    """
    Зберегти батч подій Monitor Agent
    Оптимізовано для збору метрик з багатьох нод
    Зберігає події в загальну пам'ять (monitor) та специфічну пам'ять (monitor-node-{node_id} або monitor-microdao-{microdao_id})
    """
    saved = 0
    failed = 0
    
    # Визначаємо agent_id на основі node_id
    # Формат: monitor-node-{node_id} для ноди, monitor-microdao-{microdao_id} для мікроДАО
    if "microdao" in batch.node_id:
        specific_agent_id = batch.node_id  # Вже в форматі monitor-microdao-{id}
    else:
        specific_agent_id = f"monitor-node-{batch.node_id}"
    
    # Загальний agent_id для всіх Monitor Agent
    global_agent_id = "monitor"
    
    for event_data in batch.events:
        try:
            # 1. Зберегти в специфічну пам'ять (monitor-node-{node_id} або monitor-microdao-{microdao_id})
            specific_event = AgentMemoryEventCreate(
                agent_id=specific_agent_id,
                team_id=event_data.get("team_id", "system"),
                channel_id=event_data.get("channel_id"),
                user_id=event_data.get("user_id"),
                scope=event_data.get("scope", "long_term"),
                kind=event_data.get("kind", "system_event"),
                body_text=event_data.get("body_text", ""),
                body_json=event_data.get("body_json", {})
            )
            create_agent_memory_event(db, specific_event)
            
            # 2. Зберегти в загальну пам'ять (monitor) - тільки важливі події
            # Зберігаємо всі події в загальну пам'ять для агрегації
            global_event = AgentMemoryEventCreate(
                agent_id=global_agent_id,
                team_id=event_data.get("team_id", "system"),
                channel_id=event_data.get("channel_id"),
                user_id=event_data.get("user_id"),
                scope=event_data.get("scope", "long_term"),
                kind=event_data.get("kind", "system_event"),
                body_text=event_data.get("body_text", ""),
                body_json={
                    **event_data.get("body_json", {}),
                    "source_node": batch.node_id,  # Додаємо джерело події
                    "specific_agent_id": specific_agent_id
                }
            )
            create_agent_memory_event(db, global_event)
            
            saved += 2  # Збережено в обидві пам'яті
            
            # TODO: Збереження в Qdrant, Milvus, Neo4j (асинхронно)
            # await save_to_qdrant(event_data)
            # await save_to_milvus(event_data)
            # await save_to_neo4j(event_data)
            
        except Exception as e:
            print(f"Error saving event: {e}")
            failed += 1
    
    return MonitorEventResponse(
        saved=saved,
        failed=failed,
        node_id=batch.node_id,
        timestamp=datetime.utcnow().isoformat()
    )

async def save_monitor_event_single(
    node_id: str,
    event: Dict[str, Any],
    db: Session,
    authorization: Optional[str] = None
) -> AgentMemoryEventResponse:
    """
    Зберегти одну подію Monitor Agent
    """
    agent_id = f"monitor-{node_id}"
    
    memory_event = AgentMemoryEventCreate(
        agent_id=agent_id,
        team_id=event.get("team_id", "system"),
        channel_id=event.get("channel_id"),
        user_id=event.get("user_id"),
        scope=event.get("scope", "long_term"),
        kind=event.get("kind", "system_event"),
        body_text=event.get("body_text", ""),
        body_json=event.get("body_json", {})
    )
    
    db_event = create_agent_memory_event(db, memory_event)
    return AgentMemoryEventResponse.model_validate(db_event)

