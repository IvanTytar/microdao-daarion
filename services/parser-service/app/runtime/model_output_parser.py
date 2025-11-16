"""
Parser for dots.ocr model output
Converts model output to structured blocks

Expected dots.ocr output formats:
1. JSON with structured blocks (preferred)
2. Plain text with layout hints
3. Markdown-like structure

This parser handles all formats and normalizes to ParsedBlock structure.
"""

import logging
import json
import re
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image

logger = logging.getLogger(__name__)


def parse_model_output_to_blocks(
    model_output: str,
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """
    Parse dots.ocr model output into structured blocks
    
    Handles multiple output formats:
    1. JSON with "blocks" array (preferred)
    2. JSON with "pages" array
    3. Plain text with layout hints
    4. Markdown-like structure
    
    Args:
        model_output: Raw text output from model
        image_size: (width, height) of the image
        page_num: Page number
    
    Returns:
        List of block dictionaries with normalized structure
    """
    blocks = []
    
    try:
        # Format 1: Try to parse as JSON (structured output)
        parsed_json = _try_parse_json(model_output)
        if parsed_json:
            blocks = _extract_blocks_from_json(parsed_json, image_size, page_num)
            if blocks:
                logger.debug(f"Parsed {len(blocks)} blocks from JSON output")
                return blocks
        
        # Format 2: Try to parse as structured text (markdown-like)
        blocks = _parse_structured_text(model_output, image_size, page_num)
        if blocks:
            logger.debug(f"Parsed {len(blocks)} blocks from structured text")
            return blocks
        
        # Format 3: Fallback - plain text as single paragraph
        blocks = _parse_plain_text(model_output, image_size, page_num)
        logger.debug(f"Parsed {len(blocks)} blocks from plain text")
        
    except Exception as e:
        logger.error(f"Error parsing model output: {e}", exc_info=True)
        blocks = _create_fallback_block(model_output, image_size, page_num)
    
    return blocks


def _try_parse_json(text: str) -> Optional[Dict[str, Any]]:
    """Try to parse text as JSON"""
    try:
        # Try to find JSON in text (might be wrapped in markdown code blocks)
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Try direct JSON parse
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None


def _extract_blocks_from_json(
    data: Dict[str, Any],
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """Extract blocks from JSON structure"""
    blocks = []
    
    # Format: {"blocks": [...]}
    if "blocks" in data and isinstance(data["blocks"], list):
        for idx, block_data in enumerate(data["blocks"], start=1):
            block = _normalize_block(block_data, image_size, idx)
            if block:
                blocks.append(block)
    
    # Format: {"pages": [{"blocks": [...]}]}
    elif "pages" in data and isinstance(data["pages"], list):
        for page_data in data["pages"]:
            if isinstance(page_data, dict) and "blocks" in page_data:
                for idx, block_data in enumerate(page_data["blocks"], start=1):
                    block = _normalize_block(block_data, image_size, idx)
                    if block:
                        blocks.append(block)
    
    # Format: Direct array of blocks
    elif isinstance(data, list):
        for idx, block_data in enumerate(data, start=1):
            block = _normalize_block(block_data, image_size, idx)
            if block:
                blocks.append(block)
    
    return blocks


def _normalize_block(
    block_data: Dict[str, Any],
    image_size: tuple[int, int],
    reading_order: int
) -> Optional[Dict[str, Any]]:
    """Normalize block data to standard format"""
    if not isinstance(block_data, dict):
        return None
    
    # Extract text
    text = block_data.get("text") or block_data.get("content") or ""
    if not text or not text.strip():
        return None
    
    # Extract type
    block_type = block_data.get("type") or block_data.get("block_type") or "paragraph"
    
    # Normalize type
    type_mapping = {
        "heading": "heading",
        "title": "heading",
        "h1": "heading",
        "h2": "heading",
        "h3": "heading",
        "paragraph": "paragraph",
        "p": "paragraph",
        "text": "paragraph",
        "table": "table",
        "formula": "formula",
        "figure": "figure_caption",
        "caption": "figure_caption",
        "list": "list",
        "li": "list"
    }
    block_type = type_mapping.get(block_type.lower(), "paragraph")
    
    # Extract bbox
    bbox = block_data.get("bbox") or block_data.get("bounding_box") or {}
    if isinstance(bbox, list) and len(bbox) >= 4:
        # Format: [x, y, width, height]
        bbox = {
            "x": float(bbox[0]),
            "y": float(bbox[1]),
            "width": float(bbox[2]),
            "height": float(bbox[3])
        }
    elif isinstance(bbox, dict):
        # Ensure all fields are present
        bbox = {
            "x": float(bbox.get("x", 0)),
            "y": float(bbox.get("y", 0)),
            "width": float(bbox.get("width", image_size[0])),
            "height": float(bbox.get("height", 30))
        }
    else:
        # Default bbox
        bbox = {
            "x": 0,
            "y": reading_order * 30,
            "width": image_size[0],
            "height": 30
        }
    
    # Build normalized block
    normalized = {
        "type": block_type,
        "text": text.strip(),
        "bbox": bbox,
        "reading_order": block_data.get("reading_order") or reading_order
    }
    
    # Add table data if present
    if block_type == "table" and "table_data" in block_data:
        normalized["table_data"] = block_data["table_data"]
    
    # Add metadata if present
    if "metadata" in block_data:
        normalized["metadata"] = block_data["metadata"]
    
    return normalized


def _parse_structured_text(
    text: str,
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """Parse structured text (markdown-like) into blocks"""
    blocks = []
    lines = text.strip().split('\n')
    
    current_block = None
    reading_order = 1
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_block:
                blocks.append(current_block)
                current_block = None
            continue
        
        # Detect heading (markdown style)
        heading_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if heading_match:
            if current_block:
                blocks.append(current_block)
            
            level = len(heading_match.group(1))
            heading_text = heading_match.group(2)
            
            current_block = {
                "type": "heading",
                "text": heading_text,
                "bbox": {
                    "x": 0,
                    "y": reading_order * 30,
                    "width": image_size[0],
                    "height": 30
                },
                "reading_order": reading_order
            }
            reading_order += 1
            continue
        
        # Detect list item
        if re.match(r'^[-*+]\s+', line) or re.match(r'^\d+\.\s+', line):
            if current_block and current_block["type"] != "list":
                blocks.append(current_block)
            
            list_text = re.sub(r'^[-*+]\s+', '', line)
            list_text = re.sub(r'^\d+\.\s+', '', list_text)
            
            current_block = {
                "type": "list",
                "text": list_text,
                "bbox": {
                    "x": 0,
                    "y": reading_order * 30,
                    "width": image_size[0],
                    "height": 30
                },
                "reading_order": reading_order
            }
            reading_order += 1
            continue
        
        # Regular paragraph
        if current_block and current_block["type"] == "paragraph":
            current_block["text"] += " " + line
        else:
            if current_block:
                blocks.append(current_block)
            
            current_block = {
                "type": "paragraph",
                "text": line,
                "bbox": {
                    "x": 0,
                    "y": reading_order * 30,
                    "width": image_size[0],
                    "height": 30
                },
                "reading_order": reading_order
            }
            reading_order += 1
    
    if current_block:
        blocks.append(current_block)
    
    return blocks


def _parse_plain_text(
    text: str,
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """Parse plain text as single paragraph"""
    if not text or not text.strip():
        return []
    
    return [{
        "type": "paragraph",
        "text": text.strip(),
        "bbox": {
            "x": 0,
            "y": 0,
            "width": image_size[0],
            "height": image_size[1]
        },
        "reading_order": 1
    }]


def _create_fallback_block(
    text: str,
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """Create fallback block when parsing fails"""
    return [{
        "type": "paragraph",
        "text": text.strip() if text else f"Page {page_num} (parsing failed)",
        "bbox": {
            "x": 0,
            "y": 0,
            "width": image_size[0],
            "height": image_size[1]
        },
        "reading_order": 1,
        "metadata": {"parsing_error": True}
    }]


def extract_layout_info(model_output: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Extract layout information from model output (if available)
    
    Args:
        model_output: Model output dictionary
    
    Returns:
        Layout info dictionary or None
    """
    # This function should be customized based on actual dots.ocr output format
    # For now, return None (no layout info)
    return None

