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
from app.runtime.inference import parse_document, dummy_parse_document

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
        
        # Determine document type
        if file:
            doc_type = "image"  # Will be determined from file extension
            file_ext = Path(file.filename or "").suffix.lower()
            if file_ext == ".pdf":
                doc_type = "pdf"
            
            # Read file content
            content = await file.read()
            
            # Check file size
            max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
            if len(content) > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds maximum {settings.MAX_FILE_SIZE_MB}MB"
                )
            
            # Save to temp file
            temp_dir = Path(settings.TEMP_DIR)
            temp_dir.mkdir(exist_ok=True, parents=True)
            temp_file = temp_dir / f"{uuid.uuid4()}{file_ext}"
            temp_file.write_bytes(content)
            
            input_path = str(temp_file)
            
        else:
            # TODO: Download from doc_url
            raise HTTPException(
                status_code=501,
                detail="doc_url download not yet implemented"
            )
        
        # Parse document
        logger.info(f"Parsing document: {input_path}, mode: {output_mode}")
        
        # TODO: Replace with real parse_document when model is integrated
        parsed_doc = dummy_parse_document(
            input_path=input_path,
            output_mode=output_mode,
            doc_id=doc_id or str(uuid.uuid4()),
            doc_type=doc_type
        )
        
        # Build response based on output_mode
        response_data = {"metadata": {}}
        
        if output_mode == "raw_json":
            response_data["document"] = parsed_doc
        elif output_mode == "markdown":
            # TODO: Convert to markdown
            response_data["markdown"] = "# Document\n\n" + "\n\n".join(
                block.text for page in parsed_doc.pages for block in page.blocks
            )
        elif output_mode == "qa_pairs":
            # TODO: Extract QA pairs
            response_data["qa_pairs"] = []
        elif output_mode == "chunks":
            # Convert blocks to chunks
            chunks = []
            for page in parsed_doc.pages:
                for block in page.blocks:
                    chunks.append(ParsedChunk(
                        text=block.text,
                        page=page.page_num,
                        bbox=block.bbox,
                        section=block.type,
                        metadata={
                            "dao_id": dao_id,
                            "doc_id": parsed_doc.doc_id,
                            "block_type": block.type
                        }
                    ))
            response_data["chunks"] = chunks
        
        # Cleanup temp file
        if file and temp_file.exists():
            temp_file.unlink()
        
        return ParseResponse(**response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing document: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


@router.post("/parse_qa", response_model=ParseResponse)
async def parse_qa_endpoint(
    file: Optional[UploadFile] = File(None),
    doc_url: Optional[str] = Form(None)
):
    """Parse document and return Q&A pairs"""
    return await parse_document_endpoint(
        file=file,
        doc_url=doc_url,
        output_mode="qa_pairs"
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

