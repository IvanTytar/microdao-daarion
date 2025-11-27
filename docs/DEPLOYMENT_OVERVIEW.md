# DAARION Deployment Overview

**Version:** 1.0.0  
**Phase:** INFRA — All-in-One Gateway  
**Last Updated:** 24 листопада 2025

---

## 🎯 Architecture Overview

DAARION uses a **microservices architecture** with a single **NGINX gateway** as the entry point.

```
                    ┌─────────────────┐
                    │   Internet      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  NGINX Gateway  │
                    │   (Port 80/443) │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼─────┐      ┌─────▼──────┐    ┌──────▼─────┐
    │ Frontend │      │ API Routes │    │ WebSockets │
    │  (SPA)   │      │  /api/*    │    │   /ws/*    │
    └──────────┘      └─────┬──────┘    └──────┬─────┘
                             │                   │
              ┌──────────────┼──────────────┬────┘
              │              │              │
      ┌───────▼──────┐  ┌───▼────────┐ ┌──▼─────────┐
      │ Auth Service │  │DAO Service │ │Living Map  │
      │   :7011      │  │  :7016     │ │  :7017     │
      └──────┬───────┘  └───┬────────┘ └──┬─────────┘
             │              │              │
             └──────────────┼──────────────┘
                            │
                   ┌────────▼──────────┐
                   │  PostgreSQL :5432 │
                   │  NATS :4222       │
                   │  Redis :6379      │
                   └───────────────────┘
```

---

## 📦 Services Stack

### Infrastructure Services (4)
- **PostgreSQL** — Database
- **Redis** — Cache & Sessions
- **NATS** — Message Bus (JetStream)
- **Matrix Synapse** — Chat server

### Core Services (4)
- **auth-service** (7011) — Authentication (Passkey)
- **pdp-service** (7012) — Authorization (PDP)
- **usage-engine** (7013) — Metrics & Usage tracking
- **messaging-service** (7004) — Messenger API

### Agent Infrastructure (6)
- **agent-runtime** (7010) — Agent execution
- **agent-filter** (7005) — Request filtering
- **dagi-router** (7006) — Routing logic
- **llm-proxy** (7007) — LLM provider proxy
- **memory-orchestrator** (7008) — Memory management
- **toolcore** (7009) — Tool execution

### Application Services (6)
- **agents-service** (7014) — Agent Hub (Phase 6)
- **microdao-service** (7015) — MicroDAO Console (Phase 7)
- **dao-service** (7016) — DAO Dashboard (Phase 8)
- **living-map-service** (7017) — Living Map (Phase 9)
- **city-service** (7001) — City layer
- **space-service** (7002) — Space layer

### Frontend & Gateway (2)
- **frontend** (nginx:80) — React SPA
- **gateway** (nginx:80/443) — Reverse proxy

**Total: 23 services** behind a single gateway

---

## 🌐 API Routes

All services are accessible through the gateway at `/api/*`:

| Service | External Route | Internal URL |
|---------|---------------|--------------|
| Auth | `/api/auth/` | `http://auth-service:7011/` |
| PDP | `/api/pdp/` | `http://pdp-service:7012/` |
| Usage | `/api/usage/` | `http://usage-engine:7013/` |
| Agents | `/api/agents/` | `http://agents-service:7014/` |
| MicroDAO | `/api/microdao/` | `http://microdao-service:7015/` |
| DAO | `/api/dao/` | `http://dao-service:7016/` |
| Living Map | `/api/living-map/` | `http://living-map-service:7017/living-map/` |
| Messaging | `/api/messaging/` | `http://messaging-service:7004/` |
| City | `/api/city/` | `http://city-service:7001/api/city/` |
| Space | `/api/space/` | `http://space-service:7002/api/space/` |

### WebSocket Routes

| Service | External Route | Internal URL |
|---------|---------------|--------------|
| Living Map | `/ws/living-map/` | `ws://living-map-service:7017/living-map/stream` |
| Agents Events | `/ws/agents/` | `ws://agents-service:7014/ws/agents/stream` |
| Messaging | `/ws/messaging/` | `ws://messaging-service:7004/ws` |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- PostgreSQL client (psql)

### 1. Build Frontend

```bash
npm install
npm run build
```

### 2. Start All Services

```bash
./scripts/start-all.sh
```

This will:
- Apply database migrations (001-010)
- Build all Docker images
- Start all services
- Configure NGINX gateway

### 3. Access

- **Frontend:** http://localhost
- **API:** http://localhost/api/
- **Health:** http://localhost/health

### 4. Stop Services

```bash
./scripts/stop-all.sh
```

---

## 📁 Project Structure

```
daarion/
├── docker-compose.all.yml      # All-in-one compose
├── Dockerfile.frontend         # Frontend build
├── nginx/
│   ├── all-in-one.conf        # Gateway config
│   └── frontend.conf          # Frontend nginx
├── scripts/
│   ├── start-all.sh           # Start script
│   └── stop-all.sh            # Stop script
├── services/
│   ├── auth-service/
│   ├── dao-service/
│   ├── living-map-service/
│   └── ... (20+ services)
├── migrations/
│   ├── 001_create_users_and_auth.sql
│   ├── ...
│   └── 010_create_living_map_tables.sql
└── src/                        # Frontend source
```

---

## 🔒 Security

### Authentication
- **Passkey** (WebAuthn) for users
- **Internal tokens** for service-to-service

### Authorization
- **PDP** (Policy Decision Point) for all requests
- Role-based access control (RBAC)
- Resource-level permissions

### Network
- All services in private network
- Only gateway exposed to internet
- No direct service access from outside

---

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose -f docker-compose.all.yml logs -f

# Specific service
docker-compose -f docker-compose.all.yml logs -f gateway
docker-compose -f docker-compose.all.yml logs -f living-map-service
```

### Health Checks

- **Gateway:** http://localhost/health
- **Individual services:** Health checks in docker-compose

### Metrics

- Usage Engine collects all LLM/Agent metrics
- Available through `/api/usage/`

---

## 🔧 Configuration

### Environment Variables

All services use:
- `DATABASE_URL` — PostgreSQL connection
- `NATS_URL` — NATS connection
- `REDIS_URL` — Redis connection
- Service-specific URLs (e.g., `AUTH_SERVICE_URL`)

### Volumes

- `postgres_data` — Database persistence
- `nats_data` — NATS JetStream storage
- `redis_data` — Redis persistence
- `matrix_data` — Matrix Synapse data

---

## 🐛 Troubleshooting

### Services not starting

```bash
# Check logs
docker-compose -f docker-compose.all.yml logs

# Check specific service
docker-compose -f docker-compose.all.yml ps
```

### Database connection issues

```bash
# Check if postgres is healthy
docker-compose -f docker-compose.all.yml ps postgres

# Connect to postgres
docker exec -it daarion-postgres psql -U postgres -d daarion
```

### Frontend not loading

```bash
# Rebuild frontend
npm run build

# Restart gateway
docker-compose -f docker-compose.all.yml restart gateway
```

### API routes not working

1. Check nginx config: `nginx/all-in-one.conf`
2. Check if service is running:
   ```bash
   docker-compose -f docker-compose.all.yml ps [service-name]
   ```
3. Check service logs

---

## 📈 Scaling

### Horizontal Scaling

For production, you can scale services:

```bash
docker-compose -f docker-compose.all.yml up -d --scale living-map-service=3
```

### Load Balancing

Update nginx config to use multiple backends:

```nginx
upstream living_map_service {
    server living-map-service-1:7017;
    server living-map-service-2:7017;
    server living-map-service-3:7017;
}
```

---

## 🌍 Production Deployment

See [DEPLOY_ON_SERVER.md](./DEPLOY_ON_SERVER.md) for:
- Server setup
- Domain configuration
- SSL/TLS certificates
- Environment variables
- Backup strategy

---

## 📚 Related Documentation

- **Infrastructure:** `INFRASTRUCTURE.md`
- **Quick Reference:** `docs/infrastructure_quick_ref.ipynb`
- **Phase 9A:** `PHASE9A_BACKEND_READY.md`
- **Phase 9B:** `PHASE9B_LITE_2D_READY.md`
- **Server Deployment:** `DEPLOY_ON_SERVER.md`

---

**🎉 DAARION — Unified Gateway Ready!**

