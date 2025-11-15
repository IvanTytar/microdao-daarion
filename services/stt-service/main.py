"""
STT Service (Speech-to-Text) для DAGI Router
Використовує qwen3_asr_toolkit для розпізнавання голосу
"""

import os
import uuid
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="STT Service",
    description="Speech-to-Text service using Qwen3 ASR Toolkit",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
TEMP_DIR = Path("/tmp/stt")
TEMP_DIR.mkdir(exist_ok=True)

# Initialize Qwen3 ASR Toolkit
try:
    from qwen3_asr_toolkit import transcribe_audio
    ASR_AVAILABLE = True
    logger.info("qwen3_asr_toolkit loaded successfully")
except ImportError:
    ASR_AVAILABLE = False
    logger.warning("qwen3_asr_toolkit not available, install with: pip install qwen3-asr-toolkit")


class STTResponse(BaseModel):
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None


def transcribe_with_qwen(audio_path: str) -> tuple[str, Optional[str], Optional[float]]:
    """
    Розпізнати мову з аудіо файлу через qwen3_asr_toolkit
    Повертає (text, language, duration)
    """
    if not ASR_AVAILABLE:
        raise ImportError("qwen3_asr_toolkit not installed. Install with: pip install qwen3-asr-toolkit")
    
    if not DASHSCOPE_API_KEY:
        raise ValueError("DASHSCOPE_API_KEY environment variable not set")
    
    try:
        # qwen3_asr_toolkit автоматично обробляє різні формати аудіо
        # та виконує необхідні конвертації
        transcript = transcribe_audio(audio_path)
        
        # transcribe_audio повертає текст
        # Можна також отримати додаткову інформацію, якщо API підтримує
        text = transcript.strip() if isinstance(transcript, str) else str(transcript).strip()
        
        # Для української мови встановлюємо language="uk"
        # qwen3_asr_toolkit може автоматично визначати мову
        language = "uk"  # Можна змінити на автоматичне визначення
        
        # Duration можна отримати з аудіо файлу, якщо потрібно
        # Поки що повертаємо None
        duration = None
        
        return text, language, duration
        
    except Exception as e:
        logger.error(f"Qwen3 ASR transcription failed: {e}", exc_info=True)
        raise


@app.post("/stt", response_model=STTResponse)
async def stt(file: UploadFile = File(...)):
    """
    Розпізнати мову з аудіо файлу через qwen3_asr_toolkit
    
    Підтримує формати: ogg, mp3, wav, m4a, webm, flac
    qwen3_asr_toolkit автоматично обробляє конвертацію
    """
    if not ASR_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="qwen3_asr_toolkit not available. Install with: pip install qwen3-asr-toolkit"
        )
    
    if not DASHSCOPE_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="DASHSCOPE_API_KEY not configured"
        )
    
    tmp_id = str(uuid.uuid4())
    # Визначаємо розширення файлу
    file_ext = "ogg"
    if file.filename and "." in file.filename:
        file_ext = file.filename.split(".")[-1].lower()
    
    tmp_input = TEMP_DIR / f"{tmp_id}.{file_ext}"
    
    try:
        # Зберігаємо вхідний файл
        content = await file.read()
        tmp_input.write_bytes(content)
        logger.info(f"Received audio file: {file.filename}, size: {len(content)} bytes, format: {file_ext}")
        
        # qwen3_asr_toolkit автоматично обробляє різні формати
        # та виконує необхідні конвертації всередині
        text, language, duration = transcribe_with_qwen(str(tmp_input))
        
        logger.info(f"Transcribed: {text[:100]}... (lang: {language})")
        
        return STTResponse(
            text=text,
            language=language,
            duration=duration
        )
        
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"STT configuration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except ImportError as e:
        logger.error(f"STT import error: {e}")
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error(f"STT error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
    finally:
        # Очищаємо тимчасові файли
        if tmp_input.exists():
            try:
                tmp_input.unlink()
            except Exception as e:
                logger.warning(f"Failed to delete temp file {tmp_input}: {e}")


@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok" if ASR_AVAILABLE else "degraded",
        "service": "stt-service",
        "engine": "qwen3_asr_toolkit",
        "asr_available": ASR_AVAILABLE,
        "api_key_configured": DASHSCOPE_API_KEY is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)

