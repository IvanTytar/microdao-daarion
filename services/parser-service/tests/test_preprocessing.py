"""
Tests for preprocessing functions
"""

import pytest
from PIL import Image
import io

from app.runtime.preprocessing import (
    convert_pdf_to_images,
    load_image,
    normalize_image,
    prepare_images_for_model,
    detect_file_type,
    validate_file_size
)
from app.core.config import settings


class TestImageLoading:
    """Tests for image loading functions"""
    
    def test_load_image_png(self, sample_image_bytes):
        """Test loading PNG image"""
        image = load_image(sample_image_bytes)
        assert isinstance(image, Image.Image)
        assert image.size == (800, 600)
    
    def test_load_image_invalid(self):
        """Test loading invalid image"""
        invalid_bytes = b"not an image"
        with pytest.raises(ValueError, match="Image loading failed"):
            load_image(invalid_bytes)


class TestPDFConversion:
    """Tests for PDF conversion"""
    
    def test_convert_pdf_to_images(self, sample_pdf_bytes):
        """Test converting PDF to images"""
        images = convert_pdf_to_images(sample_pdf_bytes, dpi=150, max_pages=1)
        assert len(images) > 0
        assert all(isinstance(img, Image.Image) for img in images)
    
    def test_convert_pdf_max_pages(self, sample_pdf_bytes):
        """Test PDF conversion respects max_pages"""
        images = convert_pdf_to_images(sample_pdf_bytes, max_pages=1)
        assert len(images) <= 1


class TestImageNormalization:
    """Tests for image normalization"""
    
    def test_normalize_image_rgb(self, sample_image_bytes):
        """Test image is converted to RGB"""
        image = load_image(sample_image_bytes)
        normalized = normalize_image(image)
        assert normalized.mode == 'RGB'
    
    def test_normalize_image_resize(self):
        """Test image is resized if too large"""
        # Create large image
        large_img = Image.new('RGB', (3000, 2000), color='white')
        normalized = normalize_image(large_img, max_size=2048)
        assert normalized.width <= 2048 or normalized.height <= 2048
    
    def test_normalize_image_small(self):
        """Test small image is not resized"""
        small_img = Image.new('RGB', (500, 400), color='white')
        normalized = normalize_image(small_img, max_size=2048)
        assert normalized.size == small_img.size


class TestFileTypeDetection:
    """Tests for file type detection"""
    
    def test_detect_pdf(self, sample_pdf_bytes):
        """Test PDF detection"""
        assert detect_file_type(sample_pdf_bytes) == "pdf"
        assert detect_file_type(sample_pdf_bytes, "test.pdf") == "pdf"
    
    def test_detect_image(self, sample_image_bytes):
        """Test image detection"""
        assert detect_file_type(sample_image_bytes) == "image"
        assert detect_file_type(sample_image_bytes, "test.png") == "image"
    
    def test_detect_unsupported(self):
        """Test unsupported file type"""
        with pytest.raises(ValueError, match="Unsupported file type"):
            detect_file_type(b"random bytes", "test.xyz")


class TestFileSizeValidation:
    """Tests for file size validation"""
    
    def test_validate_file_size_ok(self):
        """Test valid file size"""
        small_file = b"x" * (10 * 1024 * 1024)  # 10 MB
        validate_file_size(small_file)  # Should not raise
    
    def test_validate_file_size_too_large(self):
        """Test file size exceeds limit"""
        large_file = b"x" * (100 * 1024 * 1024)  # 100 MB
        with pytest.raises(ValueError, match="exceeds maximum"):
            validate_file_size(large_file)


class TestPrepareImages:
    """Tests for preparing images for model"""
    
    def test_prepare_images_for_model(self, sample_image_bytes):
        """Test preparing images for model"""
        image = load_image(sample_image_bytes)
        prepared = prepare_images_for_model([image])
        assert len(prepared) == 1
        assert isinstance(prepared[0], Image.Image)
        assert prepared[0].mode == 'RGB'
    
    def test_prepare_images_empty(self):
        """Test preparing empty list"""
        prepared = prepare_images_for_model([])
        assert len(prepared) == 0

