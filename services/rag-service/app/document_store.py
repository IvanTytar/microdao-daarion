"""
Document Store for RAG Service
Uses PostgreSQL + pgvector via Haystack
"""

import logging
from typing import Optional

from haystack.document_stores import PGVectorDocumentStore

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global document store instance
_document_store: Optional[PGVectorDocumentStore] = None


def get_document_store() -> PGVectorDocumentStore:
    """
    Get or create PGVectorDocumentStore instance
    
    Returns:
        PGVectorDocumentStore configured with pgvector
    """
    global _document_store
    
    if _document_store is not None:
        return _document_store
    
    logger.info(f"Initializing PGVectorDocumentStore: table={settings.RAG_TABLE_NAME}")
    logger.info(f"Connection: {settings.PG_DSN.split('@')[1] if '@' in settings.PG_DSN else 'hidden'}")
    
    try:
        _document_store = PGVectorDocumentStore(
            connection_string=settings.PG_DSN,
            embedding_dim=settings.EMBED_DIM,
            table_name=settings.RAG_TABLE_NAME,
            search_strategy=settings.SEARCH_STRATEGY,
            # Additional options
            recreate_table=False,  # Don't drop existing table
            similarity="cosine",  # Cosine similarity for embeddings
        )
        
        logger.info("PGVectorDocumentStore initialized successfully")
        return _document_store
        
    except Exception as e:
        logger.error(f"Failed to initialize DocumentStore: {e}", exc_info=True)
        raise RuntimeError(f"DocumentStore initialization failed: {e}") from e


def reset_document_store():
    """Reset global document store instance (for testing)"""
    global _document_store
    _document_store = None

