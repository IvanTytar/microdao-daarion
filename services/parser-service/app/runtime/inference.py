"""
Inference functions for document parsing
"""

import logging
from typing import Literal, Optional
from pathlib import Path

from app.schemas import ParsedDocument, ParsedPage, ParsedBlock, BBox
from app.runtime.model_loader import get_model
from app.core.config import settings

logger = logging.getLogger(__name__)


def parse_document(
    input_path: str,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Parse document using dots.ocr model
    
    Args:
        input_path: Path to document file (PDF or image)
        output_mode: Output format mode
        doc_id: Document ID
        doc_type: Document type (pdf or image)
    
    Returns:
        ParsedDocument with structured content
    """
    model = get_model()
    
    if model is None:
        logger.warning("Model not loaded, using dummy parser")
        return dummy_parse_document(input_path, output_mode, doc_id, doc_type)
    
    # TODO: Implement actual inference with dots.ocr
    # Example:
    # from PIL import Image
    # import pdf2image  # for PDF
    
    # if doc_type == "pdf":
    #     images = pdf2image.convert_from_path(input_path)
    # else:
    #     images = [Image.open(input_path)]
    #
    # pages = []
    # for idx, image in enumerate(images):
    #     # Process with model
    #     inputs = model["processor"](images=image, return_tensors="pt")
    #     outputs = model["model"].generate(**inputs)
    #     text = model["processor"].decode(outputs[0], skip_special_tokens=True)
    #
    #     # Parse output into blocks
    #     blocks = parse_model_output(text, idx + 1)
    #     pages.append(ParsedPage(...))
    #
    # return ParsedDocument(...)
    
    # For now, use dummy
    return dummy_parse_document(input_path, output_mode, doc_id, doc_type)


def dummy_parse_document(
    input_path: str,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Dummy parser for testing (returns mock data)
    
    This will be replaced with actual dots.ocr inference
    """
    logger.info(f"Dummy parsing: {input_path}")
    
    # Mock data
    mock_page = ParsedPage(
        page_num=1,
        blocks=[
            ParsedBlock(
                type="heading",
                text="Document Title",
                bbox=BBox(x=0, y=0, width=800, height=50),
                reading_order=1,
                page_num=1
            ),
            ParsedBlock(
                type="paragraph",
                text="This is a dummy parsed document. Replace this with actual dots.ocr inference.",
                bbox=BBox(x=0, y=60, width=800, height=100),
                reading_order=2,
                page_num=1
            )
        ],
        width=800,
        height=1200
    )
    
    return ParsedDocument(
        doc_id=doc_id or "dummy-doc-1",
        doc_type=doc_type,
        pages=[mock_page],
        metadata={
            "parser": "dummy",
            "input_path": input_path
        }
    )

