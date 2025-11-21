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
                            await send_telegram_message(chat_id, "📥 Імпортую документ у RAG...")
                            
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
                    
                    # Send "Processing..." message
                    await send_telegram_message(chat_id, "📄 Обробляю PDF-документ... Це може зайняти кілька секунд.")
                    
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
                                scope="short_term"
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
                            await send_telegram_message(chat_id, "📥 Імпортую документ у RAG...", helion_token)
                            
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
                    await send_telegram_message(chat_id, "📄 Обробляю PDF-документ... Це може зайняти кілька секунд.", helion_token)
                    
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
                                scope="short_term"
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
