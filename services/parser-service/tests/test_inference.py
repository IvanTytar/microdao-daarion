"""
Tests for inference functions
"""

import pytest
from PIL import Image

from app.runtime.inference import (
    parse_document_from_images,
    dummy_parse_document_from_images
)
from app.core.config import settings


class TestDummyParser:
    """Tests for dummy parser"""
    
    def test_dummy_parse_document_from_images(self):
        """Test dummy parser with images"""
        images = [
            Image.new('RGB', (800, 600), color='white'),
            Image.new('RGB', (800, 600), color='white')
        ]
        
        doc = dummy_parse_document_from_images(images, doc_id="test-doc")
        
        assert doc.doc_id == "test-doc"
        assert len(doc.pages) == 2
        assert all(len(page.blocks) > 0 for page in doc.pages)
        assert all(page.width == 800 for page in doc.pages)
        assert all(page.height == 600 for page in doc.pages)


class TestParseDocumentFromImages:
    """Tests for parse_document_from_images"""
    
    def test_parse_document_from_images_dummy_mode(self, monkeypatch):
        """Test parsing with dummy mode enabled"""
        monkeypatch.setenv("USE_DUMMY_PARSER", "true")
        from app.core.config import Settings
        settings = Settings()
        
        images = [Image.new('RGB', (800, 600), color='white')]
        doc = parse_document_from_images(images, doc_id="test-doc")
        
        assert doc.doc_id == "test-doc"
        assert len(doc.pages) == 1
    
    def test_parse_document_from_images_empty(self):
        """Test parsing with empty images list"""
        with pytest.raises(ValueError, match="No valid images"):
            parse_document_from_images([], doc_id="test-doc")

