import httpx
from typing import Optional

class EmbeddingClient:
    """Simple embedding client for Phase 3"""
    
    def __init__(self, endpoint: str = "http://localhost:8001/embed", provider: str = "local"):
        self.endpoint = endpoint
        self.provider = provider
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def embed(self, text: str) -> list[float]:
        """
        Generate embedding for text
        
        For Phase 3: Returns stub embeddings if service unavailable
        """
        try:
            response = await self.client.post(
                self.endpoint,
                json={"text": text}
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])
        
        except (httpx.ConnectError, httpx.HTTPStatusError):
            # Embedding service not available - return stub
            print(f"⚠️  Embedding service not available at {self.endpoint}, using stub")
            # Return zero vector as stub (1024 dimensions for BGE-M3)
            return [0.0] * 1024
        
        except Exception as e:
            print(f"❌ Embedding error: {e}")
            return [0.0] * 1024
    
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts"""
        # For Phase 3: simple sequential processing
        embeddings = []
        for text in texts:
            emb = await self.embed(text)
            embeddings.append(emb)
        return embeddings
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()




