"""
Embedding service for RAG
Uses SentenceTransformers via Haystack
"""

import logging
from typing import Optional

from haystack.components.embedders import SentenceTransformersTextEmbedder

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global embedder instance
_text_embedder: Optional[SentenceTransformersTextEmbedder] = None


def get_text_embedder() -> SentenceTransformersTextEmbedder:
    """
    Get or create SentenceTransformersTextEmbedder instance
    
    Returns:
        SentenceTransformersTextEmbedder configured with embedding model
    """
    global _text_embedder
    
    if _text_embedder is not None:
        return _text_embedder
    
    logger.info(f"Loading embedding model: {settings.EMBED_MODEL_NAME}")
    logger.info(f"Device: {settings.EMBED_DEVICE}")
    
    try:
        _text_embedder = SentenceTransformersTextEmbedder(
            model=settings.EMBED_MODEL_NAME,
            device=settings.EMBED_DEVICE,
        )
        
        logger.info("Text embedder initialized successfully")
        return _text_embedder
        
    except Exception as e:
        logger.error(f"Failed to initialize TextEmbedder: {e}", exc_info=True)
        raise RuntimeError(f"TextEmbedder initialization failed: {e}") from e


def reset_embedder():
    """Reset global embedder instance (for testing)"""
    global _text_embedder
    _text_embedder = None

