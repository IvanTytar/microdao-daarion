"""
Model loader for dots.ocr
Handles lazy loading and GPU/CPU fallback
"""

import logging
from typing import Optional, Literal
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global model instance
_model: Optional[object] = None


def load_model() -> object:
    """
    Load dots.ocr model
    
    Returns:
        Loaded model instance
    """
    global _model
    
    if _model is not None:
        return _model
    
    logger.info(f"Loading model: {settings.PARSER_MODEL_NAME}")
    logger.info(f"Device: {settings.PARSER_DEVICE}")
    
    try:
        # TODO: Implement actual model loading
        # Example:
        # from transformers import AutoModelForVision2Seq, AutoProcessor
        # 
        # processor = AutoProcessor.from_pretrained(settings.PARSER_MODEL_NAME)
        # model = AutoModelForVision2Seq.from_pretrained(
        #     settings.PARSER_MODEL_NAME,
        #     device_map=settings.PARSER_DEVICE
        # )
        # 
        # _model = {
        #     "model": model,
        #     "processor": processor
        # }
        
        # For now, return None (will use dummy parser)
        logger.warning("Model loading not yet implemented, using dummy parser")
        _model = None
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        raise
    
    return _model


def get_model() -> Optional[object]:
    """Get loaded model instance"""
    if _model is None:
        return load_model()
    return _model


def unload_model():
    """Unload model from memory"""
    global _model
    if _model is not None:
        # TODO: Proper cleanup
        _model = None
        logger.info("Model unloaded")

