"""
Bot Gateway HTTP API
Handles incoming webhooks from Telegram, Discord, etc.
"""
import logging
import os
import httpx
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from router_client import send_to_router
from memory_client import memory_client

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
# HELION Configuration
# ========================================

HELION_NAME = os.getenv("HELION_NAME", "Helion")
HELION_PROMPT_PATH = os.getenv(
    "HELION_PROMPT_PATH",
    str(Path(__file__).parent / "helion_prompt.txt"),
)


def load_helion_prompt() -> str:
    """Load Helion system prompt from file"""
    try:
        p = Path(HELION_PROMPT_PATH)
        if not p.exists():
            logger.warning(f"Helion prompt file not found: {HELION_PROMPT_PATH}")
            return f"Ти — {HELION_NAME}, AI-агент платформи Energy Union. Допомагай учасникам з технологіями та токеномікою."
        
        prompt = p.read_text(encoding="utf-8")
        logger.info(f"Helion system prompt loaded ({len(prompt)} chars)")
        return prompt
    except Exception as e:
        logger.error(f"Error loading Helion prompt: {e}")
        return f"Ти — {HELION_NAME}, AI-агент платформи Energy Union."


HELION_SYSTEM_PROMPT = load_helion_prompt()


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
        from_user = update.message.get("from", {})
        chat = update.message.get("chat", {})
        
        user_id = str(from_user.get("id", "unknown"))
        chat_id = str(chat.get("id", "unknown"))
        username = from_user.get("username", "")
        
        # Get DAO ID for this chat
        dao_id = get_dao_id(chat_id, "telegram")
        
        # Check if it's a voice message
        voice = update.message.get("voice")
        audio = update.message.get("audio")
        video_note = update.message.get("video_note")
        
        text = ""
        
        if voice or audio or video_note:
            # Голосове повідомлення - розпізнаємо через STT
            media_obj = voice or audio or video_note
            file_id = media_obj.get("file_id") if media_obj else None
            
            if not file_id:
                raise HTTPException(status_code=400, detail="No file_id in voice/audio/video_note")
            
            logger.info(f"Voice message from {username} (tg:{user_id}), file_id: {file_id}")
            
            try:
                # Отримуємо файл з Telegram
                file_path = await get_telegram_file_path(file_id)
                if not file_path:
                    raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
                
                # Завантажуємо файл
                file_url = f"https://api.telegram.org/file/bot{os.getenv('TELEGRAM_BOT_TOKEN')}/{file_path}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    file_resp = await client.get(file_url)
                    file_resp.raise_for_status()
                    audio_bytes = file_resp.content
                
                # Відправляємо в STT-сервіс
                stt_service_url = os.getenv("STT_SERVICE_URL", "http://stt-service:9000")
                files = {"file": ("voice.ogg", audio_bytes, "audio/ogg")}
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    stt_resp = await client.post(f"{stt_service_url}/stt", files=files)
                    stt_resp.raise_for_status()
                    stt_data = stt_resp.json()
                    text = stt_data.get("text", "")
                
                logger.info(f"STT result: {text[:100]}...")
                
            except Exception as e:
                logger.error(f"STT processing failed: {e}", exc_info=True)
                await send_telegram_message(chat_id, "Вибач, не вдалося розпізнати голосове повідомлення. Спробуй надіслати текстом.", os.getenv("DAARWIZZ_TELEGRAM_BOT_TOKEN"))
                return {"ok": False, "error": "STT failed"}
        else:
            # Текстове повідомлення
            text = update.message.get("text", "")
            if not text:
                raise HTTPException(status_code=400, detail="No text or voice in message")
        
        logger.info(f"Telegram message from {username} (tg:{user_id}) in chat {chat_id}: {text[:50]}")
        
        # Fetch memory context
        memory_context = await memory_client.get_context(
            user_id=f"tg:{user_id}",
            agent_id="daarwizz",
            team_id=dao_id,
            channel_id=chat_id,
            limit=10
        )
        
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
                "memory": memory_context,  # Додаємо пам'ять
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
        
        # Save chat turn to memory
        await memory_client.save_chat_turn(
            agent_id="daarwizz",
            team_id=dao_id,
            user_id=f"tg:{user_id}",
            message=text,
            response=answer_text,
            channel_id=chat_id,
            scope="short_term"
        )
        
        # Send response back to Telegram
        await send_telegram_message(chat_id, answer_text, os.getenv("DAARWIZZ_TELEGRAM_BOT_TOKEN"))
        
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
        
        # Fetch memory context
        memory_context = await memory_client.get_context(
            user_id=f"discord:{user_id}",
            agent_id="daarwizz",
            team_id=dao_id,
            channel_id=channel_id,
            limit=10
        )
        
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
                "memory": memory_context,  # Додаємо пам'ять
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
        
        # Save chat turn to memory
        await memory_client.save_chat_turn(
            agent_id="daarwizz",
            team_id=dao_id,
            user_id=f"discord:{user_id}",
            message=text,
            response=answer_text,
            channel_id=channel_id,
            scope="short_term"
        )
        
        # TODO: Send response back to Discord
        # await send_discord_message(channel_id, answer_text)
        
        return {"ok": True, "agent": "daarwizz", "response": answer_text}
        
    except Exception as e:
        logger.error(f"Error handling Discord webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# Helper Functions
# ========================================

async def get_telegram_file_path(file_id: str) -> Optional[str]:
    """Отримати шлях до файлу з Telegram API"""
    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not telegram_token:
        logger.error("TELEGRAM_BOT_TOKEN not set")
        return None
    
    url = f"https://api.telegram.org/bot{telegram_token}/getFile"
    params = {"file_id": file_id}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            if data.get("ok"):
                return data.get("result", {}).get("file_path")
    except Exception as e:
        logger.error(f"Error getting Telegram file: {e}")
    return None


async def send_telegram_message(chat_id: str, text: str, bot_token: str = None):
    """Send message to Telegram chat"""
    telegram_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
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


# ========================================
# Helion Telegram Webhook
# ========================================

@router.post("/helion/telegram/webhook")
async def helion_telegram_webhook(update: TelegramUpdate):
    """
    Handle Telegram webhook for Helion agent.
    """
    try:
        if not update.message:
            raise HTTPException(status_code=400, detail="No message in update")
        
        # Extract message details
        from_user = update.message.get("from", {})
        chat = update.message.get("chat", {})
        
        user_id = str(from_user.get("id", "unknown"))
        chat_id = str(chat.get("id", "unknown"))
        username = from_user.get("username", "")
        
        # Get DAO ID for this chat (Energy Union specific)
        dao_id = get_dao_id(chat_id, "telegram")
        
        # Get message text
        text = update.message.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text in message")
        
        logger.info(f"Helion Telegram message from {username} (tg:{user_id}) in chat {chat_id}: {text[:50]}")
        
        # Fetch memory context
        memory_context = await memory_client.get_context(
            user_id=f"tg:{user_id}",
            agent_id="helion",
            team_id=dao_id,
            channel_id=chat_id,
            limit=10
        )
        
        # Build request to Router with Helion context
        router_request = {
            "message": text,
            "mode": "chat",
            "agent": "helion",  # Helion agent identifier
            "metadata": {
                "source": "telegram",
                "dao_id": dao_id,
                "user_id": f"tg:{user_id}",
                "session_id": f"tg:{chat_id}:{dao_id}",
                "username": username,
                "chat_id": chat_id,
            },
            "payload": {
                "context": {
                    "agent_name": HELION_NAME,
                    "system_prompt": HELION_SYSTEM_PROMPT,
                    "memory": memory_context,
                }
            },
        }
        
        # Send to Router
        logger.info(f"Sending to Router: agent=helion, dao={dao_id}, user=tg:{user_id}")
        response = await send_to_router(router_request)
        
        # Extract response text
        if isinstance(response, dict):
            answer_text = response.get("data", {}).get("text") or response.get("response", "Вибач, я зараз не можу відповісти.")
        else:
            answer_text = "Вибач, сталася помилка."
        
        logger.info(f"Router response: {answer_text[:100]}")
        
        # Save chat turn to memory
        await memory_client.save_chat_turn(
            agent_id="helion",
            team_id=dao_id,
            user_id=f"tg:{user_id}",
            message=text,
            response=answer_text,
            channel_id=chat_id,
            scope="short_term"
        )
        
        # Send response back to Telegram
        await send_telegram_message(chat_id, answer_text, os.getenv("HELION_TELEGRAM_BOT_TOKEN"))
        
        return {"ok": True, "agent": "helion"}
        
    except Exception as e:
        logger.error(f"Error handling Helion Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "agents": {
            "daarwizz": {
                "name": DAARWIZZ_NAME,
                "prompt_loaded": len(DAARWIZZ_SYSTEM_PROMPT) > 0
            },
            "helion": {
                "name": HELION_NAME,
                "prompt_loaded": len(HELION_SYSTEM_PROMPT) > 0
            }
        },
        "timestamp": datetime.utcnow().isoformat(),
    }
