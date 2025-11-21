# 🖥️ Node #2 Specifications — MacBook Pro M4 Max

**Версія:** 1.0.0  
**Останнє оновлення:** 2025-01-17  
**Статус:** Development Node / Backup Production Node  
**Node ID:** `node-2-macbook-m4max`

---

## 📍 Node Overview

### Identification
- **Node Name:** `MacBook-Pro.local`
- **Node ID:** `node-2-macbook-m4max`
- **Role:** Development Node / Secondary DAGI Router
- **Location:** Local Network (192.168.1.244)
- **Owner:** Ivan Tytar (apple)

### Network Configuration
- **Local IP:** `192.168.1.244`
- **Hostname:** `MacBook-Pro.local`
- **External IPv6:** `2a0d:3341:c75d:2110:7028:a5c:fbae:8d04`
- **MAC Address:** `ca:60:9e:d4:7a:db` (en0)
- **Network Interface:** en0 (Wi-Fi/Ethernet)

---

## 🔧 Hardware Specifications

### System Information
- **Model:** MacBook Pro (16-inch, 2024)
- **Model Identifier:** Mac16,5
- **Model Number:** Z1FW00077LL/A
- **Serial Number:** F2MCWXDTY2
- **Hardware UUID:** FF5B65C5-BCC3-5BEC-8D73-4BD7BF5BF33E

### Processor (SoC)
- **Chip:** Apple M4 Max
- **Architecture:** ARM64 (Apple Silicon)
- **Total Cores:** 16
  - **Performance Cores:** 12
  - **Efficiency Cores:** 4
- **CPU Brand:** Apple M4 Max
- **Metal Support:** Metal 4

### Graphics (GPU)
- **GPU:** Apple M4 Max (Integrated)
- **GPU Cores:** 40
- **Vendor:** Apple (0x106b)
- **Metal Version:** Metal 4
- **GPU Capabilities:**
  - Hardware-accelerated ML/AI inference
  - Unified memory architecture
  - Neural Engine support
  - Ray tracing support

### Memory (RAM)
- **Total Memory:** 64 GB
- **Type:** LPDDR5
- **Manufacturer:** Hynix
- **Architecture:** Unified Memory (shared CPU/GPU)
- **Memory Bandwidth:** ~400 GB/s

### Storage
- **Total Capacity:** 2 TB (1,995,218,165,760 bytes)
- **Free Space:** 1.72 TB (1,720,359,989,248 bytes)
- **Usage:** ~13.8% (275 GB used)
- **Device:** APPLE SSD AP2048Z
- **Type:** NVMe SSD (Apple Fabric Protocol)
- **File System:** APFS
- **S.M.A.R.T. Status:** ✅ Verified
- **Read Speed:** ~7000 MB/s
- **Write Speed:** ~6000 MB/s

### Display
- **Type:** Built-in Liquid Retina XDR Display
- **Resolution:** 3456 x 2234 (Retina)
- **Refresh Rate:** 120 Hz (ProMotion)
- **Color Gamut:** P3 Wide Color
- **Brightness:** 1000 nits sustained, 1600 nits HDR peak

---

## 💻 Software Configuration

### Operating System
- **OS:** macOS 26.1 (Developer Beta)
- **Build:** 25B78
- **Kernel:** Darwin 25.1.0
- **Architecture:** arm64
- **Boot Volume:** Macintosh HD
- **Secure Virtual Memory:** ✅ Enabled
- **System Integrity Protection (SIP):** ✅ Enabled
- **Uptime:** 4 days, 33 minutes

### Development Tools

#### Docker
- **Docker Engine:** 28.5.1 (build e180ab8)
- **Docker Compose:** v2.40.0-desktop.1
- **Docker Desktop:** Installed via `/usr/local/bin/docker`
- **Container Runtime:** Apple Silicon native (ARM64)

#### Ollama (Local LLM)
- **Version:** 0.5.5 (Server) / 0.12.5 (Client)
- **Location:** `/opt/homebrew/bin/ollama`
- **Running Instances:**
  - **Native macOS:** Port 11434 (via Pieces OS)
  - **Docker Container:** Port 11435 (ollama-ai)
- **Installed Models:**
  - **qwen2.5:7b-instruct** (4.7 GB, Q4_K_M) — Main reasoning model, 7.6B params
  - **qwen2.5:1.5b-instruct** (986 MB, Q4_K_M) — Lightweight model, 1.5B params
- **API Endpoints:**
  - Native: `http://localhost:11434/api/tags`
  - Docker: `http://localhost:11435/api/tags`

#### Python
- **Version:** Python 3.14.0 (latest)
- **Location:** `/opt/homebrew/bin/python3`
- **Package Manager:** pip, Homebrew

#### Git
- **Version:** 2.50.1 (Apple Git-155)
- **Location:** `/usr/bin/git`
- **SSH Keys:** Configured for GitHub

#### Shell
- **Default Shell:** zsh 5.9
- **Terminal:** Warp (Agentic Development Environment)

---

## 🚀 DAGI Stack Capabilities

### Available Resources for Services

| Resource | Available | Notes |
|----------|-----------|-------|
| **CPU Cores** | 16 cores | 12 performance + 4 efficiency |
| **GPU Cores** | 40 cores | Metal 4, Neural Engine |
| **RAM** | 64 GB | Unified memory (shared CPU/GPU) |
| **Storage** | 1.72 TB free | High-speed NVMe SSD |
| **Network** | 1 Gbps+ | Wi-Fi 6E or Thunderbolt Ethernet |

### Currently Running Services

#### ✅ Active Services (Running Now)
- ✅ **Ollama** (Port 11434 native + 11435 Docker) — 2x LLM instances
- ✅ **LobeChat** (Port 3210) — AI chat interface
- ✅ **Qdrant** (Port 6333-6335) — Vector database ⚠️ Shows unhealthy in docker ps
- ✅ **MeiliSearch** (Port 7700) — Full-text search engine
- ✅ **Jupyter Lab** (Port 8888) — Data science notebook
- ✅ **NATS JetStream** (Port 4222, 6222, 8222) — Message broker

#### 📦 Docker Resources
- **Volumes:**
  - `apple_qdrant_storage` — Qdrant vector data
  - `microdao-daarion_rag-model-cache` — RAG model cache
- **Networks:**
  - `daarion-network` — Docker bridge network
- **Data Directory:**
  - `/Users/apple/github-projects/microdao-daarion/data/rbac/` — RBAC data (empty)

#### 🔧 Configuration Files Present
- ✅ `.env` — Environment variables configured
- ✅ `router-config.yml` — Router configuration
- ✅ `router-config.yml.backup` — Config backup
- ✅ `docker-compose.yml` — Docker services definition
- ✅ `.env.example` — Environment template

#### 🐍 Python Packages Installed
- `httpx 0.28.1` — HTTP client
- `openai 2.8.0` — OpenAI SDK
- `pydantic 2.12.4` — Data validation
- `pydantic_core 2.41.5` — Pydantic core
- (Note: fastapi, uvicorn likely missing — need to install)

#### 🚀 Recommended Services to Add
- 🔨 **DAGI Router** (Port 9102) — Main routing engine
- 🔨 **DevTools Backend** (Port 8008) — Development tools
- 🔨 **Memory Service** (Port 8000) — Agent memory
- 🔨 **PostgreSQL** (Port 5432) — Memory storage
- 🔨 **Redis** (Port 6379) — Cache

---

## 🔌 Network Configuration

### Local Network Access
```bash
# SSH Access (if enabled)
ssh apple@192.168.1.244

# Router URL (when running)
http://192.168.1.244:9102/health

# Ollama API
http://192.168.1.244:11434/api/tags
```

### Port Forwarding (if needed)
To expose services externally, configure router port forwarding:
- External: 9102 → Internal: 192.168.1.244:9102 (Router)
- External: 11434 → Internal: 192.168.1.244:11434 (Ollama)

---

## 📦 Deployment Configuration

### Project Location
```bash
# Repository path
/Users/apple/github-projects/microdao-daarion

# Environment file
/Users/apple/github-projects/microdao-daarion/.env
```

### Environment Variables (.env)
```bash
# Node identification
NODE_ID=node-2-macbook-m4max
NODE_NAME=MacBook-Pro.local
NODE_ROLE=development

# Network
LOCAL_IP=192.168.1.244
ROUTER_HOST=0.0.0.0
ROUTER_PORT=9102

# Ollama (Dual instance setup)
OLLAMA_BASE_URL=http://localhost:11434    # Native Ollama (via Pieces OS)
OLLAMA_DOCKER_URL=http://localhost:11435  # Docker Ollama
OLLAMA_MODEL=qwen2.5:7b-instruct
OLLAMA_FAST_MODEL=qwen2.5:1.5b-instruct

# LobeChat (Already running)
LOBECHAT_URL=http://localhost:3210

# Qdrant (Already running)
QDRANT_URL=http://localhost:6333

# MeiliSearch (Already running)
MEILISEARCH_URL=http://localhost:7700

# NATS JetStream (Already running)
NATS_URL=nats://localhost:4222

# Memory Service
MEMORY_SERVICE_URL=http://localhost:8000
MEMORY_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/daarion_memory

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=daarion_memory

# Resource Limits
MAX_WORKERS=8
MEMORY_LIMIT=32G
GPU_ENABLED=true
GPU_MEMORY_FRACTION=0.5

# Remote Node (Production Server)
PRODUCTION_NODE_URL=https://gateway.daarion.city
PRODUCTION_NODE_IP=144.76.224.179
```

---

## 🧪 Performance Benchmarks

### LLM Inference (Ollama)
- **Primary Model:** qwen2.5:7b-instruct (Q4_K_M, 7.6B params)
  - Size: 4.7 GB
  - Tokens/second: ~50-70 tokens/s (M4 Max optimized)
  - Context Length: 32,768 tokens
  - Memory Usage: ~6 GB RAM
  - Concurrent Requests: 3-5 simultaneous (dual instance)
- **Fast Model:** qwen2.5:1.5b-instruct (Q4_K_M, 1.5B params)
  - Size: 986 MB
  - Tokens/second: ~100-150 tokens/s
  - Context Length: 32,768 tokens
  - Memory Usage: ~2 GB RAM
  - Use case: Quick responses, summarization

### Docker Container Limits
```yaml
# Recommended docker-compose.yml resource limits
services:
  router:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
  
  memory-service:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
  
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

---

## 🔐 Security Configuration

### Firewall
- **macOS Firewall:** Enabled (System Preferences → Security)
- **Allowed Services:** Docker, Ollama, SSH (optional)

### SSH Access (Optional)
```bash
# Enable remote login
sudo systemsetup -setremotelogin on

# Configure SSH key
cat ~/.ssh/id_ed25519.pub  # Copy to authorized_keys on remote servers
```

### Environment Secrets
```bash
# Never commit to Git
.env
.env.local
secrets/

# Secure storage
export OPENAI_API_KEY=$(security find-generic-password -s openai_key -w)
```

---

## 🔄 Backup & Sync Strategy

### Code Synchronization
```bash
# Push to GitHub (primary backup)
cd /Users/apple/github-projects/microdao-daarion
git add .
git commit -m "feat: update from Node 2"
git push origin main

# Pull on production server (Node 1)
ssh root@144.76.224.179
cd /opt/microdao-daarion
git pull origin main
docker-compose up -d --build
```

### Database Backup
```bash
# Backup PostgreSQL to production
docker exec dagi-postgres pg_dump -U postgres daarion_memory | \
  ssh root@144.76.224.179 "cat > /opt/backups/node2_$(date +%Y%m%d).sql"

# Restore from production
ssh root@144.76.224.179 "cat /opt/backups/latest.sql" | \
  docker exec -i dagi-postgres psql -U postgres daarion_memory
```

---

## 🚨 Limitations & Considerations

### Hardware Limitations
- ⚠️ **No NVIDIA GPU:** Cannot run CUDA-based vision models (use Metal/MPS or remote GPU)
- ⚠️ **Battery-powered:** Not suitable for 24/7 production (use Node 1 instead)
- ⚠️ **Single storage:** No RAID redundancy (backup to cloud required)
- ✅ **40-core Apple GPU:** Can run Metal-optimized ML models (CoreML, MLX, MPS)

### Network Limitations
- ⚠️ **Dynamic IP:** Local IP may change (use DHCP reservation or static IP)
- ⚠️ **No public IP:** Requires port forwarding or VPN for external access
- ⚠️ **Wi-Fi latency:** Use Ethernet adapter for low-latency requirements

### Software Limitations
- ⚠️ **Apple Silicon:** Some Docker images may not be ARM64-compatible
- ⚠️ **macOS Beta:** May have stability issues (use stable macOS for production)
- ⚠️ **Docker Desktop:** Less efficient than native Docker (Linux preferred for production)

---

## 📊 Monitoring & Health Checks

### System Monitoring
```bash
# CPU/Memory usage
top -l 1 | head -n 10

# Disk usage
df -h /

# Docker stats
docker stats --no-stream

# Ollama status
curl http://localhost:11434/api/tags
```

### Service Health
```bash
# Router health
curl http://localhost:9102/health

# Memory service health
curl http://localhost:8000/health

# PostgreSQL health
docker exec dagi-postgres pg_isready
```

---

## 🔗 Related Documentation

- [NODE-2-CURRENT-STATE.md](./NODE-2-CURRENT-STATE.md) — **Current running services & action plan**
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Production Node #1 (Hetzner)
- [WARP.md](./WARP.md) — Main developer guide
- [SYSTEM-INVENTORY.md](./SYSTEM-INVENTORY.md) — Complete system inventory
- [docs/infrastructure_quick_ref.ipynb](./docs/infrastructure_quick_ref.ipynb) — Quick reference

---

## 📞 Node Contacts

### Hardware Support
- **Manufacturer:** Apple Inc.
- **AppleCare:** https://support.apple.com
- **Serial Number:** F2MCWXDTY2

### Network
- **Local Admin:** Ivan Tytar
- **Router:** 192.168.1.1
- **ISP:** (to be documented)

---

**Last Updated:** 2025-01-17 by WARP AI  
**Maintained by:** Ivan Tytar  
**Status:** ✅ Development Ready (Services Partially Running)  
**Next Steps:**
1. Install missing Python packages: `pip3 install fastapi uvicorn`
2. Start core DAGI services: Router, Memory, DevTools
3. Fix Qdrant unhealthy status (check logs: `docker logs qdrant-vector-db`)
4. Configure node-to-node communication with Node #1
5. Set up PostgreSQL for DAARION core memory
