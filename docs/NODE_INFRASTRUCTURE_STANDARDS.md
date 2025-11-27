# 🏗️ Стандарти Інфраструктури НОД — DAARION Ecosystem

**Версія:** 1.0.0  
**Дата:** 25 листопада 2025  
**Мета:** Уніфікація архітектури на всіх нодах системи

---

## 🎯 Принципи

### 1. **Consistency First**
Кожна нода має **однакову структуру** каталогів, конфігів, портів (де можливо).

### 2. **Isolation with Integration**
Сервіси ізольовані (Docker), але інтегруються через стандартні протоколи (HTTP, WS, NATS).

### 3. **Observable by Default**
Кожна нода має Prometheus metrics + health endpoints.

### 4. **Git as Source of Truth**
Всі конфігурації та код в Git. Ніяких "ручних правок".

### 5. **Rollback Ready**
Кожен deployment має чіткий rollback plan.

---

## 📁 Стандартна Структура Ноди

```
/opt/microdao-daarion/  (або /Users/apple/github-projects/microdao-daarion/)
│
├── .env                        # Environment variables (не в Git!)
├── .env.example                # Template (в Git)
├── docker-compose.all.yml      # Головний compose file
├── docker-compose.dev.yml      # Dev overrides (опційно)
│
├── services/                   # Всі мікросервіси
│   ├── agents-service/
│   ├── city-service/
│   ├── secondme-service/
│   ├── router/
│   ├── gateway/
│   └── ...
│
├── migrations/                 # Database migrations
│   ├── 001_*.sql
│   ├── 002_*.sql
│   └── ...
│
├── scripts/                    # Automation scripts
│   ├── deploy-prod.sh
│   ├── backup-db.sh
│   ├── health-check.sh
│   └── rollback.sh
│
├── docs/                       # Documentation
│   ├── INFRASTRUCTURE.md
│   ├── DEPLOY_*.md
│   └── NODE_INFRASTRUCTURE_STANDARDS.md (цей файл)
│
├── infra/                      # Infrastructure configs
│   ├── nginx/
│   ├── prometheus/
│   ├── grafana/
│   └── caddy/ (якщо використовується)
│
└── backups/                    # Database backups (не в Git!)
    └── daarion_memory_*.sql
```

---

## 🔢 Стандартні Порти

### Core Infrastructure
| Service | Port | Protocol | Note |
|---------|------|----------|------|
| PostgreSQL | 5432 | TCP | Internal only |
| Redis | 6379 | TCP | Internal only |
| NATS | 4222 | TCP | Internal only |
| Prometheus | 9090 | HTTP | Monitoring |
| Grafana | 3000 | HTTP | Dashboards |
| Nginx/Gateway | 80/443 | HTTP/HTTPS | Public entry |

### DAGI Stack (Production)
| Service | Port | Protocol | Note |
|---------|------|----------|------|
| Router | 9102 | HTTP | DAGI Router |
| Gateway | 9300 | HTTP | Bot Gateway |
| DevTools | 8008 | HTTP | Dev Interface |
| Swapper | 8890-8891 | HTTP | Model Swapper + Metrics |
| Frontend | 8899 | HTTP | Web UI |

### Phase 1-3 MVP Services
| Service | Port | Protocol | Note |
|---------|------|----------|------|
| City Service | 7001 | HTTP + WS | Public Rooms + Presence |
| Agents Service | 7002 | HTTP | Agent Core |
| Second Me | 7003 | HTTP | Personal AI |
| MicroDAO Service | 7004 | HTTP | MicroDAO Core |

### Multimodal Services (НОДА2 initially)
| Service | Port | Protocol | Note |
|---------|------|----------|------|
| STT Service | 8895 | HTTP | Speech-to-Text |
| OCR Service | 8896 | HTTP | Image-to-Text |
| Web Search | 8897 | HTTP | Search Engine |
| Vector DB | 8898 | HTTP | Semantic Search |

**Правило:** Порти 7000-7999 — MVP services, 8000-8999 — Utilities/Multimodal, 9000-9999 — DAGI Stack.

---

## 🌐 API Routing Standards

### Через Nginx/Gateway

```
https://<domain>/api/<service>/<endpoint>
```

**Приклади:**
```
https://gateway.daarion.city/api/agents/list
https://gateway.daarion.city/api/city/rooms
https://gateway.daarion.city/api/secondme/invoke
https://gateway.daarion.city/api/microdao/members
```

### WebSocket

```
wss://<domain>/ws/<service>/<channel>
```

**Приклади:**
```
wss://gateway.daarion.city/ws/city/rooms/general
wss://gateway.daarion.city/ws/city/presence
wss://gateway.daarion.city/ws/agents/events
```

---

## 🐳 Docker Standards

### Naming Convention

**Containers:**
```
<project>-<service>
```

**Examples:**
- `daarion-postgres`
- `daarion-agents-service`
- `daarion-city-service`

**Networks:**
```
<project>_net
```

**Example:**
- `daarion_net`

**Volumes:**
```
<service>_data
```

**Examples:**
- `postgres_data`
- `redis_data`
- `nats_data`

### Labels (для моніторингу)

```yaml
services:
  agents-service:
    labels:
      - "com.daarion.service=agents"
      - "com.daarion.tier=backend"
      - "com.daarion.phase=mvp"
```

---

## 📊 Health Check Standards

### Endpoint

Кожен сервіс **ОБОВ'ЯЗКОВО** має endpoint:

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "agents-service",
  "version": "1.0.0",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "nats": "connected"
  }
}
```

**Status Codes:**
- `200` — Healthy
- `503` — Unhealthy (service degraded)

### Docker Healthcheck

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:7002/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 📈 Metrics Standards (Prometheus)

### Endpoint

```
GET /metrics
```

**Format:** Prometheus text format

**Required Metrics:**
```
# HTTP requests
http_requests_total{service="agents",method="GET",status="200"} 1234

# Response time
http_request_duration_seconds_bucket{le="0.1"} 100

# Active connections
active_connections{service="agents"} 42

# Health status
service_health{service="agents",dependency="database"} 1
```

---

## 🔐 Security Standards

### 1. **Secrets Management**

**НЕ В GIT:**
- `.env` файли з паролями
- SSL приватні ключі
- API tokens
- DB passwords

**В GIT:**
- `.env.example` з плейсхолдерами
- Public SSL certificates (якщо потрібно)

### 2. **Network Isolation**

```yaml
services:
  postgres:
    networks:
      - daarion_net
    # НЕ expose ports на host!
```

**Тільки gateway має публічні порти:**
```yaml
services:
  gateway-nginx:
    ports:
      - "80:80"
      - "443:443"
```

### 3. **Rate Limiting**

Nginx має rate limiting для API:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
}
```

---

## 🗄️ Database Standards

### Migrations

**Naming:**
```
XXX_description.sql
```

**Examples:**
- `001_create_messenger_schema.sql`
- `007_create_agents_tables.sql`
- `010_create_city_backend.sql`

**Header (у кожній міграції):**
```sql
-- Migration: 007
-- Description: Create agents tables
-- Date: 2025-11-20
-- Author: DAARION Team
-- Rollback: See 007_rollback.sql

BEGIN;

-- Your changes here

COMMIT;
```

### Backup Schedule

**Production (НОДА1):**
- Щоденно о 03:00 UTC
- Зберігати останні 7 днів
- Weekly backup (зберігати 4 тижні)

**Commands:**
```bash
# Backup
docker exec daarion-postgres pg_dump -U postgres daarion_memory > \
  /root/backups/daarion_memory_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  /root/backups/daarion_memory_YYYYMMDD_HHMMSS.sql
```

---

## 🔄 Deployment Standards

### Pre-Deployment Checklist

- [ ] Git branch merged to `main`
- [ ] All tests passed (якщо є)
- [ ] Database backup created
- [ ] Health checks passing on staging/dev
- [ ] Rollback plan documented
- [ ] Team notified (якщо production)

### Deployment Process

1. **Code Sync:** `git pull origin main`
2. **ENV Check:** Verify `.env` variables
3. **DB Migrations:** Apply sequentially
4. **Build:** `docker compose build <service>`
5. **Start:** `docker compose up -d <service>`
6. **Health Check:** Verify `/health` endpoint
7. **Smoke Tests:** Run basic API tests
8. **Monitor:** Watch logs for 5-15 minutes

### Post-Deployment

- [ ] Health checks passing
- [ ] Metrics appearing in Prometheus
- [ ] No critical errors in logs
- [ ] Existing services unaffected
- [ ] Update INFRASTRUCTURE.md

---

## 📝 Logging Standards

### Log Format (JSON)

```json
{
  "timestamp": "2025-11-25T10:30:00Z",
  "level": "INFO",
  "service": "agents-service",
  "message": "Agent invoked",
  "agent_id": "ag_123",
  "user_id": "u_456",
  "request_id": "req_789"
}
```

### Log Levels

- `DEBUG` — Детальна інформація (тільки в dev)
- `INFO` — Нормальні операції
- `WARNING` — Потенційна проблема
- `ERROR` — Помилка яку треба перевірити
- `CRITICAL` — Система не працює

### Centralized Logging (майбутнє)

**Варіанти:**
- Grafana Loki
- ELK Stack
- CloudWatch (якщо AWS)

---

## 🌍 Multi-Node Standards

### Node Roles

| Node | Role | Uptime | Services |
|------|------|--------|----------|
| НОДА1 | Production | 24/7 | All Core + MVP |
| НОДА2 | Dev + Backup | On-demand | Core + Multimodal |
| НОДА3 (майбутнє) | Federation | 24/7 | Matrix + City |

### Service Distribution

**Production (НОДА1):**
- Router, Gateway, DevTools
- Agents, City, Second Me, MicroDAO
- PostgreSQL, Redis, NATS
- Monitoring (Prometheus, Grafana)

**Development (НОДА2):**
- Core services (для тестування)
- Multimodal services (STT, OCR, Web Search, Vector DB)
- Experimental features

**Federation (НОДА3, майбутнє):**
- Matrix Synapse
- City Federation
- DAO Governance

### Cross-Node Communication

**Через публічні API:**
```
NODE1 → NODE2
https://node2.local:8897/api/search (Web Search)
```

**Через VPN/WireGuard (майбутнє):**
```
NODE1 ←→ NODE2 ←→ NODE3
10.0.0.1   10.0.0.2   10.0.0.3
```

---

## 🔮 Future Standards (Roadmap)

### Phase MULTI (Multimodal Integration)
- [ ] Router v2.0 з multimodal підтримкою
- [ ] Unified API для всіх multimodal сервісів
- [ ] Fallback mechanisms (якщо НОДА2 offline)

### Phase MATRIX (Federation)
- [ ] Matrix Synapse на НОДА3
- [ ] Element Web client integration
- [ ] NATS ↔ Matrix bridge

### Phase SCALE (Horizontal Scaling)
- [ ] Load balancer перед нодами
- [ ] Auto-scaling для сервісів
- [ ] Distributed cache (Redis Cluster)

### Phase MONITOR (Advanced Monitoring)
- [ ] Distributed tracing (Jaeger/Tempo)
- [ ] APM (Application Performance Monitoring)
- [ ] Alerting (Alertmanager)

---

## 📞 Contacts & Resources

**Documentation:**
- Main: `/docs/INFRASTRUCTURE.md`
- Quick Ref: `/docs/infrastructure_quick_ref.ipynb`
- Deployment: `/docs/DEPLOY_*.md`

**GitHub:**
- Main Repo: `git@github.com:IvanTytar/microdao-daarion.git`
- DAARION City: `git@github.com:DAARION-DAO/daarion-ai-city.git`

**Monitoring:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000

---

## ✅ Compliance Checklist

**Кожна нода має:**
- [ ] Стандартна структура каталогів
- [ ] Docker Compose з усіма сервісами
- [ ] Health endpoints на всіх сервісах
- [ ] Prometheus metrics
- [ ] Backup strategy
- [ ] Rollback plan
- [ ] Nginx/Gateway з SSL
- [ ] `.env` не в Git
- [ ] Документація актуальна

---

**Документ створено:** Cursor AI Assistant  
**Для проєкту:** MicroDAO DAARION  
**Останнє оновлення:** 2025-11-25

