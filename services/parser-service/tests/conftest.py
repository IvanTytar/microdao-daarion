"""
Pytest configuration and fixtures
"""

import pytest
import os
from pathlib import Path
from PIL import Image
import io

# Test fixtures directory
FIXTURES_DIR = Path(__file__).parent / "fixtures"
DOCS_DIR = FIXTURES_DIR / "docs"


@pytest.fixture
def fixtures_dir():
    """Return fixtures directory path"""
    return FIXTURES_DIR


@pytest.fixture
def docs_dir():
    """Return test documents directory path"""
    return DOCS_DIR


@pytest.fixture
def sample_image_bytes():
    """Create a sample image in memory"""
    img = Image.new('RGB', (800, 600), color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    return buffer.getvalue()


@pytest.fixture
def sample_pdf_bytes():
    """Create a minimal PDF in memory (for testing)"""
    # Minimal valid PDF structure
    pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000306 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
400
%%EOF"""
    return pdf_content


@pytest.fixture
def temp_dir(tmp_path):
    """Temporary directory for test files"""
    return tmp_path

