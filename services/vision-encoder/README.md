# Vision Encoder Service - Deployment Guide

**Version:** 1.0.0  
**Status:** Production Ready  
**Model:** OpenCLIP ViT-L/14@336  
**GPU:** NVIDIA CUDA required

---

## 🎯 Overview

Vision Encoder Service provides **text and image embeddings** using OpenCLIP (ViT-L/14 @ 336px resolution) for:
- **Text-to-image search** (encode text queries, search image database)
- **Image-to-text search** (encode images, search text captions)
- **Image similarity** (compare image embeddings)
- **Multimodal RAG** (combine text and image retrieval)

**Key Features:**
- ✅ **GPU-accelerated** (CUDA required for production)
- ✅ **REST API** (FastAPI with OpenAPI docs)
- ✅ **Normalized embeddings** (cosine similarity ready)
- ✅ **Docker support** with NVIDIA runtime
- ✅ **Qdrant integration** (vector database for embeddings)

**Embedding Dimension:** 768 (ViT-L/14)

---

## 📋 Prerequisites

### 1. GPU & CUDA Stack

**On Server (GEX44 #2844465):**

```bash
# Check GPU availability
nvidia-smi

# Expected output:
# +-----------------------------------------------------------------------------+
# | NVIDIA-SMI 535.104.05   Driver Version: 535.104.05   CUDA Version: 12.2    |
# |-------------------------------+----------------------+----------------------+
# | GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
# | Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
# |===============================+======================+======================|
# |   0  NVIDIA GeForce...  Off  | 00000000:01:00.0 Off |                  N/A |
# | 30%   45C    P0    25W / 250W |      0MiB / 11264MiB |      0%      Default |
# +-------------------------------+----------------------+----------------------+

# Check CUDA version
nvcc --version  # or use nvidia-smi output

# Check Docker NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

**If GPU not available:**
- Install NVIDIA drivers: `sudo apt install nvidia-driver-535`
- Install NVIDIA Container Toolkit:
  ```bash
  distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
  curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
  curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
  sudo apt-get update
  sudo apt-get install -y nvidia-container-toolkit
  sudo systemctl restart docker
  ```
- Reboot server: `sudo reboot`

### 2. Docker Compose

Version 1.29+ required for GPU support (`deploy.resources.reservations.devices`).

```bash
docker-compose --version
# Docker Compose version v2.20.0 or higher
```

---

## 🚀 Deployment

### 1. Build & Start Services

**On Server:**

```bash
cd /opt/microdao-daarion

# Build vision-encoder image (GPU-ready)
docker-compose build vision-encoder

# Start vision-encoder + qdrant
docker-compose up -d vision-encoder qdrant

# Check logs
docker-compose logs -f vision-encoder
```

**Expected startup logs:**

```json
{"timestamp": "2025-01-17 12:00:00", "level": "INFO", "message": "Starting vision-encoder service..."}
{"timestamp": "2025-01-17 12:00:01", "level": "INFO", "message": "Loading model ViT-L-14 with pretrained weights openai"}
{"timestamp": "2025-01-17 12:00:01", "level": "INFO", "message": "Device: cuda"}
{"timestamp": "2025-01-17 12:00:15", "level": "INFO", "message": "Model loaded successfully. Embedding dimension: 768"}
{"timestamp": "2025-01-17 12:00:15", "level": "INFO", "message": "GPU: NVIDIA GeForce RTX 3090, Memory: 24.00 GB"}
{"timestamp": "2025-01-17 12:00:15", "level": "INFO", "message": "Model loaded successfully during startup"}
{"timestamp": "2025-01-17 12:00:15", "level": "INFO", "message": "Started server process [1]"}
{"timestamp": "2025-01-17 12:00:15", "level": "INFO", "message": "Uvicorn running on http://0.0.0.0:8001"}
```

### 2. Environment Variables

**In `.env` file:**

```bash
# Vision Encoder Configuration
VISION_DEVICE=cuda                    # cuda or cpu
VISION_MODEL_NAME=ViT-L-14            # OpenCLIP model name
VISION_MODEL_PRETRAINED=openai        # Pretrained weights (openai, laion400m, laion2b)
VISION_ENCODER_URL=http://vision-encoder:8001

# Qdrant Configuration
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_ENABLED=true
```

**Docker Compose variables:**
- `DEVICE` - GPU device (`cuda` or `cpu`)
- `MODEL_NAME` - Model architecture (`ViT-L-14`, `ViT-B-32`, etc.)
- `MODEL_PRETRAINED` - Pretrained weights source
- `NORMALIZE_EMBEDDINGS` - Normalize embeddings to unit vectors (`true`)
- `QDRANT_HOST`, `QDRANT_PORT` - Vector database connection

### 3. Service URLs

| Service | Internal URL | External Port | Description |
|---------|-------------|---------------|-------------|
| **Vision Encoder** | `http://vision-encoder:8001` | `8001` | Embedding API |
| **Qdrant** | `http://qdrant:6333` | `6333` | Vector DB (HTTP) |
| **Qdrant gRPC** | `qdrant:6334` | `6334` | Vector DB (gRPC) |

---

## 🧪 Testing

### 1. Health Check

```bash
# On server
curl http://localhost:8001/health

# Expected response:
{
  "status": "healthy",
  "device": "cuda",
  "model": "ViT-L-14/openai",
  "cuda_available": true,
  "gpu_name": "NVIDIA GeForce RTX 3090"
}
```

### 2. Model Info

```bash
curl http://localhost:8001/info

# Expected response:
{
  "model_name": "ViT-L-14",
  "pretrained": "openai",
  "device": "cuda",
  "embedding_dim": 768,
  "normalize_default": true,
  "qdrant_enabled": true
}
```

### 3. Text Embedding

```bash
curl -X POST http://localhost:8001/embed/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "токеноміка DAARION",
    "normalize": true
  }'

# Expected response:
{
  "embedding": [0.123, -0.456, 0.789, ...],  # 768 dimensions
  "dimension": 768,
  "model": "ViT-L-14/openai",
  "normalized": true
}
```

### 4. Image Embedding

```bash
curl -X POST http://localhost:8001/embed/image \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "https://example.com/image.jpg",
    "normalize": true
  }'

# Expected response:
{
  "embedding": [0.234, -0.567, 0.890, ...],  # 768 dimensions
  "dimension": 768,
  "model": "ViT-L-14/openai",
  "normalized": true
}
```

### 5. Integration Test via DAGI Router

```bash
# Text embedding via Router
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "vision_embed",
    "message": "embed text",
    "payload": {
      "operation": "embed_text",
      "text": "DAARION city governance model",
      "normalize": true
    }
  }'

# Image embedding via Router
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "vision_embed",
    "message": "embed image",
    "payload": {
      "operation": "embed_image",
      "image_url": "https://example.com/dao-diagram.png",
      "normalize": true
    }
  }'
```

### 6. Qdrant Vector Database Test

```bash
# Check Qdrant health
curl http://localhost:6333/healthz

# Create collection
curl -X PUT http://localhost:6333/collections/images \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    }
  }'

# List collections
curl http://localhost:6333/collections
```

---

## 🔧 Configuration

### OpenCLIP Models

Vision Encoder supports multiple OpenCLIP models. Change via environment variables:

| Model | Embedding Dim | Memory (GPU) | Speed | Description |
|-------|--------------|-------------|-------|-------------|
| `ViT-B-32` | 512 | 2 GB | Fast | Base model, good for prototyping |
| `ViT-L-14` | 768 | 4 GB | Medium | **Default**, balanced quality/speed |
| `ViT-L-14@336` | 768 | 6 GB | Slow | Higher resolution (336x336) |
| `ViT-H-14` | 1024 | 8 GB | Slowest | Highest quality |

**Change model:**
```bash
# In .env or docker-compose.yml
VISION_MODEL_NAME=ViT-B-32
VISION_MODEL_PRETRAINED=openai
```

### Pretrained Weights

| Source | Description | Best For |
|--------|-------------|---------|
| `openai` | Official CLIP weights | **Recommended**, general purpose |
| `laion400m` | LAION-400M dataset | Large-scale web images |
| `laion2b` | LAION-2B dataset | Highest diversity |

### CPU Fallback

If GPU not available, service falls back to CPU:

```bash
# In docker-compose.yml
environment:
  - DEVICE=cpu
```

**Warning:** CPU inference is **~50-100x slower**. Use only for development.

---

## 📊 Monitoring

### Docker Container Stats

```bash
# Check GPU usage
docker stats dagi-vision-encoder

# Check GPU memory
nvidia-smi

# View logs
docker-compose logs -f vision-encoder | jq -r '.'
```

### Performance Metrics

| Operation | GPU Time | CPU Time | Embedding Dim | Notes |
|-----------|---------|----------|--------------|-------|
| Text embed | 10-20ms | 500-1000ms | 768 | Single text, ViT-L-14 |
| Image embed | 30-50ms | 2000-4000ms | 768 | Single image, 224x224 |
| Batch (32 texts) | 100ms | 15000ms | 768 | Batch processing |

**Optimization tips:**
- Use GPU for production
- Batch requests when possible
- Enable embedding normalization (cosine similarity)
- Use Qdrant for vector search (faster than PostgreSQL pgvector)

---

## 🐛 Troubleshooting

### Problem: Container fails to start with "CUDA not available"

**Solution:**

```bash
# Check NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# If fails, restart Docker
sudo systemctl restart docker

# Check docker-compose.yml has GPU config
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### Problem: Model download fails (network error)

**Solution:**

```bash
# Download model weights manually
docker exec -it dagi-vision-encoder python -c "
import open_clip
model, _, preprocess = open_clip.create_model_and_transforms('ViT-L-14', pretrained='openai')
"

# Check cache
docker exec -it dagi-vision-encoder ls -lh /root/.cache/clip
```

### Problem: OOM (Out of Memory) on GPU

**Solution:**

1. Use smaller model: `ViT-B-32` instead of `ViT-L-14`
2. Reduce batch size (currently 1)
3. Check GPU memory:
   ```bash
   nvidia-smi
   # If other processes use GPU, stop them
   ```

### Problem: Service returns HTTP 500 on embedding request

**Check logs:**

```bash
docker-compose logs vision-encoder | grep ERROR

# Common issues:
# - Invalid image URL (HTTP 400 from image host)
# - Image format not supported (use JPG/PNG)
# - Model not loaded (check startup logs)
```

### Problem: Qdrant connection error

**Solution:**

```bash
# Check Qdrant is running
docker-compose ps qdrant

# Check network
docker exec -it dagi-vision-encoder ping qdrant

# Restart Qdrant
docker-compose restart qdrant
```

---

## 📂 File Structure

```
services/vision-encoder/
├── README.md                 # This file
├── Dockerfile                # GPU-ready Docker image
├── requirements.txt          # Python dependencies
└── app/
    └── main.py              # FastAPI application
```

---

## 🔗 Integration with DAGI Router

Vision Encoder is automatically registered in DAGI Router as `vision_encoder` provider.

**Router configuration** (`router-config.yml`):

```yaml
routing:
  - id: vision_encoder_embed
    priority: 3
    when:
      mode: vision_embed
    use_provider: vision_encoder
    description: "Text/Image embeddings → Vision Encoder (OpenCLIP ViT-L/14)"
```

**Usage via Router:**

```python
import httpx

async def embed_text_via_router(text: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://router:9102/route",
            json={
                "mode": "vision_embed",
                "message": "embed text",
                "payload": {
                    "operation": "embed_text",
                    "text": text,
                    "normalize": True
                }
            }
        )
        return response.json()
```

---

## 🔐 Security Notes

- Vision Encoder service is **internal-only** (not exposed via Nginx)
- Access via `http://vision-encoder:8001` from Docker network
- No authentication required (trust internal network)
- Image URLs are downloaded by service (validate URLs in production)

---

## 📖 API Documentation

Once deployed, visit:

**OpenAPI Docs:** `http://localhost:8001/docs`  
**ReDoc:** `http://localhost:8001/redoc`

---

## 🎯 Next Steps

### Phase 1: Image RAG (MVP)
- [ ] Create Qdrant collection for images
- [ ] Integrate with Parser Service (image ingestion)
- [ ] Add search endpoint (text→image, image→image)

### Phase 2: Multimodal RAG
- [ ] Combine text RAG + image RAG in Router
- [ ] Add re-ranking (text + image scores)
- [ ] Implement hybrid search (BM25 + vector)

### Phase 3: Advanced Features
- [ ] Add CLIP score calculation (text-image similarity)
- [ ] Implement batch embedding API
- [ ] Add model caching (Redis/S3)
- [ ] Add zero-shot classification
- [ ] Add image captioning (BLIP-2)

---

## 📞 Support

- **Logs:** `docker-compose logs -f vision-encoder`
- **Health:** `curl http://localhost:8001/health`
- **Docs:** `http://localhost:8001/docs`
- **Team:** Ivan Tytar, DAARION Team

---

**Last Updated:** 2025-01-17  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
