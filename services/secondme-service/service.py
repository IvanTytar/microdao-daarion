"""
Second Me Service Logic
"""

import os
import httpx
import time
import logging
from typing import List, Dict

import repository

logger = logging.getLogger(__name__)

# Config
SECONDME_AGENT_ID = os.getenv("SECONDME_AGENT_ID", "ag_secondme_global")
AGENTS_SERVICE_URL = os.getenv("AGENTS_SERVICE_URL", "http://agents-service:7002")


async def invoke_second_me(user_id: str, prompt: str) -> Dict:
    """
    Викликати Second Me agent для користувача
    
    1. Отримати або створити сесію
    2. Зберегти user prompt
    3. Зібрати контекст (останні N повідомлень)
    4. Викликати Agents Core
    5. Зберегти assistant відповідь
    6. Повернути результат
    """
    start_time = time.monotonic()
    
    # 1. Отримати/створити сесію
    session = await repository.get_or_create_session(user_id, agent_id=SECONDME_AGENT_ID)
    session_id = session["id"]
    
    # 2. Зберегти user prompt
    await repository.create_message(
        session_id=session_id,
        user_id=user_id,
        role="user",
        content=prompt
    )
    
    # 3. Зібрати контекст
    messages = await repository.get_session_messages(session_id, limit=10)
    
    # Сформувати контекст для LLM
    context_messages = []
    for msg in messages:
        context_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # 4. Викликати Agents Core
    try:
        response_text, tokens_used = await call_agents_core(
            agent_id=SECONDME_AGENT_ID,
            user_id=user_id,
            prompt=prompt,
            context=context_messages
        )
    except Exception as e:
        logger.error(f"Failed to call Agents Core: {e}")
        # Fallback до mock відповіді
        response_text = f"Я — твій Second Me. Ти запитав: '{prompt}'. На жаль, зараз я не можу підключитися до LLM, але я тут для тебе! 🤖"
        tokens_used = 50
    
    latency_ms = int((time.monotonic() - start_time) * 1000)
    
    # 5. Зберегти assistant відповідь
    await repository.create_message(
        session_id=session_id,
        user_id=user_id,
        role="assistant",
        content=response_text,
        tokens_used=tokens_used,
        latency_ms=latency_ms
    )
    
    # Оновити час останньої взаємодії
    await repository.update_session_interaction(session_id)
    
    # 6. Повернути результат
    return {
        "response": response_text,
        "tokens_used": tokens_used,
        "latency_ms": latency_ms
    }


async def call_agents_core(
    agent_id: str,
    user_id: str,
    prompt: str,
    context: List[Dict]
) -> tuple[str, int]:
    """
    Викликати Agents Core service
    
    Returns: (response_text, tokens_used)
    """
    
    # Формуємо input з контекстом
    context_str = ""
    if context:
        for msg in context[-5:]:  # Останні 5 повідомлень
            role = msg["role"]
            content = msg["content"]
            context_str += f"{role.capitalize()}: {content}\n"
    
    input_text = f"""You are Second Me — персональний цифровий двійник користувача в DAARION City.

Контекст попередніх розмов:
{context_str}

Поточне запитання користувача:
{prompt}

Твоя відповідь (українською мовою):"""
    
    payload = {
        "input": input_text,
        "context": {
            "user_id": user_id,
            "kind": "secondme",
            "agent_id": agent_id
        }
    }
    
    url = f"{AGENTS_SERVICE_URL}/agents/invoke"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json={
            "agent_id": agent_id,
            "payload": payload
        })
        
        response.raise_for_status()
        data = response.json()
        
        # TODO: адаптувати під реальний формат відповіді Agents Core
        response_text = data.get("response", data.get("reply", "Немає відповіді"))
        tokens_used = data.get("tokens_used", 100)
        
        return response_text, tokens_used


async def get_user_history(user_id: str, limit: int = 5) -> List[Dict]:
    """Отримати історію користувача"""
    messages = await repository.get_user_messages(user_id, limit=limit)
    return [
        {
            "role": msg["role"],
            "content": msg["content"],
            "created_at": msg["created_at"].isoformat()
        }
        for msg in messages
    ]


async def get_user_profile(user_id: str) -> Dict:
    """Отримати профіль Second Me для користувача"""
    stats = await repository.get_user_stats(user_id)
    
    return {
        "user_id": user_id,
        "agent_id": SECONDME_AGENT_ID,
        "total_interactions": stats.get("total_messages", 0),
        "last_interaction": stats.get("last_interaction").isoformat() if stats.get("last_interaction") else None
    }


async def clear_user_history(user_id: str):
    """Очистити історію користувача"""
    await repository.clear_user_history(user_id)

