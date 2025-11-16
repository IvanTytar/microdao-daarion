"""
Utilities for converting ParsedDocument to RAG formats
"""

import logging
from typing import List, Dict, Any

from app.schemas import ParsedDocument, ParsedBlock, ParsedPage

logger = logging.getLogger(__name__)


def parsed_doc_to_haystack_docs(parsed_doc: ParsedDocument) -> List[Dict[str, Any]]:
    """
    Convert ParsedDocument to Haystack Documents format
    
    This function prepares documents for RAG indexing by:
    - Extracting all blocks with text
    - Adding required metadata (dao_id, doc_id, page, block_type)
    - Preserving optional fields (bbox, section, reading_order)
    
    Args:
        parsed_doc: ParsedDocument from PARSER service
    
    Returns:
        List of dictionaries compatible with Haystack Document format
    """
    docs = []
    
    # Validate required fields
    if not parsed_doc.doc_id:
        logger.warning("ParsedDocument missing doc_id, cannot create RAG documents")
        return []
    
    dao_id = parsed_doc.metadata.get("dao_id")
    if not dao_id:
        logger.warning(f"ParsedDocument missing metadata.dao_id for doc_id={parsed_doc.doc_id}")
    
    for page in parsed_doc.pages:
        for block in page.blocks:
            # Skip empty blocks
            if not block.text or not block.text.strip():
                continue
            
            # Build metadata (must-have для RAG)
            meta: Dict[str, Any] = {
                "dao_id": dao_id or "",
                "doc_id": parsed_doc.doc_id,
                "page": page.page_num,
                "block_type": block.type,
                "reading_order": block.reading_order
            }
            
            # Add optional fields
            if block.bbox:
                meta["bbox_x"] = block.bbox.x
                meta["bbox_y"] = block.bbox.y
                meta["bbox_width"] = block.bbox.width
                meta["bbox_height"] = block.bbox.height
            
            # Add section if it's a heading
            if block.type == "heading":
                meta["section"] = block.text[:100]  # First 100 chars as section name
            
            # Add table data if present
            if block.type == "table" and block.table_data:
                meta["table_rows"] = len(block.table_data.rows)
                meta["table_columns"] = len(block.table_data.columns)
            
            # Add document-level metadata
            if parsed_doc.metadata:
                meta.update({
                    k: v for k, v in parsed_doc.metadata.items()
                    if k not in ["dao_id"]  # Already added
                })
            
            # Create document dict (Haystack format)
            doc = {
                "content": block.text.strip(),
                "meta": meta
            }
            
            docs.append(doc)
    
    logger.info(f"Converted {len(docs)} blocks to Haystack documents for doc_id={parsed_doc.doc_id}")
    return docs


def parsed_chunks_to_haystack_docs(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert ParsedChunk list to Haystack Documents format
    
    Args:
        chunks: List of ParsedChunk dictionaries
    
    Returns:
        List of Haystack Document dictionaries
    """
    docs = []
    
    for chunk in chunks:
        # Validate required fields
        if not chunk.get("text") or not chunk.get("text", "").strip():
            continue
        
        metadata = chunk.get("metadata", {})
        if not metadata.get("dao_id") or not metadata.get("doc_id"):
            logger.warning(f"Chunk missing required metadata: {metadata}")
            continue
        
        doc = {
            "content": chunk["text"].strip(),
            "meta": {
                "dao_id": metadata["dao_id"],
                "doc_id": metadata["doc_id"],
                "page": chunk.get("page", 1),
                "section": chunk.get("section"),
            }
        }
        
        # Add bbox if present
        if chunk.get("bbox"):
            bbox = chunk["bbox"]
            doc["meta"]["bbox_x"] = bbox.get("x")
            doc["meta"]["bbox_y"] = bbox.get("y")
            doc["meta"]["bbox_width"] = bbox.get("width")
            doc["meta"]["bbox_height"] = bbox.get("height")
        
        # Add other metadata
        doc["meta"].update({
            k: v for k, v in metadata.items()
            if k not in ["dao_id", "doc_id"]
        })
        
        docs.append(doc)
    
    return docs


def validate_parsed_doc_for_rag(parsed_doc: ParsedDocument) -> tuple[bool, List[str]]:
    """
    Validate ParsedDocument has all required fields for RAG
    
    Args:
        parsed_doc: ParsedDocument to validate
    
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    # Check doc_id
    if not parsed_doc.doc_id:
        errors.append("doc_id is required")
    
    # Check pages
    if not parsed_doc.pages:
        errors.append("pages list is empty")
    
    # Check metadata.dao_id
    if not parsed_doc.metadata.get("dao_id"):
        errors.append("metadata.dao_id is required for RAG filtering")
    
    # Check that pages have blocks
    for idx, page in enumerate(parsed_doc.pages, start=1):
        if not page.blocks:
            errors.append(f"Page {idx} has no blocks")
        
        # Check blocks have text
        for block_idx, block in enumerate(page.blocks, start=1):
            if not block.text or not block.text.strip():
                errors.append(f"Page {idx}, block {block_idx} has no text")
    
    return len(errors) == 0, errors

