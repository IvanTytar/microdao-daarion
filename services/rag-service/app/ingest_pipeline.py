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
from app.events import publish_document_ingested, publish_document_indexed

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
        Dictionary with ingest results (doc_count, status, metrics)
    """
    import time
    ingest_start = time.time()
    
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
        pipeline_start = time.time()
        result = pipeline.run({"documents": documents})
        pipeline_time = time.time() - pipeline_start
        
        # Extract results
        written_docs = result.get("documents_writer", {}).get("documents_written", 0)
        
        # Calculate metrics
        total_time = time.time() - ingest_start
        pages_count = len(parsed_json.get("pages", []))
        blocks_count = sum(
            len(page.get("blocks", []))
            for page in parsed_json.get("pages", [])
        )
        
        logger.info(
            f"Ingested {written_docs} documents for doc_id={doc_id}: "
            f"pages={pages_count}, blocks={blocks_count}, "
            f"pipeline_time={pipeline_time:.2f}s, total_time={total_time:.2f}s"
        )
        
        # Publish events
        try:
            # First publish rag.document.ingested event
            await publish_document_ingested(
                doc_id=doc_id,
                team_id=dao_id,
                dao_id=dao_id,
                chunk_count=written_docs,
                indexed=True,
                visibility="public",
                metadata={
                    "ingestion_time_ms": round(pipeline_time * 1000),
                    "embed_model": settings.EMBEDDING_MODEL or "bge-m3@v1",
                    "pages_processed": pages_count,
                    "blocks_processed": blocks_count
                }
            )
            logger.info(f"Published rag.document.ingested event for doc_id={doc_id}")
            
            # Then publish rag.document.indexed event
            chunk_ids = []
            for i in range(written_docs):
                chunk_ids.append(f"{doc_id}_chunk_{i+1}")
                
            await publish_document_indexed(
                doc_id=doc_id,
                team_id=dao_id,
                dao_id=dao_id,
                chunk_ids=chunk_ids,
                indexed=True,
                visibility="public",
                metadata={
                    "indexing_time_ms": 0,  # TODO: track actual indexing time
                    "milvus_collection": "documents_v1",
                    "neo4j_nodes_created": len(chunk_ids),
                    "embed_model": settings.EMBEDDING_MODEL or "bge-m3@v1"
                }
            )
            logger.info(f"Published rag.document.indexed event for doc_id={doc_id}")
        except Exception as e:
            logger.error(f"Failed to publish RAG events for doc_id={doc_id}: {e}")
        
        return {
            "status": "success",
            "doc_count": written_docs,
            "dao_id": dao_id,
            "doc_id": doc_id,
            "metrics": {
                "pages_processed": pages_count,
                "blocks_processed": blocks_count,
                "documents_indexed": written_docs,
                "pipeline_time_seconds": round(pipeline_time, 2),
                "total_time_seconds": round(total_time, 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to ingest document: {e}", exc_info=True)
        total_time = time.time() - ingest_start
        logger.error(f"Ingest failed after {total_time:.2f}s: {e}")
        return {
            "status": "error",
            "message": str(e),
            "doc_count": 0,
            "metrics": {
                "total_time_seconds": round(total_time, 2),
                "error": str(e)
            }
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

