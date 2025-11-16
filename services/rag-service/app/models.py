"""
Pydantic models for RAG Service API
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    """Request for document ingestion"""
    dao_id: str = Field(..., description="DAO identifier")
    doc_id: str = Field(..., description="Document identifier")
    parsed_json: Dict[str, Any] = Field(..., description="ParsedDocument JSON from PARSER service")
    user_id: Optional[str] = Field(None, description="User identifier")


class IngestResponse(BaseModel):
    """Response from document ingestion"""
    status: str = Field(..., description="Status: success or error")
    doc_count: int = Field(..., description="Number of documents ingested")
    dao_id: str = Field(..., description="DAO identifier")
    doc_id: str = Field(..., description="Document identifier")
    message: Optional[str] = Field(None, description="Error message if status=error")


class QueryRequest(BaseModel):
    """Request for RAG query"""
    dao_id: str = Field(..., description="DAO identifier")
    question: str = Field(..., description="User question")
    top_k: Optional[int] = Field(None, description="Number of documents to retrieve")
    user_id: Optional[str] = Field(None, description="User identifier")


class Citation(BaseModel):
    """Citation from retrieved document"""
    doc_id: str = Field(..., description="Document identifier")
    page: int = Field(..., description="Page number")
    section: Optional[str] = Field(None, description="Section name")
    excerpt: str = Field(..., description="Document excerpt")


class QueryResponse(BaseModel):
    """Response from RAG query"""
    answer: str = Field(..., description="Generated answer")
    citations: List[Citation] = Field(..., description="List of citations")
    documents: List[Dict[str, Any]] = Field(..., description="Retrieved documents (for debugging)")

