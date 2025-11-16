"""
Inference functions for document parsing
"""

import logging
from typing import Literal, Optional, List
from pathlib import Path

import torch
from PIL import Image

from app.schemas import ParsedDocument, ParsedPage, ParsedBlock, BBox
from app.runtime.model_loader import get_model
from app.runtime.preprocessing import (
    convert_pdf_to_images, load_image, prepare_images_for_model
)
from app.runtime.postprocessing import build_parsed_document
from app.runtime.model_output_parser import parse_model_output_to_blocks
from app.runtime.ollama_client import (
    call_ollama_vision, parse_ollama_response, OutputMode as OllamaOutputMode
)
from app.core.config import settings

logger = logging.getLogger(__name__)


async def parse_document_with_ollama(
    images: List[Image.Image],
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Parse document using Ollama API
    
    Args:
        images: List of PIL Images
        output_mode: Output format mode
        doc_id: Document ID
        doc_type: Document type
    
    Returns:
        ParsedDocument
    """
    import io
    
    # Convert output_mode to Ollama format
    ollama_mode_map = {
        "raw_json": OllamaOutputMode.raw_json,
        "markdown": OllamaOutputMode.markdown,
        "qa_pairs": OllamaOutputMode.qa_pairs,
        "chunks": OllamaOutputMode.raw_json  # Use raw_json for chunks, will be processed later
    }
    ollama_mode = ollama_mode_map.get(output_mode, OllamaOutputMode.raw_json)
    
    pages_data = []
    
    for idx, image in enumerate(images, start=1):
        try:
            # Convert image to PNG bytes
            buf = io.BytesIO()
            image.convert("RGB").save(buf, format="PNG")
            png_bytes = buf.getvalue()
            
            # Call Ollama
            ollama_data = await call_ollama_vision(png_bytes, ollama_mode)
            raw_text, parsed_json = parse_ollama_response(ollama_data, ollama_mode)
            
            logger.debug(f"Ollama output for page {idx}: {raw_text[:100]}...")
            
            # Parse into blocks
            if parsed_json and isinstance(parsed_json, dict):
                # Use structured JSON if available
                blocks = parsed_json.get("blocks", [])
                if not blocks:
                    # Fallback: create block from raw text
                    blocks = [{
                        "type": "paragraph",
                        "text": raw_text,
                        "bbox": {"x": 0, "y": 0, "width": image.width, "height": image.height},
                        "reading_order": 1
                    }]
            else:
                # Parse plain text output
                blocks = parse_model_output_to_blocks(raw_text, image.size, page_num=idx)
            
            pages_data.append({
                "blocks": blocks,
                "width": image.width,
                "height": image.height
            })
            
            logger.info(f"Processed page {idx}/{len(images)} via Ollama")
            
        except Exception as e:
            logger.error(f"Error processing page {idx} with Ollama: {e}", exc_info=True)
            continue
    
    return build_parsed_document(
        pages_data=pages_data,
        doc_id=doc_id or "parsed-doc",
        doc_type=doc_type,
        metadata={"model": settings.PARSER_MODEL_NAME, "runtime": "ollama"}
    )


def parse_document_from_images(
    images: List[Image.Image],
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Parse document from list of images using dots.ocr model
    
    Args:
        images: List of PIL Images (pages)
        output_mode: Output format mode
        doc_id: Document ID
        doc_type: Document type (pdf or image)
    
    Returns:
        ParsedDocument with structured content
    """
    # Check if we should use dummy parser
    if settings.USE_DUMMY_PARSER:
        logger.info("Using dummy parser (USE_DUMMY_PARSER=true)")
        return dummy_parse_document_from_images(images, doc_id, doc_type)
    
    # Check if using Ollama runtime
    if settings.RUNTIME_TYPE == "ollama":
        logger.info("Using Ollama runtime")
        return await parse_document_with_ollama(images, output_mode, doc_id, doc_type)
    
    # Try to get local model
    model = get_model()
    
    if model is None:
        if settings.ALLOW_DUMMY_FALLBACK:
            logger.warning("Model not loaded, falling back to dummy parser")
            return dummy_parse_document_from_images(images, doc_id, doc_type)
        else:
            raise RuntimeError("Model not loaded and dummy fallback is disabled")
    
    # Prepare images for model
    prepared_images = prepare_images_for_model(images)
    
    if not prepared_images:
        raise ValueError("No valid images to process")
    
    # Process with model
    pages_data = []
    
    for idx, image in enumerate(prepared_images, start=1):
        try:
            # Prepare inputs for model
            inputs = model["processor"](images=image, return_tensors="pt")
            
            # Move inputs to device
            device = model["device"]
            if device != "cpu":
                inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v 
                         for k, v in inputs.items()}
            
            # Generate output
            with torch.no_grad():
                outputs = model["model"].generate(
                    **inputs,
                    max_new_tokens=2048,  # Adjust based on model capabilities
                    do_sample=False  # Deterministic output
                )
            
            # Decode output
            generated_text = model["processor"].decode(
                outputs[0], 
                skip_special_tokens=True
            )
            
            logger.debug(f"Model output for page {idx}: {generated_text[:100]}...")
            
            # Parse model output into blocks
            blocks = parse_model_output_to_blocks(
                generated_text,
                image.size,
                page_num=idx
            )
            
            pages_data.append({
                "blocks": blocks,
                "width": image.width,
                "height": image.height
            })
            
            logger.info(f"Processed page {idx}/{len(prepared_images)}")
            
        except Exception as e:
            logger.error(f"Error processing page {idx}: {e}", exc_info=True)
            # Continue with other pages
            continue
    
    # Build ParsedDocument from model output
    return build_parsed_document(
        pages_data=pages_data,
        doc_id=doc_id or "parsed-doc",
        doc_type=doc_type,
        metadata={"model": settings.PARSER_MODEL_NAME}
    )


def parse_document(
    input_path: str,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Parse document from file path
    
    This function handles file loading and delegates to parse_document_from_images
    
    Args:
        input_path: Path to document file (PDF or image)
        output_mode: Output format mode
        doc_id: Document ID
        doc_type: Document type (pdf or image)
    
    Returns:
        ParsedDocument with structured content
    """
    # Load file content
    with open(input_path, 'rb') as f:
        content = f.read()
    
    # Convert to images based on type
    if doc_type == "pdf":
        images = convert_pdf_to_images(content)
    else:
        image = load_image(content)
        images = [image]
    
    # Parse from images
    return parse_document_from_images(images, output_mode, doc_id, doc_type)


def dummy_parse_document_from_images(
    images: List[Image.Image],
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Dummy parser for testing (returns mock data from images)
    
    This will be replaced with actual dots.ocr inference
    """
    logger.info(f"Dummy parsing: {len(images)} image(s)")
    
    pages = []
    
    for idx, image in enumerate(images, start=1):
        mock_page = ParsedPage(
            page_num=idx,
            blocks=[
                ParsedBlock(
                    type="heading",
                    text=f"Page {idx} Title",
                    bbox=BBox(x=0, y=0, width=image.width, height=50),
                    reading_order=1,
                    page_num=idx
                ),
                ParsedBlock(
                    type="paragraph",
                    text=f"This is a dummy parsed document (page {idx}). "
                         f"Image size: {image.width}x{image.height}. "
                         f"Replace this with actual dots.ocr inference.",
                    bbox=BBox(x=0, y=60, width=image.width, height=100),
                    reading_order=2,
                    page_num=idx
                )
            ],
            width=image.width,
            height=image.height
        )
        pages.append(mock_page)
    
    return ParsedDocument(
        doc_id=doc_id or "dummy-doc-1",
        doc_type=doc_type,
        pages=pages,
        metadata={
            "parser": "dummy",
            "page_count": len(images)
        }
    )


def dummy_parse_document(
    input_path: str,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"] = "raw_json",
    doc_id: Optional[str] = None,
    doc_type: Literal["pdf", "image"] = "image"
) -> ParsedDocument:
    """
    Dummy parser for testing (returns mock data)
    
    This function loads the file and delegates to dummy_parse_document_from_images
    """
    # Load file content
    with open(input_path, 'rb') as f:
        content = f.read()
    
    # Convert to images
    if doc_type == "pdf":
        images = convert_pdf_to_images(content)
    else:
        image = load_image(content)
        images = [image]
    
    return dummy_parse_document_from_images(images, doc_id, doc_type)

