"""
E2E tests for RAG Service
Tests full ingest → query pipeline
"""

import pytest
import json
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# Load example parsed JSON
FIXTURES_DIR = Path(__file__).parent / "fixtures"
EXAMPLE_JSON = json.loads((FIXTURES_DIR / "parsed_json_example.json").read_text())


class TestE2E:
    """End-to-end tests"""
    
    def test_health(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "rag-service"
    
    @pytest.mark.skip(reason="Requires database connection")
    def test_ingest_then_query(self):
        """Test full pipeline: ingest → query"""
        # Step 1: Ingest document
        ingest_request = {
            "dao_id": "daarion",
            "doc_id": "microdao-tokenomics-2025-11",
            "parsed_json": EXAMPLE_JSON
        }
        
        ingest_response = client.post("/ingest", json=ingest_request)
        assert ingest_response.status_code == 200
        ingest_data = ingest_response.json()
        assert ingest_data["status"] == "success"
        assert ingest_data["doc_count"] > 0
        
        # Step 2: Query
        query_request = {
            "dao_id": "daarion",
            "question": "Поясни токеноміку microDAO і роль стейкінгу"
        }
        
        query_response = client.post("/query", json=query_request)
        assert query_response.status_code == 200
        query_data = query_response.json()
        
        assert "answer" in query_data
        assert len(query_data["answer"]) > 0
        assert "citations" in query_data
        assert len(query_data["citations"]) > 0
        
        # Check citation structure
        citation = query_data["citations"][0]
        assert "doc_id" in citation
        assert "page" in citation
        assert "excerpt" in citation

