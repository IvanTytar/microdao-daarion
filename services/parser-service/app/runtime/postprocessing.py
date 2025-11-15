"""
Post-processing functions to convert model output to structured formats
"""

import logging
import re
from typing import List, Dict, Any, Optional

from app.schemas import (
    ParsedDocument, ParsedPage, ParsedBlock, ParsedChunk, QAPair, BBox
)

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """
    Normalize text: remove extra whitespace, line breaks, invisible chars
    
    Args:
        text: Raw text
    
    Returns:
        Normalized text
    """
    if not text:
        return ""
    
    # Remove invisible characters
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    return text


def build_parsed_document(
    pages_data: List[Dict[str, Any]],
    doc_id: str,
    doc_type: str,
    metadata: Dict[str, Any] = None
) -> ParsedDocument:
    """
    Build ParsedDocument from model output
    
    Args:
        pages_data: List of page data from model
            Each page should have: blocks, width, height
        doc_id: Document ID
        doc_type: Document type ("pdf" or "image")
        metadata: Additional metadata
    
    Returns:
        ParsedDocument
    """
    pages = []
    
    for page_idx, page_data in enumerate(pages_data, start=1):
        blocks = []
        
        for block_data in page_data.get('blocks', []):
            # Normalize text
            text = normalize_text(block_data.get('text', ''))
            
            if not text:
                continue
            
            # Extract bbox
            bbox_data = block_data.get('bbox', {})
            bbox = BBox(
                x=bbox_data.get('x', 0),
                y=bbox_data.get('y', 0),
                width=bbox_data.get('width', 0),
                height=bbox_data.get('height', 0)
            )
            
            # Create block
            block = ParsedBlock(
                type=block_data.get('type', 'paragraph'),
                text=text,
                bbox=bbox,
                reading_order=block_data.get('reading_order', len(blocks) + 1),
                page_num=page_idx,
                metadata=block_data.get('metadata', {})
            )
            
            blocks.append(block)
        
        page = ParsedPage(
            page_num=page_idx,
            blocks=blocks,
            width=page_data.get('width', 0),
            height=page_data.get('height', 0)
        )
        pages.append(page)
    
    return ParsedDocument(
        doc_id=doc_id,
        doc_type=doc_type,
        pages=pages,
        metadata=metadata or {}
    )


def build_chunks(
    parsed_doc: ParsedDocument,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    dao_id: Optional[str] = None
) -> List[ParsedChunk]:
    """
    Build semantic chunks from ParsedDocument
    
    Args:
        parsed_doc: Parsed document
        chunk_size: Target chunk size in characters
        chunk_overlap: Overlap between chunks
        dao_id: Optional DAO ID for metadata
    
    Returns:
        List of ParsedChunk
    """
    chunks = []
    
    for page in parsed_doc.pages:
        # Group blocks by section (heading-based)
        current_section = None
        current_text_parts = []
        
        for block in page.blocks:
            # Update section if we encounter a heading
            if block.type == 'heading':
                # Save previous section if exists
                if current_text_parts:
                    text = ' '.join(current_text_parts)
                    if text:
                        chunks.append(ParsedChunk(
                            text=text,
                            page=page.page_num,
                            bbox=block.bbox,  # Use first block's bbox
                            section=current_section or "main",
                            metadata={
                                "dao_id": dao_id,
                                "doc_id": parsed_doc.doc_id,
                                "chunk_type": "section"
                            }
                        ))
                
                current_section = normalize_text(block.text)
                current_text_parts = []
            
            # Add block text
            if block.text:
                current_text_parts.append(block.text)
        
        # Save last section
        if current_text_parts:
            text = ' '.join(current_text_parts)
            if text:
                chunks.append(ParsedChunk(
                    text=text,
                    page=page.page_num,
                    section=current_section or "main",
                    metadata={
                        "dao_id": dao_id,
                        "doc_id": parsed_doc.doc_id,
                        "chunk_type": "section"
                    }
                ))
    
    # Split large chunks
    final_chunks = []
    for chunk in chunks:
        if len(chunk.text) <= chunk_size:
            final_chunks.append(chunk)
        else:
            # Split into smaller chunks
            words = chunk.text.split()
            current_chunk_words = []
            current_length = 0
            
            for word in words:
                word_length = len(word) + 1  # +1 for space
                if current_length + word_length > chunk_size and current_chunk_words:
                    # Save current chunk
                    chunk_text = ' '.join(current_chunk_words)
                    final_chunks.append(ParsedChunk(
                        text=chunk_text,
                        page=chunk.page,
                        bbox=chunk.bbox,
                        section=chunk.section,
                        metadata=chunk.metadata
                    ))
                    
                    # Start new chunk with overlap
                    overlap_words = current_chunk_words[-chunk_overlap:] if chunk_overlap > 0 else []
                    current_chunk_words = overlap_words + [word]
                    current_length = sum(len(w) + 1 for w in current_chunk_words)
                else:
                    current_chunk_words.append(word)
                    current_length += word_length
            
            # Save last chunk
            if current_chunk_words:
                chunk_text = ' '.join(current_chunk_words)
                final_chunks.append(ParsedChunk(
                    text=chunk_text,
                    page=chunk.page,
                    bbox=chunk.bbox,
                    section=chunk.section,
                    metadata=chunk.metadata
                ))
    
    logger.info(f"Created {len(final_chunks)} chunks from document")
    return final_chunks


def build_qa_pairs(
    parsed_doc: ParsedDocument,
    max_pairs: int = 10
) -> List[QAPair]:
    """
    Build Q&A pairs from ParsedDocument
    
    This is a simple implementation. For production, consider using LLM
    to generate better Q&A pairs.
    
    Args:
        parsed_doc: Parsed document
        max_pairs: Maximum number of Q&A pairs to generate
    
    Returns:
        List of QAPair
    """
    qa_pairs = []
    
    # Simple heuristic: use headings as questions, following paragraphs as answers
    for page in parsed_doc.pages:
        for i, block in enumerate(page.blocks):
            if block.type == 'heading' and i + 1 < len(page.blocks):
                question = f"What is {normalize_text(block.text)}?"
                answer_block = page.blocks[i + 1]
                answer = normalize_text(answer_block.text)
                
                if answer:
                    qa_pairs.append(QAPair(
                        question=question,
                        answer=answer,
                        source_page=page.page_num,
                        source_bbox=block.bbox,
                        confidence=0.7  # Placeholder
                    ))
                    
                    if len(qa_pairs) >= max_pairs:
                        break
        
        if len(qa_pairs) >= max_pairs:
            break
    
    logger.info(f"Generated {len(qa_pairs)} Q&A pairs")
    return qa_pairs


def build_markdown(parsed_doc: ParsedDocument) -> str:
    """
    Build Markdown representation from ParsedDocument
    
    Args:
        parsed_doc: Parsed document
    
    Returns:
        Markdown string
    """
    markdown_parts = []
    
    for page in parsed_doc.pages:
        if len(parsed_doc.pages) > 1:
            markdown_parts.append(f"\n## Page {page.page_num}\n")
        
        for block in page.blocks:
            text = normalize_text(block.text)
            if not text:
                continue
            
            if block.type == 'heading':
                # Determine heading level (simple heuristic)
                if len(text) < 50:
                    markdown_parts.append(f"### {text}\n")
                else:
                    markdown_parts.append(f"#### {text}\n")
            elif block.type == 'paragraph':
                markdown_parts.append(f"{text}\n\n")
            elif block.type == 'list':
                # Simple list formatting
                lines = text.split('\n')
                for line in lines:
                    if line.strip():
                        markdown_parts.append(f"- {line.strip()}\n")
                markdown_parts.append("\n")
            elif block.type == 'table' and block.table_data:
                # Format table as Markdown
                table = block.table_data
                if table.columns:
                    # Header
                    markdown_parts.append("| " + " | ".join(table.columns) + " |\n")
                    markdown_parts.append("| " + " | ".join(["---"] * len(table.columns)) + " |\n")
                    
                    # Rows
                    for row in table.rows:
                        markdown_parts.append("| " + " | ".join(str(cell) for cell in row) + " |\n")
                    markdown_parts.append("\n")
            else:
                # Default: plain text
                markdown_parts.append(f"{text}\n\n")
    
    return ''.join(markdown_parts)

