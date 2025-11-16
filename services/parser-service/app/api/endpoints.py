"""
API endpoints for PARSER Service
"""

import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse

from app.schemas import (
    ParseRequest, ParseResponse, ParsedDocument, ParsedChunk, QAPair, ChunksResponse
)
from app.core.config import settings
from app.runtime.inference import parse_document_from_images
from app.runtime.preprocessing import (
    convert_pdf_to_images, load_image, detect_file_type, validate_file_size
)
from app.runtime.postprocessing import (
    build_chunks, build_qa_pairs, build_markdown
)
from app.runtime.qa_builder import build_qa_pairs_via_router

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/parse", response_model=ParseResponse)
async def parse_document_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None),
    output_mode: str = Form("raw_json"),
    dao_id: Optional[str] = Form(None),
    doc_id: Optional[str] = Form(None)
):
    """
    Parse document (PDF or image) using dots.ocr
    
    Supports:
    - PDF files (multi-page)
    - Image files (PNG, JPEG, TIFF)
    
    Output modes:
    - raw_json: Full structured JSON
    - markdown: Markdown representation
    - qa_pairs: Q&A pairs extracted from document
    - chunks: Semantic chunks for RAG
    """
    try:
        # Validate input
        if not file and not doc_url:
            raise HTTPException(
                status_code=400,
                detail="Either 'file' or 'doc_url' must be provided"
            )
        
        # Process file
        if file:
            # Read file content
            content = await file.read()
            
            # Validate file size
            try:
                validate_file_size(content)
            except ValueError as e:
                raise HTTPException(status_code=413, detail=str(e))
            
            # Detect file type
            try:
                doc_type = detect_file_type(content, file.filename)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
            
            # Convert to images
            if doc_type == "pdf":
                images = convert_pdf_to_images(content)
            else:
                image = load_image(content)
                images = [image]
            
        else:
            # TODO: Download from doc_url
            raise HTTPException(
                status_code=501,
                detail="doc_url download not yet implemented"
            )
        
        # Parse document from images
        logger.info(f"Parsing document: {len(images)} page(s), mode: {output_mode}")
        
        # Check if using Ollama (async) or local model (sync)
        from app.core.config import settings
        if settings.RUNTIME_TYPE == "ollama":
            from app.runtime.inference import parse_document_with_ollama
            parsed_doc = await parse_document_with_ollama(
                images=images,
                output_mode=output_mode,
                doc_id=doc_id or str(uuid.uuid4()),
                doc_type=doc_type
            )
        else:
            parsed_doc = parse_document_from_images(
                images=images,
                output_mode=output_mode,
                doc_id=doc_id or str(uuid.uuid4()),
                doc_type=doc_type
            )
        
        # Build response based on output_mode
        response_data = {"metadata": {
            "doc_id": parsed_doc.doc_id,
            "doc_type": parsed_doc.doc_type,
            "page_count": len(parsed_doc.pages)
        }}
        
        if output_mode == "raw_json":
            response_data["document"] = parsed_doc
        elif output_mode == "markdown":
            response_data["markdown"] = build_markdown(parsed_doc)
        elif output_mode == "qa_pairs":
            # 2-stage pipeline: PARSER → LLM (DAGI Router)
            logger.info("Starting 2-stage Q&A pipeline: PARSER → LLM")
            try:
                qa_pairs = await build_qa_pairs_via_router(
                    parsed_doc=parsed_doc,
                    dao_id=dao_id or "daarion"
                )
                response_data["qa_pairs"] = qa_pairs
                logger.info(f"Generated {len(qa_pairs)} Q&A pairs via DAGI Router")
            except Exception as e:
                logger.error(f"Q&A generation failed, falling back to simple extraction: {e}")
                # Fallback to simple Q&A extraction
                response_data["qa_pairs"] = build_qa_pairs(parsed_doc)
        elif output_mode == "chunks":
            response_data["chunks"] = build_chunks(parsed_doc, dao_id=dao_id)
        elif output_mode == "layout_only":
            # Return document with layout info only
            response_data["document"] = parsed_doc
        elif output_mode == "region":
            # Region parsing (for future use)
            response_data["document"] = parsed_doc
        
        return ParseResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@router.post("/parse_qa", response_model=ParseResponse)
async def parse_qa_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None),
    dao_id: Optional[str] = Form(None)
):
    """
    Parse document and return Q&A pairs (2-stage pipeline)
    
    Stage 1: PARSER (dots.ocr) → raw JSON
    Stage 2: LLM (DAGI Router) → Q&A pairs
    """
    return await parse_document_endpoint(
        file=file,
        doc_url=doc_url,
        output_mode="qa_pairs",
        dao_id=dao_id
    )


@router.post("/parse_markdown", response_model=ParseResponse)
async def parse_markdown_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None)
):
    """Parse document and return Markdown"""
    return await parse_document_endpoint(
        file=file,
        doc_url=doc_url,
        output_mode="markdown"
    )


@router.post("/parse_chunks", response_model=ChunksResponse)
async def parse_chunks_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None),
    dao_id: str = Form(...),
    doc_id: Optional[str] = Form(None)
):
    """Parse document and return chunks for RAG"""
    response = await parse_document_endpoint(
        file=file,
        doc_url=doc_url,
        output_mode="chunks",
        dao_id=dao_id,
        doc_id=doc_id
    )
    
    if not response.chunks:
        raise HTTPException(status_code=500, detail="Failed to generate chunks")
    
    return ChunksResponse(
        chunks=response.chunks,
        total_chunks=len(response.chunks),
        doc_id=response.chunks[0].metadata.get("doc_id", doc_id or "unknown"),
        dao_id=dao_id
    )

