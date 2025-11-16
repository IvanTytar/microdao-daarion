"""
Query Pipeline: RAG → LLM
Retrieves relevant documents and generates answers
"""

import logging
from typing import List, Dict, Any, Optional
import httpx

from haystack import Pipeline
from haystack.components.embedders import SentenceTransformersTextEmbedder
from haystack.components.retrievers import InMemoryEmbeddingRetriever
from haystack.document_stores import PGVectorDocumentStore

from app.document_store import get_document_store
from app.embedding import get_text_embedder
from app.core.config import settings

logger = logging.getLogger(__name__)


async def answer_query(
    dao_id: str,
    question: str,
    top_k: Optional[int] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Answer query using RAG pipeline
    
    Args:
        dao_id: DAO identifier (for filtering)
        question: User question
        top_k: Number of documents to retrieve (default from settings)
        user_id: Optional user identifier
    
    Returns:
        Dictionary with answer, citations, and retrieved documents
    """
    logger.info(f"Answering query: dao_id={dao_id}, question={question[:50]}...")
    
    top_k = top_k or settings.TOP_K
    
    try:
        # Retrieve relevant documents
        documents = _retrieve_documents(dao_id, question, top_k)
        
        if not documents:
            logger.warning(f"No documents found for dao_id={dao_id}")
            return {
                "answer": "На жаль, я не знайшов релевантної інформації в базі знань.",
                "citations": [],
                "documents": []
            }
        
        logger.info(f"Retrieved {len(documents)} documents")
        
        # Generate answer using LLM
        answer = await _generate_answer(question, documents, dao_id, user_id)
        
        # Build citations
        citations = _build_citations(documents)
        
        return {
            "answer": answer,
            "citations": citations,
            "documents": [
                {
                    "content": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content,
                    "meta": doc.meta
                }
                for doc in documents
            ]
        }
        
    except Exception as e:
        logger.error(f"Failed to answer query: {e}", exc_info=True)
        return {
            "answer": f"Помилка при обробці запиту: {str(e)}",
            "citations": [],
            "documents": []
        }


def _retrieve_documents(
    dao_id: str,
    question: str,
    top_k: int
) -> List[Any]:
    """
    Retrieve relevant documents from DocumentStore
    
    Args:
        dao_id: DAO identifier for filtering
        question: Query text
        top_k: Number of documents to retrieve
    
    Returns:
        List of Haystack Document objects
    """
    # Get components
    embedder = get_text_embedder()
    document_store = get_document_store()
    
    # Embed query
    embedding_result = embedder.run(question)
    query_embedding = embedding_result["embedding"][0] if isinstance(embedding_result["embedding"], list) else embedding_result["embedding"]
    
    # Retrieve with filters using vector similarity search
    filters = {"dao_id": [dao_id]}
    
    try:
        documents = document_store.search(
            query_embedding=query_embedding,
            filters=filters,
            top_k=top_k,
            return_embedding=False
        )
    except Exception as e:
        logger.warning(f"Vector search failed: {e}, trying filter_documents")
        # Fallback to filter_documents
        documents = document_store.filter_documents(
            filters=filters,
            top_k=top_k,
            return_embedding=False
        )
    
    # If no documents with filter, try without filter (fallback)
    if not documents:
        logger.warning(f"No documents found with dao_id={dao_id}, trying without filter")
        try:
            documents = document_store.search(
                query_embedding=query_embedding,
                filters=None,
                top_k=top_k,
                return_embedding=False
            )
        except Exception:
            documents = document_store.filter_documents(
                filters=None,
                top_k=top_k,
                return_embedding=False
            )
    
    return documents


async def _generate_answer(
    question: str,
    documents: List[Any],
    dao_id: str,
    user_id: Optional[str] = None
) -> str:
    """
    Generate answer using LLM (via DAGI Router or OpenAI)
    
    Args:
        question: User question
        documents: Retrieved documents
        dao_id: DAO identifier
        user_id: Optional user identifier
    
    Returns:
        Generated answer text
    """
    # Build context from documents
    context = "\n\n".join([
        f"[Документ {idx+1}, сторінка {doc.meta.get('page', '?')}]: {doc.content[:500]}"
        for idx, doc in enumerate(documents[:3])  # Limit to first 3 documents
    ])
    
    # Build prompt
    prompt = (
        "Тобі надано контекст з бази знань та питання користувача.\n"
        "Відповідай на основі наданого контексту. Якщо в контексті немає відповіді, "
        "скажи що не знаєш.\n\n"
        f"Контекст:\n{context}\n\n"
        f"Питання: {question}\n\n"
        "Відповідь:"
    )
    
    # Call LLM based on provider
    if settings.LLM_PROVIDER == "router":
        return await _call_router_llm(prompt, dao_id, user_id)
    elif settings.LLM_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        return await _call_openai_llm(prompt)
    else:
        # Fallback: simple answer
        return f"Знайдено {len(documents)} релевантних документів. Перший фрагмент: {documents[0].content[:200]}..."


async def _call_router_llm(
    prompt: str,
    dao_id: str,
    user_id: Optional[str] = None
) -> str:
    """Call DAGI Router LLM"""
    router_url = f"{settings.ROUTER_BASE_URL.rstrip('/')}/route"
    
    payload = {
        "mode": "chat",
        "dao_id": dao_id,
        "user_id": user_id or "rag-service",
        "payload": {
            "message": prompt
        }
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(router_url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            
            return data.get("data", {}).get("text", "Не вдалося отримати відповідь")
            
    except Exception as e:
        logger.error(f"Router LLM call failed: {e}")
        return f"Помилка при виклику LLM: {str(e)}"


async def _call_openai_llm(prompt: str) -> str:
    """Call OpenAI LLM"""
    # TODO: Implement OpenAI client
    return "OpenAI integration not yet implemented"


def _build_citations(documents: List[Any]) -> List[Dict[str, Any]]:
    """
    Build citations from retrieved documents
    
    Args:
        documents: List of Haystack Documents
    
    Returns:
        List of citation dictionaries
    """
    citations = []
    
    for doc in documents:
        meta = doc.meta
        citations.append({
            "doc_id": meta.get("doc_id", "unknown"),
            "page": meta.get("page", 0),
            "section": meta.get("section"),
            "excerpt": doc.content[:200] + "..." if len(doc.content) > 200 else doc.content
        })
    
    return citations

