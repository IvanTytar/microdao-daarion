"""
PARSER Runtime module
Handles model loading and inference for dots.ocr
"""

from app.runtime.inference import parse_document, dummy_parse_document
from app.runtime.model_loader import load_model, get_model

__all__ = [
    "parse_document",
    "dummy_parse_document",
    "load_model",
    "get_model"
]

