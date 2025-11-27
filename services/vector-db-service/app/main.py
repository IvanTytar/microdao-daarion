"""
Vector DB Service - Векторна база даних для DAARION Knowledge Base
ChromaDB + Sentence Transformers для embeddings та RAG
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import os
from typing import Optional, List, Dict, Any
from datetime import datetime
import hashlib

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Vector DB Service",
    description="Vector Database для DAARION (ChromaDB + Sentence Transformers)",
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

# Lazy import vector DB
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    logger.warning("⚠️ ChromaDB not available")

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logger.warning("⚠️ Sentence Transformers not available")

# Конфігурація
CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# Global variables
_chroma_client = None
_embedding_model = None

def get_chroma_client():
    """Lazy initialization of ChromaDB client"""
    global _chroma_client
    if _chroma_client is None and CHROMADB_AVAILABLE:
        _chroma_client = chromadb.Client(Settings(
            chroma_db_impl="duckdb+parquet",
            persist_directory=CHROMA_PERSIST_DIR
        ))
    return _chroma_client

def get_embedding_model():
    """Lazy initialization of embedding model"""
    global _embedding_model
    if _embedding_model is None and EMBEDDINGS_AVAILABLE:
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model

class Document(BaseModel):
    id: str
    text: str
    metadata: Optional[Dict[str, Any]] = {}

class AddDocumentsRequest(BaseModel):
    collection: str
    documents: List[Document]

class SearchRequest(BaseModel):
    collection: str
    query: str
    n_results: Optional[int] = 5
    filter: Optional[Dict[str, Any]] = None

class SearchResult(BaseModel):
    id: str
    text: str
    score: float
    metadata: Dict[str, Any]

class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    collection: str
    total: int
    timestamp: str

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "Vector DB Service",
        "status": "running",
        "chromadb": CHROMADB_AVAILABLE,
        "embeddings": EMBEDDINGS_AVAILABLE,
        "embedding_model": EMBEDDING_MODEL,
        "persist_dir": CHROMA_PERSIST_DIR,
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if (CHROMADB_AVAILABLE and EMBEDDINGS_AVAILABLE) else "degraded",
        "chromadb": "available" if CHROMADB_AVAILABLE else "unavailable",
        "embeddings": "available" if EMBEDDINGS_AVAILABLE else "unavailable"
    }

@app.post("/api/collections")
async def create_collection(collection_name: str):
    """
    Створює нову колекцію
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        # Створити або отримати колекцію
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"created_at": datetime.utcnow().isoformat()}
        )
        
        logger.info(f"✅ Created/got collection: {collection_name}")
        
        return {
            "collection": collection_name,
            "created": True,
            "count": collection.count()
        }
        
    except Exception as e:
        logger.error(f"❌ Create collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collections")
async def list_collections():
    """
    Список всіх колекцій
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        collections = client.list_collections()
        
        return {
            "collections": [
                {
                    "name": col.name,
                    "count": col.count(),
                    "metadata": col.metadata
                }
                for col in collections
            ],
            "total": len(collections)
        }
        
    except Exception as e:
        logger.error(f"❌ List collections error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents")
async def add_documents(request: AddDocumentsRequest):
    """
    Додає документи в колекцію
    
    Body:
    {
        "collection": "knowledge_base",
        "documents": [
            {
                "id": "doc1",
                "text": "DAARION is a decentralized platform...",
                "metadata": {"source": "website", "date": "2025-01-01"}
            }
        ]
    }
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        model = get_embedding_model()
        if not model:
            raise HTTPException(status_code=503, detail="Embeddings not available")
        
        # Отримати колекцію
        collection = client.get_or_create_collection(name=request.collection)
        
        # Підготувати дані
        ids = [doc.id for doc in request.documents]
        documents = [doc.text for doc in request.documents]
        metadatas = [doc.metadata for doc in request.documents]
        
        # Згенерувати embeddings
        embeddings = model.encode(documents, convert_to_numpy=True).tolist()
        
        # Додати в ChromaDB
        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )
        
        logger.info(f"✅ Added {len(documents)} documents to {request.collection}")
        
        return {
            "collection": request.collection,
            "added": len(documents),
            "total": collection.count()
        }
        
    except Exception as e:
        logger.error(f"❌ Add documents error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search", response_model=SearchResponse)
async def search_documents(request: SearchRequest):
    """
    Пошук документів в колекції
    
    Body:
    {
        "collection": "knowledge_base",
        "query": "What is DAARION?",
        "n_results": 5
    }
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        model = get_embedding_model()
        if not model:
            raise HTTPException(status_code=503, detail="Embeddings not available")
        
        # Отримати колекцію
        try:
            collection = client.get_collection(name=request.collection)
        except:
            raise HTTPException(status_code=404, detail=f"Collection '{request.collection}' not found")
        
        # Згенерувати embedding для запиту
        query_embedding = model.encode([request.query], convert_to_numpy=True).tolist()[0]
        
        # Пошук
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=request.n_results,
            where=request.filter
        )
        
        # Форматувати результати
        search_results = []
        for idx in range(len(results['ids'][0])):
            search_results.append(SearchResult(
                id=results['ids'][0][idx],
                text=results['documents'][0][idx],
                score=1 - results['distances'][0][idx],  # Convert distance to similarity
                metadata=results['metadatas'][0][idx]
            ))
        
        logger.info(f"✅ Found {len(search_results)} results for '{request.query}'")
        
        return SearchResponse(
            query=request.query,
            results=search_results,
            collection=request.collection,
            total=len(search_results),
            timestamp=datetime.utcnow().isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents")
async def delete_documents(collection: str, ids: List[str]):
    """
    Видаляє документи з колекції
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        # Отримати колекцію
        try:
            coll = client.get_collection(name=collection)
        except:
            raise HTTPException(status_code=404, detail=f"Collection '{collection}' not found")
        
        # Видалити документи
        coll.delete(ids=ids)
        
        logger.info(f"✅ Deleted {len(ids)} documents from {collection}")
        
        return {
            "collection": collection,
            "deleted": len(ids),
            "remaining": coll.count()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Delete documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """
    Видаляє колекцію
    """
    try:
        client = get_chroma_client()
        if not client:
            raise HTTPException(status_code=503, detail="ChromaDB not available")
        
        # Видалити колекцію
        client.delete_collection(name=collection_name)
        
        logger.info(f"✅ Deleted collection: {collection_name}")
        
        return {
            "collection": collection_name,
            "deleted": True
        }
        
    except Exception as e:
        logger.error(f"❌ Delete collection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8898)





