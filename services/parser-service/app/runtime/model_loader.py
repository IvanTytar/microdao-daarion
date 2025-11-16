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
        # dots.ocr is a Vision-Language Model for document OCR and layout parsing
        
        try:
            from transformers import AutoModelForVision2Seq, AutoProcessor
            import torch
        except ImportError as e:
            logger.error(f"transformers or torch not installed: {e}")
            logger.error("Install with: pip install transformers torch")
            if not settings.ALLOW_DUMMY_FALLBACK:
                raise
            return None
        
        model_name = settings.PARSER_MODEL_NAME
        logger.info(f"Loading dots.ocr model from: {model_name}")
        logger.info(f"Target device: {settings.PARSER_DEVICE}")
        
        # Load processor (handles image preprocessing and text tokenization)
        try:
            processor = AutoProcessor.from_pretrained(
                model_name,
                trust_remote_code=True  # dots.ocr may have custom code
            )
            logger.info("Processor loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load processor: {e}")
            if not settings.ALLOW_DUMMY_FALLBACK:
                raise
            return None
        
        # Determine device and dtype
        device = settings.PARSER_DEVICE
        
        # Check CUDA availability
        if device == "cuda":
            if not torch.cuda.is_available():
                logger.warning("CUDA requested but not available, falling back to CPU")
                device = "cpu"
            else:
                logger.info(f"Using CUDA device: {torch.cuda.get_device_name(0)}")
        
        # Check MPS availability (Apple Silicon)
        elif device == "mps":
            if not hasattr(torch.backends, "mps") or not torch.backends.mps.is_available():
                logger.warning("MPS requested but not available, falling back to CPU")
                device = "cpu"
            else:
                logger.info("Using MPS (Apple Silicon)")
        
        # Determine dtype based on device
        if device == "cpu":
            dtype = torch.float32
        else:
            dtype = torch.float16  # Use half precision for GPU to save memory
        
        logger.info(f"Loading model with dtype: {dtype}")
        
        # Load model
        try:
            model = AutoModelForVision2Seq.from_pretrained(
                model_name,
                device_map=device if device != "cpu" else None,
                torch_dtype=dtype,
                trust_remote_code=True,
                low_cpu_mem_usage=True  # Optimize memory usage
            )
            
            # Explicitly move to device if CPU
            if device == "cpu":
                model = model.to("cpu")
                model.eval()  # Set to evaluation mode
            
            logger.info(f"Model loaded successfully on device: {device}")
            
        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            if not settings.ALLOW_DUMMY_FALLBACK:
                raise
            return None
        
        # Store model and processor
        _model = {
            "model": model,
            "processor": processor,
            "device": device,
            "dtype": dtype
        }
        
        logger.info(f"dots.ocr model ready on {device}")
        
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

