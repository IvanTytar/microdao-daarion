from typing import Optional, Any, Dict
from pydantic import BaseModel


class TelegramUpdateEvent(BaseModel):
    """Подія 'agent.telegram.update' для NATS."""
    agent_id: str
    bot_id: str
    chat_id: int
    user_id: int
    text: Optional[str] = None
    raw_update: Dict[str, Any]


class TelegramSendCommand(BaseModel):
    """Команда від DAGI/microdao для надсилання повідомлення в Telegram."""
    agent_id: str
    chat_id: int
    text: str
    reply_to_message_id: Optional[int] = None


class BotRegistration(BaseModel):
    """HTTP payload для реєстрації нового бота/агента."""
    agent_id: str
    bot_token: str
    # опційно: allowed_chat_id, ім'я, тощо

