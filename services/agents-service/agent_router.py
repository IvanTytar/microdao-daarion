"""
Agent Router — Маршрутизація запитів до агентів через NATS
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime
from nats.aio.client import Client as NATS
from nats_helpers.publisher import NATSPublisher

class AgentRouter:
    """
    Маршрутизує запити до агентів через NATS
    
    Flow:
    1. Отримати запит від користувача
    2. Визначити агента
    3. Опублікувати agents.invoke
    4. Очікувати agents.reply або agents.error (опційно)
    """
    
    def __init__(self, nc: NATS):
        self.nc = nc
        self.publisher = NATSPublisher(nc)
    
    async def route_to_agent(
        self,
        agent_id: str,
        channel_id: str,
        message_text: str,
        user_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        wait_for_reply: bool = False,
        timeout_seconds: int = 30
    ) -> Optional[Dict[str, Any]]:
        """
        Маршрутизувати запит до агента
        
        Args:
            agent_id: ID агента (e.g., "agent:sofia")
            channel_id: ID каналу
            message_text: Текст повідомлення
            user_id: ID користувача (опційно)
            context: Додатковий контекст (опційно)
            wait_for_reply: Чи очікувати відповідь агента
            timeout_seconds: Таймаут очікування відповіді
        
        Returns:
            Dict з відповіддю агента (якщо wait_for_reply=True)
        """
        # Публікуємо запит
        await self.publisher.publish_agent_invoke(
            agent_id=agent_id,
            channel_id=channel_id,
            message_text=message_text,
            user_id=user_id,
            context=context
        )
        
        print(f"🔀 Routed to {agent_id}: {message_text[:50]}...")
        
        # Якщо не очікуємо відповідь — повертаємо None
        if not wait_for_reply:
            return None
        
        # TODO: Імплементувати Request-Reply pattern з NATS
        # Наразі просто повертаємо None
        # Для повної реалізації потрібно:
        # 1. Створити унікальний inbox subject
        # 2. Підписатися на inbox
        # 3. Вказати reply-to в запиті
        # 4. Очікувати відповідь з timeout
        
        return None
    
    async def broadcast_to_agents(
        self,
        agent_ids: list[str],
        channel_id: str,
        message_text: str,
        user_id: Optional[str] = None
    ) -> None:
        """
        Надіслати запит до кількох агентів одночасно
        
        Args:
            agent_ids: Список ID агентів
            channel_id: ID каналу
            message_text: Текст повідомлення
            user_id: ID користувача
        """
        for agent_id in agent_ids:
            await self.route_to_agent(
                agent_id=agent_id,
                channel_id=channel_id,
                message_text=message_text,
                user_id=user_id,
                wait_for_reply=False
            )
        
        print(f"📣 Broadcasted to {len(agent_ids)} agents")
    
    async def route_command(
        self,
        command: str,
        args: Optional[str],
        channel_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Маршрутизувати команду
        
        Args:
            command: Назва команди (без "/" або "!")
            args: Аргументи команди
            channel_id: ID каналу
            user_id: ID користувача
        
        Returns:
            Dict з результатом виконання команди
        """
        # TODO: Імплементувати обробку команд
        # Наразі просто повертаємо mock відповідь
        
        if command == "help":
            return {
                "success": True,
                "message": "Available commands: /help, /status, /list, /agent"
            }
        
        elif command == "status":
            return {
                "success": True,
                "message": f"System status: OK\nAgent: {args or 'all'}"
            }
        
        elif command == "list":
            return {
                "success": True,
                "message": "Available agents: sofia, yaromir, greenfood"
            }
        
        else:
            return {
                "success": False,
                "message": f"Unknown command: /{command}"
            }

