# 📊 Node #2 Current State — MacBook Pro M4 Max

**Дата:** 2025-11-22  
**Node ID:** node-2-macbook-m4max  
**Статус:** 🟡 Частково налаштовано (Development Services Running)

---

## ✅ Що вже працює

### 🤖 AI/LLM Services

#### 1. Ollama (Подвійна інсталяція)
```bash
# Native Ollama (via Pieces OS)
curl http://localhost:11434/api/tags
# Status: ✅ Running
# PID: 1999
# Process: /Applications/Pieces OS.app/Contents/Resources/ollama-darwin serve

# Docker Ollama
curl http://localhost:11435/api/tags  
# Container: ollama-ai
# Status: ✅ Running (20 hours uptime)
# Port: 0.0.0.0:11435->11434/tcp
```

**Встановлені моделі (8 моделей, завантажено 2025-11-21):**
- `mistral-nemo:12b` (7.1 GB, Q4_0, 12.2B params) — завантажено 14 годин тому
- `gemma2:27b` (15 GB, Q4_0, 27.2B params) — завантажено 15 годин тому
- `deepseek-coder:33b` (18 GB, Q4_0, 33B params) — завантажено 15 годин тому
- `qwen2.5-coder:32b` (19 GB, Q4_K_M, 32.8B params) — завантажено 15 годин тому
- `deepseek-r1:70b` (42 GB, Q4_K_M, 70.6B params) — завантажено 15 годин тому
- `starcoder2:3b` (1.7 GB, Q4_0, 3B params) — завантажено 15 годин тому
- `phi3:latest` (2.2 GB, Q4_0, 3.8B params) — завантажено 17 годин тому
- `gpt-oss:latest` (13 GB, MXFP4, 20.9B params) — завантажено 17 годин тому

**Загальний розмір:** ~118 GB моделей  
**Загальна кількість параметрів:** ~201.5B параметрів

#### 2. LobeChat (AI Chat Interface)
```bash
# Web UI: http://localhost:3210
curl http://localhost:3210
# Container: lobe-chat
# Status: ✅ Running (20 hours uptime)
# Image: lobehub/lobe-chat
```

### 🗄️ Database & Storage Services

#### 3. Qdrant (Vector Database)
```bash
# API: http://localhost:6333
curl http://localhost:6333/healthz
# Container: qdrant-vector-db
# Status: ⚠️ Unhealthy (but API responds)
# Image: qdrant/qdrant:latest
# Ports: 0.0.0.0:6333-6335->6333-6335/tcp
# Volume: apple_qdrant_storage
```

**Проблема:** Docker показує unhealthy, але API працює. Потребує перевірки логів.

#### 4. MeiliSearch (Full-text Search)
```bash
# API: http://localhost:7700
curl http://localhost:7700
# Container: meilisearch-search
# Status: ✅ Healthy (20 hours uptime)
# Image: getmeili/meilisearch:v1.11
```

### 📊 Development Tools

#### 5. Jupyter Lab (Data Science Notebook)
```bash
# Web UI: http://localhost:8888
curl http://localhost:8888
# Container: jupyter-lab
# Status: ✅ Healthy (20 hours uptime)
# Image: jupyter/datascience-notebook:latest
```

#### 6. NATS JetStream (Message Broker)
```bash
# NATS: nats://localhost:4222
# Management: http://localhost:8222
nc -zv localhost 4222
# Container: nats-jetstream
# Status: ✅ Running (3 hours uptime)
# Image: nats:latest
# Ports: 4222 (client), 6222 (routing), 8222 (monitoring)
```

---

## 📦 Docker Infrastructure

### Volumes
```bash
docker volume ls | grep -E "(dagi|daarion|qdrant)"
```

- `apple_qdrant_storage` — Qdrant vector embeddings
- `microdao-daarion_rag-model-cache` — RAG model cache

### Networks
- `daarion-network` (bridge) — Custom Docker network

### Data Directories
- `/Users/apple/github-projects/microdao-daarion/data/rbac/` — RBAC database (empty, ready)

---

## 🔧 Configuration Files

### ✅ Present
- `.env` — Environment variables (2.3 KB, configured)
- `.env.example` — Template (4.6 KB)
- `docker-compose.yml` — Services definition (7.1 KB, updated 2025-01-17)
- `router-config.yml` — Router rules (7.4 KB, updated 2025-01-17)
- `router-config.yml.backup` — Config backup (4.5 KB)

---

## 🐍 Python Environment

### Installed Packages
```bash
pip3 list | grep -E "(fastapi|uvicorn|httpx|pydantic|openai)"
```

- ✅ `httpx 0.28.1` — HTTP client for async requests
- ✅ `openai 2.8.0` — OpenAI SDK
- ✅ `pydantic 2.12.4` — Data validation
- ✅ `pydantic_core 2.41.5` — Pydantic core
- ❌ `fastapi` — **MISSING** (need for DAGI Router)
- ❌ `uvicorn` — **MISSING** (need for FastAPI server)

### Required Installation
```bash
pip3 install fastapi uvicorn python-multipart aiofiles
```

---

## 🚫 Що НЕ працює (потрібно запустити)

### DAGI Stack Core Services

#### 1. DAGI Router (Port 9102)
```bash
# Status: ❌ Not running
# Purpose: Main routing engine for AI requests
# Command to start:
python3 main_v2.py --config router-config.yml --port 9102
```

#### 2. Memory Service (Port 8000)
```bash
# Status: ❌ Not running
# Purpose: Agent memory and context management
# Requires: PostgreSQL
# Command to start:
cd services/memory-service && python3 main.py
```

#### 3. DevTools Backend (Port 8008)
```bash
# Status: ❌ Not running
# Purpose: File operations, test execution
# Command to start:
cd devtools-backend && python3 main.py
```

#### 4. Bot Gateway (Port 9300)
```bash
# Status: ❌ Not running
# Purpose: Telegram/Discord bot integration
# Command to start:
cd gateway-bot && python3 main.py
```

#### 5. RBAC Service (Port 9200)
```bash
# Status: ❌ Not running
# Purpose: Role-based access control
# Database: SQLite at data/rbac/rbac.db (empty)
# Command to start:
cd microdao && python3 main.py
```

#### 6. RAG Service (Port 9500)
```bash
# Status: ❌ Not running
# Purpose: Document retrieval and Q&A
# Requires: PostgreSQL, embeddings
# Command to start:
cd services/rag-service && python3 main.py
```

#### 7. Parser Service (Port 9400)
```bash
# Status: ❌ Not running
# Purpose: Document parsing and Q&A generation
# Command to start:
cd services/parser-service && python3 main.py
```

#### 8. CrewAI Orchestrator (Port 9010)
```bash
# Status: ❌ Not running
# Purpose: Multi-agent workflow coordination
# Command to start:
cd orchestrator && python3 crewai_backend.py
```

### Supporting Services

#### 9. PostgreSQL (Port 5432)
```bash
# Status: ❌ Not running
# Purpose: Memory, RAG, and core data storage
# Database: daarion_memory
# Start via docker-compose:
docker-compose up -d postgres
```

#### 10. Redis (Port 6379)
```bash
# Status: ❌ Not running
# Purpose: Cache and session management
# Start via docker-compose:
docker-compose up -d redis
```

#### 11. Neo4j (Port 7474/7687)
```bash
# Status: ❌ Not running
# Purpose: Graph database for DAO relationships
# Start via docker-compose:
docker-compose up -d neo4j
```

---

## 📋 Action Plan (Priority Order)

### Phase 1: Python Environment (5 min)
```bash
# Install missing dependencies
pip3 install fastapi uvicorn python-multipart aiofiles sqlalchemy asyncpg

# Verify installation
python3 -c "import fastapi, uvicorn; print('✅ Ready')"
```

### Phase 2: Core Database (10 min)
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Wait for ready
sleep 5

# Verify connection
docker exec dagi-postgres pg_isready

# Initialize DAARION memory database
docker exec -it dagi-postgres psql -U postgres -c "CREATE DATABASE daarion_memory;"
```

### Phase 3: DAGI Router (15 min)
```bash
# Validate configuration
python3 config_loader.py

# Start router in background
nohup python3 main_v2.py --config router-config.yml --port 9102 > logs/router.log 2>&1 &

# Test health
curl http://localhost:9102/health
```

### Phase 4: Supporting Services (20 min)
```bash
# Start Redis
docker-compose up -d redis

# Start Memory Service
cd services/memory-service
nohup python3 main.py > ../../logs/memory.log 2>&1 &
cd ../..

# Test Memory Service
curl http://localhost:8000/health
```

### Phase 5: Optional Services (on-demand)
```bash
# DevTools (for development)
cd devtools-backend
python3 main.py

# RBAC (for microDAO features)
cd microdao
python3 main.py

# RAG Service (for document Q&A)
cd services/rag-service
python3 main.py
```

---

## 🔍 Diagnostics Commands

### Check Running Services
```bash
# All Docker containers
docker ps -a

# All listening ports
lsof -i -P | grep LISTEN | grep -E "(9102|8000|8008|3210|6333|11434)"

# Python processes
ps aux | grep python | grep -E "(main|uvicorn)"
```

### Check Logs
```bash
# Docker logs
docker logs qdrant-vector-db
docker logs lobe-chat
docker logs ollama-ai

# Application logs (when services start)
tail -f logs/router.log
tail -f logs/memory.log
```

### Test Services
```bash
# Ollama native
curl http://localhost:11434/api/tags

# Ollama Docker
curl http://localhost:11435/api/tags

# LobeChat
curl http://localhost:3210

# Qdrant
curl http://localhost:6333/healthz

# MeiliSearch
curl http://localhost:7700/health
```

---

## 🔗 Related Documentation

- [NODE-2-MACBOOK-SPECS.md](./NODE-2-MACBOOK-SPECS.md) — Complete hardware specs
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Network nodes overview
- [WARP.md](./WARP.md) — Main developer guide
- [docker-compose.yml](./docker-compose.yml) — Service definitions

---

## 📊 Resource Usage (Current)

### CPU & Memory
```bash
# Check current usage
top -l 1 | head -n 10

# Docker resource usage
docker stats --no-stream
```

**Estimated current usage:**
- CPU: ~10-15% (background services)
- RAM: ~8-10 GB (Ollama + containers)
- Disk: ~275 GB used / 2 TB total

**Available for DAGI Stack:**
- CPU: 16 cores (mostly free)
- RAM: ~54 GB free
- Disk: 1.72 TB free

---

**Last Updated:** 2025-01-17 by WARP AI  
**Status:** 🟡 Partially Ready — Development services running, core DAGI services need to be started  
**Next Command:** `pip3 install fastapi uvicorn && docker-compose up -d postgres`
