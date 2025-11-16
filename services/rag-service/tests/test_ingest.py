"""
Tests for ingest pipeline
"""

import pytest
from app.ingest_pipeline import ingest_parsed_document, _parsed_json_to_documents


class TestIngestPipeline:
    """Tests for document ingestion"""
    
    def test_parsed_json_to_documents(self):
        """Test conversion of parsed JSON to Haystack Documents"""
        parsed_json = {
            "doc_id": "test-doc",
            "doc_type": "pdf",
            "pages": [
                {
                    "page_num": 1,
                    "blocks": [
                        {
                            "type": "heading",
                            "text": "Test Document",
                            "bbox": {"x": 0, "y": 0, "width": 800, "height": 50},
                            "reading_order": 1
                        },
                        {
                            "type": "paragraph",
                            "text": "This is test content.",
                            "bbox": {"x": 0, "y": 60, "width": 800, "height": 100},
                            "reading_order": 2
                        }
                    ],
                    "width": 800,
                    "height": 600
                }
            ],
            "metadata": {
                "dao_id": "test-dao",
                "title": "Test Document"
            }
        }
        
        documents = _parsed_json_to_documents(
            parsed_json=parsed_json,
            dao_id="test-dao",
            doc_id="test-doc"
        )
        
        assert len(documents) == 2
        assert documents[0].content == "Test Document"
        assert documents[0].meta["dao_id"] == "test-dao"
        assert documents[0].meta["doc_id"] == "test-doc"
        assert documents[0].meta["page"] == 1
        assert documents[0].meta["block_type"] == "heading"
    
    def test_parsed_json_to_documents_empty_blocks(self):
        """Test that empty blocks are skipped"""
        parsed_json = {
            "doc_id": "test-doc",
            "pages": [
                {
                    "page_num": 1,
                    "blocks": [
                        {"type": "paragraph", "text": ""},
                        {"type": "paragraph", "text": "   "},
                        {"type": "paragraph", "text": "Valid content"}
                    ]
                }
            ],
            "metadata": {}
        }
        
        documents = _parsed_json_to_documents(
            parsed_json=parsed_json,
            dao_id="test-dao",
            doc_id="test-doc"
        )
        
        assert len(documents) == 1
        assert documents[0].content == "Valid content"

