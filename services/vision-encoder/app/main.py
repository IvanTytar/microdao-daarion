"""
Vision Encoder Service - FastAPI app for text and image embeddings using OpenCLIP.

Endpoints:
- POST /embed/text - Generate text embeddings
- POST /embed/image - Generate image embeddings
- GET /health - Health check
- GET /info - Model information
"""

import os
import logging
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

import torch
import open_clip
from PIL import Image
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
import httpx

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "message": "%(message)s", "module": "%(name)s"}'
)
logger = logging.getLogger(__name__)

# Configuration from environment
DEVICE = os.getenv("DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
MODEL_NAME = os.getenv("MODEL_NAME", "ViT-L-14")
MODEL_PRETRAINED = os.getenv("MODEL_PRETRAINED", "openai")
NORMALIZE_EMBEDDINGS = os.getenv("NORMALIZE_EMBEDDINGS", "true").lower() == "true"

# Qdrant configuration (optional)
QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_ENABLED = os.getenv("QDRANT_ENABLED", "false").lower() == "true"

# Global model cache
_model = None
_preprocess = None
_tokenizer = None


class TextEmbedRequest(BaseModel):
    """Request for text embedding."""
    text: str = Field(..., description="Text to embed")
    normalize: bool = Field(True, description="Normalize embedding to unit vector")


class ImageEmbedRequest(BaseModel):
    """Request for image embedding from URL."""
    image_url: str = Field(..., description="URL of image to embed")
    normalize: bool = Field(True, description="Normalize embedding to unit vector")


class EmbedResponse(BaseModel):
    """Response with embedding vector."""
    embedding: List[float] = Field(..., description="Embedding vector")
    dimension: int = Field(..., description="Embedding dimension")
    model: str = Field(..., description="Model used for embedding")
    normalized: bool = Field(..., description="Whether embedding is normalized")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    device: str
    model: str
    cuda_available: bool
    gpu_name: Optional[str] = None


class ModelInfo(BaseModel):
    """Model information response."""
    model_name: str
    pretrained: str
    device: str
    embedding_dim: int
    normalize_default: bool
    qdrant_enabled: bool


def load_model():
    """Load OpenCLIP model and preprocessing pipeline."""
    global _model, _preprocess, _tokenizer
    
    if _model is not None:
        return _model, _preprocess, _tokenizer
    
    logger.info(f"Loading model {MODEL_NAME} with pretrained weights {MODEL_PRETRAINED}")
    logger.info(f"Device: {DEVICE}")
    
    try:
        # Load model and preprocessing
        model, _, preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME,
            pretrained=MODEL_PRETRAINED,
            device=DEVICE
        )
        
        # Get tokenizer
        tokenizer = open_clip.get_tokenizer(MODEL_NAME)
        
        # Set to eval mode
        model.eval()
        
        _model = model
        _preprocess = preprocess
        _tokenizer = tokenizer
        
        # Log model info
        with torch.no_grad():
            dummy_text = tokenizer(["test"])
            text_features = model.encode_text(dummy_text.to(DEVICE))
            embedding_dim = text_features.shape[1]
        
        logger.info(f"Model loaded successfully. Embedding dimension: {embedding_dim}")
        
        if DEVICE == "cuda":
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            logger.info(f"GPU: {gpu_name}, Memory: {gpu_memory:.2f} GB")
        
        return _model, _preprocess, _tokenizer
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for model loading."""
    logger.info("Starting vision-encoder service...")
    
    # Load model on startup
    try:
        load_model()
        logger.info("Model loaded successfully during startup")
    except Exception as e:
        logger.error(f"Failed to load model during startup: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down vision-encoder service...")


# Create FastAPI app
app = FastAPI(
    title="Vision Encoder Service",
    description="Text and Image embedding service using OpenCLIP",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    gpu_name = None
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
    
    return HealthResponse(
        status="healthy",
        device=DEVICE,
        model=f"{MODEL_NAME}/{MODEL_PRETRAINED}",
        cuda_available=torch.cuda.is_available(),
        gpu_name=gpu_name
    )


@app.get("/info", response_model=ModelInfo)
async def model_info():
    """Get model information."""
    model, _, _ = load_model()
    
    # Get embedding dimension
    with torch.no_grad():
        dummy_text = _tokenizer(["test"])
        text_features = model.encode_text(dummy_text.to(DEVICE))
        embedding_dim = text_features.shape[1]
    
    return ModelInfo(
        model_name=MODEL_NAME,
        pretrained=MODEL_PRETRAINED,
        device=DEVICE,
        embedding_dim=embedding_dim,
        normalize_default=NORMALIZE_EMBEDDINGS,
        qdrant_enabled=QDRANT_ENABLED
    )


@app.post("/embed/text", response_model=EmbedResponse)
async def embed_text(request: TextEmbedRequest):
    """Generate text embedding."""
    try:
        model, _, tokenizer = load_model()
        
        # Tokenize text
        text_tokens = tokenizer([request.text]).to(DEVICE)
        
        # Generate embedding
        with torch.no_grad():
            text_features = model.encode_text(text_tokens)
            
            # Normalize if requested
            if request.normalize:
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy and then to list
            embedding = text_features.cpu().numpy()[0].tolist()
        
        return EmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=f"{MODEL_NAME}/{MODEL_PRETRAINED}",
            normalized=request.normalize
        )
        
    except Exception as e:
        logger.error(f"Error generating text embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate text embedding: {str(e)}")


@app.post("/embed/image", response_model=EmbedResponse)
async def embed_image_from_url(request: ImageEmbedRequest):
    """Generate image embedding from URL."""
    try:
        model, preprocess, _ = load_model()
        
        # Download image
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(request.image_url)
            response.raise_for_status()
            image_bytes = response.content
        
        # Load and preprocess image
        from io import BytesIO
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(DEVICE)
        
        # Generate embedding
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            
            # Normalize if requested
            if request.normalize:
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy and then to list
            embedding = image_features.cpu().numpy()[0].tolist()
        
        return EmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=f"{MODEL_NAME}/{MODEL_PRETRAINED}",
            normalized=request.normalize
        )
        
    except httpx.HTTPError as e:
        logger.error(f"Failed to download image from URL: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download image: {str(e)}")
    except Exception as e:
        logger.error(f"Error generating image embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image embedding: {str(e)}")


@app.post("/embed/image/upload", response_model=EmbedResponse)
async def embed_image_from_upload(
    file: UploadFile = File(...),
    normalize: bool = True
):
    """Generate image embedding from uploaded file."""
    try:
        model, preprocess, _ = load_model()
        
        # Read uploaded file
        image_bytes = await file.read()
        
        # Load and preprocess image
        from io import BytesIO
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        image_tensor = preprocess(image).unsqueeze(0).to(DEVICE)
        
        # Generate embedding
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            
            # Normalize if requested
            if normalize:
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            # Convert to numpy and then to list
            embedding = image_features.cpu().numpy()[0].tolist()
        
        return EmbedResponse(
            embedding=embedding,
            dimension=len(embedding),
            model=f"{MODEL_NAME}/{MODEL_PRETRAINED}",
            normalized=normalize
        )
        
    except Exception as e:
        logger.error(f"Error generating image embedding from upload: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image embedding: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", "8001"))
    host = os.getenv("HOST", "0.0.0.0")
    
    logger.info(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")
