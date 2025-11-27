"""
STT Service - Speech-to-Text для DAARION
Конвертує аудіо файли в текст використовуючи Whisper AI
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
import tempfile
import base64
from typing import Optional
import subprocess
import json

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="STT Service",
    description="Speech-to-Text Service для DAARION (Whisper AI)",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфігурація
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # tiny, base, small, medium, large
LANGUAGE = os.getenv("WHISPER_LANGUAGE", "uk")  # ukrainian

class STTRequest(BaseModel):
    audio: str  # base64 encoded audio
    language: Optional[str] = "uk"
    model: Optional[str] = "base"

class STTResponse(BaseModel):
    text: str
    language: str
    duration: float
    model: str
    confidence: Optional[float] = None

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "STT Service",
        "status": "running",
        "model": WHISPER_MODEL,
        "language": LANGUAGE,
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        # Перевірити чи Whisper доступний
        result = subprocess.run(
            ["whisper", "--help"],
            capture_output=True,
            text=True,
            timeout=5
        )
        whisper_available = result.returncode == 0
        
        return {
            "status": "healthy" if whisper_available else "degraded",
            "whisper": "available" if whisper_available else "unavailable",
            "model": WHISPER_MODEL
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@app.post("/api/stt", response_model=STTResponse)
async def speech_to_text(request: STTRequest):
    """
    Конвертує аудіо в текст
    
    Body:
    {
        "audio": "data:audio/webm;base64,...",
        "language": "uk",
        "model": "base"
    }
    """
    try:
        logger.info("📥 Received STT request")
        
        # Декодувати base64 audio
        audio_data = request.audio
        if ',' in audio_data:
            audio_data = audio_data.split(',')[1]
        
        audio_bytes = base64.b64decode(audio_data)
        logger.info(f"📊 Audio size: {len(audio_bytes)} bytes")
        
        # Зберегти у тимчасовий файл
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            audio_path = temp_audio.name
        
        try:
            # Запустити Whisper
            model = request.model or WHISPER_MODEL
            language = request.language or LANGUAGE
            
            logger.info(f"🎤 Running Whisper (model={model}, language={language})")
            
            # Whisper CLI команда
            cmd = [
                "whisper",
                audio_path,
                "--model", model,
                "--language", language,
                "--output_format", "json",
                "--output_dir", tempfile.gettempdir()
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or "Whisper failed"
                logger.error(f"❌ Whisper error: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Whisper error: {error_msg}")
            
            # Прочитати результат
            json_path = audio_path.replace('.webm', '.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                whisper_result = json.load(f)
            
            text = whisper_result.get('text', '').strip()
            
            # Очистити тимчасові файли
            os.unlink(audio_path)
            if os.path.exists(json_path):
                os.unlink(json_path)
            
            logger.info(f"✅ Transcribed: '{text[:50]}...'")
            
            return STTResponse(
                text=text,
                language=language,
                duration=0.0,  # TODO: отримати з Whisper
                model=model,
                confidence=None
            )
            
        except subprocess.TimeoutExpired:
            os.unlink(audio_path)
            raise HTTPException(status_code=408, detail="Whisper timeout")
        except Exception as e:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
            raise
            
    except Exception as e:
        logger.error(f"❌ STT error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stt/upload")
async def stt_upload(file: UploadFile = File(...)):
    """
    Конвертує завантажений аудіо файл в текст
    
    Form-data:
    - file: audio file (webm, mp3, wav, m4a)
    """
    try:
        logger.info(f"📥 Received file upload: {file.filename}")
        
        # Зберегти у тимчасовий файл
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(file.filename)[1], delete=False) as temp_audio:
            content = await file.read()
            temp_audio.write(content)
            audio_path = temp_audio.name
        
        logger.info(f"📊 File size: {len(content)} bytes")
        
        try:
            # Запустити Whisper
            cmd = [
                "whisper",
                audio_path,
                "--model", WHISPER_MODEL,
                "--language", LANGUAGE,
                "--output_format", "json",
                "--output_dir", tempfile.gettempdir()
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or "Whisper failed"
                logger.error(f"❌ Whisper error: {error_msg}")
                raise HTTPException(status_code=500, detail=f"Whisper error: {error_msg}")
            
            # Прочитати результат
            json_path = audio_path.replace(os.path.splitext(audio_path)[1], '.json')
            with open(json_path, 'r', encoding='utf-8') as f:
                whisper_result = json.load(f)
            
            text = whisper_result.get('text', '').strip()
            
            # Очистити тимчасові файли
            os.unlink(audio_path)
            if os.path.exists(json_path):
                os.unlink(json_path)
            
            logger.info(f"✅ Transcribed: '{text[:50]}...'")
            
            return {
                "text": text,
                "filename": file.filename,
                "language": LANGUAGE,
                "model": WHISPER_MODEL
            }
            
        except Exception as e:
            if os.path.exists(audio_path):
                os.unlink(audio_path)
            raise
            
    except Exception as e:
        logger.error(f"❌ Upload STT error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8895)

