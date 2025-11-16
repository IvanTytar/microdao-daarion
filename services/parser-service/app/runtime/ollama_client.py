"""
Ollama client for dots.ocr model
Alternative runtime using Ollama API
"""

import base64
import json
import logging
from typing import Dict, Any, Optional
from enum import Enum

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class OutputMode(str, Enum):
    raw_json = "raw_json"
    markdown = "markdown"
    qa_pairs = "qa_pairs"


def build_prompt(mode: OutputMode) -> str:
    """Build prompt for Ollama based on output mode"""
    if mode == OutputMode.raw_json:
        return (
            "You are a document OCR and layout parser. "
            "Extract all text, tables, formulas, and layout into a clean JSON structure with fields like "
            "`blocks`, `tables`, `reading_order`, including bounding boxes and page numbers. "
            "Respond with JSON only, no explanations."
        )
    elif mode == OutputMode.markdown:
        return (
            "You are a document OCR and layout parser. "
            "Extract the document as Markdown, preserving headings, paragraphs, and tables. "
            "Tables should be proper GitHub-flavored Markdown tables. "
            "Respond with Markdown as plain text."
        )
    elif mode == OutputMode.qa_pairs:
        return (
            "You are a document OCR and knowledge extraction assistant. "
            "Read the document and output a JSON array of Q&A pairs covering the key information. "
            "Each item should be {\"question\": ..., \"answer\": ..., \"page\": ..., \"section\": ...}. "
            "Respond with JSON only, no explanations."
        )
    return "You are a document OCR assistant. Extract text."


async def call_ollama_vision(
    image_bytes: bytes,
    mode: OutputMode,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Call Ollama vision API with image
    
    Args:
        image_bytes: PNG image bytes
        mode: Output mode
        model_name: Model name (defaults to PARSER_MODEL_NAME)
    
    Returns:
        Ollama response dictionary
    """
    model_name = model_name or settings.PARSER_MODEL_NAME
    
    # Encode image to base64
    img_b64 = base64.b64encode(image_bytes).decode("ascii")
    prompt = build_prompt(mode)
    
    body = {
        "model": model_name,
        "prompt": prompt,
        "images": [img_b64],
        "stream": False,
    }
    
    url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
    
    logger.info(f"Calling Ollama: {url}, model: {model_name}, mode: {mode}")
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            data = resp.json()
            
            logger.debug(f"Ollama response: {data.get('response', '')[:100]}...")
            return data
            
    except httpx.HTTPError as e:
        logger.error(f"Ollama HTTP error: {e}")
        raise RuntimeError(f"Ollama API error: {e}") from e
    except Exception as e:
        logger.error(f"Ollama error: {e}", exc_info=True)
        raise RuntimeError(f"Failed to call Ollama: {e}") from e


def parse_ollama_response(
    ollama_data: Dict[str, Any],
    mode: OutputMode
) -> tuple[str, Optional[Dict[str, Any]]]:
    """
    Parse Ollama response
    
    Args:
        ollama_data: Response from Ollama API
        mode: Output mode
    
    Returns:
        Tuple of (raw_text, parsed_json)
    """
    raw_text = ollama_data.get("response", "").strip()
    parsed_json: Optional[Dict[str, Any]] = None
    
    # Try to parse as JSON for raw_json and qa_pairs modes
    if mode in (OutputMode.raw_json, OutputMode.qa_pairs):
        try:
            parsed_json = json.loads(raw_text)
        except (json.JSONDecodeError, ValueError):
            logger.warning(f"Failed to parse response as JSON for mode {mode}")
            parsed_json = None
    
    return raw_text, parsed_json

