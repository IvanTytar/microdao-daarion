"""
OCR Service - Optical Character Recognition для DAARION
Витягує текст з зображень використовуючи Tesseract OCR + EasyOCR
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
import tempfile
import base64
from typing import Optional, List
import io
from PIL import Image
import numpy as np

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OCR Service",
    description="Optical Character Recognition для DAARION (Tesseract + EasyOCR)",
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

# Lazy import OCR engines
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("⚠️ Tesseract not available")

try:
    import easyocr
    EASYOCR_AVAILABLE = True
    # Ініціалізувати EasyOCR reader (lazy)
    _easyocr_reader = None
except ImportError:
    EASYOCR_AVAILABLE = False
    logger.warning("⚠️ EasyOCR not available")

def get_easyocr_reader():
    """Lazy initialization of EasyOCR reader"""
    global _easyocr_reader
    if _easyocr_reader is None and EASYOCR_AVAILABLE:
        _easyocr_reader = easyocr.Reader(['uk', 'en', 'ru'], gpu=True)
    return _easyocr_reader

# Конфігурація
OCR_ENGINE = os.getenv("OCR_ENGINE", "easyocr")  # tesseract, easyocr, both
LANGUAGES = os.getenv("OCR_LANGUAGES", "ukr+eng").split('+')

class OCRRequest(BaseModel):
    image: str  # base64 encoded image
    engine: Optional[str] = "easyocr"  # tesseract, easyocr, both
    languages: Optional[List[str]] = ["uk", "en"]

class OCRResponse(BaseModel):
    text: str
    confidence: Optional[float] = None
    engine: str
    languages: List[str]
    bounding_boxes: Optional[List[dict]] = None

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "OCR Service",
        "status": "running",
        "engines": {
            "tesseract": TESSERACT_AVAILABLE,
            "easyocr": EASYOCR_AVAILABLE
        },
        "default_engine": OCR_ENGINE,
        "languages": LANGUAGES,
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if (TESSERACT_AVAILABLE or EASYOCR_AVAILABLE) else "degraded",
        "tesseract": "available" if TESSERACT_AVAILABLE else "unavailable",
        "easyocr": "available" if EASYOCR_AVAILABLE else "unavailable",
        "gpu": torch.cuda.is_available() if EASYOCR_AVAILABLE else False
    }

def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Попередня обробка зображення для кращого OCR
    """
    # Конвертувати в RGB якщо потрібно
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Збільшити контраст (опціонально)
    from PIL import ImageEnhance
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    
    return img

def ocr_tesseract(img: Image.Image, languages: List[str]) -> dict:
    """
    OCR через Tesseract
    """
    if not TESSERACT_AVAILABLE:
        raise HTTPException(status_code=503, detail="Tesseract not available")
    
    # Мапінг мов
    lang_map = {
        'uk': 'ukr',
        'en': 'eng',
        'ru': 'rus',
        'pl': 'pol',
        'de': 'deu',
        'fr': 'fra'
    }
    
    tesseract_langs = '+'.join([lang_map.get(lang, lang) for lang in languages])
    
    # Витягти текст
    text = pytesseract.image_to_string(img, lang=tesseract_langs)
    
    # Отримати confidence
    data = pytesseract.image_to_data(img, lang=tesseract_langs, output_type=pytesseract.Output.DICT)
    confidences = [int(conf) for conf in data['conf'] if conf != '-1']
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    return {
        'text': text.strip(),
        'confidence': avg_confidence / 100.0,
        'engine': 'tesseract'
    }

def ocr_easyocr(img: Image.Image, languages: List[str]) -> dict:
    """
    OCR через EasyOCR
    """
    if not EASYOCR_AVAILABLE:
        raise HTTPException(status_code=503, detail="EasyOCR not available")
    
    reader = get_easyocr_reader()
    
    # Конвертувати PIL Image в numpy array
    img_array = np.array(img)
    
    # Витягти текст
    results = reader.readtext(img_array, detail=1)
    
    # Зібрати текст та bounding boxes
    text_parts = []
    bounding_boxes = []
    confidences = []
    
    for bbox, text, conf in results:
        text_parts.append(text)
        bounding_boxes.append({
            'text': text,
            'bbox': bbox,
            'confidence': conf
        })
        confidences.append(conf)
    
    full_text = ' '.join(text_parts)
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0
    
    return {
        'text': full_text.strip(),
        'confidence': avg_confidence,
        'engine': 'easyocr',
        'bounding_boxes': bounding_boxes
    }

@app.post("/api/ocr", response_model=OCRResponse)
async def extract_text(request: OCRRequest):
    """
    Витягує текст з зображення
    
    Body:
    {
        "image": "data:image/png;base64,...",
        "engine": "easyocr",
        "languages": ["uk", "en"]
    }
    """
    try:
        logger.info("📥 Received OCR request")
        
        # Декодувати base64 image
        image_data = request.image
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        img_bytes = base64.b64decode(image_data)
        img = Image.open(io.BytesIO(img_bytes))
        
        logger.info(f"📊 Image size: {img.size}, mode: {img.mode}")
        
        # Попередня обробка
        img = preprocess_image(img)
        
        # Вибрати OCR engine
        engine = request.engine or OCR_ENGINE
        languages = request.languages or ['uk', 'en']
        
        result = None
        
        if engine == 'tesseract':
            result = ocr_tesseract(img, languages)
        elif engine == 'easyocr':
            result = ocr_easyocr(img, languages)
        elif engine == 'both':
            # Спробувати обидва та вибрати кращий результат
            try:
                result_tesseract = ocr_tesseract(img, languages)
            except:
                result_tesseract = None
            
            try:
                result_easyocr = ocr_easyocr(img, languages)
            except:
                result_easyocr = None
            
            # Вибрати результат з більшою confidence
            if result_tesseract and result_easyocr:
                result = result_tesseract if result_tesseract['confidence'] > result_easyocr['confidence'] else result_easyocr
            else:
                result = result_tesseract or result_easyocr
        else:
            raise HTTPException(status_code=400, detail=f"Unknown engine: {engine}")
        
        if not result:
            raise HTTPException(status_code=503, detail="No OCR engine available")
        
        logger.info(f"✅ Extracted text: '{result['text'][:50]}...' (confidence: {result.get('confidence', 0):.2f})")
        
        return OCRResponse(
            text=result['text'],
            confidence=result.get('confidence'),
            engine=result['engine'],
            languages=languages,
            bounding_boxes=result.get('bounding_boxes')
        )
        
    except Exception as e:
        logger.error(f"❌ OCR error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ocr/upload")
async def ocr_upload(file: UploadFile = File(...), engine: str = "easyocr"):
    """
    Витягує текст з завантаженого зображення
    
    Form-data:
    - file: image file (png, jpg, jpeg, webp)
    - engine: tesseract | easyocr | both
    """
    try:
        logger.info(f"📥 Received file upload: {file.filename}")
        
        # Прочитати файл
        content = await file.read()
        img = Image.open(io.BytesIO(content))
        
        logger.info(f"📊 Image size: {img.size}, mode: {img.mode}")
        
        # Попередня обробка
        img = preprocess_image(img)
        
        # Вибрати OCR engine
        result = None
        
        if engine == 'tesseract':
            result = ocr_tesseract(img, ['uk', 'en'])
        elif engine == 'easyocr':
            result = ocr_easyocr(img, ['uk', 'en'])
        elif engine == 'both':
            try:
                result_tesseract = ocr_tesseract(img, ['uk', 'en'])
            except:
                result_tesseract = None
            
            try:
                result_easyocr = ocr_easyocr(img, ['uk', 'en'])
            except:
                result_easyocr = None
            
            if result_tesseract and result_easyocr:
                result = result_tesseract if result_tesseract['confidence'] > result_easyocr['confidence'] else result_easyocr
            else:
                result = result_tesseract or result_easyocr
        
        if not result:
            raise HTTPException(status_code=503, detail="No OCR engine available")
        
        logger.info(f"✅ Extracted text: '{result['text'][:50]}...'")
        
        return {
            "text": result['text'],
            "confidence": result.get('confidence'),
            "engine": result['engine'],
            "filename": file.filename
        }
        
    except Exception as e:
        logger.error(f"❌ Upload OCR error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8896)

