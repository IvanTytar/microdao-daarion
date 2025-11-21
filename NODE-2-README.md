# 📝 Node #2 Documentation Index

**MacBook Pro M4 Max** — Development Node для DAGI Stack

---

## 📚 Документація

### 1. [NODE-2-MACBOOK-SPECS.md](./NODE-2-MACBOOK-SPECS.md) 
**Повна технічна специфікація**
- Hardware: M4 Max (16 cores), 64GB RAM, 2TB SSD, 40-core GPU
- Software: macOS 26.1, Docker, Ollama, Python 3.14
- Network: 192.168.1.244
- Recommended service distribution
- Performance benchmarks
- Security configuration

### 2. [NODE-2-CURRENT-STATE.md](./NODE-2-CURRENT-STATE.md) ⭐
**Поточний стан — що вже працює**
- ✅ Running services: Ollama (2x), LobeChat, Qdrant, MeiliSearch, Jupyter, NATS
- ❌ Not running: DAGI Router, Memory, DevTools, RBAC, RAG, PostgreSQL, Redis
- 📋 Action plan по 5 фазах
- 🔍 Diagnostic commands

### 3. [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
**Загальний огляд мережі**
- Node #1: Production (Hetzner) — 144.76.224.179
- Node #2: Development (MacBook) — 192.168.1.244

---

## 🚀 Quick Start

### Перевірити що працює
```bash
# Docker контейнери
docker ps

# Ollama
curl http://localhost:11434/api/tags
curl http://localhost:11435/api/tags

# LobeChat
open http://localhost:3210

# Qdrant
curl http://localhost:6333/healthz
```

### Запустити DAGI Stack
```bash
# 1. Install dependencies
pip3 install fastapi uvicorn python-multipart aiofiles sqlalchemy asyncpg

# 2. Start PostgreSQL
docker-compose up -d postgres

# 3. Start Router
python3 main_v2.py --config router-config.yml --port 9102

# 4. Test
curl http://localhost:9102/health
```

---

## 📊 Current Status

| Category | Status | Details |
|----------|--------|---------|
| Hardware | ✅ Ready | M4 Max, 64GB, 2TB |
| Ollama | ✅ Running | 2 instances (native + docker) |
| LobeChat | ✅ Running | Port 3210 |
| Qdrant | ⚠️ Unhealthy | Port 6333 (API works) |
| DAGI Stack | ❌ Not Started | Need Phase 1-3 |

---

## 🔗 Links

- [Main Guide: WARP.md](./WARP.md)
- [Production Node: INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- [System Inventory](./SYSTEM-INVENTORY.md)

---

**Last Updated:** 2025-01-17  
**Maintained by:** Ivan Tytar
