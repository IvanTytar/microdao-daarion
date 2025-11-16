"""
Tests for query pipeline
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.query_pipeline import answer_query, _build_citations


class TestQueryPipeline:
    """Tests for RAG query pipeline"""
    
    @pytest.mark.asyncio
    async def test_answer_query_no_documents(self):
        """Test query when no documents found"""
        with patch("app.query_pipeline._retrieve_documents", return_value=[]):
            result = await answer_query(
                dao_id="test-dao",
                question="Test question"
            )
            
            assert "answer" in result
            assert "На жаль, я не знайшов" in result["answer"]
            assert result["citations"] == []
    
    @pytest.mark.asyncio
    async def test_build_citations(self):
        """Test citation building"""
        from haystack.schema import Document
        
        documents = [
            Document(
                content="Test content 1",
                meta={"doc_id": "doc1", "page": 1, "section": "Section 1"}
            ),
            Document(
                content="Test content 2",
                meta={"doc_id": "doc2", "page": 2}
            )
        ]
        
        citations = _build_citations(documents)
        
        assert len(citations) == 2
        assert citations[0]["doc_id"] == "doc1"
        assert citations[0]["page"] == 1
        assert citations[0]["section"] == "Section 1"
        assert citations[1]["doc_id"] == "doc2"
        assert citations[1]["page"] == 2

