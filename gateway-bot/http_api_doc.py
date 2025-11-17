"""
Document API Endpoints
Channel-agnostic HTTP API for document operations.

Endpoints:
- POST /api/doc/parse - Parse a document
- POST /api/doc/ingest - Ingest document to RAG
- POST /api/doc/ask - Ask question about document
"""
import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from services.doc_service import (
    doc_service,
    parse_document,
    ingest_document,
    ask_about_document,
    get_doc_context,
    ParsedResult,
    IngestResult,
    QAResult,
    DocContext
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ========================================
# Request Models
# ========================================

class ParseDocumentRequest(BaseModel):
    """Request to parse a document"""
    session_id: str
    doc_url: str
    file_name: str
    dao_id: str
    user_id: str
    output_mode: str = "qa_pairs"  # qa_pairs, markdown, chunks
    metadata: Optional[Dict[str, Any]] = None


class IngestDocumentRequest(BaseModel):
    """Request to ingest a document"""
    session_id: str
    doc_id: Optional[str] = None
    doc_url: Optional[str] = None
    file_name: Optional[str] = None
    dao_id: Optional[str] = None
    user_id: Optional[str] = None


class AskDocumentRequest(BaseModel):
    """Request to ask about a document"""
    session_id: str
    question: str
    doc_id: Optional[str] = None
    dao_id: Optional[str] = None
    user_id: Optional[str] = None


# ========================================
# Endpoints
# ========================================

@router.post("/api/doc/parse")
async def parse_document_endpoint(request: ParseDocumentRequest):
    """
    Parse a document through DAGI Router.
    
    Accepts JSON with doc_url or can accept file upload.
    
    Returns parsed document data (qa_pairs, markdown, or chunks).
    """
    try:
        result = await parse_document(
            session_id=request.session_id,
            doc_url=request.doc_url,
            file_name=request.file_name,
            dao_id=request.dao_id,
            user_id=request.user_id,
            output_mode=request.output_mode,
            metadata=request.metadata
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        # Convert QAItem to dict for JSON response
        qa_pairs_dict = None
        if result.qa_pairs:
            qa_pairs_dict = [{"question": qa.question, "answer": qa.answer} for qa in result.qa_pairs]
        
        return {
            "ok": True,
            "doc_id": result.doc_id,
            "qa_pairs": qa_pairs_dict,
            "markdown": result.markdown,
            "chunks_meta": result.chunks_meta,
            "raw": result.raw
        }
        
    except Exception as e:
        logger.error(f"Parse document error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/doc/parse/upload")
async def parse_document_upload(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    dao_id: str = Form(...),
    user_id: str = Form(...),
    output_mode: str = Form("qa_pairs")
):
    """
    Parse a document from file upload.
    
    Accepts multipart/form-data with file and metadata.
    """
    try:
        # Check file type
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # For now, we need to upload file somewhere accessible
        # TODO: Implement file storage (S3, local storage, etc.)
        # For now, return error suggesting to use doc_url instead
        raise HTTPException(
            status_code=501,
            detail="File upload not yet implemented. Please use /api/doc/parse with doc_url instead."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Parse document upload error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/doc/ingest")
async def ingest_document_endpoint(request: IngestDocumentRequest):
    """
    Ingest document chunks into RAG/Memory.
    
    Can use doc_id from previous parse, or doc_url to parse and ingest.
    """
    try:
        # If doc_id not provided, try to get from context
        doc_id = request.doc_id
        if not doc_id:
            doc_context = await get_doc_context(request.session_id)
            if doc_context:
                doc_id = doc_context.doc_id
                if not request.dao_id:
                    request.dao_id = doc_context.dao_id
                if not request.user_id:
                    request.user_id = doc_context.user_id
        
        result = await ingest_document(
            session_id=request.session_id,
            doc_id=doc_id,
            doc_url=request.doc_url,
            file_name=request.file_name,
            dao_id=request.dao_id,
            user_id=request.user_id
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return {
            "ok": True,
            "doc_id": result.doc_id,
            "ingested_chunks": result.ingested_chunks,
            "status": result.status
        }
        
    except Exception as e:
        logger.error(f"Ingest document error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/doc/ask")
async def ask_about_document_endpoint(request: AskDocumentRequest):
    """
    Ask a question about a document using RAG query.
    
    Uses doc_id from session context if not provided.
    """
    try:
        # If doc_id not provided, try to get from context
        doc_id = request.doc_id
        if not doc_id:
            doc_context = await get_doc_context(request.session_id)
            if doc_context:
                doc_id = doc_context.doc_id
                if not request.dao_id:
                    request.dao_id = doc_context.dao_id
                if not request.user_id:
                    request.user_id = doc_context.user_id
        
        result = await ask_about_document(
            session_id=request.session_id,
            question=request.question,
            doc_id=doc_id,
            dao_id=request.dao_id,
            user_id=request.user_id
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)
        
        return {
            "ok": True,
            "answer": result.answer,
            "doc_id": result.doc_id,
            "sources": result.sources
        }
        
    except Exception as e:
        logger.error(f"Ask document error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/doc/context/{session_id}")
async def get_document_context(session_id: str):
    """
    Get document context for a session.
    
    Returns the last parsed document ID and metadata for the session.
    """
    try:
        context = await get_doc_context(session_id)
        
        if not context:
            raise HTTPException(status_code=404, detail="No document context found")
        
        return {
            "ok": True,
            "context": {
                "doc_id": context.doc_id,
                "dao_id": context.dao_id,
                "user_id": context.user_id,
                "doc_url": context.doc_url,
                "file_name": context.file_name,
                "saved_at": context.saved_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get document context error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

