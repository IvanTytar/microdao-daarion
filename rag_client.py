"""
RAG Service Client for Router
Used to query RAG Service for document retrieval
"""

import os
import logging
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://rag-service:9500")


class RAGClient:
    """Client for RAG Service"""
    
    def __init__(self, base_url: str = RAG_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.timeout = 30.0
    
    async def query(
        self,
        dao_id: str,
        question: str,
        top_k: Optional[int] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Query RAG Service for answer and documents
        
        Args:
            dao_id: DAO identifier
            question: User question
            top_k: Number of documents to retrieve
            user_id: Optional user identifier
        
        Returns:
            Dictionary with answer, citations, and documents
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/query",
                    json={
                        "dao_id": dao_id,
                        "question": question,
                        "top_k": top_k,
                        "user_id": user_id
                    }
                )
                response.raise_for_status()
                return response.json()
                
        except httpx.HTTPError as e:
            logger.error(f"RAG query failed: {e}")
            return {
                "answer": "Помилка при запиті до бази знань.",
                "citations": [],
                "documents": []
            }
        except Exception as e:
            logger.error(f"RAG query error: {e}", exc_info=True)
            return {
                "answer": "Помилка при запиті до бази знань.",
                "citations": [],
                "documents": []
            }


# Global client instance
rag_client = RAGClient()

