"""
Voice and Document Handler for Telegram Gateway
Handles STT (Speech-to-Text) and document processing
"""
import logging
import httpx
from aiogram.types import Message

logger = logging.getLogger(__name__)

STT_SERVICE_URL = "http://dagi-stt:9000/stt"
PARSER_SERVICE_URL = "http://dagi-parser:9400"


async def handle_voice_message(message: Message, bot_token: str) -> str:
    """
    Process voice/audio message through STT
    
    Args:
        message: Telegram message with voice/audio
        bot_token: Bot token for file download
        
    Returns:
        Transcribed text
    """
    # Get file_id from different message types
    file_id = None
    if message.voice:
        file_id = message.voice.file_id
        duration = message.voice.duration
    elif message.audio:
        file_id = message.audio.file_id
        duration = message.audio.duration
    elif message.video_note:
        file_id = message.video_note.file_id
        duration = message.video_note.duration
    
    if not file_id:
        logger.error("No file_id found in voice message")
        return ""
    
    logger.info(f"🎤 Processing voice: file_id={file_id}, duration={duration}s")
    
    try:
        # Get file path from Telegram
        from aiogram import Bot
        bot = Bot(token=bot_token)
        file = await bot.get_file(file_id)
        file_path = file.file_path
        
        # Download file URL (через офіційний Telegram API для файлів)
        file_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        
        logger.info(f"📥 Downloading audio: {file_url}")
        
        # Download audio file
        async with httpx.AsyncClient(timeout=30.0) as client:
            audio_response = await client.get(file_url)
            audio_response.raise_for_status()
            audio_bytes = audio_response.content
        
        logger.info(f"✅ Downloaded {len(audio_bytes)} bytes")
        
        # Send to STT service
        logger.info(f"🔊 Sending to STT: {STT_SERVICE_URL}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"file": ("audio.ogg", audio_bytes, "audio/ogg")}
            stt_response = await client.post(STT_SERVICE_URL, files=files)
            stt_response.raise_for_status()
            result = stt_response.json()
        
        transcribed_text = result.get("text", "")
        logger.info(f"📝 Transcribed: {transcribed_text[:100]}...")
        
        return transcribed_text
        
    except httpx.HTTPError as e:
        logger.error(f"❌ HTTP error in voice processing: {e}")
        return ""
    except Exception as e:
        logger.error(f"❌ Error in voice processing: {e}", exc_info=True)
        return ""


async def handle_document_message(message: Message, bot_token: str) -> dict:
    """
    Process document (PDF) message through Parser
    
    Args:
        message: Telegram message with document
        bot_token: Bot token for file download
        
    Returns:
        Dict with document info or empty dict
    """
    if not message.document:
        return {}
    
    file_name = message.document.file_name or "document"
    mime_type = message.document.mime_type
    file_id = message.document.file_id
    file_size = message.document.file_size
    
    # Check if it's a PDF
    is_pdf = mime_type == "application/pdf" or file_name.lower().endswith(".pdf")
    
    if not is_pdf:
        logger.info(f"⏭️ Skipping non-PDF document: {file_name} ({mime_type})")
        return {}
    
    logger.info(f"📄 Processing PDF: {file_name}, size={file_size} bytes")
    
    try:
        # Get file path from Telegram
        from aiogram import Bot
        bot = Bot(token=bot_token)
        file = await bot.get_file(file_id)
        file_path = file.file_path
        
        # Download file URL (через офіційний Telegram API для файлів)
        file_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
        
        logger.info(f"📥 PDF URL: {file_url}")
        
        # Return document info (processing will happen through Router)
        return {
            "file_url": file_url,
            "file_name": file_name,
            "file_size": file_size,
            "mime_type": mime_type,
            "file_id": file_id,
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing document: {e}", exc_info=True)
        return {}

