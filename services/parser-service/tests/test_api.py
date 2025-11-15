"""
Tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io

from app.main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    def test_health(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "parser-service"


class TestParseEndpoint:
    """Tests for parse endpoint"""
    
    def test_parse_no_file(self):
        """Test parse without file"""
        response = client.post("/ocr/parse")
        assert response.status_code == 400
    
    def test_parse_image(self):
        """Test parsing image"""
        # Create test image
        img = Image.new('RGB', (800, 600), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        response = client.post(
            "/ocr/parse",
            files={"file": ("test.png", buffer, "image/png")},
            data={"output_mode": "raw_json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "document" in data or "chunks" in data or "markdown" in data
    
    def test_parse_chunks_mode(self):
        """Test parsing in chunks mode"""
        img = Image.new('RGB', (800, 600), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        response = client.post(
            "/ocr/parse",
            files={"file": ("test.png", buffer, "image/png")},
            data={"output_mode": "chunks", "dao_id": "test-dao"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "chunks" in data
    
    def test_parse_markdown_mode(self):
        """Test parsing in markdown mode"""
        img = Image.new('RGB', (800, 600), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        response = client.post(
            "/ocr/parse",
            files={"file": ("test.png", buffer, "image/png")},
            data={"output_mode": "markdown"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "markdown" in data


class TestParseChunksEndpoint:
    """Tests for parse_chunks endpoint"""
    
    def test_parse_chunks(self):
        """Test parse_chunks endpoint"""
        img = Image.new('RGB', (800, 600), color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        response = client.post(
            "/ocr/parse_chunks",
            files={"file": ("test.png", buffer, "image/png")},
            data={"dao_id": "test-dao"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "chunks" in data
        assert "total_chunks" in data
        assert data["dao_id"] == "test-dao"

