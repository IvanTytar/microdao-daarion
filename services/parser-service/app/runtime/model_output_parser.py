"""
Parser for dots.ocr model output
Converts model output to structured blocks
"""

import logging
import json
from typing import List, Dict, Any, Optional
from PIL import Image

logger = logging.getLogger(__name__)


def parse_model_output_to_blocks(
    model_output: str,
    image_size: tuple[int, int],
    page_num: int
) -> List[Dict[str, Any]]:
    """
    Parse dots.ocr model output into structured blocks
    
    Args:
        model_output: Raw text output from model (may be JSON or plain text)
        image_size: (width, height) of the image
        page_num: Page number
    
    Returns:
        List of block dictionaries
    """
    blocks = []
    
    try:
        # Try to parse as JSON first (if model outputs structured JSON)
        try:
            output_data = json.loads(model_output)
            if isinstance(output_data, dict) and "blocks" in output_data:
                # Model outputs structured format
                return output_data["blocks"]
            elif isinstance(output_data, list):
                # Model outputs list of blocks
                return output_data
        except (json.JSONDecodeError, KeyError):
            # Not JSON, treat as plain text
            pass
        
        # Parse plain text output
        # This is a simple heuristic - adjust based on actual dots.ocr output format
        lines = model_output.strip().split('\n')
        
        current_block = None
        reading_order = 1
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Heuristic: lines starting with # are headings
            if line.startswith('#'):
                # Save previous block
                if current_block:
                    blocks.append(current_block)
                
                # New heading block
                current_block = {
                    "type": "heading",
                    "text": line.lstrip('#').strip(),
                    "bbox": {
                        "x": 0,
                        "y": reading_order * 30,
                        "width": image_size[0],
                        "height": 30
                    },
                    "reading_order": reading_order
                }
                reading_order += 1
            else:
                # Regular paragraph
                if current_block and current_block["type"] == "paragraph":
                    # Append to existing paragraph
                    current_block["text"] += " " + line
                else:
                    # Save previous block
                    if current_block:
                        blocks.append(current_block)
                    
                    # New paragraph block
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
        
        # Save last block
        if current_block:
            blocks.append(current_block)
        
        # If no blocks were created, create a single paragraph with all text
        if not blocks:
            blocks.append({
                "type": "paragraph",
                "text": model_output.strip(),
                "bbox": {
                    "x": 0,
                    "y": 0,
                    "width": image_size[0],
                    "height": image_size[1]
                },
                "reading_order": 1
            })
        
    except Exception as e:
        logger.error(f"Error parsing model output: {e}", exc_info=True)
        # Fallback: create single block with raw output
        blocks = [{
            "type": "paragraph",
            "text": model_output.strip() if model_output else "",
            "bbox": {
                "x": 0,
                "y": 0,
                "width": image_size[0],
                "height": image_size[1]
            },
            "reading_order": 1
        }]
    
    return blocks


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

