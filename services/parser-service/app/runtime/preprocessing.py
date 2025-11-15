"""
Preprocessing functions for PDF and images
"""

import logging
from typing import List, Optional
from io import BytesIO
from pathlib import Path

from PIL import Image
import pdf2image

from app.core.config import settings

logger = logging.getLogger(__name__)


def convert_pdf_to_images(
    pdf_bytes: bytes,
    dpi: Optional[int] = None,
    max_pages: Optional[int] = None
) -> List[Image.Image]:
    """
    Convert PDF bytes to list of PIL Images
    
    Args:
        pdf_bytes: PDF file content as bytes
        dpi: DPI for conversion (default from settings)
        max_pages: Maximum number of pages to process (default from settings)
    
    Returns:
        List of PIL Images (one per page)
    """
    dpi = dpi or getattr(settings, 'PDF_DPI', 200)
    max_pages = max_pages or settings.PARSER_MAX_PAGES
    
    try:
        # Convert PDF to images
        images = pdf2image.convert_from_bytes(
            pdf_bytes,
            dpi=dpi,
            first_page=1,
            last_page=max_pages
        )
        
        logger.info(f"Converted PDF to {len(images)} images (DPI: {dpi}, max_pages: {max_pages})")
        
        return images
        
    except Exception as e:
        logger.error(f"Failed to convert PDF to images: {e}", exc_info=True)
        raise ValueError(f"PDF conversion failed: {str(e)}")


def load_image(image_bytes: bytes) -> Image.Image:
    """
    Load image from bytes
    
    Args:
        image_bytes: Image file content as bytes
    
    Returns:
        PIL Image
    """
    try:
        image = Image.open(BytesIO(image_bytes))
        logger.info(f"Loaded image: {image.format}, size: {image.size}")
        return image
        
    except Exception as e:
        logger.error(f"Failed to load image: {e}", exc_info=True)
        raise ValueError(f"Image loading failed: {str(e)}")


def normalize_image(
    image: Image.Image,
    max_size: Optional[int] = None
) -> Image.Image:
    """
    Normalize image for model input
    
    - Convert to RGB
    - Resize to max_size (preserving aspect ratio)
    - Ensure proper format
    
    Args:
        image: PIL Image
        max_size: Maximum size for longest side (default from settings)
    
    Returns:
        Normalized PIL Image
    """
    max_size = max_size or getattr(settings, 'IMAGE_MAX_SIZE', 2048)
    
    # Convert to RGB if needed
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize if needed (preserve aspect ratio)
    width, height = image.size
    if width > max_size or height > max_size:
        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))
        
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        logger.info(f"Resized image from {width}x{height} to {new_width}x{new_height}")
    
    return image


def prepare_images_for_model(
    images: List[Image.Image],
    max_size: Optional[int] = None
) -> List[Image.Image]:
    """
    Prepare list of images for model inference
    
    - Normalize each image
    - Apply batch processing if needed
    
    Args:
        images: List of PIL Images
        max_size: Maximum size for longest side
    
    Returns:
        List of normalized PIL Images
    """
    normalized = []
    
    for idx, image in enumerate(images):
        try:
            norm_image = normalize_image(image, max_size)
            normalized.append(norm_image)
        except Exception as e:
            logger.warning(f"Failed to normalize image {idx + 1}: {e}")
            # Skip problematic images
            continue
    
    logger.info(f"Prepared {len(normalized)} images for model")
    return normalized


def detect_file_type(content: bytes, filename: Optional[str] = None) -> str:
    """
    Detect file type from content and/or filename
    
    Args:
        content: File content as bytes
        filename: Optional filename (for extension detection)
    
    Returns:
        File type: "pdf" or "image"
    """
    # Check magic bytes
    if content.startswith(b'%PDF'):
        return "pdf"
    
    # Check by extension if available
    if filename:
        ext = Path(filename).suffix.lower()
        if ext == '.pdf':
            return "pdf"
        elif ext in ['.png', '.jpg', '.jpeg', '.webp', '.tiff', '.tif']:
            return "image"
    
    # Try to open as image
    try:
        Image.open(BytesIO(content))
        return "image"
    except:
        pass
    
    raise ValueError("Unsupported file type. Expected PDF or image (PNG/JPEG/WebP)")


def validate_file_size(content: bytes) -> None:
    """
    Validate file size against MAX_FILE_SIZE_MB
    
    Args:
        content: File content as bytes
    
    Raises:
        ValueError if file is too large
    """
    max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    file_size = len(content)
    
    if file_size > max_size_bytes:
        raise ValueError(
            f"File size ({file_size / 1024 / 1024:.2f} MB) exceeds maximum "
            f"({settings.MAX_FILE_SIZE_MB} MB)"
        )

