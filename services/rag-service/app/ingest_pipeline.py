"""
Ingest Pipeline: PARSER → RAG
Converts ParsedDocument to Haystack Documents and indexes them
"""

import logging
from typing import List, Dict, Any, Optional

from haystack import Pipeline
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.writers import DocumentWriter
from haystack.schema import Document

from app.document_store import get_document_store
from app.embedding import get_text_embedder
from app.core.config import settings

logger = logging.getLogger(__name__)


def ingest_parsed_document(
    dao_id: str,
    doc_id: str,
    parsed_json: Dict[str, Any],
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Ingest parsed document from PARSER service into RAG
    
    Args:
        dao_id: DAO identifier
        doc_id: Document identifier
        parsed_json: ParsedDocument JSON from PARSER service
        user_id: Optional user identifier
    
    Returns:
        Dictionary with ingest results (doc_count, status)
    """
    logger.info(f"Ingesting document: dao_id={dao_id}, doc_id={doc_id}")
    
    try:
        # Convert parsed_json to Haystack Documents
        documents = _parsed_json_to_documents(parsed_json, dao_id, doc_id, user_id)
        
        if not documents:
            logger.warning(f"No documents to ingest for doc_id={doc_id}")
            return {
                "status": "error",
                "message": "No documents to ingest",
                "doc_count": 0
            }
        
        logger.info(f"Converted {len(documents)} blocks to Haystack Documents")
        
        # Create ingest pipeline
        pipeline = _create_ingest_pipeline()
        
        # Run pipeline
        result = pipeline.run({"documents": documents})
        
        # Extract results
        written_docs = result.get("documents_writer", {}).get("documents_written", 0)
        
        logger.info(f"Ingested {written_docs} documents for doc_id={doc_id}")
        
        return {
            "status": "success",
            "doc_count": written_docs,
            "dao_id": dao_id,
            "doc_id": doc_id
        }
        
    except Exception as e:
        logger.error(f"Failed to ingest document: {e}", exc_info=True)
        return {
            "status": "error",
            "message": str(e),
            "doc_count": 0
        }


def _parsed_json_to_documents(
    parsed_json: Dict[str, Any],
    dao_id: str,
    doc_id: str,
    user_id: Optional[str] = None
) -> List[Document]:
    """
    Convert ParsedDocument JSON to Haystack Documents
    
    Args:
        parsed_json: ParsedDocument JSON structure
        dao_id: DAO identifier
        doc_id: Document identifier
        user_id: Optional user identifier
    
    Returns:
        List of Haystack Document objects
    """
    documents = []
    
    # Extract pages from parsed_json
    pages = parsed_json.get("pages", [])
    
    for page_data in pages:
        page_num = page_data.get("page_num", 1)
        blocks = page_data.get("blocks", [])
        
        for block in blocks:
            # Skip empty blocks
            text = block.get("text", "").strip()
            if not text:
                continue
            
            # Build metadata (must-have для RAG)
            meta = {
                "dao_id": dao_id,
                "doc_id": doc_id,
                "page": page_num,
                "block_type": block.get("type", "paragraph"),
                "reading_order": block.get("reading_order", 0)
            }
            
            # Add optional fields
            if block.get("bbox"):
                bbox = block["bbox"]
                meta.update({
                    "bbox_x": bbox.get("x", 0),
                    "bbox_y": bbox.get("y", 0),
                    "bbox_width": bbox.get("width", 0),
                    "bbox_height": bbox.get("height", 0)
                })
            
            # Add section if heading
            if block.get("type") == "heading":
                meta["section"] = text[:100]  # First 100 chars as section name
            
            # Add user_id if provided
            if user_id:
                meta["user_id"] = user_id
            
            # Add document-level metadata
            if parsed_json.get("metadata"):
                meta.update({
                    k: v for k, v in parsed_json["metadata"].items()
                    if k not in ["dao_id"]  # Already added
                })
            
            # Create Haystack Document
            doc = Document(
                content=text,
                meta=meta
            )
            
            documents.append(doc)
    
    return documents


def _create_ingest_pipeline() -> Pipeline:
    """
    Create Haystack ingest pipeline
    
    Pipeline: DocumentSplitter → Embedder → DocumentWriter
    """
    # Get components
    embedder = get_text_embedder()
    document_store = get_document_store()
    
    # Create splitter (optional, if chunks are too large)
    splitter = DocumentSplitter(
        split_by="sentence",
        split_length=settings.CHUNK_SIZE,
        split_overlap=settings.CHUNK_OVERLAP
    )
    
    # Create writer
    writer = DocumentWriter(document_store)
    
    # Build pipeline
    pipeline = Pipeline()
    pipeline.add_component("splitter", splitter)
    pipeline.add_component("embedder", embedder)
    pipeline.add_component("documents_writer", writer)
    
    # Connect components
    pipeline.connect("splitter", "embedder")
    pipeline.connect("embedder", "documents_writer")
    
    return pipeline

