"""
Bot Gateway HTTP API
Handles incoming webhooks from Telegram, Discord, etc.
"""
import asyncio
import base64
import logging
import os
import time
import httpx
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from dataclasses import dataclass

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from router_client import send_to_router
from memory_client import memory_client
from services.doc_service import (
    parse_document,
    ingest_document,
    ask_about_document,
    get_doc_context
)

logger = logging.getLogger(__name__)

# Telegram message length limits
TELEGRAM_MAX_MESSAGE_LENGTH = 4096
TELEGRAM_SAFE_LENGTH = 3500  # Leave room for formatting

router = APIRouter()


# ========================================
# Agent Configuration
# ========================================

@dataclass
class AgentConfig:
    """Конфігурація агента для стандартизації обробки повідомлень"""
    agent_id: str
    name: str
    prompt_path: str
    telegram_token_env: str
    default_prompt: str
    system_prompt: str = ""  # Буде встановлено після завантаження
    
    def load_prompt(self) -> str:
        """Завантажити system prompt з файлу"""
        try:
            p = Path(self.prompt_path)
            if not p.exists():
                logger.warning(f"{self.name} prompt file not found: {self.prompt_path}")
                return self.default_prompt
            
            prompt = p.read_text(encoding="utf-8")
            logger.info(f"{self.name} system prompt loaded ({len(prompt)} chars)")
            return prompt
        except Exception as e:
            logger.error(f"Error loading {self.name} prompt: {e}")
            return self.default_prompt
    
    def get_telegram_token(self) -> Optional[str]:
        """Отримати Telegram токен агента"""
        return os.getenv(self.telegram_token_env)


def load_agent_config(agent_id: str, name: str, prompt_path: str, 
                      telegram_token_env: str, default_prompt: str) -> AgentConfig:
    """Створити та завантажити конфігурацію агента"""
    config = AgentConfig(
        agent_id=agent_id,
        name=name,
        prompt_path=prompt_path,
        telegram_token_env=telegram_token_env,
        default_prompt=default_prompt,
        system_prompt=""  # Тимчасове значення
    )
    # Завантажити prompt
    config.system_prompt = config.load_prompt()
    return config


# ========================================
# Agent Configurations
# ========================================

# DAARWIZZ Configuration
DAARWIZZ_CONFIG = load_agent_config(
    agent_id="daarwizz",
    name=os.getenv("DAARWIZZ_NAME", "DAARWIZZ"),
    prompt_path=os.getenv(
        "DAARWIZZ_PROMPT_PATH",
        str(Path(__file__).parent / "daarwizz_prompt.txt"),
    ),
    telegram_token_env="TELEGRAM_BOT_TOKEN",
    default_prompt=f"Ти — {os.getenv('DAARWIZZ_NAME', 'DAARWIZZ')}, AI-агент екосистеми DAARION.city. Допомагай учасникам з DAO-процесами."
)

# HELION Configuration
HELION_CONFIG = load_agent_config(
    agent_id="helion",
    name=os.getenv("HELION_NAME", "Helion"),
    prompt_path=os.getenv(
        "HELION_PROMPT_PATH",
        str(Path(__file__).parent / "helion_prompt.txt"),
    ),
    telegram_token_env="HELION_TELEGRAM_BOT_TOKEN",
    default_prompt=f"Ти — {os.getenv('HELION_NAME', 'Helion')}, AI-агент платформи Energy Union. Допомагай учасникам з технологіями та токеномікою."
)

# GREENFOOD Configuration
GREENFOOD_CONFIG = load_agent_config(
    agent_id="greenfood",
    name=os.getenv("GREENFOOD_NAME", "GREENFOOD"),
    prompt_path=os.getenv(
        "GREENFOOD_PROMPT_PATH",
        str(Path(__file__).parent / "greenfood_prompt.txt"),
    ),
    telegram_token_env="GREENFOOD_TELEGRAM_BOT_TOKEN",
    default_prompt="Ти — GREENFOOD Assistant, AI-ERP для крафтових виробників та кооперативів. Допомагай з обліком партій, логістикою, бухгалтерією та продажами."
)

# NUTRA Configuration
NUTRA_CONFIG = load_agent_config(
    agent_id="nutra",
    name=os.getenv("NUTRA_NAME", "NUTRA"),
    prompt_path=os.getenv(
        "NUTRA_PROMPT_PATH",
        str(Path(__file__).parent / "nutra_prompt.txt"),
    ),
    telegram_token_env="NUTRA_TELEGRAM_BOT_TOKEN",
    default_prompt="Ти — NUTRA, нутріцевтичний агент платформи DAARION. Допомагаєш з формулами нутрієнтів, біомедичних добавок та лабораторних інтерпретацій. Консультуєш з питань харчування, вітамінів та оптимізації здоров'я."
)

# Registry of all agents (для легкого додавання нових агентів)
# 
# Щоб додати нового агента:
# 1. Створіть конфігурацію через load_agent_config():
#    NEW_AGENT_CONFIG = load_agent_config(
#        agent_id="new_agent",
#        name=os.getenv("NEW_AGENT_NAME", "New Agent"),
#        prompt_path=os.getenv("NEW_AGENT_PROMPT_PATH", str(Path(__file__).parent / "new_agent_prompt.txt")),
#        telegram_token_env="NEW_AGENT_TELEGRAM_BOT_TOKEN",
#        default_prompt="Ти — New Agent, AI-агент..."
#    )
# 2. Додайте до реєстру:
# DRUID Configuration
DRUID_CONFIG = load_agent_config(
    agent_id="druid",
    name=os.getenv("DRUID_NAME", "DRUID"),
    prompt_path=os.getenv(
        "DRUID_PROMPT_PATH",
        str(Path(__file__).parent / "druid_prompt.txt"),
    ),
    telegram_token_env="DRUID_TELEGRAM_BOT_TOKEN",
    default_prompt="Ти — DRUID, агент платформи DAARION. Допомагай користувачам з аналізом даних, рекомендаціями та інтеграцією RAG.",
)

# Registry of all agents (для легкого додавання нових агентів)
AGENT_REGISTRY: Dict[str, AgentConfig] = {
    "daarwizz": DAARWIZZ_CONFIG,
    "helion": HELION_CONFIG,
    "greenfood": GREENFOOD_CONFIG,
    "nutra": NUTRA_CONFIG,
    "druid": DRUID_CONFIG,
}
# 3. Створіть endpoint (опціонально, якщо потрібен окремий webhook):
#    @router.post("/new_agent/telegram/webhook")
#    async def new_agent_telegram_webhook(update: TelegramUpdate):
#        return await handle_telegram_webhook(NEW_AGENT_CONFIG, update)
#
# Новий агент автоматично отримає:
# - Обробку фото через Swapper vision-8b
# - Обробку PDF документів
# - Обробку голосових повідомлень (коли буде реалізовано)
# - RAG запити по документам
# - Memory context
    #    AGENT_REGISTRY["new_agent"] = NEW_AGENT_CONFIG
    # 3. Створіть endpoint (опціонально, якщо потрібен окремий webhook):


# Backward compatibility
DAARWIZZ_NAME = DAARWIZZ_CONFIG.name
DAARWIZZ_SYSTEM_PROMPT = DAARWIZZ_CONFIG.system_prompt
HELION_NAME = HELION_CONFIG.name
HELION_SYSTEM_PROMPT = HELION_CONFIG.system_prompt
GREENFOOD_NAME = GREENFOOD_CONFIG.name
GREENFOOD_SYSTEM_PROMPT = GREENFOOD_CONFIG.system_prompt


# ========================================
# Request Models
# ========================================

# DRUID webhook endpoint
@router.post("/druid/telegram/webhook")
async def druid_telegram_webhook(update: TelegramUpdate):
    return await handle_telegram_webhook(DRUID_CONFIG, update)

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
# Helper Functions
# ========================================

SERVICE_ACK_PREFIXES = (
    "📥 Імпортую",
    "📄 Обробляю",
    "Обробляю голосове",
    "🎤",
)


def is_service_response(text: str) -> bool:
    """Heuristic: визначає, чи відповідь є службовою (вітальна/ack)."""
    if not text:
        return True
    stripped = text.strip()
    if not stripped:
        return True
    if len(stripped) < 5:
        return True
    lower = stripped.lower()
    return any(lower.startswith(prefix.lower()) for prefix in SERVICE_ACK_PREFIXES)


def extract_bot_mentions(text: str) -> List[str]:
    """Витягує згадки інших ботів виду @NameBot."""
    if not text:
        return []
    mentions = []
    for token in text.split():
        if token.startswith("@") and token[1:].lower().endswith("bot"):
            mentions.append(token[1:])
    return mentions


def should_force_concise_reply(text: str) -> bool:
    """Якщо коротке або без питального знаку — просимо агента відповісти стисло."""
    if not text:
        return True
    stripped = text.strip()
    if len(stripped) <= 120 and "?" not in stripped:
        return True
    return False


COMPLEX_REASONING_KEYWORDS = [
    "стратег", "roadmap", "алгоритм", "architecture", "архітектур",
    "прогноз", "scenario", "модель", "аналіз", "побудуй", "plan", "дослідж",
    "симуляц", "forecast", "оптиміз", "розрахуй", "calculate", "predict"
]


def requires_complex_reasoning(text: str) -> bool:
    if not text:
        return False
    stripped = text.strip()
    if len(stripped) > 400:
        return True
    lower = stripped.lower()
    return any(keyword in lower for keyword in COMPLEX_REASONING_KEYWORDS)


LAST_RESPONSE_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}
LAST_RESPONSE_TTL = float(os.getenv("TELEGRAM_LAST_RESPONSE_TTL", "15"))


def get_cached_response(agent_id: str, chat_id: str, text: str) -> Optional[str]:
    entry = LAST_RESPONSE_CACHE.get((agent_id, chat_id))
    if not entry:
        return None
    if entry["text"] == text and time.time() - entry["ts"] < LAST_RESPONSE_TTL:
        return entry["answer"]
    return None


def store_response_cache(agent_id: str, chat_id: str, text: str, answer: str) -> None:
    LAST_RESPONSE_CACHE[(agent_id, chat_id)] = {
        "text": text,
        "answer": answer,
        "ts": time.time(),
    }


def _resolve_stt_upload_url() -> str:
    """
    Повертає фінальний endpoint для STT upload, враховуючи налаштування.
    Дозволяє передати або базовий URL сервісу, або повний шлях до /api/stt/upload.
    """
    upload_override = os.getenv("STT_SERVICE_UPLOAD_URL")
    if upload_override:
        return upload_override.rstrip("/")
    
    base_url = os.getenv("STT_SERVICE_URL", "http://172.21.0.19:8895").rstrip("/")
    
    if base_url.endswith("/api/stt/upload"):
        return base_url
    if base_url.endswith("/api/stt"):
        return f"{base_url}/upload"
    if base_url.endswith("/api"):
        return f"{base_url}/stt/upload"
    
    return f"{base_url}/api/stt/upload"


# ========================================
# Helper Functions
# ========================================

async def send_telegram_message(chat_id: str, text: str, bot_token: Optional[str] = None) -> bool:
    """
    Відправити повідомлення в Telegram.
    
    Args:
        chat_id: ID чату
        text: Текст повідомлення
        bot_token: Telegram bot token (якщо None, використовується TELEGRAM_BOT_TOKEN)
    
    Returns:
        True якщо успішно, False інакше
    """
    try:
        token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            logger.error("TELEGRAM_BOT_TOKEN not set")
            return False
        
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.error(f"Failed to send Telegram message: {e}")
        return False


async def get_telegram_file_path(file_id: str, bot_token: Optional[str] = None) -> Optional[str]:
    """
    Отримати шлях до файлу з Telegram API.
    
    Args:
        file_id: ID файлу з Telegram
        bot_token: Telegram bot token (якщо None, використовується TELEGRAM_BOT_TOKEN)
    
    Returns:
        Шлях до файлу або None
    """
    try:
        token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        if not token:
            logger.error("TELEGRAM_BOT_TOKEN not set")
            return None
        
        url = f"https://api.telegram.org/bot{token}/getFile"
        params = {"file_id": file_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            if data.get("ok"):
                return data.get("result", {}).get("file_path")
            return None
    except Exception as e:
        logger.error(f"Failed to get Telegram file path: {e}")
        return None


def format_qa_response(qa_list: list) -> str:
    """Форматувати список питань-відповідей для Telegram"""
    if not qa_list:
        return "Немає питань-відповідей."
    
    result = "📋 **Питання та відповіді:**\n\n"
    for i, qa in enumerate(qa_list, 1):
        question = qa.get("question", "") if isinstance(qa, dict) else getattr(qa, "question", "")
        answer = qa.get("answer", "") if isinstance(qa, dict) else getattr(qa, "answer", "")
        result += f"**{i}. {question}**\n{answer}\n\n"
    
    return result.strip()


def format_markdown_response(markdown: str) -> str:
    """Форматувати markdown відповідь для Telegram"""
    if len(markdown) > TELEGRAM_SAFE_LENGTH:
        return markdown[:TELEGRAM_SAFE_LENGTH] + "\n\n_... (відповідь обрізано)_"
    return markdown


def format_chunks_response(chunks: list) -> str:
    """Форматувати список чанків для Telegram"""
    if not chunks:
        return "Немає фрагментів."
    
    result = f"📄 **Знайдено {len(chunks)} фрагментів:**\n\n"
    for i, chunk in enumerate(chunks[:5], 1):  # Показуємо тільки перші 5
        text = chunk.get("text", "") if isinstance(chunk, dict) else str(chunk)
        if len(text) > 200:
            text = text[:200] + "..."
        result += f"**{i}.** {text}\n\n"
    
    if len(chunks) > 5:
        result += f"_... та ще {len(chunks) - 5} фрагментів_"
    
    return result.strip()


# ========================================
# Universal Message Processing Functions
# ========================================

async def process_photo(
    agent_config: AgentConfig,
    update: TelegramUpdate,
    chat_id: str,
    user_id: str,
    username: str,
    dao_id: str,
    photo: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Універсальна функція для обробки фото для будь-якого агента.
    
    Args:
        agent_config: Конфігурація агента
        update: Telegram update об'єкт
        chat_id: ID чату
        user_id: ID користувача
        username: Ім'я користувача
        dao_id: ID DAO
        photo: Об'єкт фото з Telegram
    
    Returns:
        Dict з результатом обробки
    """
    # Telegram sends multiple sizes, get the largest one (last in array)
    photo_obj = photo[-1] if isinstance(photo, list) else photo
    file_id = photo_obj.get("file_id") if isinstance(photo_obj, dict) else None
    
    if not file_id:
        return {"ok": False, "error": "No file_id in photo"}
    
    logger.info(f"{agent_config.name}: Photo from {username} (tg:{user_id}), file_id: {file_id}")
    
    try:
        caption = (update.message or {}).get("caption") or ""
        # Get file path from Telegram
        telegram_token = agent_config.get_telegram_token()
        if not telegram_token:
            return {"ok": False, "error": f"Telegram token not configured for {agent_config.name}"}
        
        file_path = await get_telegram_file_path(file_id, telegram_token)
        if not file_path:
            raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
        
        # Build file URL
        file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
        
        # Download and encode the image as base64 data URL for Router
        async with httpx.AsyncClient(timeout=60.0) as client:
            photo_resp = await client.get(file_url)
            photo_resp.raise_for_status()
            image_bytes = photo_resp.content
            content_type = photo_resp.headers.get("Content-Type", "")
        
        if not content_type or not content_type.startswith("image/"):
            content_type = "image/jpeg"
        
        encoded_image = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{content_type};base64,{encoded_image}"
        
        logger.info(
            f"{agent_config.name}: Photo downloaded ({len(image_bytes)} bytes, content_type={content_type})"
        )
        
        # Send to Router with specialist_vision_8b model (Swapper)
        prompt = caption.strip() if caption else "Опиши це зображення детально."
        router_request = {
            "message": f"{prompt}\n\n[Зображення передано окремо у context.images]",
            "mode": "chat",
            "agent": agent_config.agent_id,
            "payload": {
                "provider": "llm_specialist_vision_8b",
                "task_type": "vision_photo_analysis",
            },
            "metadata": {
                "source": "telegram",
                "dao_id": dao_id,
                "user_id": f"tg:{user_id}",
                "session_id": f"tg:{chat_id}:{dao_id}",
                "username": username,
                "chat_id": chat_id,
                "file_id": file_id,
                "file_url": file_url,
                "has_image": True,
                "provider": "llm_specialist_vision_8b",
                "use_llm": "specialist_vision_8b",
            },
            "context": {
                "agent_name": agent_config.name,
                "system_prompt": agent_config.system_prompt,
                "images": [data_url],
            },
        }
        
        # Send to Router
        logger.info(f"{agent_config.name}: Sending photo to Router with vision-8b (provider override)")
        response = await send_to_router(router_request)
        
        # Extract response
        if isinstance(response, dict) and response.get("ok"):
            answer_text = response.get("data", {}).get("text") or response.get("response", "")
            
            if answer_text:
                # Photo processed successfully
                await send_telegram_message(
                    chat_id,
                    f"✅ **Фото оброблено**\n\n{answer_text}",
                    telegram_token
                )
                
                # Save to memory for context
                await memory_client.save_chat_turn(
                    agent_id=agent_config.agent_id,
                    team_id=dao_id,
                    user_id=f"tg:{user_id}",
                    message=f"[Photo: {file_id}]",
                    response=answer_text,
                    channel_id=chat_id,
                    scope="short_term",
                    save_agent_response=not is_service_response(answer_text),
                    agent_metadata={"context": "photo"},
                )
                
                return {"ok": True, "agent": agent_config.agent_id, "model": "specialist_vision_8b"}
            else:
                await send_telegram_message(
                    chat_id,
                    "Фото оброблено, але не вдалося отримати опис.",
                    telegram_token
                )
                return {"ok": False, "error": "No description in response"}
        else:
            error_msg = response.get("error", "Unknown error") if isinstance(response, dict) else "Router error"
            logger.error(f"{agent_config.name}: Vision-8b error: {error_msg}")
            await send_telegram_message(
                chat_id,
                f"Вибач, не вдалося обробити фото: {error_msg}",
                telegram_token
            )
            return {"ok": False, "error": error_msg}
        
    except Exception as e:
        logger.error(f"{agent_config.name}: Photo processing failed: {e}", exc_info=True)
        telegram_token = agent_config.get_telegram_token()
        await send_telegram_message(
            chat_id,
            "Вибач, не вдалося обробити фото. Переконайся, що Swapper Service з vision-8b моделлю запущений.",
            telegram_token
        )
        return {"ok": False, "error": "Photo processing failed"}


async def process_document(
    agent_config: AgentConfig,
    update: TelegramUpdate,
    chat_id: str,
    user_id: str,
    username: str,
    dao_id: str,
    document: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Універсальна функція для обробки документів (PDF) для будь-якого агента.
    
    Args:
        agent_config: Конфігурація агента
        update: Telegram update об'єкт
        chat_id: ID чату
        user_id: ID користувача
        username: Ім'я користувача
        dao_id: ID DAO
        document: Об'єкт документа з Telegram
    
    Returns:
        Dict з результатом обробки
    """
    mime_type = document.get("mime_type", "")
    file_name = document.get("file_name", "")
    file_id = document.get("file_id")
    
    # Check if it's a PDF
    is_pdf = (
        mime_type == "application/pdf" or
        (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
    )
    
    if is_pdf and file_id:
        logger.info(f"{agent_config.name}: PDF document from {username} (tg:{user_id}), file_id: {file_id}, file_name: {file_name}")
        
        try:
            telegram_token = agent_config.get_telegram_token()
            if not telegram_token:
                return {"ok": False, "error": f"Telegram token not configured for {agent_config.name}"}
            
            file_path = await get_telegram_file_path(file_id, telegram_token)
            if not file_path:
                raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
            
            file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
            
            session_id = f"telegram:{chat_id}"
            result = await parse_document(
                session_id=session_id,
                doc_url=file_url,
                file_name=file_name,
                dao_id=dao_id,
                user_id=f"tg:{user_id}",
                output_mode="qa_pairs",
                metadata={"username": username, "chat_id": chat_id}
            )
            
            if not result.success:
                await send_telegram_message(chat_id, f"Вибач, не вдалося обробити документ: {result.error}", telegram_token)
                return {"ok": False, "error": result.error}
            
            # Format response for Telegram
            answer_text = ""
            if result.qa_pairs:
                qa_list = [{"question": qa.question, "answer": qa.answer} for qa in result.qa_pairs]
                answer_text = format_qa_response(qa_list)
            elif result.markdown:
                answer_text = format_markdown_response(result.markdown)
            elif result.chunks_meta and result.chunks_meta.get("chunks"):
                chunks = result.chunks_meta.get("chunks", [])
                answer_text = format_chunks_response(chunks)
            else:
                answer_text = "✅ Документ успішно оброблено, але формат відповіді не розпізнано."
            
            if not answer_text.endswith("_"):
                answer_text += "\n\n💡 _Використай /ingest для імпорту документа у RAG_"
            
            logger.info(f"{agent_config.name}: PDF parsing result: {len(answer_text)} chars, doc_id={result.doc_id}")
            await send_telegram_message(chat_id, answer_text, telegram_token)
            return {"ok": True, "agent": "parser", "mode": "doc_parse", "doc_id": result.doc_id}
            
        except Exception as e:
            logger.error(f"{agent_config.name}: PDF processing failed: {e}", exc_info=True)
            telegram_token = agent_config.get_telegram_token()
            await send_telegram_message(chat_id, "Вибач, не вдалося обробити PDF-документ. Переконайся, що файл не пошкоджений.", telegram_token)
            return {"ok": False, "error": "PDF processing failed"}
    elif document and not is_pdf:
        telegram_token = agent_config.get_telegram_token()
        await send_telegram_message(chat_id, "Наразі підтримуються тільки PDF-документи. Інші формати (docx, zip, тощо) будуть додані пізніше.", telegram_token)
        return {"ok": False, "error": "Unsupported document type"}
    
    return {"ok": False, "error": "No document to process"}


async def process_voice(
    agent_config: AgentConfig,
    update: TelegramUpdate,
    chat_id: str,
    user_id: str,
    username: str,
    dao_id: str,
    media_obj: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Універсальна функція для обробки голосових повідомлень для будь-якого агента.
    Використовує STT Service для розпізнавання мовлення.
    
    Args:
        agent_config: Конфігурація агента
        update: Telegram update об'єкт
        chat_id: ID чату
        user_id: ID користувача
        username: Ім'я користувача
        dao_id: ID DAO
        media_obj: Об'єкт голосового повідомлення з Telegram
    
    Returns:
        Dict з результатом обробки та розпізнаним текстом
    """
    file_id = media_obj.get("file_id") if media_obj else None
    
    if not file_id:
        return {"ok": False, "error": "No file_id in voice/audio/video_note"}
    
    logger.info(f"{agent_config.name}: Voice message from {username} (tg:{user_id}), file_id: {file_id}")
    
    try:
        telegram_token = agent_config.get_telegram_token()
        if not telegram_token:
            return {"ok": False, "error": f"Telegram token not configured for {agent_config.name}"}
        
        # Отримуємо файл з Telegram
        file_path = await get_telegram_file_path(file_id, telegram_token)
        if not file_path:
            raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
        
        # Завантажуємо файл
        file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            file_resp = await client.get(file_url)
            file_resp.raise_for_status()
            audio_bytes = file_resp.content
        
        # Відправляємо в STT-сервіс
        stt_upload_url = _resolve_stt_upload_url()
        mime_type = media_obj.get("mime_type") if isinstance(media_obj, dict) else None
        files = {
            "file": (
                "voice.ogg",
                audio_bytes,
                mime_type or "audio/ogg",
            )
        }
        
        logger.info(f"{agent_config.name}: Sending voice to STT endpoint {stt_upload_url}")
        async with httpx.AsyncClient(timeout=90.0) as client:
            stt_resp = await client.post(stt_upload_url, files=files)
            stt_resp.raise_for_status()
            stt_data = stt_resp.json()
            text = stt_data.get("text", "")
        
        if not text:
            await send_telegram_message(
                chat_id,
                "Вибач, не вдалося розпізнати голосове повідомлення. Спробуй надіслати текстом.",
                telegram_token
            )
            return {"ok": False, "error": "STT returned empty text"}
        
        logger.info(f"{agent_config.name}: STT result: {text[:100]}...")
        
        # Повертаємо розпізнаний текст для подальшої обробки
        return {"ok": True, "text": text, "agent": agent_config.agent_id, "mode": "voice_stt"}
        
    except Exception as e:
        logger.error(f"{agent_config.name}: Voice processing failed: {e}", exc_info=True)
        telegram_token = agent_config.get_telegram_token()
        await send_telegram_message(
            chat_id,
            "Вибач, не вдалося розпізнати голосове повідомлення. Спробуй надіслати текстом.",
            telegram_token
        )
        return {"ok": False, "error": "Voice processing failed"}


# ========================================
# Universal Telegram Webhook Handler
# ========================================

async def handle_telegram_webhook(
    agent_config: AgentConfig,
    update: TelegramUpdate
) -> Dict[str, Any]:
    """
    Універсальна функція для обробки Telegram webhook для будь-якого агента.
    
    Args:
        agent_config: Конфігурація агента
        update: Telegram update об'єкт
    
    Returns:
        Dict з результатом обробки
    """
    # Allow updates without message if they contain photo/voice
    # The actual message validation happens after multimodal checks
    # if not update.message:
    #     raise HTTPException(status_code=400, detail="No message in update")
    
    # Extract message details
    from_user = update.message.get("from", {})
    chat = update.message.get("chat", {})
    
    user_id = str(from_user.get("id", "unknown"))
    chat_id = str(chat.get("id", "unknown"))
    username = from_user.get("username", "")
    first_name = from_user.get("first_name")
    last_name = from_user.get("last_name")
    is_sender_bot = bool(from_user.get("is_bot") or (username and username.lower().endswith("bot")))
    
    # Get DAO ID for this chat
    dao_id = get_dao_id(chat_id, "telegram")
    
    # Оновлюємо факти про користувача/агента для побудови графу пам'яті
    asyncio.create_task(
        memory_client.upsert_fact(
            user_id=f"tg:{user_id}",
            fact_key="profile",
            fact_value_json={
                "username": username,
                "first_name": first_name,
                "last_name": last_name,
                "language_code": from_user.get("language_code"),
                "is_bot": is_sender_bot,
            },
            team_id=dao_id,
        )
    )
    
    telegram_token = agent_config.get_telegram_token()
    if not telegram_token:
        raise HTTPException(status_code=500, detail=f"Telegram token not configured for {agent_config.name}")
    
    # Check for /ingest command
    text = update.message.get("text", "")
    if text and text.strip().startswith("/ingest"):
        session_id = f"telegram:{chat_id}"
        
        # Check if there's a document in the message
        document = update.message.get("document")
        if document:
            mime_type = document.get("mime_type", "")
            file_name = document.get("file_name", "")
            file_id = document.get("file_id")
            
            is_pdf = (
                mime_type == "application/pdf" or
                (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
            )
            
            if is_pdf and file_id:
                try:
                    file_path = await get_telegram_file_path(file_id, telegram_token)
                    if file_path:
                        file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
                        result = await ingest_document(
                            session_id=session_id,
                            doc_url=file_url,
                            file_name=file_name,
                            dao_id=dao_id,
                            user_id=f"tg:{user_id}"
                        )
                        
                        if result.success:
                            await send_telegram_message(
                                chat_id,
                                f"✅ **Документ імпортовано у RAG**\n\n"
                                f"📊 Фрагментів: {result.ingested_chunks}\n"
                                f"📁 DAO: {dao_id}\n\n"
                                f"Тепер ти можеш задавати питання по цьому документу!",
                                telegram_token
                            )
                            return {"ok": True, "chunks_count": result.ingested_chunks}
                        else:
                            await send_telegram_message(chat_id, f"Вибач, не вдалося імпортувати: {result.error}", telegram_token)
                            return {"ok": False, "error": result.error}
                except Exception as e:
                    logger.error(f"{agent_config.name}: Ingest failed: {e}", exc_info=True)
                    await send_telegram_message(chat_id, "Вибач, не вдалося імпортувати документ.", telegram_token)
                    return {"ok": False, "error": "Ingest failed"}
        
        # Try to get last parsed doc_id from session context
        result = await ingest_document(
            session_id=session_id,
            dao_id=dao_id,
            user_id=f"tg:{user_id}"
        )
        
        if result.success:
            await send_telegram_message(
                chat_id,
                f"✅ **Документ імпортовано у RAG**\n\n"
                f"📊 Фрагментів: {result.ingested_chunks}\n"
                f"📁 DAO: {dao_id}\n\n"
                f"Тепер ти можеш задавати питання по цьому документу!",
                telegram_token
            )
            return {"ok": True, "chunks_count": result.ingested_chunks}
        else:
            await send_telegram_message(chat_id, "Спочатку надішли PDF-документ, а потім використай /ingest", telegram_token)
            return {"ok": False, "error": result.error}
    
    # Check if it's a document (PDF)
    document = update.message.get("document")
    if document:
        result = await process_document(
            agent_config, update, chat_id, user_id, username, dao_id, document
        )
        if result.get("ok"):
            return result
    
    # Check if it's a photo
    photo = update.message.get("photo")
    if photo:
        result = await process_photo(
            agent_config, update, chat_id, user_id, username, dao_id, photo
        )
        if result.get("ok"):
            return result
    
    # Check if it's a voice message
    voice = update.message.get("voice")
    audio = update.message.get("audio")
    video_note = update.message.get("video_note")
    
    text = ""
    if voice or audio or video_note:
        media_obj = voice or audio or video_note
        result = await process_voice(
            agent_config, update, chat_id, user_id, username, dao_id, media_obj
        )
        if result.get("ok") and result.get("text"):
            # Отримали розпізнаний текст, продовжуємо обробку як текстове повідомлення
            text = result.get("text")
        elif result.get("ok"):
            # STT успішний, але текст порожній
            return result
        else:
            # Помилка STT
            return result
    
    # Get message text (якщо не було голосового повідомлення)
    if not text:
        text = update.message.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text or voice in message")
    
    logger.info(f"{agent_config.name} Telegram message from {username} (tg:{user_id}) in chat {chat_id}: {text[:50]}")
    mentioned_bots = extract_bot_mentions(text)
    needs_complex_reasoning = requires_complex_reasoning(text)
    
    cached_answer = get_cached_response(agent_config.agent_id, chat_id, text)
    if cached_answer:
        await send_telegram_message(chat_id, cached_answer, telegram_token)
        await memory_client.save_chat_turn(
            agent_id=agent_config.agent_id,
            team_id=dao_id,
            user_id=f"tg:{user_id}",
            message=text,
            response=cached_answer,
            channel_id=chat_id,
            scope="short_term",
            save_agent_response=not is_service_response(cached_answer),
            agent_metadata={
                "cached_reply": True,
                "mentioned_bots": mentioned_bots,
                "requires_complex_reasoning": needs_complex_reasoning,
            },
        )
        return {"ok": True, "agent": agent_config.agent_id, "cached": True}
    
    # Check if there's a document context for follow-up questions
    session_id = f"telegram:{chat_id}"
    doc_context = await get_doc_context(session_id)
    
    # If there's a doc_id and the message looks like a question about the document
    if doc_context and doc_context.doc_id:
        # Check if it's a question (simple heuristic: contains question words or ends with ?)
        is_question = (
            "?" in text or
            any(word in text.lower() for word in ["що", "як", "чому", "коли", "де", "хто", "чи"])
        )
        
        if is_question:
            logger.info(f"{agent_config.name}: Follow-up question detected for doc_id={doc_context.doc_id}")
            # Try RAG query first
            rag_result = await ask_about_document(
                session_id=session_id,
                question=text,
                doc_id=doc_context.doc_id,
                dao_id=dao_id or doc_context.dao_id,
                user_id=f"tg:{user_id}"
            )
            
            if rag_result.success and rag_result.answer:
                # Truncate if too long for Telegram
                answer = rag_result.answer
                if len(answer) > TELEGRAM_SAFE_LENGTH:
                    answer = answer[:TELEGRAM_SAFE_LENGTH] + "\n\n_... (відповідь обрізано)_"
                
                await send_telegram_message(chat_id, answer, telegram_token)
                return {"ok": True, "agent": "parser", "mode": "rag_query"}
            # Fall through to regular chat if RAG query fails
    
    # Regular chat mode
    # Fetch memory context
    memory_context = await memory_client.get_context(
        user_id=f"tg:{user_id}",
        agent_id=agent_config.agent_id,
        team_id=dao_id,
        channel_id=chat_id,
        limit=10
    )
    
    # Build request to Router
    router_request = {
        "message": text,
        "mode": "chat",
        "agent": agent_config.agent_id,
        "metadata": {
            "source": "telegram",
            "dao_id": dao_id,
            "user_id": f"tg:{user_id}",
            "session_id": f"tg:{chat_id}:{dao_id}",
            "username": username,
            "chat_id": chat_id,
            "sender_is_bot": is_sender_bot,
            "mentioned_bots": mentioned_bots,
            "requires_complex_reasoning": needs_complex_reasoning,
        },
        "context": {
            "agent_name": agent_config.name,
            "system_prompt": agent_config.system_prompt,
            "memory": memory_context,
            "participants": {
                "sender_is_bot": is_sender_bot,
                "mentioned_bots": mentioned_bots,
            },
        },
    }
    
    if should_force_concise_reply(text):
        router_request["message"] = (
            f"{text}\n\n(Інструкція: дай максимально коротку відповідь, якщо не просили деталей "
            "і дочекайся додаткового питання.)"
        )
    
    if needs_complex_reasoning:
        router_request["metadata"]["provider"] = "cloud_deepseek"
        router_request["metadata"]["reason"] = "auto_complex"
    
    # Send to Router
    logger.info(f"Sending to Router: agent={agent_config.agent_id}, dao={dao_id}, user=tg:{user_id}")
    response = await send_to_router(router_request)
    
    # Extract response
    if isinstance(response, dict) and response.get("ok"):
        answer_text = response.get("data", {}).get("text") or response.get("response", "")
        
        if not answer_text:
            answer_text = "Вибач, я зараз не можу відповісти."
        
        # Truncate if too long for Telegram
        if len(answer_text) > TELEGRAM_SAFE_LENGTH:
            answer_text = answer_text[:TELEGRAM_SAFE_LENGTH] + "\n\n_... (відповідь обрізано)_"
        
        # Send response back to Telegram
        await send_telegram_message(chat_id, answer_text, telegram_token)
        
        await memory_client.save_chat_turn(
            agent_id=agent_config.agent_id,
            team_id=dao_id,
            user_id=f"tg:{user_id}",
            message=text,
            response=answer_text,
            channel_id=chat_id,
            scope="short_term",
            save_agent_response=not is_service_response(answer_text),
            agent_metadata={
                "mentioned_bots": mentioned_bots,
                "requires_complex_reasoning": needs_complex_reasoning,
            },
        )
        
        store_response_cache(agent_config.agent_id, chat_id, text, answer_text)
        
        return {"ok": True, "agent": agent_config.agent_id}
    else:
        error_msg = response.get("error", "Unknown error") if isinstance(response, dict) else "Router error"
        logger.error(f"Router error: {error_msg}")
        await send_telegram_message(chat_id, f"Вибач, сталася помилка: {error_msg}", telegram_token)
        return {"ok": False, "error": error_msg}


# ========================================
# Endpoints
# ========================================

@router.post("/telegram/webhook")
async def telegram_webhook(update: TelegramUpdate):
    """
    Handle Telegram webhook for DAARWIZZ agent.
    
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
        return await handle_telegram_webhook(DAARWIZZ_CONFIG, update)
    except Exception as e:
        logger.error(f"Error handling DAARWIZZ Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Legacy code - will be removed after testing
async def _old_telegram_webhook(update: TelegramUpdate):
    """Стара версія - використовується для тестування"""
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
        
        # Check for /ingest command
        text = update.message.get("text", "")
        if text and text.strip().startswith("/ingest"):
            session_id = f"telegram:{chat_id}"
            
            # Check if there's a document in the message
            document = update.message.get("document")
            if document:
                mime_type = document.get("mime_type", "")
                file_name = document.get("file_name", "")
                file_id = document.get("file_id")
                
                is_pdf = (
                    mime_type == "application/pdf" or
                    (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
                )
                
                if is_pdf and file_id:
                    try:
                        telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
                        file_path = await get_telegram_file_path(file_id)
                        if file_path:
                            file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
                            result = await ingest_document(
                                session_id=session_id,
                                doc_url=file_url,
                                file_name=file_name,
                                dao_id=dao_id,
                                user_id=f"tg:{user_id}"
                            )
                            
                            if result.success:
                                await send_telegram_message(
                                    chat_id,
                                    f"✅ **Документ імпортовано у RAG**\n\n"
                                    f"📊 Фрагментів: {result.ingested_chunks}\n"
                                    f"📁 DAO: {dao_id}\n\n"
                                    f"Тепер ти можеш задавати питання по цьому документу!"
                                )
                                return {"ok": True, "chunks_count": result.ingested_chunks}
                            else:
                                await send_telegram_message(chat_id, f"Вибач, не вдалося імпортувати: {result.error}")
                                return {"ok": False, "error": result.error}
                    except Exception as e:
                        logger.error(f"Ingest failed: {e}", exc_info=True)
                        await send_telegram_message(chat_id, "Вибач, не вдалося імпортувати документ.")
                        return {"ok": False, "error": "Ingest failed"}
            
            # Try to get last parsed doc_id from session context
            result = await ingest_document(
                session_id=session_id,
                dao_id=dao_id,
                user_id=f"tg:{user_id}"
            )
            
            if result.success:
                await send_telegram_message(
                    chat_id,
                    f"✅ **Документ імпортовано у RAG**\n\n"
                    f"📊 Фрагментів: {result.ingested_chunks}\n"
                    f"📁 DAO: {dao_id}\n\n"
                    f"Тепер ти можеш задавати питання по цьому документу!"
                )
                return {"ok": True, "chunks_count": result.ingested_chunks}
            else:
                await send_telegram_message(chat_id, "Спочатку надішли PDF-документ, а потім використай /ingest")
                return {"ok": False, "error": result.error}
        
        # Check if it's a document (PDF)
        document = update.message.get("document")
        if document:
            mime_type = document.get("mime_type", "")
            file_name = document.get("file_name", "")
            file_id = document.get("file_id")
            
            # Check if it's a PDF
            is_pdf = (
                mime_type == "application/pdf" or
                (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
            )
            
            if is_pdf and file_id:
                logger.info(f"PDF document from {username} (tg:{user_id}), file_id: {file_id}, file_name: {file_name}")
                
                try:
                    # Get file path from Telegram
                    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
                    file_path = await get_telegram_file_path(file_id)
                    if not file_path:
                        raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
                    
                    # Build file URL
                    file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
                    
                    # Use doc_service for parsing
                    session_id = f"telegram:{chat_id}"
                    result = await parse_document(
                        session_id=session_id,
                        doc_url=file_url,
                        file_name=file_name,
                        dao_id=dao_id,
                        user_id=f"tg:{user_id}",
                        output_mode="qa_pairs",
                        metadata={"username": username, "chat_id": chat_id}
                    )
                    
                    if not result.success:
                        await send_telegram_message(chat_id, f"Вибач, не вдалося обробити документ: {result.error}")
                        return {"ok": False, "error": result.error}
                    
                    # Format response for Telegram
                    answer_text = ""
                    if result.qa_pairs:
                        # Convert QAItem to dict for formatting
                        qa_list = [{"question": qa.question, "answer": qa.answer} for qa in result.qa_pairs]
                        answer_text = format_qa_response(qa_list)
                    elif result.markdown:
                        answer_text = format_markdown_response(result.markdown)
                    elif result.chunks_meta and result.chunks_meta.get("chunks"):
                        chunks = result.chunks_meta.get("chunks", [])
                        answer_text = format_chunks_response(chunks)
                    else:
                        answer_text = "✅ Документ успішно оброблено, але формат відповіді не розпізнано."
                    
                    # Add hint about /ingest command
                    if not answer_text.endswith("_"):
                        answer_text += "\n\n💡 _Використай /ingest для імпорту документа у RAG_"
                    
                    logger.info(f"PDF parsing result: {len(answer_text)} chars, doc_id={result.doc_id}")
                    
                    # Send response back to Telegram
                    await send_telegram_message(chat_id, answer_text)
                    
                    return {"ok": True, "agent": "parser", "mode": "doc_parse", "doc_id": result.doc_id}
                    
                except Exception as e:
                    logger.error(f"PDF processing failed: {e}", exc_info=True)
                    await send_telegram_message(chat_id, "Вибач, не вдалося обробити PDF-документ. Переконайся, що файл не пошкоджений.")
                    return {"ok": False, "error": "PDF processing failed"}
            elif document and not is_pdf:
                # Non-PDF document
                await send_telegram_message(chat_id, "Наразі підтримуються тільки PDF-документи. Інші формати (docx, zip, тощо) будуть додані пізніше.")
                return {"ok": False, "error": "Unsupported document type"}
        
        # Check if it's a photo
        photo = update.message.get("photo")
        if photo:
            # Telegram sends multiple sizes, get the largest one (last in array)
            photo_obj = photo[-1] if isinstance(photo, list) else photo
            file_id = photo_obj.get("file_id") if isinstance(photo_obj, dict) else None
            
            if file_id:
                logger.info(f"Photo from {username} (tg:{user_id}), file_id: {file_id}")
                
                try:
                    # Get file path from Telegram
                    telegram_token = os.getenv("TELEGRAM_BOT_TOKEN")
                    file_path = await get_telegram_file_path(file_id)
                    if not file_path:
                        raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
                    
                    # Build file URL
                    file_url = f"https://api.telegram.org/file/bot{telegram_token}/{file_path}"
                    
                    # Send to Router with specialist_vision_8b model (Swapper)
                    router_request = {
                        "message": f"Опиши це зображення детально: {file_url}",
                        "mode": "chat",
                        "agent": "daarwizz",
                        "metadata": {
                            "source": "telegram",
                            "dao_id": dao_id,
                            "user_id": f"tg:{user_id}",
                            "session_id": f"tg:{chat_id}:{dao_id}",
                            "username": username,
                            "chat_id": chat_id,
                            "file_id": file_id,
                            "file_url": file_url,
                            "has_image": True,
                        },
                        "context": {
                            "agent_name": DAARWIZZ_NAME,
                            "system_prompt": DAARWIZZ_SYSTEM_PROMPT,
                        },
                    }
                    
                    # Override LLM to use specialist_vision_8b for image understanding
                    router_request["metadata"]["use_llm"] = "specialist_vision_8b"
                    
                    # Send to Router
                    logger.info(f"Sending photo to Router with vision-8b: file_url={file_url[:50]}...")
                    response = await send_to_router(router_request)
                    
                    # Extract response
                    if isinstance(response, dict) and response.get("ok"):
                        answer_text = response.get("data", {}).get("text") or response.get("response", "")
                        
                        if answer_text:
                            # Photo processed successfully
                            await send_telegram_message(
                                chat_id,
                                f"✅ **Фото оброблено**\n\n{answer_text}"
                            )
                            
                            # Save to memory for context
                            await memory_client.save_chat_turn(
                                agent_id="daarwizz",
                                team_id=dao_id,
                                user_id=f"tg:{user_id}",
                                message=f"[Photo: {file_id}]",
                                response=answer_text,
                                channel_id=chat_id,
                                scope="short_term",
                                save_agent_response=not is_service_response(answer_text),
                                agent_metadata={"context": "photo"},
                            )
                            
                            return {"ok": True, "agent": "daarwizz", "model": "specialist_vision_8b"}
                        else:
                            await send_telegram_message(chat_id, "Фото оброблено, але не вдалося отримати опис.")
                            return {"ok": False, "error": "No description in response"}
                    else:
                        error_msg = response.get("error", "Unknown error") if isinstance(response, dict) else "Router error"
                        logger.error(f"Vision-8b error: {error_msg}")
                        await send_telegram_message(chat_id, f"Вибач, не вдалося обробити фото: {error_msg}")
                        return {"ok": False, "error": error_msg}
                    
                except Exception as e:
                    logger.error(f"Photo processing failed: {e}", exc_info=True)
                    await send_telegram_message(chat_id, "Вибач, не вдалося обробити фото. Переконайся, що Vision Encoder сервіс запущений.")
                    return {"ok": False, "error": "Photo processing failed"}
        
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
                stt_upload_url = _resolve_stt_upload_url()
                files = {"file": ("voice.ogg", audio_bytes, "audio/ogg")}
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    stt_resp = await client.post(stt_upload_url, files=files)
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
        
        # Check if there's a document context for follow-up questions
        session_id = f"telegram:{chat_id}"
        doc_context = await get_doc_context(session_id)
        
        # If there's a doc_id and the message looks like a question about the document
        if doc_context and doc_context.doc_id:
            # Check if it's a question (simple heuristic: contains question words or ends with ?)
            is_question = (
                "?" in text or
                any(word in text.lower() for word in ["що", "як", "чому", "коли", "де", "хто", "чи"])
            )
            
            if is_question:
                logger.info(f"Follow-up question detected for doc_id={doc_context.doc_id}")
                # Try RAG query first
                rag_result = await ask_about_document(
                    session_id=session_id,
                    question=text,
                    doc_id=doc_context.doc_id,
                    dao_id=dao_id or doc_context.dao_id,
                    user_id=f"tg:{user_id}"
                )
                
                if rag_result.success and rag_result.answer:
                    # Truncate if too long for Telegram
                    answer = rag_result.answer
                    if len(answer) > TELEGRAM_SAFE_LENGTH:
                        answer = answer[:TELEGRAM_SAFE_LENGTH] + "\n\n_... (відповідь обрізано)_"
                    
                    await send_telegram_message(chat_id, answer)
                    return {"ok": True, "agent": "parser", "mode": "rag_query"}
                # Fall through to regular chat if RAG query fails
        
        # Regular chat mode
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
            scope="short_term",
            save_agent_response=not is_service_response(answer_text),
            agent_metadata={"context": "legacy_daarwizz"},
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
            scope="short_term",
            save_agent_response=not is_service_response(answer_text),
            agent_metadata={"source": "discord"},
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

async def get_telegram_file_path(file_id: str, bot_token: str = None) -> Optional[str]:
    """Отримати шлях до файлу з Telegram API"""
    telegram_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
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


def format_qa_response(qa_pairs: list, max_pairs: int = 5) -> str:
    """Format Q&A pairs for Telegram with length limits"""
    if not qa_pairs:
        return "📋 Документ оброблено, але Q&A пари не знайдено."
    
    qa_text = "📋 **Зміст документа:**\n\n"
    displayed = 0
    
    for i, qa in enumerate(qa_pairs[:max_pairs], 1):
        question = qa.get('question', 'Питання')
        answer = qa.get('answer', 'Відповідь')
        
        # Truncate answer if too long
        if len(answer) > 500:
            answer = answer[:500] + "..."
        
        pair_text = f"**{i}. {question}**\n{answer}\n\n"
        
        # Check if adding this pair would exceed limit
        if len(qa_text) + len(pair_text) > TELEGRAM_SAFE_LENGTH:
            break
        
        qa_text += pair_text
        displayed += 1
    
    if len(qa_pairs) > displayed:
        remaining = len(qa_pairs) - displayed
        qa_text += f"_... та ще {remaining} {'питань' if remaining > 1 else 'питання'}_"
    
    return qa_text


def format_markdown_response(markdown: str) -> str:
    """Format markdown response with length limits"""
    if len(markdown) <= TELEGRAM_SAFE_LENGTH:
        return f"📄 **Розпарсений документ:**\n\n{markdown}"
    
    # Truncate and add summary
    truncated = markdown[:TELEGRAM_SAFE_LENGTH]
    return f"📄 **Розпарсений документ:**\n\n{truncated}\n\n_... (текст обрізано, використай /ingest для повного імпорту)_"


def format_chunks_response(chunks: list) -> str:
    """Format chunks summary for Telegram"""
    if not chunks:
        return "📄 Документ розпарсено, але фрагменти не знайдено."
    
    answer_text = f"📄 **Документ розпарсено** ({len(chunks)} фрагментів)\n\n"
    answer_text += "**Перші фрагменти:**\n\n"
    
    for i, chunk in enumerate(chunks[:3], 1):
        text = chunk.get('text', '')[:200]
        answer_text += f"{i}. {text}...\n\n"
    
    if len(chunks) > 3:
        answer_text += f"_... та ще {len(chunks) - 3} фрагментів_"
    
    return answer_text


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
        # "parse_mode": "Markdown",  # Removed to prevent 400 errors
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
        return await handle_telegram_webhook(HELION_CONFIG, update)
    except Exception as e:
        logger.error(f"Error handling Helion Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# GREENFOOD Telegram Webhook
# ========================================

@router.post("/greenfood/telegram/webhook")
async def greenfood_telegram_webhook(update: TelegramUpdate):
    """
    Handle Telegram webhook for GREENFOOD agent.
    """
    try:
        return await handle_telegram_webhook(GREENFOOD_CONFIG, update)
    except Exception as e:
        logger.error(f"Error handling GREENFOOD Telegram webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Legacy code - will be removed after testing
async def _old_helion_telegram_webhook(update: TelegramUpdate):
    """Стара версія - використовується для тестування"""
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
        
        # Check for /ingest command
        text = update.message.get("text", "")
        if text and text.strip().startswith("/ingest"):
            session_id = f"telegram:{chat_id}"
            
            # Check if there's a document in the message
            document = update.message.get("document")
            if document:
                mime_type = document.get("mime_type", "")
                file_name = document.get("file_name", "")
                file_id = document.get("file_id")
                
                is_pdf = (
                    mime_type == "application/pdf" or
                    (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
                )
                
                if is_pdf and file_id:
                    try:
                        helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                        file_path = await get_telegram_file_path(file_id)
                        if file_path:
                            file_url = f"https://api.telegram.org/file/bot{helion_token}/{file_path}"
                            result = await ingest_document(
                                session_id=session_id,
                                doc_url=file_url,
                                file_name=file_name,
                                dao_id=dao_id,
                                user_id=f"tg:{user_id}"
                            )
                            
                            if result.success:
                                await send_telegram_message(
                                    chat_id,
                                    f"✅ **Документ імпортовано у RAG**\n\n"
                                    f"📊 Фрагментів: {result.ingested_chunks}\n"
                                    f"📁 DAO: {dao_id}\n\n"
                                    f"Тепер ти можеш задавати питання по цьому документу!",
                                    helion_token
                                )
                                return {"ok": True, "chunks_count": result.ingested_chunks}
                            else:
                                await send_telegram_message(chat_id, f"Вибач, не вдалося імпортувати: {result.error}", helion_token)
                                return {"ok": False, "error": result.error}
                    except Exception as e:
                        logger.error(f"Helion: Ingest failed: {e}", exc_info=True)
                        await send_telegram_message(chat_id, "Вибач, не вдалося імпортувати документ.", helion_token)
                        return {"ok": False, "error": "Ingest failed"}
            
            # Try to get last parsed doc_id from session context
            helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
            result = await ingest_document(
                session_id=session_id,
                dao_id=dao_id,
                user_id=f"tg:{user_id}"
            )
            
            if result.success:
                await send_telegram_message(
                    chat_id,
                    f"✅ **Документ імпортовано у RAG**\n\n"
                    f"📊 Фрагментів: {result.ingested_chunks}\n"
                    f"📁 DAO: {dao_id}\n\n"
                    f"Тепер ти можеш задавати питання по цьому документу!",
                    helion_token
                )
                return {"ok": True, "chunks_count": result.ingested_chunks}
            else:
                await send_telegram_message(chat_id, "Спочатку надішли PDF-документ, а потім використай /ingest", helion_token)
                return {"ok": False, "error": result.error}
        
        # Check if it's a document (PDF)
        document = update.message.get("document")
        if document:
            mime_type = document.get("mime_type", "")
            file_name = document.get("file_name", "")
            file_id = document.get("file_id")
            
            is_pdf = (
                mime_type == "application/pdf" or
                (mime_type.startswith("application/") and file_name.lower().endswith(".pdf"))
            )
            
            if is_pdf and file_id:
                logger.info(f"Helion: PDF document from {username} (tg:{user_id}), file_id: {file_id}, file_name: {file_name}")
                
                try:
                    helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                    file_path = await get_telegram_file_path(file_id)
                    if not file_path:
                        raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
                    
                    file_url = f"https://api.telegram.org/file/bot{helion_token}/{file_path}"
                    
                    session_id = f"telegram:{chat_id}"
                    result = await parse_document(
                        session_id=session_id,
                        doc_url=file_url,
                        file_name=file_name,
                        dao_id=dao_id,
                        user_id=f"tg:{user_id}",
                        output_mode="qa_pairs",
                        metadata={"username": username, "chat_id": chat_id}
                    )
                    
                    if not result.success:
                        await send_telegram_message(chat_id, f"Вибач, не вдалося обробити документ: {result.error}", helion_token)
                        return {"ok": False, "error": result.error}
                    
                    # Format response for Telegram
                    answer_text = ""
                    if result.qa_pairs:
                        qa_list = [{"question": qa.question, "answer": qa.answer} for qa in result.qa_pairs]
                        answer_text = format_qa_response(qa_list)
                    elif result.markdown:
                        answer_text = format_markdown_response(result.markdown)
                    elif result.chunks_meta and result.chunks_meta.get("chunks"):
                        chunks = result.chunks_meta.get("chunks", [])
                        answer_text = format_chunks_response(chunks)
                    else:
                        answer_text = "✅ Документ успішно оброблено, але формат відповіді не розпізнано."
                    
                    if not answer_text.endswith("_"):
                        answer_text += "\n\n💡 _Використай /ingest для імпорту документа у RAG_"
                    
                    logger.info(f"Helion: PDF parsing result: {len(answer_text)} chars, doc_id={result.doc_id}")
                    await send_telegram_message(chat_id, answer_text, helion_token)
                    return {"ok": True, "agent": "parser", "mode": "doc_parse", "doc_id": result.doc_id}
                    
                except Exception as e:
                    logger.error(f"Helion: PDF processing failed: {e}", exc_info=True)
                    await send_telegram_message(chat_id, "Вибач, не вдалося обробити PDF-документ. Переконайся, що файл не пошкоджений.", helion_token)
                    return {"ok": False, "error": "PDF processing failed"}
            elif document and not is_pdf:
                helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                await send_telegram_message(chat_id, "Наразі підтримуються тільки PDF-документи. Інші формати (docx, zip, тощо) будуть додані пізніше.", helion_token)
                return {"ok": False, "error": "Unsupported document type"}
        
        # Check if it's a photo
        photo = update.message.get("photo")
        if photo:
            # Telegram sends multiple sizes, get the largest one (last in array)
            photo_obj = photo[-1] if isinstance(photo, list) else photo
            file_id = photo_obj.get("file_id") if isinstance(photo_obj, dict) else None
            
            if file_id:
                logger.info(f"Helion: Photo from {username} (tg:{user_id}), file_id: {file_id}")
                
                try:
                    # Get file path from Telegram
                    helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                    file_path = await get_telegram_file_path(file_id, helion_token)
                    if not file_path:
                        raise HTTPException(status_code=400, detail="Failed to get file from Telegram")
                    
                    # Build file URL
                    file_url = f"https://api.telegram.org/file/bot{helion_token}/{file_path}"
                    
                    # Send to Router with specialist_vision_8b model (Swapper)
                    router_request = {
                        "message": f"Опиши це зображення детально, зосередься на технічних деталях EcoMiner/BioMiner якщо вони є: {file_url}",
                        "mode": "chat",
                        "agent": "helion",
                        "metadata": {
                            "source": "telegram",
                            "dao_id": dao_id,
                            "user_id": f"tg:{user_id}",
                            "session_id": f"tg:{chat_id}:{dao_id}",
                            "username": username,
                            "chat_id": chat_id,
                            "file_id": file_id,
                            "file_url": file_url,
                            "has_image": True,
                        },
                        "context": {
                            "agent_name": HELION_NAME,
                            "system_prompt": HELION_SYSTEM_PROMPT,
                        },
                    }
                    
                    # Override LLM to use specialist_vision_8b for image understanding
                    router_request["metadata"]["use_llm"] = "specialist_vision_8b"
                    
                    # Send to Router
                    logger.info(f"Helion: Sending photo to Router with vision-8b: file_url={file_url[:50]}...")
                    response = await send_to_router(router_request)
                    
                    # Extract response
                    if isinstance(response, dict) and response.get("ok"):
                        answer_text = response.get("data", {}).get("text") or response.get("response", "")
                        
                        if answer_text:
                            # Photo processed successfully
                            await send_telegram_message(
                                chat_id,
                                f"✅ **Фото оброблено**\n\n{answer_text}",
                                helion_token
                            )
                            
                            # Save to memory for context
                            await memory_client.save_chat_turn(
                                agent_id="helion",
                                team_id=dao_id,
                                user_id=f"tg:{user_id}",
                                message=f"[Photo: {file_id}]",
                                response=answer_text,
                                channel_id=chat_id,
                                scope="short_term",
                                save_agent_response=not is_service_response(answer_text),
                                agent_metadata={"context": "photo"},
                            )
                            
                            return {"ok": True, "agent": "helion", "model": "specialist_vision_8b"}
                        else:
                            await send_telegram_message(chat_id, "Фото оброблено, але не вдалося отримати опис.", helion_token)
                            return {"ok": False, "error": "No description in response"}
                    else:
                        error_msg = response.get("error", "Unknown error") if isinstance(response, dict) else "Router error"
                        logger.error(f"Helion: Vision-8b error: {error_msg}")
                        await send_telegram_message(chat_id, f"Вибач, не вдалося обробити фото: {error_msg}", helion_token)
                        return {"ok": False, "error": error_msg}
                    
                except Exception as e:
                    logger.error(f"Helion: Photo processing failed: {e}", exc_info=True)
                    helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                    await send_telegram_message(chat_id, "Вибач, не вдалося обробити фото. Переконайся, що Swapper Service з vision-8b моделлю запущений.", helion_token)
                    return {"ok": False, "error": "Photo processing failed"}
        
        # Get message text
        text = update.message.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text in message")
        
        logger.info(f"Helion Telegram message from {username} (tg:{user_id}) in chat {chat_id}: {text[:50]}")
        mentioned_bots = extract_bot_mentions(text)
        needs_complex_reasoning = requires_complex_reasoning(text)
        
        # Check if there's a document context for follow-up questions
        session_id = f"telegram:{chat_id}"
        doc_context = await get_doc_context(session_id)
        
        # If there's a doc_id and the message looks like a question about the document
        if doc_context and doc_context.doc_id:
            # Check if it's a question (simple heuristic: contains question words or ends with ?)
            is_question = (
                "?" in text or
                any(word in text.lower() for word in ["що", "як", "чому", "коли", "де", "хто", "чи"])
            )
            
            if is_question:
                logger.info(f"Helion: Follow-up question detected for doc_id={doc_context.doc_id}")
                # Try RAG query first
                rag_result = await ask_about_document(
                    session_id=session_id,
                    question=text,
                    doc_id=doc_context.doc_id,
                    dao_id=dao_id or doc_context.dao_id,
                    user_id=f"tg:{user_id}"
                )
                
                if rag_result.success and rag_result.answer:
                    # Truncate if too long for Telegram
                    answer = rag_result.answer
                    if len(answer) > TELEGRAM_SAFE_LENGTH:
                        answer = answer[:TELEGRAM_SAFE_LENGTH] + "\n\n_... (відповідь обрізано)_"
                    
                    helion_token = os.getenv("HELION_TELEGRAM_BOT_TOKEN")
                    await send_telegram_message(chat_id, answer, helion_token)
                    return {"ok": True, "agent": "parser", "mode": "rag_query"}
                # Fall through to regular chat if RAG query fails
        
        # Regular chat mode
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
                "mentioned_bots": mentioned_bots,
                "requires_complex_reasoning": needs_complex_reasoning,
            },
            "context": {
                "agent_name": HELION_NAME,
                "system_prompt": HELION_SYSTEM_PROMPT,
                "memory": memory_context,
                # RBAC context will be injected by Router
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
            scope="short_term",
            save_agent_response=not is_service_response(answer_text),
            agent_metadata={
                "context": "helion",
                "mentioned_bots": mentioned_bots,
                "requires_complex_reasoning": needs_complex_reasoning,
            },
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
    agents_info = {}
    for agent_id, config in AGENT_REGISTRY.items():
        agents_info[agent_id] = {
            "name": config.name,
            "prompt_loaded": len(config.system_prompt) > 0,
            "telegram_token_configured": config.get_telegram_token() is not None
        }
    
    return {
        "status": "healthy",
        "agents": agents_info,
        "agents_count": len(AGENT_REGISTRY),
        "timestamp": datetime.utcnow().isoformat(),
    }
