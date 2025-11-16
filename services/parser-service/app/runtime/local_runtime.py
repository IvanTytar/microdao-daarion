"""
Local runtime for dots.ocr model with native prompt modes
Maps OutputMode to dots.ocr prompt modes using dict_promptmode_to_prompt
"""

import os
import tempfile
import logging
from typing import Literal, Optional

import torch
from transformers import AutoModelForVision2Seq, AutoProcessor
from qwen_vl_utils import process_vision_info

from app.core.config import settings

logger = logging.getLogger(__name__)

# Try to import dots.ocr prompt dictionary
try:
    from dots_ocr.utils.prompts import dict_promptmode_to_prompt
    DOTS_PROMPTS_AVAILABLE = True
except ImportError:
    logger.warning(
        "dots_ocr.utils.prompts not available. "
        "Using fallback prompts. Install dots.ocr package for native prompt modes."
    )
    DOTS_PROMPTS_AVAILABLE = False
    dict_promptmode_to_prompt = {}

# Map OutputMode to dots.ocr native prompt modes
DOTS_PROMPT_MAP = {
    "raw_json": "prompt_layout_all_en",      # Full JSON (layout + content)
    "markdown": "prompt_ocr",                # Content-oriented OCR (Markdown)
    "qa_pairs": "prompt_layout_all_en",      # Full JSON, then 2nd step LLM
    "chunks": "prompt_layout_all_en",        # Full JSON for chunking
    "layout_only": "prompt_layout_only_en",  # Layout only (bbox + categories, no text)
    "region": "prompt_grounding_ocr",        # Targeted region parsing (grounding)
}

# Fallback prompts if dict_promptmode_to_prompt is not available
FALLBACK_PROMPTS = {
    "prompt_layout_all_en": (
        "You are a document OCR and layout parser. "
        "Extract all text, tables, formulas, and layout into a clean JSON structure with fields like "
        "`blocks`, `tables`, `reading_order`, including bounding boxes and page numbers. "
        "Respond with JSON only, no explanations."
    ),
    "prompt_ocr": (
        "You are a document OCR and layout parser. "
        "Extract the document as Markdown, preserving headings, paragraphs, and tables. "
        "Tables should be proper GitHub-flavored Markdown tables. "
        "Respond with Markdown as plain text."
    ),
    "prompt_layout_only_en": (
        "You are a document layout parser. "
        "Extract only the layout structure (bounding boxes, block types, reading order) "
        "without the text content. "
        "Respond with JSON containing only layout information (bbox, type, reading_order)."
    ),
    "prompt_grounding_ocr": (
        "You are a document OCR assistant for targeted region parsing. "
        "Extract text and layout for the specified region of the document. "
        "Respond with JSON containing the parsed content for the region."
    ),
}

# Global model instance
_model: Optional[dict] = None
_processor: Optional[object] = None

# Model configuration
MODEL_PATH = settings.PARSER_MODEL_NAME
DEVICE = settings.PARSER_DEVICE
DTYPE = torch.bfloat16 if DEVICE != "cpu" else torch.float32
MAX_NEW_TOKENS = int(os.getenv("DOTS_OCR_MAX_NEW_TOKENS", "24000"))


def load_model():
    """Load dots.ocr model with lazy initialization"""
    global _model, _processor
    
    if _model is not None and _processor is not None:
        return _model, _processor
    
    logger.info(f"Loading dots.ocr model: {MODEL_PATH}")
    logger.info(f"Device: {DEVICE}")
    
    try:
        model = AutoModelForVision2Seq.from_pretrained(
            MODEL_PATH,
            attn_implementation="flash_attention_2",
            torch_dtype=DTYPE,
            device_map="auto",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        
        processor = AutoProcessor.from_pretrained(
            MODEL_PATH,
            trust_remote_code=True
        )
        
        if DEVICE == "cuda" and torch.cuda.is_available():
            model.to("cuda")
        elif DEVICE == "mps" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            model.to("mps")
        
        _model = model
        _processor = processor
        
        logger.info(f"Model loaded successfully on {DEVICE}")
        return _model, _processor
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}", exc_info=True)
        raise


def get_model():
    """Get loaded model instance"""
    if _model is None or _processor is None:
        return load_model()
    return _model, _processor


def _build_prompt(output_mode: str) -> str:
    """
    Build prompt for dots.ocr based on OutputMode
    
    Args:
        output_mode: One of "raw_json", "markdown", "qa_pairs", "chunks", "layout_only", "region"
    
    Returns:
        Prompt string for dots.ocr
    """
    prompt_key = DOTS_PROMPT_MAP.get(output_mode, "prompt_layout_all_en")
    
    # Try to use native dots.ocr prompts
    if DOTS_PROMPTS_AVAILABLE and prompt_key in dict_promptmode_to_prompt:
        prompt = dict_promptmode_to_prompt[prompt_key]
        logger.debug(f"Using native dots.ocr prompt: {prompt_key}")
        return prompt
    
    # Fallback to our prompts
    if prompt_key in FALLBACK_PROMPTS:
        logger.debug(f"Using fallback prompt: {prompt_key}")
        return FALLBACK_PROMPTS[prompt_key]
    
    # Ultimate fallback
    logger.warning(f"Unknown prompt key: {prompt_key}, using default")
    return FALLBACK_PROMPTS["prompt_layout_all_en"]


def _build_messages(image_path: str, prompt: str) -> list:
    """Build messages for dots.ocr model"""
    return [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image_path},
                {"type": "text", "text": prompt},
            ],
        }
    ]


def _generate_from_path(
    image_path: str,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks", "layout_only", "region"]
) -> str:
    """
    Generate output from image path using dots.ocr model
    
    Args:
        image_path: Path to image file
        output_mode: Output mode (maps to dots.ocr prompt mode)
    
    Returns:
        Generated text from model
    """
    model, processor = get_model()
    prompt = _build_prompt(output_mode)
    messages = _build_messages(image_path, prompt)
    
    # Apply chat template
    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )
    
    # Process vision info
    image_inputs, video_inputs = process_vision_info(messages)
    
    # Prepare inputs
    inputs = processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    )
    
    # Move to device
    device = DEVICE
    if device == "cuda" and torch.cuda.is_available():
        inputs = {k: v.to("cuda") if isinstance(v, torch.Tensor) else v 
                 for k, v in inputs.items()}
    elif device == "mps" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        inputs = {k: v.to("mps") if isinstance(v, torch.Tensor) else v 
                 for k, v in inputs.items()}
    
    # Generate
    with torch.inference_mode():
        generated_ids = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
        )
    
    # Trim input tokens
    generated_ids_trimmed = [
        out_ids[len(in_ids):] 
        for in_ids, out_ids in zip(inputs["input_ids"], generated_ids)
    ]
    
    # Decode
    output_text = processor.batch_decode(
        generated_ids_trimmed,
        skip_special_tokens=True,
        clean_up_tokenization_spaces=False,
    )
    
    return output_text[0]


def parse_document_with_local(
    image_bytes: bytes,
    output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks", "layout_only", "region"] = "raw_json"
) -> str:
    """
    Parse document from image bytes using local dots.ocr model
    
    Args:
        image_bytes: Image bytes (PNG/JPEG)
        output_mode: Output mode (maps to dots.ocr prompt mode)
            - raw_json: Full JSON (layout + content) via prompt_layout_all_en
            - markdown: Markdown text via prompt_ocr
            - qa_pairs: Full JSON (same as raw_json), then 2nd step LLM
            - chunks: Full JSON for chunking
            - layout_only: Layout only (bbox + categories) via prompt_layout_only_en
            - region: Targeted region parsing via prompt_grounding_ocr
    
    Returns:
        Generated text from model (JSON or Markdown depending on mode)
    
    Note:
        For "qa_pairs" mode, this returns full JSON. 
        The 2nd step (LLM Q&A generation) should be done separately.
    """
    # Save to temporary file
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        tmp_path = f.name
        f.write(image_bytes)
    
    try:
        return _generate_from_path(tmp_path, output_mode)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

