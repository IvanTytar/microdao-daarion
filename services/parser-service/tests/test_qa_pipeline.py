"""
Tests for 2-stage Q&A pipeline (PARSER → LLM)
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from PIL import Image
import io
import json

from app.schemas import ParsedDocument, ParsedPage, ParsedBlock, BBox
from app.runtime.qa_builder import build_qa_pairs_via_router, _build_qa_prompt, _parse_qa_response


class TestQABuilder:
    """Tests for Q&A builder (2-stage pipeline)"""
    
    def test_build_qa_prompt(self):
        """Test prompt building for Q&A generation"""
        # Create mock parsed document
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[
                ParsedPage(
                    page_num=1,
                    blocks=[
                        ParsedBlock(
                            type="heading",
                            text="Test Document",
                            bbox=BBox(x=0, y=0, width=800, height=50),
                            reading_order=1,
                            page_num=1
                        ),
                        ParsedBlock(
                            type="paragraph",
                            text="This is a test document with some content.",
                            bbox=BBox(x=0, y=60, width=800, height=100),
                            reading_order=2,
                            page_num=1
                        )
                    ],
                    width=800,
                    height=600
                )
            ],
            metadata={}
        )
        
        prompt = _build_qa_prompt(doc)
        
        # Check prompt structure
        assert "OCR-документу" in prompt
        assert "JSON-масив" in prompt
        assert "question" in prompt
        assert "answer" in prompt
        assert "source_page" in prompt
        assert "Test Document" in prompt or "test document" in prompt.lower()
    
    def test_parse_qa_response_valid_json(self):
        """Test parsing valid JSON response from LLM"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[ParsedPage(page_num=1, blocks=[], width=800, height=600)],
            metadata={}
        )
        
        response_text = json.dumps([
            {
                "question": "Що це за документ?",
                "answer": "Це тестовий документ",
                "source_page": 1,
                "confidence": 0.9
            },
            {
                "question": "Який контент?",
                "answer": "Тестовий контент",
                "source_page": 1
            }
        ])
        
        qa_pairs = _parse_qa_response(response_text, doc)
        
        assert len(qa_pairs) == 2
        assert qa_pairs[0].question == "Що це за документ?"
        assert qa_pairs[0].answer == "Це тестовий документ"
        assert qa_pairs[0].source_page == 1
        assert qa_pairs[0].confidence == 0.9
    
    def test_parse_qa_response_markdown_code_block(self):
        """Test parsing JSON from markdown code block"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[ParsedPage(page_num=1, blocks=[], width=800, height=600)],
            metadata={}
        )
        
        response_text = "```json\n" + json.dumps([
            {
                "question": "Тест?",
                "answer": "Відповідь"
            }
        ]) + "\n```"
        
        qa_pairs = _parse_qa_response(response_text, doc)
        
        assert len(qa_pairs) == 1
        assert qa_pairs[0].question == "Тест?"
    
    def test_parse_qa_response_invalid_json(self):
        """Test parsing invalid JSON (should return empty list)"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[ParsedPage(page_num=1, blocks=[], width=800, height=600)],
            metadata={}
        )
        
        response_text = "This is not JSON"
        
        qa_pairs = _parse_qa_response(response_text, doc)
        
        assert len(qa_pairs) == 0
    
    @pytest.mark.asyncio
    async def test_build_qa_pairs_via_router_success(self):
        """Test successful Q&A generation via DAGI Router"""
        # Create mock parsed document
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[
                ParsedPage(
                    page_num=1,
                    blocks=[
                        ParsedBlock(
                            type="paragraph",
                            text="Test content",
                            bbox=BBox(x=0, y=0, width=800, height=100),
                            reading_order=1,
                            page_num=1
                        )
                    ],
                    width=800,
                    height=600
                )
            ],
            metadata={}
        )
        
        # Mock router response
        mock_response = {
            "ok": True,
            "data": {
                "text": json.dumps([
                    {
                        "question": "Що це?",
                        "answer": "Тест",
                        "source_page": 1
                    }
                ])
            }
        }
        
        with patch("app.runtime.qa_builder.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=MagicMock(
                    raise_for_status=MagicMock(),
                    json=lambda: mock_response
                )
            )
            
            qa_pairs = await build_qa_pairs_via_router(doc, dao_id="test-dao")
            
            assert len(qa_pairs) == 1
            assert qa_pairs[0].question == "Що це?"
    
    @pytest.mark.asyncio
    async def test_build_qa_pairs_via_router_failure(self):
        """Test Q&A generation failure (should raise exception)"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[ParsedPage(page_num=1, blocks=[], width=800, height=600)],
            metadata={}
        )
        
        with patch("app.runtime.qa_builder.httpx.AsyncClient") as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=Exception("Router error")
            )
            
            with pytest.raises(RuntimeError):
                await build_qa_pairs_via_router(doc, dao_id="test-dao")

