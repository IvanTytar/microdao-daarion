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


def load_model() -> Optional[object]:
    """
    Load dots.ocr model
    
    Returns:
        Loaded model instance or None if loading fails
    """
    global _model
    
    if _model is not None:
        return _model
    
    # Check if dummy mode is enabled
    if settings.USE_DUMMY_PARSER:
        logger.info("Dummy parser mode enabled, skipping model loading")
        return None
    
    logger.info(f"Loading model: {settings.PARSER_MODEL_NAME}")
    logger.info(f"Device: {settings.PARSER_DEVICE}")
    
    try:
        # Load dots.ocr model
        # Note: Adjust imports and model class based on actual dots.ocr implementation
        # This is a template that should work with most Vision-Language models
        
        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor
            import torch
        except ImportError:
            logger.error("transformers or torch not installed. Install with: pip install transformers torch")
            if not settings.ALLOW_DUMMY_FALLBACK:
                raise
            return None
        
        logger.info(f"Loading model from: {settings.PARSER_MODEL_NAME}")
        
        # Load processor
        processor = AutoProcessor.from_pretrained(
            settings.PARSER_MODEL_NAME,
            trust_remote_code=True  # If model has custom code
        )
        
        # Determine device and dtype
        device = settings.PARSER_DEVICE
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, falling back to CPU")
            device = "cpu"
        elif device == "mps" and not hasattr(torch.backends, "mps") or not torch.backends.mps.is_available():
            logger.warning("MPS not available, falling back to CPU")
            device = "cpu"
        
        dtype = torch.float16 if device != "cpu" else torch.float32
        
        # Load model
        model = AutoModelForVision2Seq.from_pretrained(
            settings.PARSER_MODEL_NAME,
            device_map=device if device != "cpu" else None,
            torch_dtype=dtype,
            trust_remote_code=True
        )
        
        if device == "cpu":
            model = model.to("cpu")
        
        # Store model and processor
        _model = {
            "model": model,
            "processor": processor,
            "device": device
        }
        
        logger.info(f"Model loaded successfully on device: {device}")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        if not settings.ALLOW_DUMMY_FALLBACK:
            raise
        _model = None
        
    except ImportError as e:
        logger.error(f"Required packages not installed: {e}")
        if not settings.ALLOW_DUMMY_FALLBACK:
            raise
        _model = None
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        if not settings.ALLOW_DUMMY_FALLBACK:
            raise
        _model = None
    
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

