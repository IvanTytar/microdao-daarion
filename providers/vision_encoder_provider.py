"""
Vision Encoder Provider
Calls Vision Encoder service for text and image embeddings using OpenCLIP.

Endpoints:
- /embed/text - Generate text embedding
- /embed/image - Generate image embedding (from URL)
- /embed/image/upload - Generate image embedding (from file upload)
"""
import logging
from typing import Dict, Any, Optional
import httpx

from providers.base import Provider
from router_models import RouterRequest, RouterResponse

logger = logging.getLogger(__name__)


class VisionEncoderProvider(Provider):
    """
    Provider that routes requests to Vision Encoder service.
    
    Supports:
    - Text embeddings (for text-to-image search)
    - Image embeddings (for image-to-text search or image similarity)
    - Normalized embeddings (cosine similarity ready)
    """
    
    def __init__(
        self,
        provider_id: str,
        base_url: str,
        timeout: int = 60,
        **kwargs
    ):
        super().__init__(provider_id)
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        logger.info(f"VisionEncoderProvider initialized: {provider_id} → {base_url}")
    
    async def call(self, request: RouterRequest) -> RouterResponse:
        """
        Route request to Vision Encoder service.
        
        Expected request.payload format:
        {
            "operation": "embed_text" | "embed_image",
            "text": "...",           # for embed_text
            "image_url": "...",       # for embed_image
            "normalize": true         # optional, default true
        }
        """
        try:
            # Extract operation from payload
            operation = request.payload.get("operation") if request.payload else None
            if not operation:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error="Missing 'operation' in request payload. Expected 'embed_text' or 'embed_image'"
                )
            
            normalize = request.payload.get("normalize", True)
            
            # Route based on operation
            if operation == "embed_text":
                return await self._embed_text(request, normalize)
            elif operation == "embed_image":
                return await self._embed_image(request, normalize)
            else:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error=f"Unknown operation: {operation}. Available: embed_text, embed_image"
                )
        
        except Exception as e:
            logger.error(f"VisionEncoder error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=str(e)
            )
    
    async def _embed_text(self, request: RouterRequest, normalize: bool) -> RouterResponse:
        """Generate text embedding."""
        try:
            text = request.payload.get("text") if request.payload else None
            if not text:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error="Missing 'text' in request payload"
                )
            
            # Call Vision Encoder API
            url = f"{self.base_url}/embed/text"
            body = {
                "text": text,
                "normalize": normalize
            }
            
            logger.info(f"VisionEncoder embed_text: {text[:100]}...")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=body)
                response.raise_for_status()
                
                data = response.json()
                
                return RouterResponse(
                    ok=True,
                    provider_id=self.id,
                    data={
                        "embedding": data.get("embedding"),
                        "dimension": data.get("dimension"),
                        "model": data.get("model"),
                        "normalized": data.get("normalized")
                    },
                    metadata={
                        "provider_type": "vision_encoder",
                        "operation": "embed_text",
                        "text_length": len(text),
                        "status_code": response.status_code
                    }
                )
        
        except httpx.HTTPStatusError as e:
            logger.error(f"VisionEncoder HTTP error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"HTTP {e.response.status_code}: {e.response.text}"
            )
        
        except httpx.RequestError as e:
            logger.error(f"VisionEncoder request error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Request failed: {str(e)}"
            )
    
    async def _embed_image(self, request: RouterRequest, normalize: bool) -> RouterResponse:
        """Generate image embedding from URL."""
        try:
            image_url = request.payload.get("image_url") if request.payload else None
            if not image_url:
                return RouterResponse(
                    ok=False,
                    provider_id=self.id,
                    error="Missing 'image_url' in request payload"
                )
            
            # Call Vision Encoder API
            url = f"{self.base_url}/embed/image"
            body = {
                "image_url": image_url,
                "normalize": normalize
            }
            
            logger.info(f"VisionEncoder embed_image: {image_url}")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=body)
                response.raise_for_status()
                
                data = response.json()
                
                return RouterResponse(
                    ok=True,
                    provider_id=self.id,
                    data={
                        "embedding": data.get("embedding"),
                        "dimension": data.get("dimension"),
                        "model": data.get("model"),
                        "normalized": data.get("normalized")
                    },
                    metadata={
                        "provider_type": "vision_encoder",
                        "operation": "embed_image",
                        "image_url": image_url,
                        "status_code": response.status_code
                    }
                )
        
        except httpx.HTTPStatusError as e:
            logger.error(f"VisionEncoder HTTP error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"HTTP {e.response.status_code}: {e.response.text}"
            )
        
        except httpx.RequestError as e:
            logger.error(f"VisionEncoder request error: {e}")
            return RouterResponse(
                ok=False,
                provider_id=self.id,
                error=f"Request failed: {str(e)}"
            )
