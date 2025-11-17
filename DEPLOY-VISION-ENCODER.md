# 🚀 Vision Encoder Deployment — Quick Guide

**Server:** 144.76.224.179 (Hetzner GEX44 #2844465)  
**Status:** ✅ Code pushed to GitHub  
**Ready to deploy:** YES

---

## ⚡ Quick Deploy (One Command)

SSH to server and run automated script:

```bash
ssh root@144.76.224.179 'cd /opt/microdao-daarion && git pull origin main && ./deploy-vision-encoder.sh'
```

**That's it!** The script will:
- ✅ Pull latest code
- ✅ Check GPU & Docker GPU runtime
- ✅ Build Vision Encoder image
- ✅ Start Vision Encoder + Qdrant
- ✅ Run health checks
- ✅ Run smoke tests
- ✅ Show GPU status

---

## 📋 Manual Deploy (Step by Step)

If you prefer manual deployment:

### 1. SSH to Server

```bash
ssh root@144.76.224.179
```

### 2. Navigate to Project

```bash
cd /opt/microdao-daarion
```

### 3. Pull Latest Code

```bash
git pull origin main
```

### 4. Check GPU

```bash
nvidia-smi
```

Should show NVIDIA GPU with ~24 GB VRAM.

### 5. Build Vision Encoder

```bash
docker-compose build vision-encoder
```

This takes 5-10 minutes (downloads PyTorch + OpenCLIP).

### 6. Start Services

```bash
docker-compose up -d vision-encoder qdrant
```

### 7. Check Logs

```bash
docker-compose logs -f vision-encoder
```

Wait for: `"Model loaded successfully. Embedding dimension: 768"`

### 8. Verify Health

```bash
curl http://localhost:8001/health
curl http://localhost:6333/healthz
```

### 9. Create Qdrant Collection

```bash
curl -X PUT http://localhost:6333/collections/daarion_images \
  -H "Content-Type: application/json" \
  -d '{"vectors": {"size": 768, "distance": "Cosine"}}'
```

### 10. Run Smoke Tests

```bash
chmod +x ./test-vision-encoder.sh
./test-vision-encoder.sh
```

### 11. Monitor GPU

```bash
watch -n 1 nvidia-smi
```

Should show Vision Encoder using ~4 GB VRAM.

---

## 🔍 Verification

### Check All Services

```bash
docker-compose ps
```

All 17 services should be "Up":
- dagi-router (9102)
- dagi-gateway (9300)
- dagi-devtools (8008)
- dagi-crewai (9010)
- dagi-rbac (9200)
- dagi-rag-service (9500)
- dagi-memory-service (8000)
- dagi-parser-service (9400)
- **dagi-vision-encoder (8001)** ← NEW
- dagi-postgres (5432)
- redis (6379)
- neo4j (7687/7474)
- **dagi-qdrant (6333/6334)** ← NEW
- grafana (3000)
- prometheus (9090)
- neo4j-exporter (9091)
- ollama (11434)

### Test Vision Encoder API

```bash
# Text embedding
curl -X POST http://localhost:8001/embed/text \
  -H "Content-Type: application/json" \
  -d '{"text": "токеноміка DAARION", "normalize": true}'

# Should return: {"embedding": [...], "dimension": 768, ...}
```

### Test via Router

```bash
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "vision_embed",
    "message": "embed text",
    "payload": {
      "operation": "embed_text",
      "text": "DAARION governance",
      "normalize": true
    }
  }'
```

---

## 📊 Expected Results

### GPU Usage

```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 535.104.05   Driver Version: 535.104.05   CUDA Version: 12.2    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        Persistence-M| Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  NVIDIA GeForce...  Off  | 00000000:01:00.0 Off |                  N/A |
| 35%   52C    P2    85W / 350W |   4096MiB / 24576MiB |     15%      Default |
+-------------------------------+----------------------+----------------------+
```

**VRAM Allocation:**
- Vision Encoder: ~4 GB (always loaded)
- Ollama (qwen3:8b): ~6 GB (when active)
- Available: ~14 GB

### Service Logs

Vision Encoder startup logs:
```json
{"timestamp": "2025-01-17 13:00:00", "level": "INFO", "message": "Starting vision-encoder service..."}
{"timestamp": "2025-01-17 13:00:01", "level": "INFO", "message": "Loading model ViT-L-14 with pretrained weights openai"}
{"timestamp": "2025-01-17 13:00:01", "level": "INFO", "message": "Device: cuda"}
{"timestamp": "2025-01-17 13:00:15", "level": "INFO", "message": "Model loaded successfully. Embedding dimension: 768"}
{"timestamp": "2025-01-17 13:00:15", "level": "INFO", "message": "GPU: NVIDIA GeForce RTX 3090, Memory: 24.00 GB"}
{"timestamp": "2025-01-17 13:00:15", "level": "INFO", "message": "Uvicorn running on http://0.0.0.0:8001"}
```

---

## 🐛 Troubleshooting

### Problem: GPU not detected

**Check:**
```bash
nvidia-smi
```

**Fix:**
```bash
# Install NVIDIA drivers (if needed)
sudo apt install nvidia-driver-535
sudo reboot

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Problem: Vision Encoder using CPU instead of GPU

**Check device:**
```bash
curl http://localhost:8001/health | jq '.device'
```

If returns `"cpu"`:
1. Check GPU runtime: `docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi`
2. Restart Vision Encoder: `docker-compose restart vision-encoder`
3. Check logs: `docker-compose logs vision-encoder`

### Problem: Out of Memory

**Check GPU memory:**
```bash
nvidia-smi
```

**Solutions:**
1. Use smaller model: Edit `docker-compose.yml` → `MODEL_NAME=ViT-B-32` (2 GB instead of 4 GB)
2. Stop Ollama temporarily: `docker stop ollama`
3. Restart services: `docker-compose restart vision-encoder`

---

## 📖 Documentation

- **[SYSTEM-INVENTORY.md](./SYSTEM-INVENTORY.md)** — Complete system inventory (GPU, models, services)
- **[VISION-ENCODER-STATUS.md](./VISION-ENCODER-STATUS.md)** — Vision Encoder service status
- **[VISION-RAG-IMPLEMENTATION.md](./VISION-RAG-IMPLEMENTATION.md)** — Implementation details
- **[services/vision-encoder/README.md](./services/vision-encoder/README.md)** — Full deployment guide
- **[docs/cursor/vision_encoder_deployment_task.md](./docs/cursor/vision_encoder_deployment_task.md)** — Deployment checklist

---

## ✅ Deployment Checklist

**Before Deployment:**
- [x] Code committed to Git
- [x] Code pushed to GitHub
- [x] Documentation updated
- [x] Tests created
- [x] Deploy script created

**After Deployment:**
- [ ] Vision Encoder running (port 8001)
- [ ] Qdrant running (port 6333)
- [ ] Health checks passing
- [ ] Smoke tests passing
- [ ] GPU detected and used (~4 GB VRAM)
- [ ] Qdrant collection created
- [ ] Integration with Router working

---

## 🎯 Next Steps After Deployment

### 1. Index Existing Images

```bash
# Example: Index images from Parser Service output
python scripts/index_images.py --dao-id daarion --directory /data/images
```

### 2. Test Image Search

```bash
# Text-to-image search
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "image_search",
    "message": "знайди діаграми токеноміки",
    "dao_id": "daarion",
    "payload": {"top_k": 5}
  }'
```

### 3. Monitor Performance

```bash
# GPU usage
watch -n 1 nvidia-smi

# Service logs
docker-compose logs -f vision-encoder

# Request metrics
curl http://localhost:9090/metrics | grep vision_encoder
```

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** 2025-01-17  
**Maintained by:** Ivan Tytar & DAARION Team
