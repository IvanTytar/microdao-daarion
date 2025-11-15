"""
Bot Gateway HTTP API
Handles incoming webhooks from Telegram, Discord, etc.
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .router_client import send_to_router

logger = logging.getLogger(__name__)

router = APIRouter()


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
        
        # Build request to Router
        router_request = {
            "mode": "chat",
            "source": "telegram",
            "dao_id": dao_id,
            "user_id": f"tg:{user_id}",
            "session_id": f"tg:{chat_id}:{dao_id}",
            "message": text,
            "payload": {
                "message": text,
                "username": username,
                "chat_id": chat_id,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Send to Router
        router_response = await send_to_router(router_request)
        
        # TODO: Send response back to Telegram via Bot API
        # For now, just return the router response
        
        return {
            "status": "ok",
            "processed": True,
            "router_response": router_response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
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
        
        # Get DAO ID for this guild/channel
        dao_id = get_dao_id(guild_id, "discord")
        
        logger.info(f"Discord message from {username} (dc:{user_id}) in guild {guild_id}: {text[:50]}")
        
        # Build request to Router
        router_request = {
            "mode": "chat",
            "source": "discord",
            "dao_id": dao_id,
            "user_id": f"dc:{user_id}",
            "session_id": f"dc:{channel_id}:{dao_id}",
            "message": text,
            "payload": {
                "message": text,
                "username": username,
                "channel_id": channel_id,
                "guild_id": guild_id,
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # Send to Router
        router_response = await send_to_router(router_request)
        
        # TODO: Send response back to Discord via Bot API
        
        return {
            "status": "ok",
            "processed": True,
            "router_response": router_response
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Discord webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "bot-gateway"
    }
