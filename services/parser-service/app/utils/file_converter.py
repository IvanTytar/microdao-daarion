"""
Helper functions for file conversion (PDF/image → PNG bytes)
"""

import logging
from typing import Tuple, Optional
from io import BytesIO

from PIL import Image
from app.runtime.preprocessing import convert_pdf_to_images, load_image, detect_file_type

logger = logging.getLogger(__name__)


async def pdf_or_image_to_png_bytes(
    filename: Optional[str],
    file_bytes: bytes
) -> Tuple[bytes, int]:
    """
    Convert PDF or image file to PNG bytes
    
    Args:
        filename: Original filename (for type detection)
        file_bytes: File content as bytes
    
    Returns:
        Tuple of (PNG bytes, number of pages)
    
    Raises:
        ValueError: If file type is not supported or conversion fails
    """
    # Detect file type
    doc_type = detect_file_type(file_bytes, filename)
    
    if doc_type == "pdf":
        # Convert PDF to images
        images = convert_pdf_to_images(file_bytes)
        
        if not images:
            raise ValueError("PDF conversion produced no images")
        
        # Convert first page to PNG bytes (for single-page processing)
        # For multi-page, we'll process all pages separately
        first_image = images[0]
        buf = BytesIO()
        first_image.convert("RGB").save(buf, format="PNG")
        png_bytes = buf.getvalue()
        
        return png_bytes, len(images)
        
    else:
        # Load image and convert to PNG
        image = load_image(file_bytes)
        buf = BytesIO()
        image.convert("RGB").save(buf, format="PNG")
        png_bytes = buf.getvalue()
        
        return png_bytes, 1

