"""
STT Service (Speech-to-Text) для DAGI Router
Використовує Whisper для розпізнавання голосу
"""

import os
import uuid
import subprocess
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
    description="Speech-to-Text service using Whisper",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")  # base, small, medium
TEMP_DIR = Path("/tmp/stt")
TEMP_DIR.mkdir(exist_ok=True)


class STTResponse(BaseModel):
    text: str
    language: Optional[str] = None
    duration: Optional[float] = None


def convert_audio_to_wav(input_path: str, output_path: str) -> bool:
    """Конвертувати аудіо в WAV 16kHz mono"""
    try:
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-ar", "16000",  # Sample rate
            "-ac", "1",      # Mono
            "-f", "wav",
            output_path
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr}")
            return False
        return True
    except Exception as e:
        logger.error(f"Audio conversion failed: {e}")
        return False


def transcribe_with_whisper(audio_path: str) -> tuple[str, Optional[str], Optional[float]]:
    """
    Розпізнати мову з аудіо файлу
    Повертає (text, language, duration)
    """
    try:
        # Варіант 1: faster-whisper (рекомендовано)
        try:
            from faster_whisper import WhisperModel
            model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
            segments, info = model.transcribe(audio_path, language="uk", beam_size=5)
            
            text_parts = []
            for segment in segments:
                text_parts.append(segment.text)
            
            text = " ".join(text_parts).strip()
            language = info.language
            duration = sum(segment.end - segment.start for segment in segments)
            
            return text, language, duration
        except ImportError:
            logger.warning("faster-whisper not installed, trying whisper CLI")
        
        # Варіант 2: whisper CLI (fallback)
        try:
            cmd = ["whisper", audio_path, "--model", WHISPER_MODEL, "--language", "uk", "--output_format", "txt"]
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0:
                # Whisper CLI створює .txt файл з тим самим ім'ям
                txt_path = audio_path.replace(".wav", ".txt")
                if Path(txt_path).exists():
                    text = Path(txt_path).read_text(encoding="utf-8").strip()
                    return text, "uk", None
        except FileNotFoundError:
            logger.warning("whisper CLI not found")
        
        # Варіант 3: OpenAI Whisper API (якщо є API key)
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            try:
                import openai
                client = openai.OpenAI(api_key=openai_api_key)
                with open(audio_path, "rb") as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language="uk"
                    )
                return transcript.text, transcript.language, None
            except Exception as e:
                logger.warning(f"OpenAI Whisper API failed: {e}")
        
        raise Exception("No Whisper implementation available")
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise


@app.post("/stt", response_model=STTResponse)
async def stt(file: UploadFile = File(...)):
    """
    Розпізнати мову з аудіо файлу
    
    Підтримує формати: ogg, mp3, wav, m4a, webm
    """
    tmp_id = str(uuid.uuid4())
    tmp_input = TEMP_DIR / f"{tmp_id}_input.{file.filename.split('.')[-1] if '.' in file.filename else 'ogg'}"
    tmp_wav = TEMP_DIR / f"{tmp_id}.wav"
    
    try:
        # Зберігаємо вхідний файл
        content = await file.read()
        tmp_input.write_bytes(content)
        logger.info(f"Received audio file: {file.filename}, size: {len(content)} bytes")
        
        # Конвертуємо в WAV 16kHz
        if not convert_audio_to_wav(str(tmp_input), str(tmp_wav)):
            raise HTTPException(status_code=400, detail="Audio conversion failed")
        
        # Розпізнаємо мову
        text, language, duration = transcribe_with_whisper(str(tmp_wav))
        
        logger.info(f"Transcribed: {text[:100]}... (lang: {language})")
        
        return STTResponse(
            text=text,
            language=language,
            duration=duration
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"STT error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"STT failed: {str(e)}")
    finally:
        # Очищаємо тимчасові файли
        for path in [tmp_input, tmp_wav]:
            if path.exists():
                try:
                    path.unlink()
                except:
                    pass


@app.get("/health")
async def health():
    """Health check"""
    return {
        "status": "ok",
        "service": "stt-service",
        "model": WHISPER_MODEL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000)

