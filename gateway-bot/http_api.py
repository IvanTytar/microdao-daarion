"""
Bot Gateway HTTP API
Handles incoming webhooks from Telegram, Discord, etc.
"""
import logging
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from router_client import send_to_router

logger = logging.getLogger(__name__)

router = APIRouter()


# ========================================
# DAARWIZZ Configuration
# ========================================

DAARWIZZ_NAME = os.getenv("DAARWIZZ_NAME", "DAARWIZZ")
DAARWIZZ_PROMPT_PATH = os.getenv(
    "DAARWIZZ_PROMPT_PATH",
    str(Path(__file__).parent / "daarwizz_prompt.txt"),
)


def load_daarwizz_prompt() -> str:
    """Load DAARWIZZ system prompt from file"""
    try:
        p = Path(DAARWIZZ_PROMPT_PATH)
        if not p.exists():
            logger.warning(f"DAARWIZZ prompt file not found: {DAARWIZZ_PROMPT_PATH}")
            return f"Ти — {DAARWIZZ_NAME}, AI-агент екосистеми DAARION.city. Допомагай учасникам з DAO-процесами."
        
        prompt = p.read_text(encoding="utf-8")
        logger.info(f"DAARWIZZ system prompt loaded ({len(prompt)} chars)")
        return prompt
    except Exception as e:
        logger.error(f"Error loading DAARWIZZ prompt: {e}")
        return f"Ти — {DAARWIZZ_NAME}, AI-агент екосистеми DAARION.city."


DAARWIZZ_SYSTEM_PROMPT = load_daarwizz_prompt()


# ========================================
# Request Models
# ========================================

class TelegramUpdate(BaseModel):
    """Simplified Telegram update model"""
    update_id: Optional[int] = None
    message: Optional[Dict[str, Any]] = None


class DiscordMessage(BaseModel):
    """Simplified Discord message model"""
    content: Optional[str] = None
    author: Optional[Dict[str, Any]] = None
    channel_id: Optional[str] = None
    guild_id: Optional[str] = None


# ========================================
# DAO Mapping (temporary)
# ========================================

# Map chat/channel ID to DAO ID
# TODO: Move to database or config
CHAT_TO_DAO = {
    "default": "greenfood-dao",
    # Add mappings: "telegram:12345": "specific-dao",
}


def get_dao_id(chat_id: str, source: str) -> str:
    """Get DAO ID from chat ID"""
    key = f"{source}:{chat_id}"
    return CHAT_TO_DAO.get(key, CHAT_TO_DAO["default"])


# ========================================
# Endpoints
# ========================================

@router.post("/telegram/webhook")
async def telegram_webhook(update: TelegramUpdate):
    """
    Handle Telegram webhook.
    
    Telegram update format:
    {
      "update_id": 123,
      "message": {
        "message_id": 456,
        "from": {"id": 12345, "username": "alice"},
        "chat": {"id": 12345, "type": "private"},
        "text": "Hello!"
      }
    }
    """
    try:
        if not update.message:
            raise HTTPException(status_code=400, detail="No message in update")
        
        # Extract message details
        text = update.message.get("text", "")
        from_user = update.message.get("from", {})
        chat = update.message.get("chat", {})
        
        user_id = str(from_user.get("id", "unknown"))
        chat_id = str(chat.get("id", "unknown"))
        username = from_user.get("username", "")
        
        # Get DAO ID for this chat
        dao_id = get_dao_id(chat_id, "telegram")
        
        logger.info(f"Telegram message from {username} (tg:{user_id}) in chat {chat_id}: {text[:50]}")
        
        # Build request to Router with DAARWIZZ context
        router_request = {
            "message": text,
            "mode": "chat",
            "agent": "daarwizz",  # DAARWIZZ agent identifier
            "metadata": {
                "source": "telegram",
                "dao_id": dao_id,
                "user_id": f"tg:{user_id}",
                "session_id": f"tg:{chat_id}:{dao_id}",
                "username": username,
                "chat_id": chat_id,
            },
            "context": {
                "agent_name": DAARWIZZ_NAME,
                "system_prompt": DAARWIZZ_SYSTEM_PROMPT,
                # RBAC context will be injected by Router
            },
        }
        
        # Send to Router
        logger.info(f"Sending to Router: agent=daarwizz, dao={dao_id}, user=tg:{user_id}")
        response = await send_to_router(router_request)
        
        # Extract response text
        if isinstance(response, dict):
            answer_text = response.get("data", {}).get("text") or response.get("response", "Вибач, я зараз не можу відповісти.")
        else:
            answer_text = "Вибач, сталася помилка."
        
        logger.info(f"Router response: {answer_text[:100]}")
        
        # Send response back to Telegram
        await send_telegram_message(chat_id, answer_text)
        
        return {"ok": True, "agent": "daarwizz"}
        
    except Exception as e:
        logger.error(f"Error handling Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/discord/webhook")
async def discord_webhook(message: DiscordMessage):
    """
    Handle Discord webhook.
    
    Discord message format:
    {
      "content": "Hello!",
      "author": {"id": "123", "username": "alice"},
      "channel_id": "456",
      "guild_id": "789"
    }
    """
    try:
        if not message.content:
            raise HTTPException(status_code=400, detail="No content in message")
        
        # Extract message details
        text = message.content
        author = message.author or {}
        channel_id = message.channel_id or "unknown"
        guild_id = message.guild_id or "unknown"
        
        user_id = author.get("id", "unknown")
        username = author.get("username", "")
        
        # Get DAO ID for this channel
        dao_id = get_dao_id(channel_id, "discord")
        
        logger.info(f"Discord message from {username} (discord:{user_id}): {text[:50]}")
        
        # Build request to Router with DAARWIZZ context
        router_request = {
            "message": text,
            "mode": "chat",
            "agent": "daarwizz",
            "metadata": {
                "source": "discord",
                "dao_id": dao_id,
                "user_id": f"discord:{user_id}",
                "session_id": f"discord:{channel_id}:{dao_id}",
                "username": username,
                "channel_id": channel_id,
                "guild_id": guild_id,
            },
            "context": {
                "agent_name": DAARWIZZ_NAME,
                "system_prompt": DAARWIZZ_SYSTEM_PROMPT,
            },
        }
        
        # Send to Router
        response = await send_to_router(router_request)
        
        # Extract response text
        if isinstance(response, dict):
            answer_text = response.get("data", {}).get("text") or response.get("response", "Sorry, I can't respond right now.")
        else:
            answer_text = "Sorry, an error occurred."
        
        logger.info(f"Router response: {answer_text[:100]}")
        
        # TODO: Send response back to Discord
        # await send_discord_message(channel_id, answer_text)
        
        return {"ok": True, "agent": "daarwizz", "response": answer_text}
        
    except Exception as e:
        logger.error(f"Error handling Discord webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Helper Functions
# ========================================

async def send_telegram_message(chat_id: str, text: str):
    """Send message to Telegram chat"""
    import httpx
    
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        return
    
    url = f"https://api.telegram.org/bot{telegram_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            logger.info(f"Telegram message sent to chat {chat_id}")
    except Exception as e:
        logger.error(f"Error sending Telegram message: {e}")


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "agent": DAARWIZZ_NAME,
        "system_prompt_loaded": len(DAARWIZZ_SYSTEM_PROMPT) > 0,
        "timestamp": datetime.utcnow().isoformat(),
    }
