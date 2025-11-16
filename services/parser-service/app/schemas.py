"""
Pydantic schemas for PARSER Service
"""

from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime


class BBox(BaseModel):
    """Bounding box coordinates"""
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate")
    width: float = Field(..., description="Width")
    height: float = Field(..., description="Height")


class TableCell(BaseModel):
    """Table cell data"""
    row: int
    col: int
    text: str
    rowspan: Optional[int] = 1
    colspan: Optional[int] = 1


class TableData(BaseModel):
    """Structured table data"""
    rows: List[List[str]] = Field(..., description="Table rows")
    columns: List[str] = Field(..., description="Column headers")
    merged_cells: Optional[List[Dict[str, Any]]] = Field(None, description="Merged cells info")


class ParsedBlock(BaseModel):
    """Parsed document block"""
    type: Literal["paragraph", "heading", "table", "formula", "figure_caption", "list"] = Field(
        ..., description="Block type"
    )
    text: str = Field(..., description="Block text content")
    bbox: BBox = Field(..., description="Bounding box")
    reading_order: int = Field(..., description="Reading order index")
    page_num: int = Field(..., description="Page number")
    table_data: Optional[TableData] = Field(None, description="Table data (if type=table)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ParsedPage(BaseModel):
    """Parsed document page"""
    page_num: int = Field(..., description="Page number (1-indexed)")
    blocks: List[ParsedBlock] = Field(..., description="Page blocks")
    width: float = Field(..., description="Page width in pixels")
    height: float = Field(..., description="Page height in pixels")


class ParsedChunk(BaseModel):
    """
    Semantic chunk for RAG
    
    Must-have fields for RAG indexing:
    - text: Chunk text content (required)
    - metadata.dao_id: DAO identifier (required for filtering)
    - metadata.doc_id: Document identifier (required for citation)
    
    Recommended fields:
    - page: Page number (for citation)
    - section: Section name (for context)
    - metadata.block_type: Type of block (heading, paragraph, etc.)
    - metadata.reading_order: Reading order (for sorting)
    """
    text: str = Field(..., description="Chunk text (required for RAG)")
    page: int = Field(..., description="Page number (for citation)")
    bbox: Optional[BBox] = Field(None, description="Bounding box (for highlighting)")
    section: Optional[str] = Field(None, description="Section name (for context)")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata (must include dao_id, doc_id for RAG)"
    )


class QAPair(BaseModel):
    """Question-Answer pair"""
    question: str = Field(..., description="Question")
    answer: str = Field(..., description="Answer")
    source_page: int = Field(..., description="Source page number")
    source_bbox: Optional[BBox] = Field(None, description="Source bounding box")
    confidence: Optional[float] = Field(None, description="Confidence score")


class ParsedDocument(BaseModel):
    """
    Complete parsed document
    
    Must-have fields for RAG integration:
    - doc_id: Unique document identifier (required for RAG indexing)
    - pages: List of parsed pages with blocks (required for content)
    - doc_type: Document type (required for processing)
    
    Recommended fields for RAG:
    - metadata.dao_id: DAO identifier (for filtering)
    - metadata.user_id: User who uploaded (for access control)
    - metadata.title: Document title (for display)
    - metadata.created_at: Upload timestamp (for sorting)
    """
    doc_id: str = Field(..., description="Document ID (required for RAG)")
    doc_url: Optional[str] = Field(None, description="Document URL")
    doc_type: Literal["pdf", "image"] = Field(..., description="Document type")
    pages: List[ParsedPage] = Field(..., description="Parsed pages (required for RAG)")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Document metadata (should include dao_id, user_id for RAG)"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")


class ParseRequest(BaseModel):
    """Parse request"""
    doc_url: Optional[str] = Field(None, description="Document URL")
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks", "layout_only", "region"] = Field(
        "raw_json", description="Output mode"
    )
    dao_id: Optional[str] = Field(None, description="DAO ID")
    doc_id: Optional[str] = Field(None, description="Document ID")


class ParseResponse(BaseModel):
    """Parse response"""
    document: Optional[ParsedDocument] = Field(None, description="Parsed document (raw_json mode)")
    markdown: Optional[str] = Field(None, description="Markdown content (markdown mode)")
    qa_pairs: Optional[List[QAPair]] = Field(None, description="QA pairs (qa_pairs mode)")
    chunks: Optional[List[ParsedChunk]] = Field(None, description="Chunks (chunks mode)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ChunksResponse(BaseModel):
    """Chunks response for RAG"""
    chunks: List[ParsedChunk] = Field(..., description="Document chunks")
    total_chunks: int = Field(..., description="Total number of chunks")
    doc_id: str = Field(..., description="Document ID")
    dao_id: str = Field(..., description="DAO ID")

