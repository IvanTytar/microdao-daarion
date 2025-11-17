"""
Document Workflow Service
Channel-agnostic service for document parsing, ingestion, and RAG queries.

This service can be used by:
- Telegram bots
- Web applications
- Mobile apps
- Any other client
"""
import logging
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from router_client import send_to_router
from memory_client import memory_client

logger = logging.getLogger(__name__)


class QAItem(BaseModel):
    """Single Q&A pair"""
    question: str
    answer: str


class ParsedResult(BaseModel):
    """Result of document parsing"""
    success: bool
    doc_id: Optional[str] = None
    qa_pairs: Optional[List[QAItem]] = None
    markdown: Optional[str] = None
    chunks_meta: Optional[Dict[str, Any]] = None
    raw: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class IngestResult(BaseModel):
    """Result of document ingestion to RAG"""
    success: bool
    doc_id: Optional[str] = None
    ingested_chunks: int = 0
    status: str = "unknown"
    error: Optional[str] = None


class QAResult(BaseModel):
    """Result of RAG query about a document"""
    success: bool
    answer: Optional[str] = None
    doc_id: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None


class DocContext(BaseModel):
    """Document context stored in Memory Service"""
    doc_id: str
    dao_id: Optional[str] = None
    user_id: Optional[str] = None
    doc_url: Optional[str] = None
    file_name: Optional[str] = None
    saved_at: Optional[str] = None


class DocumentService:
    """
    Channel-agnostic service for document operations.
    
    Handles:
    - Document parsing (PDF, images)
    - Document ingestion to RAG
    - RAG queries about documents
    """
    
    def __init__(self):
        """Initialize document service"""
        self.memory_client = memory_client
    
    async def save_doc_context(
        self,
        session_id: str,
        doc_id: str,
        doc_url: Optional[str] = None,
        file_name: Optional[str] = None,
        dao_id: Optional[str] = None
    ) -> bool:
        """
        Save document context for a session.
        
        Uses Memory Service to persist document context across channels.
        
        Args:
            session_id: Session identifier (e.g., "telegram:123", "web:user456")
            doc_id: Document ID from parser
            doc_url: Optional document URL
            file_name: Optional file name
            dao_id: Optional DAO ID
        
        Returns:
            True if saved successfully
        """
        try:
            # Extract user_id from session_id if possible
            # Format: "channel:identifier" or "channel:user_id"
            parts = session_id.split(":", 1)
            user_id = parts[1] if len(parts) > 1 else session_id
            
            # Save as fact in Memory Service
            fact_key = f"doc_context:{session_id}"
            fact_value_json = {
                "doc_id": doc_id,
                "doc_url": doc_url,
                "file_name": file_name,
                "dao_id": dao_id,
                "saved_at": datetime.utcnow().isoformat()
            }
            
            result = await self.memory_client.upsert_fact(
                user_id=user_id,
                fact_key=fact_key,
                fact_value_json=fact_value_json,
                team_id=dao_id
            )
            
            logger.info(f"Saved doc context for session {session_id}: doc_id={doc_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to save doc context: {e}", exc_info=True)
            return False
    
    async def get_doc_context(self, session_id: str) -> Optional[DocContext]:
        """
        Get document context for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            DocContext or None
        """
        try:
            parts = session_id.split(":", 1)
            user_id = parts[1] if len(parts) > 1 else session_id
            
            fact_key = f"doc_context:{session_id}"
            
            # Get fact from Memory Service
            fact = await self.memory_client.get_fact(
                user_id=user_id,
                fact_key=fact_key
            )
            
            if fact and fact.get("fact_value_json"):
                logger.debug(f"Retrieved doc context for session {session_id}")
                ctx_data = fact.get("fact_value_json")
                return DocContext(**ctx_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get doc context: {e}", exc_info=True)
            return None
    
    async def parse_document(
        self,
        session_id: str,
        doc_url: str,
        file_name: str,
        dao_id: str,
        user_id: str,
        output_mode: str = "qa_pairs",
        metadata: Optional[Dict[str, Any]] = None
    ) -> ParsedResult:
        """
        Parse a document through DAGI Router.
        
        Args:
            session_id: Session identifier (e.g., "telegram:123", "web:user456")
            doc_url: URL to the document file
            file_name: Name of the file
            dao_id: DAO identifier
            user_id: User identifier
            output_mode: Output format ("qa_pairs", "markdown", "chunks")
            metadata: Optional additional metadata
        
        Returns:
            ParsedResult with parsed data
        """
        try:
            # Build request to Router
            router_request = {
                "mode": "doc_parse",
                "agent": "parser",
                "metadata": {
                    "source": self._extract_source(session_id),
                    "dao_id": dao_id,
                    "user_id": user_id,
                    "session_id": session_id,
                    **(metadata or {})
                },
                "payload": {
                    "doc_url": doc_url,
                    "file_name": file_name,
                    "output_mode": output_mode,
                    "dao_id": dao_id,
                    "user_id": user_id,
                },
            }
            
            logger.info(f"Parsing document: session={session_id}, file={file_name}, mode={output_mode}")
            
            # Send to Router
            response = await send_to_router(router_request)
            
            if not isinstance(response, dict):
                return ParsedResult(
                    success=False,
                    error="Invalid response from router"
                )
            
            data = response.get("data", {})
            
            # Extract doc_id
            doc_id = data.get("doc_id") or data.get("metadata", {}).get("doc_id")
            
            # Save document context for follow-up queries
            if doc_id:
                await self.save_doc_context(
                    session_id=session_id,
                    doc_id=doc_id,
                    doc_url=doc_url,
                    file_name=file_name,
                    dao_id=dao_id
                )
            
            # Extract parsed data
            qa_pairs_raw = data.get("qa_pairs", [])
            qa_pairs = None
            if qa_pairs_raw:
                # Convert to QAItem list
                try:
                    qa_pairs = [QAItem(**qa) if isinstance(qa, dict) else QAItem(question=qa.get("question", ""), answer=qa.get("answer", "")) for qa in qa_pairs_raw]
                except Exception as e:
                    logger.warning(f"Failed to parse qa_pairs: {e}")
                    qa_pairs = None
            
            markdown = data.get("markdown")
            chunks = data.get("chunks", [])
            chunks_meta = None
            if chunks:
                chunks_meta = {
                    "count": len(chunks),
                    "chunks": chunks[:3] if len(chunks) > 3 else chunks  # Sample
                }
            
            return ParsedResult(
                success=True,
                doc_id=doc_id,
                qa_pairs=qa_pairs,
                markdown=markdown,
                chunks_meta=chunks_meta,
                raw=data,
                error=None
            )
            
        except Exception as e:
            logger.error(f"Document parsing failed: {e}", exc_info=True)
            return ParsedResult(
                success=False,
                error=str(e)
            )
    
    async def ingest_document(
        self,
        session_id: str,
        doc_id: Optional[str] = None,
        doc_url: Optional[str] = None,
        file_name: Optional[str] = None,
        dao_id: str = None,
        user_id: str = None
    ) -> IngestResult:
        """
        Ingest document chunks into RAG/Memory.
        
        Args:
            session_id: Session identifier
            doc_id: Document ID (if already parsed)
            doc_url: Document URL (if need to parse first)
            file_name: File name
            dao_id: DAO identifier
            user_id: User identifier
        
        Returns:
            IngestResult with ingestion status
        """
        try:
            # If doc_id not provided, try to get from context
            if not doc_id:
                doc_context = await self.get_doc_context(session_id)
                if doc_context:
                    doc_id = doc_context.doc_id
                    doc_url = doc_url or doc_context.doc_url
                    file_name = file_name or doc_context.file_name
                    dao_id = dao_id or doc_context.dao_id
            
            if not doc_id and not doc_url:
                return IngestResult(
                    success=False,
                    error="No document ID or URL provided"
                )
            
            # Build request to Router with ingest flag
            router_request = {
                "mode": "doc_parse",
                "agent": "parser",
                "metadata": {
                    "source": self._extract_source(session_id),
                    "dao_id": dao_id,
                    "user_id": user_id,
                    "session_id": session_id,
                },
                "payload": {
                    "output_mode": "chunks",  # Use chunks for RAG ingestion
                    "dao_id": dao_id,
                    "user_id": user_id,
                    "ingest": True,  # Flag for ingestion
                },
            }
            
            if doc_url:
                router_request["payload"]["doc_url"] = doc_url
                router_request["payload"]["file_name"] = file_name or "document.pdf"
            
            if doc_id:
                router_request["payload"]["doc_id"] = doc_id
            
            logger.info(f"Ingesting document: session={session_id}, doc_id={doc_id}")
            
            # Send to Router
            response = await send_to_router(router_request)
            
            if not isinstance(response, dict):
                return IngestResult(
                    success=False,
                    error="Invalid response from router"
                )
            
            data = response.get("data", {})
            chunks = data.get("chunks", [])
            
            if chunks:
                return IngestResult(
                    success=True,
                    doc_id=doc_id or data.get("doc_id"),
                    ingested_chunks=len(chunks),
                    status="ingested"
                )
            else:
                return IngestResult(
                    success=False,
                    status="failed",
                    error="No chunks to ingest"
                )
                
        except Exception as e:
            logger.error(f"Document ingestion failed: {e}", exc_info=True)
            return IngestResult(
                success=False,
                error=str(e)
            )
    
    async def ask_about_document(
        self,
        session_id: str,
        question: str,
        doc_id: Optional[str] = None,
        dao_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> QAResult:
        """
        Ask a question about a document using RAG query.
        
        Args:
            session_id: Session identifier
            question: Question text
            doc_id: Document ID (if None, tries to get from context)
            dao_id: DAO identifier
            user_id: User identifier
        
        Returns:
            QAResult with answer and citations
        """
        try:
            # If doc_id not provided, try to get from context
            if not doc_id:
                doc_context = await self.get_doc_context(session_id)
                if doc_context:
                    doc_id = doc_context.doc_id
                    dao_id = dao_id or doc_context.dao_id
            
            if not doc_id:
                return QAResult(
                    success=False,
                    error="No document context found. Parse a document first."
                )
            
            # Extract user_id from session_id if not provided
            if not user_id:
                parts = session_id.split(":", 1)
                user_id = parts[1] if len(parts) > 1 else session_id
            
            # Build RAG query request
            router_request = {
                "mode": "rag_query",
                "agent": "daarwizz",
                "metadata": {
                    "source": self._extract_source(session_id),
                    "dao_id": dao_id,
                    "user_id": user_id,
                    "session_id": session_id,
                },
                "payload": {
                    "question": question,
                    "dao_id": dao_id,
                    "user_id": user_id,
                    "doc_id": doc_id,
                },
            }
            
            logger.info(f"RAG query: session={session_id}, question={question[:50]}, doc_id={doc_id}")
            
            # Send to Router
            response = await send_to_router(router_request)
            
            if not isinstance(response, dict):
                return QAResult(
                    success=False,
                    error="Invalid response from router"
                )
            
            data = response.get("data", {})
            answer = data.get("answer") or data.get("text")
            sources = data.get("citations", []) or data.get("sources", [])
            
            if answer:
                return QAResult(
                    success=True,
                    answer=answer,
                    doc_id=doc_id,
                    sources=sources if sources else None
                )
            else:
                return QAResult(
                    success=False,
                    error="No answer from RAG query"
                )
                
        except Exception as e:
            logger.error(f"RAG query failed: {e}", exc_info=True)
            return QAResult(
                success=False,
                error=str(e)
            )
    
    def _extract_source(self, session_id: str) -> str:
        """Extract source channel from session_id"""
        parts = session_id.split(":", 1)
        return parts[0] if len(parts) > 1 else "unknown"


# Global instance
doc_service = DocumentService()

# Export functions for convenience
async def parse_document(
    session_id: str,
    doc_url: str,
    file_name: str,
    dao_id: str,
    user_id: str,
    output_mode: str = "qa_pairs",
    metadata: Optional[Dict[str, Any]] = None
) -> ParsedResult:
    """Parse a document through DAGI Router"""
    return await doc_service.parse_document(
        session_id=session_id,
        doc_url=doc_url,
        file_name=file_name,
        dao_id=dao_id,
        user_id=user_id,
        output_mode=output_mode,
        metadata=metadata
    )


async def ingest_document(
    session_id: str,
    doc_id: Optional[str] = None,
    doc_url: Optional[str] = None,
    file_name: Optional[str] = None,
    dao_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> IngestResult:
    """Ingest document chunks into RAG/Memory"""
    return await doc_service.ingest_document(
        session_id=session_id,
        doc_id=doc_id,
        doc_url=doc_url,
        file_name=file_name,
        dao_id=dao_id,
        user_id=user_id
    )


async def ask_about_document(
    session_id: str,
    question: str,
    doc_id: Optional[str] = None,
    dao_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> QAResult:
    """Ask a question about a document using RAG query"""
    return await doc_service.ask_about_document(
        session_id=session_id,
        question=question,
        doc_id=doc_id,
        dao_id=dao_id,
        user_id=user_id
    )


async def save_doc_context(
    session_id: str,
    doc_id: str,
    doc_url: Optional[str] = None,
    file_name: Optional[str] = None,
    dao_id: Optional[str] = None
) -> bool:
    """Save document context for a session"""
    return await doc_service.save_doc_context(
        session_id=session_id,
        doc_id=doc_id,
        doc_url=doc_url,
        file_name=file_name,
        dao_id=dao_id
    )


async def get_doc_context(session_id: str) -> Optional[DocContext]:
    """Get document context for a session"""
    return await doc_service.get_doc_context(session_id)

