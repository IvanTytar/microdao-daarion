"""
API endpoints for PARSER Service
"""

import logging
import uuid
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import httpx

from app.schemas import (
    ParseRequest, ParseResponse, ParsedDocument, ParsedChunk, QAPair, ChunksResponse,
    OcrIngestResponse
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
from app.utils.file_converter import pdf_or_image_to_png_bytes

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/parse", response_model=ParseResponse)
async def parse_document_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None),
    output_mode: str = Form("raw_json"),
    dao_id: Optional[str] = Form(None),
    doc_id: Optional[str] = Form(None),
    region_bbox_x: Optional[float] = Form(None),
    region_bbox_y: Optional[float] = Form(None),
    region_bbox_width: Optional[float] = Form(None),
    region_bbox_height: Optional[float] = Form(None),
    region_page: Optional[int] = Form(None)
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
            
            # For region mode, validate and prepare region bbox
            region_bbox = None
            if output_mode == "region":
                if not all([region_bbox_x is not None, region_bbox_y is not None, 
                           region_bbox_width is not None, region_bbox_height is not None]):
                    raise HTTPException(
                        status_code=400,
                        detail="region mode requires region_bbox_x, region_bbox_y, region_bbox_width, region_bbox_height"
                    )
                region_bbox = {
                    "x": float(region_bbox_x),
                    "y": float(region_bbox_y),
                    "width": float(region_bbox_width),
                    "height": float(region_bbox_height)
                }
                # If region_page specified, only process that page
                if region_page is not None:
                    if region_page < 1 or region_page > len(images):
                        raise HTTPException(
                            status_code=400,
                            detail=f"region_page {region_page} out of range (1-{len(images)})"
                        )
                    images = [images[region_page - 1]]
            
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
                doc_type=doc_type,
                region_bbox=region_bbox
            )
        else:
            parsed_doc = parse_document_from_images(
                images=images,
                output_mode=output_mode,
                doc_id=doc_id or str(uuid.uuid4()),
                doc_type=doc_type,
                region_bbox=region_bbox
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


@router.post("/ocr/ingest", response_model=OcrIngestResponse)
async def ocr_ingest_endpoint(
    file: UploadFile = File(...),
    dao_id: str = Form(...),
    doc_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None)
):
    """
    Parse document and ingest into RAG in one call
    
    Flow:
    1. Accept PDF/image file
    2. Parse with dots.ocr (raw_json mode)
    3. Send parsed_json to RAG Service /ingest
    4. Return doc_id + raw_json
    
    Args:
        file: PDF or image file
        dao_id: DAO identifier (required)
        doc_id: Document identifier (optional, defaults to filename)
        user_id: User identifier (optional)
    """
    try:
        # Generate doc_id if not provided
        if not doc_id:
            doc_id = file.filename or f"doc-{uuid.uuid4().hex[:8]}"
        
        # Read and validate file
        content = await file.read()
        validate_file_size(content)
        
        # Detect file type
        doc_type = detect_file_type(content, file.filename)
        
        # Convert to images
        if doc_type == "pdf":
            images = convert_pdf_to_images(content)
        else:
            image = load_image(content)
            images = [image]
        
        pages_count = len(images)
        logger.info(f"Ingesting document: dao_id={dao_id}, doc_id={doc_id}, pages={pages_count}")
        
        # Parse document (raw_json mode)
        parsed_doc = parse_document_from_images(
            images=images,
            output_mode="raw_json",
            doc_id=doc_id,
            doc_type=doc_type
        )
        
        # Convert to JSON
        parsed_json = parsed_doc.model_dump(mode="json")
        
        # Send to RAG Service
        ingest_payload = {
            "dao_id": dao_id,
            "doc_id": doc_id,
            "parsed_json": parsed_json,
        }
        
        if user_id:
            ingest_payload["user_id"] = user_id
        
        rag_url = f"{settings.RAG_BASE_URL.rstrip('/')}/ingest"
        logger.info(f"Sending to RAG Service: {rag_url}")
        
        try:
            async with httpx.AsyncClient(timeout=settings.RAG_TIMEOUT) as client:
                resp = await client.post(rag_url, json=ingest_payload)
                resp.raise_for_status()
                rag_result = resp.json()
                
                logger.info(f"RAG ingest successful: {rag_result.get('doc_count', 0)} documents indexed")
                
        except httpx.HTTPError as e:
            logger.error(f"RAG ingest failed: {e}")
            raise HTTPException(
                status_code=502,
                detail=f"RAG Service ingest failed: {str(e)}"
            )
        
        return OcrIngestResponse(
            dao_id=dao_id,
            doc_id=doc_id,
            pages_processed=pages_count,
            rag_ingested=True,
            raw_json=parsed_json
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ocr_ingest: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ingest failed: {str(e)}")

