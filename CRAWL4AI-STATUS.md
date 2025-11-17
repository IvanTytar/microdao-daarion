# 🌐 Crawl4AI Service — Status

**Версія:** 1.0.0 (MVP)  
**Останнє оновлення:** 2025-01-17  
**Статус:** ✅ Implemented (MVP Ready)

---

## 🎯 Overview

**Crawl4AI Service** — веб-краулер для автоматичного завантаження та обробки веб-контенту (HTML, PDF, зображення) через PARSER Service. Інтегрований з OCR pipeline для автоматичної обробки документів з URLs.

**Документація:**
- [docs/cursor/crawl4ai_web_crawler_task.md](./docs/cursor/crawl4ai_web_crawler_task.md) — Implementation task
- [docs/cursor/CRAWL4AI_SERVICE_REPORT.md](./docs/cursor/CRAWL4AI_SERVICE_REPORT.md) — Detailed report

---

## ✅ Implementation Complete

**Дата завершення:** 2025-01-17

### Core Module

**Location:** `services/parser-service/app/crawler/crawl4ai_service.py`  
**Lines of Code:** 204

**Functions:**
- ✅ `crawl_url()` — Краулінг веб-сторінок (markdown/text/HTML)
  - Async/sync support
  - Playwright integration (optional)
  - Timeout handling
  - Error handling with fallback
- ✅ `download_document()` — Завантаження PDF та images
  - HTTP download with streaming
  - Content-Type validation
  - Size limits
- ✅ Async context manager — Automatic cleanup
- ✅ Lazy initialization — Initialize only when used

---

### Integration with PARSER Service

**Location:** `services/parser-service/app/api/endpoints.py` (lines 117-223)

**Implemented:**
- ✅ Replaced TODO with full `doc_url` implementation
- ✅ Automatic type detection (PDF/Image/HTML)
- ✅ Integration with existing OCR pipeline
- ✅ Flow:
  - **PDF/Images:** Download → OCR
  - **HTML:** Crawl → Markdown → Text → Image → OCR

**Endpoints:**
- `POST /ocr/parse` — With `doc_url` parameter
- `POST /ocr/parse_markdown` — With `doc_url` parameter
- `POST /ocr/parse_qa` — With `doc_url` parameter
- `POST /ocr/parse_chunks` — With `doc_url` parameter

---

### Configuration

**Location:** `services/parser-service/app/core/config.py`

**Parameters:**
```python
CRAWL4AI_ENABLED = True          # Enable/disable crawler
CRAWL4AI_USE_PLAYWRIGHT = False  # Use Playwright for JS rendering
CRAWL4AI_TIMEOUT = 30            # Request timeout (seconds)
CRAWL4AI_MAX_PAGES = 1           # Max pages to crawl
```

**Environment Variables:**
```bash
CRAWL4AI_ENABLED=true
CRAWL4AI_USE_PLAYWRIGHT=false
CRAWL4AI_TIMEOUT=30
CRAWL4AI_MAX_PAGES=1
```

---

### Dependencies

**File:** `services/parser-service/requirements.txt`

```
crawl4ai>=0.3.0  # Web crawler with async support
```

**Optional (for Playwright):**
```bash
# If CRAWL4AI_USE_PLAYWRIGHT=true
playwright install chromium
```

---

### Integration with Router

**Location:** `providers/ocr_provider.py`

**Updated:**
- ✅ Pass `doc_url` as form data to PARSER Service
- ✅ Support for `doc_url` parameter in RouterRequest

**Usage Example:**
```python
# Via Router
response = await router_client.route_request(
    mode="doc_parse",
    dao_id="test-dao",
    payload={
        "doc_url": "https://example.com/document.pdf",
        "output_mode": "qa_pairs"
    }
)
```

---

## 🌐 Supported Formats

### 1. PDF Documents
- ✅ Download via HTTP/HTTPS
- ✅ Pass to OCR pipeline
- ✅ Convert to images → Parse

### 2. Images
- ✅ Formats: PNG, JPEG, GIF, TIFF, BMP
- ✅ Download and validate
- ✅ Pass to OCR pipeline

### 3. HTML Pages
- ✅ Crawl and extract content
- ✅ Convert to Markdown
- ✅ Basic text → image conversion
- ⚠️ Limitation: Simple text rendering (max 5000 chars, 60 lines)

### 4. JavaScript-Rendered Pages (Optional)
- ✅ Playwright integration available
- ⚠️ Disabled by default (performance)
- 🔧 Enable: `CRAWL4AI_USE_PLAYWRIGHT=true`

---

## 🔄 Data Flow

```
User Request
    │
    ▼
┌────────────┐
│  Gateway   │
└─────┬──────┘
      │
      ▼
┌────────────┐
│   Router   │
└─────┬──────┘
      │ doc_url
      ▼
┌────────────┐
│   PARSER   │
│  Service   │
└─────┬──────┘
      │
      ▼
┌──────────────┐
│ Crawl4AI Svc │
└─────┬────────┘
      │
  ┌───┴────┐
  │        │
  ▼        ▼
PDF/IMG  HTML
  │        │
  │    ┌───┴───┐
  │    │ Crawl │
  │    │Extract│
  │    └───┬───┘
  │        │
  └────┬───┘
       ▼
  ┌──────────┐
  │   OCR    │
  │ Pipeline │
  └─────┬────┘
        │
        ▼
  ┌──────────┐
  │  Parsed  │
  │ Document │
  └──────────┘
```

---

## 📊 Statistics

**Code Size:**
- Crawler module: 204 lines
- Integration code: 107 lines
- **Total:** ~311 lines

**Configuration:**
- Parameters: 4
- Environment variables: 4

**Dependencies:**
- New: 1 (`crawl4ai`)
- Optional: Playwright (for JS rendering)

**Supported Formats:** 3 (PDF, Images, HTML)

---

## ⚠️ Known Limitations

### 1. HTML → Image Conversion (Basic)

**Current Implementation:**
- Simple text rendering with PIL
- Max 5000 characters
- Max 60 lines
- Fixed width font

**Limitations:**
- ❌ No CSS/styling support
- ❌ No complex layouts
- ❌ No images in HTML

**Recommendation:**
```python
# Add WeasyPrint for proper HTML rendering
pip install weasyprint
# Renders HTML → PDF → Images with proper layout
```

### 2. No Caching

**Current State:**
- Every request downloads page again
- No deduplication

**Recommendation:**
```python
# Add Redis cache
cache_key = f"crawl:{url_hash}"
if cached := redis.get(cache_key):
    return cached
result = await crawl_url(url)
redis.setex(cache_key, 3600, result)  # 1 hour TTL
```

### 3. No Rate Limiting

**Current State:**
- Unlimited requests to target sites
- Risk of IP blocking

**Recommendation:**
```python
# Add rate limiter
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/ocr/parse")
@limiter.limit("10/minute")  # Max 10 requests per minute
async def parse_document(...):
    ...
```

### 4. No Tests

**Current State:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No E2E tests

**Recommendation:**
- Add `tests/test_crawl4ai_service.py`
- Mock HTTP requests
- Test error handling

### 5. No robots.txt Support

**Current State:**
- Ignores robots.txt
- Risk of crawling restricted content

**Recommendation:**
```python
from urllib.robotparser import RobotFileParser
rp = RobotFileParser()
rp.set_url(f"{url}/robots.txt")
rp.read()
if not rp.can_fetch("*", url):
    raise ValueError("Crawling not allowed by robots.txt")
```

---

## 🧪 Testing

### Manual Testing

**Test PDF Download:**
```bash
curl -X POST http://localhost:9400/ocr/parse \
  -H "Content-Type: multipart/form-data" \
  -F "doc_url=https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" \
  -F "output_mode=markdown"
```

**Test HTML Crawl:**
```bash
curl -X POST http://localhost:9400/ocr/parse \
  -H "Content-Type: multipart/form-data" \
  -F "doc_url=https://example.com" \
  -F "output_mode=text"
```

**Test via Router:**
```bash
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "doc_parse",
    "dao_id": "test-dao",
    "payload": {
      "doc_url": "https://example.com/doc.pdf",
      "output_mode": "qa_pairs"
    }
  }'
```

### Unit Tests (To be implemented)

**File:** `tests/test_crawl4ai_service.py`

```python
import pytest
from app.crawler.crawl4ai_service import Crawl4AIService

@pytest.mark.asyncio
async def test_crawl_url():
    service = Crawl4AIService()
    result = await service.crawl_url("https://example.com")
    assert result is not None
    assert "text" in result or "markdown" in result

@pytest.mark.asyncio
async def test_download_document():
    service = Crawl4AIService()
    content = await service.download_document("https://example.com/doc.pdf")
    assert content is not None
    assert len(content) > 0
```

---

## 🚀 Deployment

### Docker Compose

**Already configured in:** `docker-compose.yml`

```yaml
services:
  parser-service:
    build: ./services/parser-service
    environment:
      - CRAWL4AI_ENABLED=true
      - CRAWL4AI_USE_PLAYWRIGHT=false
      - CRAWL4AI_TIMEOUT=30
      - CRAWL4AI_MAX_PAGES=1
    ports:
      - "9400:9400"
```

### Start Service

```bash
# Start PARSER Service with Crawl4AI
docker-compose up -d parser-service

# Check logs
docker-compose logs -f parser-service | grep -i crawl

# Health check
curl http://localhost:9400/health
```

### Enable Playwright (Optional)

```bash
# Update docker-compose.yml
environment:
  - CRAWL4AI_USE_PLAYWRIGHT=true

# Install Playwright in container
docker-compose exec parser-service playwright install chromium

# Restart
docker-compose restart parser-service
```

---

## 📝 Next Steps

### Phase 1: Bug Fixes & Testing (Priority 1)
- [ ] **Add unit tests** — Test crawl_url() and download_document()
- [ ] **Add integration tests** — Test full flow with mocked HTTP
- [ ] **Fix HTML rendering** — Implement WeasyPrint for proper HTML → PDF
- [ ] **Error handling improvements** — Better error messages and logging

### Phase 2: Performance & Reliability (Priority 2)
- [ ] **Add caching** — Redis cache for crawled content (1 hour TTL)
- [ ] **Add rate limiting** — Per-IP limits (10 req/min)
- [ ] **Add robots.txt support** — Respect crawling rules
- [ ] **Optimize large pages** — Chunking for > 5000 chars

### Phase 3: Advanced Features (Priority 3)
- [ ] **Sitemap support** — Crawl multiple pages from sitemap
- [ ] **Link extraction** — Extract and follow links
- [ ] **Content filtering** — Remove ads, navigation, etc.
- [ ] **Screenshot capture** — Full-page screenshots with Playwright
- [ ] **PDF generation from HTML** — Proper HTML → PDF conversion

---

## 🔗 Related Documentation

- [TODO-PARSER-RAG.md](./TODO-PARSER-RAG.md) — PARSER Agent roadmap
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Server infrastructure
- [WARP.md](./WARP.md) — Developer guide
- [docs/cursor/crawl4ai_web_crawler_task.md](./docs/cursor/crawl4ai_web_crawler_task.md) — Implementation task
- [docs/cursor/CRAWL4AI_SERVICE_REPORT.md](./docs/cursor/CRAWL4AI_SERVICE_REPORT.md) — Detailed report
- [docs/agents/parser.md](./docs/agents/parser.md) — PARSER Agent documentation

---

## 📊 Service Integration Map

```
┌─────────────────────────────────────────────┐
│         DAGI Stack Services                 │
└──────────┬──────────────────────────────────┘
           │
    ┌──────┴──────────┐
    │                 │
    ▼                 ▼
┌──────────┐     ┌──────────┐
│  Router  │────▶│ PARSER   │
│  (9102)  │     │ Service  │
└──────────┘     │ (9400)   │
                 └─────┬────┘
                       │
                 ┌─────┴─────┐
                 │           │
                 ▼           ▼
          ┌──────────┐ ┌──────────┐
          │ Crawl4AI │ │   OCR    │
          │  Service │ │ Pipeline │
          └──────────┘ └──────────┘
                 │           │
                 └─────┬─────┘
                       ▼
                ┌──────────────┐
                │    RAG       │
                │   Service    │
                │   (9500)     │
                └──────────────┘
```

---

**Статус:** ✅ MVP Complete  
**Next:** Testing + HTML rendering improvements  
**Last Updated:** 2025-01-17 by WARP AI  
**Maintained by:** Ivan Tytar & DAARION Team
