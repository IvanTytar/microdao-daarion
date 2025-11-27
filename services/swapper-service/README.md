# Swapper Service

**Version:** 1.0.0  
**Status:** ✅ Ready for Node #2  
**Port:** 8890

Dynamic model loading service that manages LLM models on-demand to optimize memory usage. Supports single-active mode (one model loaded at a time).

---

## Overview

Swapper Service provides:
- **Dynamic Model Loading** — Load/unload models on-demand
- **Single-Active Mode** — Only one model loaded at a time (memory optimization)
- **Model Metrics** — Track uptime, request count, load/unload times
- **Ollama Integration** — Works with Ollama models
- **REST API** — Full API for model management

---

## Features

### Model Management
- Load models on-demand
- Unload models to free memory
- Track which model is currently active
- Monitor model uptime and usage

### Metrics
- Current active model
- Model uptime (hours)
- Request count per model
- Load/unload timestamps
- Total uptime per model

### Single-Active Mode
- Only one model loaded at a time
- Automatic unloading of previous model when loading new one
- Optimizes memory usage on resource-constrained systems

---

## Quick Start

### Docker (Recommended)

```bash
# Build and start
docker-compose up -d swapper-service

# Check health
curl http://localhost:8890/health

# Get status
curl http://localhost:8890/status

# List models
curl http://localhost:8890/models
```

### Local Development

```bash
cd services/swapper-service

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export OLLAMA_BASE_URL=http://localhost:11434
export SWAPPER_CONFIG_PATH=./config/swapper_config.yaml

# Run service
python -m app.main
```

---

## API Endpoints

### Health & Status

#### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "swapper-service",
  "active_model": "deepseek-r1-70b",
  "mode": "single-active"
}
```

#### GET /status
Get full Swapper service status

**Response:**
```json
{
  "status": "healthy",
  "active_model": "deepseek-r1-70b",
  "available_models": ["deepseek-r1-70b", "qwen2.5-coder-32b", ...],
  "loaded_models": ["deepseek-r1-70b"],
  "mode": "single-active",
  "total_models": 8
}
```

### Model Management

#### GET /models
List all available models

**Response:**
```json
{
  "models": [
    {
      "name": "deepseek-r1-70b",
      "ollama_name": "deepseek-r1:70b",
      "type": "llm",
      "size_gb": 42,
      "priority": "high",
      "status": "loaded"
    }
  ]
}
```

#### GET /models/{model_name}
Get information about a specific model

**Response:**
```json
{
  "name": "deepseek-r1-70b",
  "ollama_name": "deepseek-r1:70b",
  "type": "llm",
  "size_gb": 42,
  "priority": "high",
  "status": "loaded",
  "loaded_at": "2025-11-22T10:30:00",
  "unloaded_at": null,
  "total_uptime_seconds": 3600.5
}
```

#### POST /models/{model_name}/load
Load a model

**Response:**
```json
{
  "status": "success",
  "model": "deepseek-r1-70b",
  "message": "Model deepseek-r1-70b loaded"
}
```

#### POST /models/{model_name}/unload
Unload a model

**Response:**
```json
{
  "status": "success",
  "model": "deepseek-r1-70b",
  "message": "Model deepseek-r1-70b unloaded"
}
```

### Metrics

#### GET /metrics
Get metrics for all models

**Response:**
```json
{
  "metrics": [
    {
      "model_name": "deepseek-r1-70b",
      "status": "loaded",
      "loaded_at": "2025-11-22T10:30:00",
      "uptime_hours": 1.5,
      "request_count": 42,
      "total_uptime_seconds": 5400.0
    }
  ]
}
```

#### GET /metrics/{model_name}
Get metrics for a specific model

**Response:**
```json
{
  "model_name": "deepseek-r1-70b",
  "status": "loaded",
  "loaded_at": "2025-11-22T10:30:00",
  "uptime_hours": 1.5,
  "request_count": 42,
  "total_uptime_seconds": 5400.0
}
```

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API URL |
| `SWAPPER_CONFIG_PATH` | `./config/swapper_config.yaml` | Path to config file |
| `SWAPPER_MODE` | `single-active` | Mode: `single-active` or `multi-active` |
| `MAX_CONCURRENT_MODELS` | `1` | Max concurrent models (for multi-active mode) |
| `MODEL_SWAP_TIMEOUT` | `30` | Timeout for model swap (seconds) |

### Config File (swapper_config.yaml)

```yaml
swapper:
  mode: single-active
  max_concurrent_models: 1
  model_swap_timeout: 30
  gpu_enabled: true
  metal_acceleration: true

models:
  deepseek-r1-70b:
    path: ollama:deepseek-r1:70b
    type: llm
    size_gb: 42
    priority: high
```

---

## Integration with Router

Swapper Service integrates with DAGI Router through metadata:

```python
router_request = {
    "message": "Your request",
    "mode": "chat",
    "metadata": {
        "use_llm": "specialist_vision_8b",  # Swapper will load this model
        "swapper_service": "http://swapper-service:8890"
    }
}
```

---

## Monitoring

### Health Check
```bash
curl http://localhost:8890/health
```

### Prometheus Metrics (Future)
- `swapper_active_model` — Currently active model
- `swapper_model_uptime_seconds` — Uptime per model
- `swapper_model_requests_total` — Total requests per model

---

## Troubleshooting

### Model won't load
```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check model exists in Ollama
curl http://localhost:11434/api/tags | grep "model_name"

# Check Swapper logs
docker logs swapper-service
```

### Service not responding
```bash
# Check if service is running
docker ps | grep swapper-service

# Check health
curl http://localhost:8890/health

# Check logs
docker logs -f swapper-service
```

---

## Differences: Swapper Service vs vLLM

**Swapper Service:**
- Model loading/unloading manager
- Single-active mode (one model at a time)
- Memory optimization
- Works with Ollama
- Lightweight, simple API

**vLLM:**
- High-performance inference engine
- Continuous serving (models stay loaded)
- Optimized for throughput
- Direct GPU acceleration
- More complex, production-grade

**Use Swapper when:**
- Memory is limited
- Need to switch between models frequently
- Running on resource-constrained systems (like Node #2 MacBook)

**Use vLLM when:**
- Need maximum throughput
- Models stay loaded for long periods
- Have dedicated GPU resources
- Production serving at scale

---

## Next Steps

1. **Add to Node #2 Admin Console**
   - Display active model
   - Show model metrics (uptime, requests)
   - Allow manual model loading/unloading

2. **Integration with Router**
   - Auto-load models based on request type
   - Route requests to appropriate models

3. **Metrics Dashboard**
   - Grafana dashboard for Swapper metrics
   - Model usage analytics

---

**Last Updated:** 2025-11-22  
**Maintained by:** Ivan Tytar & DAARION Team  
**Status:** ✅ Ready for Node #2

