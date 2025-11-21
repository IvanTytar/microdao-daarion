# 🏗️ Infrastructure Overview — DAARION & MicroDAO

**Версія:** 1.0.0  
**Останнє оновлення:** 2025-01-17  
**Статус:** Production Ready

---

## 📍 Network Nodes

### Node #1: Production Server (Hetzner GEX44 #2844465)
- **Node ID:** `node-1-hetzner-gex44`
- **IP Address:** `144.76.224.179`
- **SSH Access:** `ssh root@144.76.224.179`
- **Location:** Hetzner Cloud (Germany)
- **Project Root:** `/opt/microdao-daarion`
- **Docker Network:** `dagi-network`
- **Role:** Production Router + Gateway + All Services
- **Uptime:** 24/7

**Domains:**
- `gateway.daarion.city` → `144.76.224.179` (Gateway + Nginx)
- `api.daarion.city` → TBD (API Gateway)
- `daarion.city` → TBD (Main website)

### Node #2: Development Node (MacBook Pro M4 Max)
- **Node ID:** `node-2-macbook-m4max`
- **Local IP:** `192.168.1.244`
- **SSH Access:** `ssh apple@192.168.1.244` (if enabled)
- **Location:** Local Network (Ivan's Office)
- **Project Root:** `/Users/apple/github-projects/microdao-daarion`
- **Role:** Development + Testing + Backup Router
- **Specs:** M4 Max (16 cores), 64GB RAM, 2TB SSD, 40-core GPU
- **Uptime:** On-demand (battery-powered)

**See full specs:** [NODE-2-MACBOOK-SPECS.md](./NODE-2-MACBOOK-SPECS.md)  
**Current state:** [NODE-2-CURRENT-STATE.md](./NODE-2-CURRENT-STATE.md) — What's running now

---

## 🐙 GitHub Repositories

### 1. MicroDAO (Current Project)
- **Repository:** `git@github.com:IvanTytar/microdao-daarion.git`
- **HTTPS:** `https://github.com/IvanTytar/microdao-daarion.git`
- **Remote Name:** `origin`
- **Main Branch:** `main`
- **Purpose:** MicroDAO core code, DAGI Stack, documentation

**Quick Clone:**
```bash
git clone git@github.com:IvanTytar/microdao-daarion.git
cd microdao-daarion
```

### 2. DAARION.city (Official Website)
- **Repository:** `git@github.com:DAARION-DAO/daarion-ai-city.git`
- **HTTPS:** `https://github.com/DAARION-DAO/daarion-ai-city.git`
- **Remote Name:** `daarion-city` (when added as remote)
- **Main Branch:** `main`
- **Purpose:** Official DAARION.city website and integrations

**Quick Clone:**
```bash
git clone git@github.com:DAARION-DAO/daarion-ai-city.git
cd daarion-ai-city
```

**Add as remote to MicroDAO:**
```bash
cd microdao-daarion
git remote add daarion-city git@github.com:DAARION-DAO/daarion-ai-city.git
git fetch daarion-city
```

---

## 🚀 Services & Ports (Docker Compose)

### Core Services

| Service | Port | Container Name | Health Endpoint |
|---------|------|----------------|-----------------|
| **DAGI Router** | 9102 | `dagi-router` | `http://localhost:9102/health` |
| **Bot Gateway** | 9300 | `dagi-gateway` | `http://localhost:9300/health` |
| **DevTools Backend** | 8008 | `dagi-devtools` | `http://localhost:8008/health` |
| **CrewAI Orchestrator** | 9010 | `dagi-crewai` | `http://localhost:9010/health` |
| **RBAC Service** | 9200 | `dagi-rbac` | `http://localhost:9200/health` |
| **RAG Service** | 9500 | `dagi-rag-service` | `http://localhost:9500/health` |
| **Memory Service** | 8000 | `dagi-memory-service` | `http://localhost:8000/health` |
| **Parser Service** | 9400 | `dagi-parser-service` | `http://localhost:9400/health` |
| **Swapper Service** | 8890-8891 | `swapper-service` | `http://localhost:8890/health` |
| **PostgreSQL** | 5432 | `dagi-postgres` | - |
| **Redis** | 6379 | `redis` | `redis-cli PING` |
| **Neo4j** | 7687 (bolt), 7474 (http) | `neo4j` | `http://localhost:7474` |
| **Qdrant** | 6333 (http), 6334 (grpc) | `dagi-qdrant` | `http://localhost:6333/healthz` |
| **Grafana** | 3000 | `grafana` | `http://localhost:3000` |
| **Prometheus** | 9090 | `prometheus` | `http://localhost:9090` |
| **Neo4j Exporter** | 9091 | `neo4j-exporter` | `http://localhost:9091/metrics` |
| **Ollama** | 11434 | `ollama` (external) | `http://localhost:11434/api/tags` |

**Note:** Vision Encoder (port 8001) не запущений на Node #1. Замість нього використовується **Swapper Service** з **vision-8b** моделлю (Qwen3-VL 8B) для обробки зображень через динамічне завантаження моделей.

### HTTPS Gateway (Nginx)
- **Port:** 443 (HTTPS), 80 (HTTP redirect)
- **Domain:** `gateway.daarion.city`
- **SSL:** Let's Encrypt (auto-renewal)
- **Proxy Pass:**
  - `/telegram/webhook` → `http://localhost:9300/telegram/webhook`
  - `/helion/telegram/webhook` → `http://localhost:9300/helion/telegram/webhook`

---

## 🤖 Telegram Bots

### 1. DAARWIZZ Bot
- **Username:** [@DAARWIZZBot](https://t.me/DAARWIZZBot)
- **Bot ID:** `8323412397`
- **Token:** `8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M` ✅
- **Webhook:** `https://gateway.daarion.city/telegram/webhook`
- **Status:** Active (Production)

### 2. Helion Bot (Energy Union AI)
- **Username:** [@HelionEnergyBot](https://t.me/HelionEnergyBot) (example)
- **Bot ID:** `8112062582`
- **Token:** `8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM` ✅
- **Webhook:** `https://gateway.daarion.city/helion/telegram/webhook`
- **Status:** Ready for deployment

---

## 🔐 Environment Variables (.env)

### Essential Variables

```bash
# Bot Gateway
TELEGRAM_BOT_TOKEN=8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
HELION_TELEGRAM_BOT_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
GATEWAY_PORT=9300

# DAGI Router
ROUTER_PORT=9102
ROUTER_CONFIG_PATH=./router-config.yml

# Ollama (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# Memory Service
MEMORY_SERVICE_URL=http://memory-service:8000
MEMORY_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/daarion_memory

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=daarion_memory

# RBAC
RBAC_PORT=9200
RBAC_DATABASE_URL=sqlite:///./rbac.db

# Vision Encoder (GPU required for production)
VISION_ENCODER_URL=http://vision-encoder:8001
VISION_DEVICE=cuda
VISION_MODEL_NAME=ViT-L-14
VISION_MODEL_PRETRAINED=openai

# Qdrant Vector Database
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_ENABLED=true

# CORS
CORS_ORIGINS=http://localhost:3000,https://daarion.city

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
```

---

## 📦 Deployment Workflow

### 1. Local Development → GitHub
```bash
# On Mac (local)
cd /Users/apple/github-projects/microdao-daarion
git add .
git commit -m "feat: description"
git push origin main
```

### 2. GitHub → Production Server
```bash
# SSH to server
ssh root@144.76.224.179

# Navigate to project
cd /opt/microdao-daarion

# Pull latest changes
git pull origin main

# Restart services
docker-compose down
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f gateway
```

### 3. HTTPS Gateway Setup
```bash
# On server (one-time setup)
sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city
```

### 4. Register Telegram Webhook
```bash
# On server
./scripts/register-agent-webhook.sh daarwizz 8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M gateway.daarion.city
./scripts/register-agent-webhook.sh helion 8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM gateway.daarion.city
```

---

## 🧪 Testing & Monitoring

### Health Checks (All Services)
```bash
# On server
curl http://localhost:9102/health  # Router
curl http://localhost:9300/health  # Gateway
curl http://localhost:8000/health  # Memory
curl http://localhost:9200/health  # RBAC
curl http://localhost:9500/health  # RAG
curl http://localhost:8001/health  # Vision Encoder
curl http://localhost:6333/healthz # Qdrant

# Public HTTPS
curl https://gateway.daarion.city/health
```

### Smoke Tests
```bash
# On server
cd /opt/microdao-daarion
./smoke.sh
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway
docker-compose logs -f router
docker-compose logs -f memory-service

# Filter by error level
docker-compose logs gateway | grep ERROR
```

### Database Check
```bash
# PostgreSQL
docker exec -it dagi-postgres psql -U postgres -c "\l"
docker exec -it dagi-postgres psql -U postgres -d daarion_memory -c "\dt"
```

---

## 🌐 DNS Configuration

### Current DNS Records (Cloudflare/Hetzner)
| Record Type | Name | Value | TTL |
|-------------|------|-------|-----|
| A | `gateway.daarion.city` | `144.76.224.179` | 300 |
| A | `daarion.city` | TBD | 300 |
| A | `api.daarion.city` | TBD | 300 |

**Verify DNS:**
```bash
dig gateway.daarion.city +short
# Should return: 144.76.224.179
```

---

## 📂 Key File Locations

### On Server (`/opt/microdao-daarion`)
- **Docker Compose:** `docker-compose.yml`
- **Environment:** `.env` (never commit!)
- **Router Config:** `router-config.yml`
- **Nginx Setup:** `scripts/setup-nginx-gateway.sh`
- **Webhook Register:** `scripts/register-agent-webhook.sh`
- **Logs:** `logs/` directory
- **Data:** `data/` directory

### System Prompts
- **DAARWIZZ:** `gateway-bot/daarwizz_prompt.txt`
- **Helion:** `gateway-bot/helion_prompt.txt`

### Documentation
- **Quick Start:** `WARP.md`
- **Agents Map:** `docs/agents.md`
- **RAG Ingestion:** `RAG-INGESTION-STATUS.md`
- **HMM Memory:** `HMM-MEMORY-STATUS.md`
- **Crawl4AI Service:** `CRAWL4AI-STATUS.md`
- **Architecture:** `docs/cursor/README.md`
- **API Reference:** `docs/api.md`

---

## 🔄 Backup & Restore

### Backup Database
```bash
# PostgreSQL dump
docker exec dagi-postgres pg_dump -U postgres daarion_memory > backup_$(date +%Y%m%d).sql

# RBAC SQLite
cp data/rbac/rbac.db backups/rbac_$(date +%Y%m%d).db
```

### Restore Database
```bash
# PostgreSQL restore
cat backup_20250117.sql | docker exec -i dagi-postgres psql -U postgres daarion_memory

# RBAC restore
cp backups/rbac_20250117.db data/rbac/rbac.db
docker-compose restart rbac
```

---

## 📞 Contacts & Support

### Team
- **Owner:** Ivan Tytar
- **Email:** admin@daarion.city
- **GitHub:** [@IvanTytar](https://github.com/IvanTytar)

### External Services
- **Hetzner Support:** https://www.hetzner.com/support
- **Cloudflare Support:** https://dash.cloudflare.com
- **Telegram Bot Support:** https://core.telegram.org/bots

---

## 🔗 Quick Reference Links

### Documentation
- [WARP.md](./WARP.md) — Main developer guide
- [SYSTEM-INVENTORY.md](./SYSTEM-INVENTORY.md) — Complete system inventory (GPU, AI models, 17 services)
- [DAARION_CITY_REPO.md](./DAARION_CITY_REPO.md) — Repository management
- [RAG-INGESTION-STATUS.md](./RAG-INGESTION-STATUS.md) — RAG event-driven ingestion (Wave 1, 2, 3)
- [HMM-MEMORY-STATUS.md](./HMM-MEMORY-STATUS.md) — Hierarchical Memory System for agents
- [CRAWL4AI-STATUS.md](./CRAWL4AI-STATUS.md) — Web crawler for document ingestion (PDF, Images, HTML)
- [VISION-ENCODER-STATUS.md](./VISION-ENCODER-STATUS.md) — Vision Encoder service status (OpenCLIP multimodal embeddings)
- [VISION-RAG-IMPLEMENTATION.md](./VISION-RAG-IMPLEMENTATION.md) — Vision RAG complete implementation (client, image search, routing)
- [services/vision-encoder/README.md](./services/vision-encoder/README.md) — Vision Encoder deployment guide
- [SERVER_SETUP_INSTRUCTIONS.md](./SERVER_SETUP_INSTRUCTIONS.md) — Server setup
- [DEPLOY-NOW.md](./DEPLOY-NOW.md) — Deployment checklist
- [STATUS-HELION.md](./STATUS-HELION.md) — Helion agent status

### Monitoring Dashboards
- **Gateway Health:** `https://gateway.daarion.city/health`
- **Router Providers:** `http://localhost:9102/providers`
- **Routing Table:** `http://localhost:9102/routing`
- **Prometheus:** `http://localhost:9090` (Metrics, Alerts, Targets)
- **Grafana Dashboard:** `http://localhost:3000` (Neo4j metrics, DAO/Agents/Users analytics)
- **Neo4j Browser:** `http://localhost:7474` (Graph visualization, Cypher queries)
- **Neo4j Exporter:** `http://localhost:9091/metrics` (Prometheus metrics endpoint)

---

## 🚨 Troubleshooting

### Service Not Starting
```bash
# Check logs
docker-compose logs service-name

# Restart service
docker-compose restart service-name

# Rebuild and restart
docker-compose up -d --build service-name
```

### Database Connection Issues
```bash
# Check PostgreSQL
docker exec -it dagi-postgres psql -U postgres -c "SELECT 1"

# Restart PostgreSQL
docker-compose restart postgres

# Check connection from memory service
docker exec -it dagi-memory-service env | grep DATABASE
```

### Webhook Not Working
```bash
# Check webhook status
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Re-register webhook
./scripts/register-agent-webhook.sh <agent> <token> <domain>

# Check gateway logs
docker-compose logs -f gateway | grep webhook
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

---

## 📊 Metrics & Analytics (Future)

### Planned Monitoring Stack
- **Prometheus:** Metrics collection
- **Grafana:** Dashboards
- **Loki:** Log aggregation
- **Alertmanager:** Alerts

**Port Reservations:**
- Prometheus: 9090
- Grafana: 3000
- Loki: 3100

---

**Last Updated:** 2025-01-17 by WARP AI  
**Maintained by:** Ivan Tytar & DAARION Team  
**Status:** ✅ Production Ready
