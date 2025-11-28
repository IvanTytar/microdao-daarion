# Node Profile Standard v1.0

**Date:** 2025-11-28  
**Status:** Active  
**Version:** 1.0.0

---

## Overview

Цей документ визначає стандартний профіль ноди в мережі DAARION/DAGI. Кожна нода описується набором модулів, які можуть бути присутні або відсутні залежно від ролі та конфігурації.

---

## Node Identity

Кожна нода має унікальну ідентичність:

```json
{
  "node_id": "node-1-hetzner-gex44",
  "name": "Hetzner GEX44 Production",
  "roles": ["core", "gateway", "matrix", "agents", "gpu"],
  "type": "production",
  "ip_address": "144.76.224.179",
  "local_ip": null,
  "hostname": "gateway.daarion.city",
  "status": "online",
  "version": "1.0.0"
}
```

---

## Standard Modules

### 1. Core Modules (Required)

| Module ID | Description | Required |
|-----------|-------------|----------|
| `core.node` | Node identity, roles, version, uptime | ✅ Yes |
| `core.health` | Basic health check endpoint | ✅ Yes |

### 2. Infrastructure Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `infra.metrics` | CPU, RAM, Disk, GPU metrics | - | Recommended |
| `infra.postgres` | PostgreSQL database | 5432 | Optional |
| `infra.redis` | Redis cache | 6379 | Optional |
| `infra.nats` | NATS message broker | 4222 | Optional |
| `infra.qdrant` | Qdrant vector DB | 6333 | Optional |
| `infra.neo4j` | Neo4j graph DB | 7474/7687 | Optional |

### 3. AI/ML Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `ai.ollama` | Ollama LLM runtime | 11434 | Optional |
| `ai.swapper` | Model swapper service | 8890 | Optional |
| `ai.router` | DAGI Router | 9102 | Optional |
| `ai.stt` | Speech-to-Text | 8895 | Optional |
| `ai.tts` | Text-to-Speech | 5002 | Optional |
| `ai.vision` | Vision/Image processing | - | Optional |
| `ai.ocr` | OCR service | 8896 | Optional |
| `ai.image_gen` | Image generation | 9600 | Optional |
| `ai.rag` | RAG service | - | Optional |
| `ai.memory` | Memory service | 8001 | Optional |
| `ai.crewai` | CrewAI orchestration | 9010 | Optional |

### 4. DAARION Stack Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `daarion.web` | Frontend (Next.js) | 3000 | Optional |
| `daarion.city` | City Service | 7001 | Optional |
| `daarion.agents` | Agents Service | 7002 | Optional |
| `daarion.auth` | Auth Service | 7020 | Optional |
| `daarion.secondme` | Second Me Service | 7003 | Optional |
| `daarion.microdao` | MicroDAO Service | 7015 | Optional |

### 5. Matrix Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `matrix.synapse` | Matrix Synapse homeserver | 8008/8018 | Optional |
| `matrix.element` | Element Web client | 8088 | Optional |
| `matrix.gateway` | Matrix Gateway | 7025 | Optional |
| `matrix.presence` | Presence Aggregator | 8085 | Optional |

### 6. DAGI Infrastructure Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `dagi.gateway` | DAGI Gateway | 9300 | Optional |
| `dagi.rbac` | RBAC Service | 9200 | Optional |
| `dagi.devtools` | DevTools | 8008 | Optional |
| `dagi.registry` | Node Registry | 9205 | Optional |
| `dagi.parser` | Parser Service | 9400 | Optional |

### 7. Monitoring Modules

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `monitoring.prometheus` | Prometheus | 9090 | Optional |
| `monitoring.grafana` | Grafana | 3001 | Optional |
| `monitoring.loki` | Loki logs | - | Optional |

### 8. External Integrations

| Module ID | Description | Port | Required |
|-----------|-------------|------|----------|
| `integration.telegram` | Telegram Bot API | 8081 | Optional |
| `integration.web_search` | Web Search Service | 8897 | Optional |

---

## Module Status Values

| Status | Description |
|--------|-------------|
| `up` | Module is running and healthy |
| `down` | Module is not running |
| `degraded` | Module is running but with issues |
| `unknown` | Status cannot be determined |
| `not_installed` | Module is not installed on this node |

---

## Node Profiles

### Production Node (NODE1)

```json
{
  "node_id": "node-1-hetzner-gex44",
  "name": "Hetzner GEX44 Production",
  "roles": ["core", "gateway", "matrix", "agents", "gpu"],
  "type": "production",
  "gpu": {
    "name": "NVIDIA RTX 4000 SFF Ada",
    "vram_gb": 20
  },
  "modules": [
    {"id": "core.node", "status": "up"},
    {"id": "core.health", "status": "up"},
    {"id": "infra.metrics", "status": "up"},
    {"id": "infra.postgres", "status": "up", "port": 5432},
    {"id": "infra.redis", "status": "up", "port": 6379},
    {"id": "infra.nats", "status": "up", "port": 4222},
    {"id": "infra.qdrant", "status": "up", "port": 6333},
    {"id": "infra.neo4j", "status": "up", "port": 7474},
    {"id": "ai.ollama", "status": "up", "port": 11434, "models": ["mistral:7b"]},
    {"id": "ai.swapper", "status": "degraded", "port": 8890},
    {"id": "ai.router", "status": "up", "port": 9102},
    {"id": "ai.stt", "status": "degraded", "port": 8895},
    {"id": "ai.tts", "status": "up", "port": 5002},
    {"id": "ai.ocr", "status": "degraded", "port": 8896},
    {"id": "ai.image_gen", "status": "degraded", "port": 9600},
    {"id": "ai.memory", "status": "up", "port": 8001},
    {"id": "ai.crewai", "status": "up", "port": 9010},
    {"id": "daarion.web", "status": "up", "port": 3000},
    {"id": "daarion.city", "status": "up", "port": 7001},
    {"id": "daarion.agents", "status": "up", "port": 7002},
    {"id": "daarion.auth", "status": "up", "port": 7020},
    {"id": "daarion.secondme", "status": "up", "port": 7003},
    {"id": "daarion.microdao", "status": "up", "port": 7015},
    {"id": "matrix.synapse", "status": "up", "port": 8018},
    {"id": "matrix.element", "status": "up", "port": 8088},
    {"id": "matrix.gateway", "status": "up", "port": 7025},
    {"id": "matrix.presence", "status": "up", "port": 8085},
    {"id": "dagi.gateway", "status": "up", "port": 9300},
    {"id": "dagi.rbac", "status": "up", "port": 9200},
    {"id": "dagi.devtools", "status": "up", "port": 8008},
    {"id": "dagi.registry", "status": "up", "port": 9205},
    {"id": "dagi.parser", "status": "up", "port": 9400},
    {"id": "monitoring.prometheus", "status": "up", "port": 9090},
    {"id": "integration.telegram", "status": "up", "port": 8081}
  ]
}
```

### Development Node (NODE2)

```json
{
  "node_id": "node-2-macbook-m4max",
  "name": "MacBook Pro M4 Max",
  "roles": ["development", "gpu", "ai_runtime"],
  "type": "development",
  "gpu": {
    "name": "Apple M4 Max",
    "unified_memory_gb": 128
  },
  "modules": [
    {"id": "core.node", "status": "up"},
    {"id": "core.health", "status": "up"},
    {"id": "infra.postgres", "status": "up", "port": 5432},
    {"id": "infra.qdrant", "status": "up", "port": 6333},
    {"id": "ai.ollama", "status": "up", "port": 11434, "models": [
      "deepseek-r1:70b", "deepseek-coder:33b", "qwen2.5-coder:32b",
      "gemma2:27b", "mistral-nemo:12b", "llava:13b", "phi3:latest",
      "starcoder2:3b", "gpt-oss:latest"
    ]},
    {"id": "ai.swapper", "status": "up", "port": 8890},
    {"id": "ai.router", "status": "up", "port": 9102},
    {"id": "ai.stt", "status": "up", "port": 8895},
    {"id": "ai.ocr", "status": "up", "port": 8896},
    {"id": "dagi.gateway", "status": "up", "port": 9300},
    {"id": "dagi.rbac", "status": "up", "port": 9200},
    {"id": "dagi.devtools", "status": "up", "port": 8008},
    {"id": "dagi.crewai", "status": "up", "port": 9010},
    {"id": "integration.web_search", "status": "up", "port": 8897}
  ]
}
```

---

## Service Inventory

### NODE1 Services (35 containers)

| Service | Image | Port | Status | Stack |
|---------|-------|------|--------|-------|
| dagi-router | dagi-router:latest | 9102 | up | DAGI |
| daarion-agents-service | daarion-agents-service:latest | 7002 | up | DAARION |
| daarion-web | daarion-web:latest | 3000 | up | DAARION |
| matrix-presence-aggregator | matrix-presence-aggregator:latest | 8085 | up | DAARION |
| daarion-city-service | microdao-daarion-city-service:latest | 7001 | up | DAARION |
| dagi-node-registry | microdao-daarion-node-registry:latest | 9205 | up | DAGI |
| daarion-matrix-gateway | daarion-matrix-gateway:latest | 7025 | up | DAARION |
| daarion-auth | daarion-auth | 7020 | up | DAARION |
| daarion-synapse | matrixdotorg/synapse:latest | 8018 | up | Matrix |
| daarion-element | vectorim/element-web:latest | 8088 | up | Matrix |
| daarion-secondme-service | daarion-secondme-service:latest | 7003 | up | DAARION |
| daarion-microdao-service | daarion-microdao-service:latest | 7015 | up | DAARION |
| daarion-redis | redis:7-alpine | 6379 | up | Infra |
| dagi-gateway | microdao-daarion-gateway | 9300 | up | DAGI |
| dagi-rbac | microdao-daarion-rbac | 9200 | up | DAGI |
| dagi-devtools | microdao-daarion-devtools | 8008 | up | DAGI |
| dagi-crewai | microdao-daarion-crewai | 9010 | up | DAGI |
| dagi-stt-service | stt-service-stt-service | 8895 | degraded | DAGI |
| telegram-gateway | telegram-infrastructure-telegram-gateway | 8000 | up | Integration |
| dagi-tts | daarion-tts:latest | 5002 | up | DAGI |
| dagi-swapper-service | microdao-daarion-swapper-service | 8890 | degraded | DAGI |
| dagi-vector-db-service | vector-db-service-vector-db-service | - | restarting | DAGI |
| dagi-ocr-service | ocr-service-ocr-service | 8896 | degraded | DAGI |
| dagi-web-search-service | web-search-service-web-search-service | 8897 | degraded | DAGI |
| dagi-postgres | pgvector/pgvector:pg15 | 5432 | up | Infra |
| dagi-memory-service | microdao-daarion-memory-service | 8001 | up | DAGI |
| dagi-neo4j-exporter | microdao-daarion-neo4j-exporter | 9108 | up | Monitoring |
| dagi-neo4j | neo4j:5.15-community | 7474/7687 | up | Infra |
| dagi-nats | nats:2-alpine | 4222 | up | Infra |
| dagi-image-gen | microdao-daarion-image-gen-service | 9600 | degraded | DAGI |
| dagi-rag-service | microdao-daarion-rag-service | - | restarting | DAGI |
| dagi-qdrant | qdrant/qdrant:v1.7.4 | 6333 | up | Infra |
| dagi-prometheus | prom/prometheus:latest | 9090 | up | Monitoring |
| dagi-parser-service | microdao-daarion-parser-service | 9400 | up | DAGI |
| telegram-bot-api | aiogram/telegram-bot-api:latest | 8081 | up | Integration |

**Systemd Services:**
- `ollama.service` — Ollama LLM runtime (port 11434)
- `k3s.service` — Lightweight Kubernetes
- `nvidia-persistenced.service` — NVIDIA GPU daemon

**GPU:** NVIDIA RTX 4000 SFF Ada Generation (20GB VRAM)

### NODE2 Services (13 containers)

| Service | Image | Port | Status | Stack |
|---------|-------|------|--------|-------|
| ocr-service | ocr-service:latest | 8896 | up | DAGI |
| dagi-stt-service | stt-service-stt-service | 8895 | up | DAGI |
| swapper-service | swapper-service:latest | 8890 | up | DAGI |
| dagi-web-search-service | web-search-service-web-search-service | 8897 | degraded | DAGI |
| dagi-postgres | postgres:15-alpine | 5432 | up | Infra |
| dagi-gateway | microdao-daarion-gateway | 9300 | up | DAGI |
| dagi-router | microdao-daarion-router | 9102 | up | DAGI |
| dagi-crewai | microdao-daarion-crewai | 9010 | up | DAGI |
| dagi-devtools | microdao-daarion-devtools | 8008 | up | DAGI |
| dagi-rbac | microdao-daarion-rbac | 9200 | up | DAGI |
| jupyter-lab | jupyter/datascience-notebook:latest | 8888 | up | Dev |
| qdrant-vector-db | qdrant/qdrant:latest | 6333 | up | Infra |
| meilisearch-search | getmeili/meilisearch:v1.11 | 7700 | up | Infra |

**Ollama Models (9):**
- deepseek-r1:70b (42 GB)
- deepseek-coder:33b (18 GB)
- qwen2.5-coder:32b (19 GB)
- gemma2:27b (15 GB)
- mistral-nemo:12b (7 GB)
- llava:13b (8 GB)
- phi3:latest (2 GB)
- starcoder2:3b (2 GB)
- gpt-oss:latest (13 GB)

**GPU:** Apple M4 Max (128GB Unified Memory)

---

## API Contract

### Node Dashboard Endpoint

`GET /node/dashboard`

Returns aggregated dashboard data for the current node.

```json
{
  "node": {
    "id": "node-1-hetzner-gex44",
    "name": "Hetzner GEX44 Production",
    "status": "online",
    "uptime_seconds": 604800,
    "version": "1.0.0"
  },
  "resources": {
    "cpu_usage_pct": 37.5,
    "ram": {"total_gb": 64, "used_gb": 43},
    "gpu": {"name": "NVIDIA RTX 4000 SFF Ada", "vram_gb": 20, "used_gb": 18},
    "disk": {"total_gb": 4000, "used_gb": 2200}
  },
  "modules": [
    {"id": "ai.router", "status": "up", "port": 9102, "latency_ms": 23},
    {"id": "ai.swapper", "status": "up", "port": 8890, "active_model": "mistral:7b"},
    ...
  ],
  "agents": {
    "total": 54,
    "online": 53,
    "by_kind": {"vision": 4, "developer": 5, ...}
  }
}
```

---

## Changelog

- **v1.0.0** (2025-11-28): Initial standard based on NODE1/NODE2 audit

