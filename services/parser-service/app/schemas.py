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
    """Semantic chunk for RAG"""
    text: str = Field(..., description="Chunk text")
    page: int = Field(..., description="Page number")
    bbox: Optional[BBox] = Field(None, description="Bounding box")
    section: Optional[str] = Field(None, description="Section name")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class QAPair(BaseModel):
    """Question-Answer pair"""
    question: str = Field(..., description="Question")
    answer: str = Field(..., description="Answer")
    source_page: int = Field(..., description="Source page number")
    source_bbox: Optional[BBox] = Field(None, description="Source bounding box")
    confidence: Optional[float] = Field(None, description="Confidence score")


class ParsedDocument(BaseModel):
    """Complete parsed document"""
    doc_id: Optional[str] = Field(None, description="Document ID")
    doc_url: Optional[str] = Field(None, description="Document URL")
    doc_type: Literal["pdf", "image"] = Field(..., description="Document type")
    pages: List[ParsedPage] = Field(..., description="Parsed pages")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")


class ParseRequest(BaseModel):
    """Parse request"""
    doc_url: Optional[str] = Field(None, description="Document URL")
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = Field(
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

