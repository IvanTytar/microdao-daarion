"""
Tests for postprocessing functions
"""

import pytest

from app.runtime.postprocessing import (
    normalize_text,
    build_parsed_document,
    build_chunks,
    build_qa_pairs,
    build_markdown
)
from app.schemas import ParsedDocument, ParsedPage, ParsedBlock, BBox


class TestTextNormalization:
    """Tests for text normalization"""
    
    def test_normalize_text_whitespace(self):
        """Test removing extra whitespace"""
        text = "  hello   world  "
        assert normalize_text(text) == "hello world"
    
    def test_normalize_text_newlines(self):
        """Test removing newlines"""
        text = "hello\n\nworld"
        assert normalize_text(text) == "hello world"
    
    def test_normalize_text_empty(self):
        """Test empty text"""
        assert normalize_text("") == ""
        assert normalize_text("   ") == ""


class TestBuildParsedDocument:
    """Tests for building ParsedDocument"""
    
    def test_build_parsed_document(self):
        """Test building ParsedDocument from model output"""
        pages_data = [
            {
                "blocks": [
                    {
                        "type": "heading",
                        "text": "  Title  ",
                        "bbox": {"x": 0, "y": 0, "width": 100, "height": 20},
                        "reading_order": 1
                    },
                    {
                        "type": "paragraph",
                        "text": "  Content  ",
                        "bbox": {"x": 0, "y": 30, "width": 100, "height": 50},
                        "reading_order": 2
                    }
                ],
                "width": 800,
                "height": 1200
            }
        ]
        
        doc = build_parsed_document(pages_data, "test-doc", "pdf")
        
        assert doc.doc_id == "test-doc"
        assert doc.doc_type == "pdf"
        assert len(doc.pages) == 1
        assert len(doc.pages[0].blocks) == 2
        assert doc.pages[0].blocks[0].text == "Title"  # Normalized
        assert doc.pages[0].blocks[0].type == "heading"


class TestBuildChunks:
    """Tests for building chunks"""
    
    def test_build_chunks(self):
        """Test building chunks from ParsedDocument"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[
                ParsedPage(
                    page_num=1,
                    blocks=[
                        ParsedBlock(
                            type="heading",
                            text="Section 1",
                            bbox=BBox(x=0, y=0, width=100, height=20),
                            reading_order=1,
                            page_num=1
                        ),
                        ParsedBlock(
                            type="paragraph",
                            text="Content of section 1",
                            bbox=BBox(x=0, y=30, width=100, height=50),
                            reading_order=2,
                            page_num=1
                        )
                    ],
                    width=800,
                    height=1200
                )
            ]
        )
        
        chunks = build_chunks(doc, dao_id="test-dao")
        
        assert len(chunks) > 0
        assert all(chunk.page == 1 for chunk in chunks)
        assert all(chunk.metadata.get("dao_id") == "test-dao" for chunk in chunks)
        assert all(chunk.metadata.get("doc_id") == "test-doc" for chunk in chunks)


class TestBuildQAPairs:
    """Tests for building Q&A pairs"""
    
    def test_build_qa_pairs(self):
        """Test building Q&A pairs from ParsedDocument"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[
                ParsedPage(
                    page_num=1,
                    blocks=[
                        ParsedBlock(
                            type="heading",
                            text="What is X?",
                            bbox=BBox(x=0, y=0, width=100, height=20),
                            reading_order=1,
                            page_num=1
                        ),
                        ParsedBlock(
                            type="paragraph",
                            text="X is a test",
                            bbox=BBox(x=0, y=30, width=100, height=50),
                            reading_order=2,
                            page_num=1
                        )
                    ],
                    width=800,
                    height=1200
                )
            ]
        )
        
        qa_pairs = build_qa_pairs(doc, max_pairs=5)
        
        assert len(qa_pairs) > 0
        assert all(isinstance(qa.question, str) for qa in qa_pairs)
        assert all(isinstance(qa.answer, str) for qa in qa_pairs)
        assert all(qa.source_page == 1 for qa in qa_pairs)


class TestBuildMarkdown:
    """Tests for building Markdown"""
    
    def test_build_markdown(self):
        """Test building Markdown from ParsedDocument"""
        doc = ParsedDocument(
            doc_id="test-doc",
            doc_type="pdf",
            pages=[
                ParsedPage(
                    page_num=1,
                    blocks=[
                        ParsedBlock(
                            type="heading",
                            text="Title",
                            bbox=BBox(x=0, y=0, width=100, height=20),
                            reading_order=1,
                            page_num=1
                        ),
                        ParsedBlock(
                            type="paragraph",
                            text="Content",
                            bbox=BBox(x=0, y=30, width=100, height=50),
                            reading_order=2,
                            page_num=1
                        )
                    ],
                    width=800,
                    height=1200
                )
            ]
        )
        
        markdown = build_markdown(doc)
        
        assert isinstance(markdown, str)
        assert "Title" in markdown
        assert "Content" in markdown
        assert "###" in markdown or "####" in markdown  # Heading markers

