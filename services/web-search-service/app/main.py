"""
Web Search Service - Пошук в інтернеті для DAARION
Інтеграція з DuckDuckGo, Google, Bing
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from typing import Optional, List
from datetime import datetime

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Web Search Service",
    description="Web Search для DAARION (DuckDuckGo, Google, Bing)",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy import search engines
try:
    from duckduckgo_search import DDGS
    DDGS_AVAILABLE = True
except ImportError:
    DDGS_AVAILABLE = False
    logger.warning("⚠️ DuckDuckGo search not available")

try:
    from googlesearch import search as google_search
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    logger.warning("⚠️ Google search not available")

# Конфігурація
SEARCH_ENGINE = os.getenv("SEARCH_ENGINE", "duckduckgo")  # duckduckgo, google, bing
MAX_RESULTS = int(os.getenv("MAX_RESULTS", "10"))

class SearchRequest(BaseModel):
    query: str
    engine: Optional[str] = "duckduckgo"
    max_results: Optional[int] = 10
    region: Optional[str] = "ua-uk"  # ua-uk, us-en, etc.

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    position: int

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    engine: str
    total: int
    timestamp: str

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "Web Search Service",
        "status": "running",
        "engines": {
            "duckduckgo": DDGS_AVAILABLE,
            "google": GOOGLE_AVAILABLE
        },
        "default_engine": SEARCH_ENGINE,
        "max_results": MAX_RESULTS,
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if (DDGS_AVAILABLE or GOOGLE_AVAILABLE) else "degraded",
        "duckduckgo": "available" if DDGS_AVAILABLE else "unavailable",
        "google": "available" if GOOGLE_AVAILABLE else "unavailable"
    }

def search_duckduckgo(query: str, max_results: int = 10, region: str = "ua-uk") -> List[dict]:
    """
    Пошук через DuckDuckGo
    """
    if not DDGS_AVAILABLE:
        raise HTTPException(status_code=503, detail="DuckDuckGo not available")
    
    try:
        ddgs = DDGS()
        results = ddgs.text(query, region=region, max_results=max_results)
        
        formatted_results = []
        for idx, result in enumerate(results):
            formatted_results.append({
                'title': result.get('title', ''),
                'url': result.get('href', ''),
                'snippet': result.get('body', ''),
                'position': idx + 1
            })
        
        return formatted_results
        
    except Exception as e:
        logger.error(f"❌ DuckDuckGo search error: {e}")
        raise HTTPException(status_code=500, detail=f"DuckDuckGo error: {str(e)}")

def search_google(query: str, max_results: int = 10) -> List[dict]:
    """
    Пошук через Google
    """
    if not GOOGLE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Google search not available")
    
    try:
        results = []
        for idx, url in enumerate(google_search(query, num_results=max_results)):
            results.append({
                'title': url,  # Google search library не повертає title
                'url': url,
                'snippet': '',
                'position': idx + 1
            })
        
        return results
        
    except Exception as e:
        logger.error(f"❌ Google search error: {e}")
        raise HTTPException(status_code=500, detail=f"Google error: {str(e)}")

@app.post("/api/search", response_model=SearchResponse)
async def web_search(request: SearchRequest):
    """
    Виконує пошук в інтернеті
    
    Body:
    {
        "query": "DAARION MicroDAO",
        "engine": "duckduckgo",
        "max_results": 10,
        "region": "ua-uk"
    }
    """
    try:
        logger.info(f"🔍 Search request: '{request.query}' via {request.engine}")
        
        engine = request.engine or SEARCH_ENGINE
        max_results = request.max_results or MAX_RESULTS
        
        results = []
        
        if engine == 'duckduckgo':
            results = search_duckduckgo(request.query, max_results, request.region)
        elif engine == 'google':
            results = search_google(request.query, max_results)
        else:
            raise HTTPException(status_code=400, detail=f"Unknown engine: {engine}")
        
        logger.info(f"✅ Found {len(results)} results")
        
        return SearchResponse(
            query=request.query,
            results=[SearchResult(**r) for r in results],
            engine=engine,
            total=len(results),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def web_search_get(query: str, engine: str = "duckduckgo", max_results: int = 10):
    """
    Виконує пошук в інтернеті (GET метод)
    
    Query params:
    - query: search query
    - engine: duckduckgo | google
    - max_results: number of results (default: 10)
    """
    request = SearchRequest(query=query, engine=engine, max_results=max_results)
    return await web_search(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8897)

