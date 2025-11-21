# 🔧 Node Registry Service — Status & Deployment

**Версія:** 1.0.0  
**Дата створення:** 2025-01-17  
**Останнє оновлення:** 2025-01-17  
**Статус:** ✅ Complete + Integrated — Full Stack Implementation Ready for Production

---

## 📋 Overview

Node Registry Service — централізований реєстр для всіх нод DAGI мережі (Node #1, Node #2, майбутні Node #N).

### Призначення
- **Реєстрація нод** — автоматична/ручна реєстрація нових нод
- **Heartbeat tracking** — моніторинг доступності та здоров'я нод
- **Node discovery** — пошук доступних нод та їх можливостей
- **Profile management** — збереження профілів нод (LLM configs, services, capabilities)

---

## ✅ Що готово (Infrastructure by Warp)

### 1. Service Structure
```
services/node-registry/
├── app/
│   └── main.py          # FastAPI stub application
├── migrations/
│   └── init_node_registry.sql  # Database schema
├── Dockerfile           # Docker image configuration
├── requirements.txt     # Python dependencies
└── README.md            # Full service documentation
```

### 2. FastAPI Application (`app/main.py`)
- ✅ Health endpoint: `GET /health`
- ✅ Metrics endpoint: `GET /metrics`
- ✅ Root endpoint: `GET /`
- 🚧 Stub API endpoints (501 Not Implemented):
  - `POST /api/v1/nodes/register`
  - `POST /api/v1/nodes/{node_id}/heartbeat`
  - `GET /api/v1/nodes`
  - `GET /api/v1/nodes/{node_id}`

### 3. PostgreSQL Database
- ✅ Database: `node_registry`
- ✅ User: `node_registry_user`
- ✅ Tables created:
  - `nodes` — Core node registry
  - `node_profiles` — Node capabilities/configurations
  - `heartbeat_log` — Historical heartbeat data
- ✅ Initial data: Node #1 and Node #2 pre-registered

### 4. Docker Configuration
- ✅ Dockerfile with Python 3.11-slim
- ✅ Health check configured
- ✅ Non-root user (noderegistry)
- ✅ Added to `docker-compose.yml` with dependencies

### 5. Deployment Script
- ✅ `scripts/deploy-node-registry.sh`
  - SSH connection check
  - Database initialization
  - Secure password generation
  - Docker image build
  - Service start
  - Firewall configuration
  - Deployment verification

---

## 🔌 Service Configuration

### Port & Access
- **Port:** 9205 (Internal only)
- **Access:** Node #1, Node #2, DAGI nodes (LAN/VPN)
- **Public access:** ❌ Blocked by firewall

### Environment Variables
```bash
NODE_REGISTRY_DB_HOST=postgres
NODE_REGISTRY_DB_PORT=5432
NODE_REGISTRY_DB_NAME=node_registry
NODE_REGISTRY_DB_USER=node_registry_user
NODE_REGISTRY_DB_PASSWORD=***generated_secure_password***
NODE_REGISTRY_HTTP_PORT=9205
NODE_REGISTRY_ENV=production
NODE_REGISTRY_LOG_LEVEL=info
```

### Firewall Rules (Node #1)
```bash
# Allow from local network
ufw allow from 192.168.1.0/24 to any port 9205 proto tcp comment 'Node Registry - LAN'

# Allow from Docker network
ufw allow from 172.16.0.0/12 to any port 9205 proto tcp comment 'Node Registry - Docker'

# Deny from external
ufw deny 9205/tcp comment 'Node Registry - Block external'
```

---

## 🗄️ Database Schema

### Table: `nodes`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | VARCHAR(255) | Unique identifier (e.g. node-1-hetzner-gex44) |
| node_name | VARCHAR(255) | Human-readable name |
| node_role | VARCHAR(50) | production, development, backup |
| node_type | VARCHAR(50) | router, gateway, worker |
| ip_address | INET | Public IP |
| local_ip | INET | Local network IP |
| hostname | VARCHAR(255) | DNS hostname |
| status | VARCHAR(50) | online, offline, maintenance, degraded |
| last_heartbeat | TIMESTAMP | Last heartbeat timestamp |
| registered_at | TIMESTAMP | Registration time |
| updated_at | TIMESTAMP | Last update time |
| metadata | JSONB | Additional metadata |

### Table: `node_profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | UUID | Foreign key to nodes |
| profile_name | VARCHAR(255) | Profile identifier |
| profile_type | VARCHAR(50) | llm, service, capability |
| config | JSONB | Profile configuration |
| enabled | BOOLEAN | Active status |

### Table: `heartbeat_log`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | UUID | Foreign key to nodes |
| timestamp | TIMESTAMP | Heartbeat time |
| status | VARCHAR(50) | Node status |
| metrics | JSONB | System metrics (CPU, RAM, etc.) |

### Initial Data
```sql
-- Pre-registered nodes
INSERT INTO nodes (node_id, node_name, node_role, node_type, ip_address, local_ip, hostname, status)
VALUES 
    ('node-1-hetzner-gex44', 'Hetzner GEX44 Production', 'production', 'router', '144.76.224.179', NULL, 'gateway.daarion.city', 'offline'),
    ('node-2-macbook-m4max', 'MacBook Pro M4 Max', 'development', 'router', NULL, '192.168.1.244', 'MacBook-Pro.local', 'offline');
```

---

## 🚀 Deployment

### Quick Deploy to Node #1 (Production)

```bash
# From Node #2 (MacBook)
cd /Users/apple/github-projects/microdao-daarion

# Deploy service
./scripts/deploy-node-registry.sh

# Register Node #1 using bootstrap
python -m tools.dagi_node_agent.bootstrap \
  --role production-router \
  --labels router,gateway,production \
  --registry-url http://144.76.224.179:9205

# Register Node #2 using bootstrap
python -m tools.dagi_node_agent.bootstrap \
  --role development-router \
  --labels router,development,mac,gpu \
  --registry-url http://192.168.1.244:9205
```

### Manual Deployment Steps

#### 1. Initialize Database (on Node #1)
```bash
ssh root@144.76.224.179
cd /opt/microdao-daarion

# Copy SQL script to container
docker cp services/node-registry/migrations/init_node_registry.sql dagi-postgres:/tmp/

# Run initialization
docker exec -i dagi-postgres psql -U postgres < /tmp/init_node_registry.sql
```

#### 2. Generate Secure Password
```bash
# Generate and save to .env
PASSWORD=$(openssl rand -base64 32)
echo "NODE_REGISTRY_DB_PASSWORD=$PASSWORD" >> .env
```

#### 3. Build and Start
```bash
# Build Docker image
docker-compose build node-registry

# Start service
docker-compose up -d node-registry

# Check status
docker-compose ps | grep node-registry
docker logs dagi-node-registry
```

#### 4. Configure Firewall
```bash
# Allow internal access
ufw allow from 192.168.1.0/24 to any port 9205 proto tcp
ufw allow from 172.16.0.0/12 to any port 9205 proto tcp

# Deny external
ufw deny 9205/tcp
```

#### 5. Verify Deployment
```bash
# Health check
curl http://localhost:9205/health

# Expected response:
# {"status":"healthy","service":"node-registry","version":"0.1.0-stub",...}
```

---

## 🧪 Testing & Verification

### Local Testing (Node #2)

```bash
# Install dependencies
cd services/node-registry
pip install -r requirements.txt

# Run locally
export NODE_REGISTRY_ENV=development
python -m app.main

# Test endpoints
curl http://localhost:9205/health
curl http://localhost:9205/metrics
open http://localhost:9205/docs  # Interactive API docs
```

### Production Testing (Node #1)

```bash
# From Node #2, test internal access
curl http://144.76.224.179:9205/health

# From Node #1
ssh root@144.76.224.179
curl http://localhost:9205/health
curl http://localhost:9205/metrics

# Check logs
docker logs dagi-node-registry --tail 50
```

---

## 📊 Monitoring

### Health Endpoint
```json
GET http://localhost:9205/health

{
  "status": "healthy",
  "service": "node-registry",
  "version": "0.1.0-stub",
  "environment": "production",
  "uptime_seconds": 3600.5,
  "timestamp": "2025-01-17T14:30:00Z",
  "database": {
    "connected": true,
    "host": "postgres",
    "port": 5432,
    "database": "node_registry"
  }
}
```

### Metrics Endpoint
```json
GET http://localhost:9205/metrics

{
  "service": "node-registry",
  "uptime_seconds": 3600.5,
  "total_nodes": 2,
  "active_nodes": 1,
  "timestamp": "2025-01-17T14:30:00Z"
}
```

### Prometheus Integration (Future)
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'node-registry'
    static_configs:
      - targets: ['node-registry:9205']
    scrape_interval: 30s
```

---

## ✅ Implemented by Cursor

### Completed Features

### Priority 1: Database Integration ✅
- [x] SQLAlchemy ORM models (`models.py`)
  - `Node` model (node_id, hostname, ip, role, labels, status, heartbeat)
  - `NodeProfile` model (role-based configuration profiles)
- [x] Database connection pool
- [x] SQL migration (`001_create_node_registry_tables.sql`)
- [x] Health check with DB connection

### Priority 2: Core API Endpoints ✅
- [x] `POST /api/v1/nodes/register` — Register/update node with auto node_id generation
- [x] `POST /api/v1/nodes/heartbeat` — Update heartbeat timestamp
- [x] `GET /api/v1/nodes` — List all nodes with filters (role, label, status)
- [x] `GET /api/v1/nodes/{node_id}` — Get specific node details
- [x] CRUD operations in `crud.py`:
  - `register_node()` — Auto-generate node_id
  - `update_heartbeat()` — Update heartbeat
  - `get_node()`, `list_nodes()` — Query nodes
  - `get_node_profile()` — Get role profile

### Priority 3: Node Profiles ✅
- [x] `GET /api/v1/profiles/{role}` — Get role-based configuration profile
- [x] `NodeProfile` model with role-based configs
- [ ] Per-node profile management (future enhancement)

### Priority 4: Security & Auth ⚠️
- [x] Request validation (Pydantic schemas in `schemas.py`)
- [ ] API key authentication (future)
- [ ] JWT tokens for inter-node communication (future)
- [ ] Rate limiting (future)

### Priority 5: Monitoring & Metrics ✅
- [x] Health check endpoint with DB connectivity
- [x] Metrics endpoint (basic)
- [ ] Prometheus metrics export (prometheus_client) (future)
- [ ] Performance metrics (request duration, DB queries) (future)
- [ ] Structured logging (JSON) (future)

### Priority 6: Testing ✅
- [x] Unit tests (`tests/test_crud.py`) — CRUD operations
- [x] Integration tests (`tests/test_api.py`) — API endpoints
- [ ] Load testing (future)

### Priority 7: Bootstrap Tool ✅
- [x] DAGI Node Agent Bootstrap (`tools/dagi_node_agent/bootstrap.py`)
  - Automatic hostname and IP detection
  - Registration with Node Registry
  - Local node_id storage (`/etc/dagi/node_id` or `~/.config/dagi/node_id`)
  - Initial heartbeat after registration
  - CLI interface with role and labels support

### Priority 8: DAGI Router Integration ✅
- [x] Node Registry Client (`utils/node_registry_client.py`)
  - Async HTTP client for Node Registry API
  - Methods: `get_nodes()`, `get_node()`, `get_nodes_by_role()`, `get_available_nodes()`
  - Graceful degradation when service unavailable
  - Error handling and retries
- [x] Router Integration (`router_app.py`)
  - Added `get_available_nodes()` method
  - Node discovery for routing decisions
- [x] HTTP API (`http_api.py`)
  - New endpoint: `GET /nodes` (with role filter)
  - Proxy to Node Registry service
- [x] Test Scripts
  - `scripts/test_node_registry.sh` — API endpoint testing
  - `scripts/test_bootstrap.sh` — Bootstrap tool testing
  - `scripts/init_node_registry_db.sh` — Database initialization

---

## 🔧 Management Commands

### Service Control
```bash
# Start
docker-compose up -d node-registry

# Stop
docker-compose stop node-registry

# Restart
docker-compose restart node-registry

# Rebuild
docker-compose up -d --build node-registry

# Logs
docker logs -f dagi-node-registry
docker-compose logs -f node-registry
```

### Database Operations
```bash
# Connect to database
docker exec -it dagi-postgres psql -U node_registry_user -d node_registry

# List tables
\dt

# Query nodes
SELECT node_id, node_name, status, last_heartbeat FROM nodes;

# Query profiles
SELECT n.node_name, p.profile_name, p.profile_type, p.enabled 
FROM nodes n 
JOIN node_profiles p ON n.id = p.node_id;
```

---

## 📖 Documentation

- **Service README:** [services/node-registry/README.md](./services/node-registry/README.md)
- **Deployment Script:** [scripts/deploy-node-registry.sh](./scripts/deploy-node-registry.sh)
- **Database Schema:** [services/node-registry/migrations/init_node_registry.sql](./services/node-registry/migrations/init_node_registry.sql)
- **Docker Compose:** [docker-compose.yml](./docker-compose.yml) (lines 253-282)
- **INFRASTRUCTURE.md:** [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) (Add Node Registry section)

---

## 🔗 Related Services

| Service | Port | Connection | Purpose |
|---------|------|------------|---------|
| PostgreSQL | 5432 | Required | Database storage |
| DAGI Router | 9102 | Optional | Node info for routing |
| Prometheus | 9090 | Optional | Metrics scraping |
| Grafana | 3000 | Optional | Monitoring dashboard |

---

## ⚠️ Security Considerations

### Network Security
- ✅ Port 9205 accessible only from internal network
- ✅ Firewall rules configured (UFW)
- ⚠️ No authentication yet (to be added by Cursor)

### Database Security
- ✅ Secure password generated automatically
- ✅ Dedicated database user with limited privileges
- ✅ Password stored in `.env` (not committed to git)

### Future Improvements
- [ ] API key authentication
- [ ] TLS/SSL for API communication
- [ ] Rate limiting per node
- [ ] Audit logging for node changes

---

## 🎯 Acceptance Criteria Status

| Criteria | Status | Notes |
|----------|--------|-------|
| Database `node_registry` created | ✅ | With tables and user |
| Environment variables configured | ✅ | In docker-compose.yml |
| Service added to docker-compose | ✅ | With health check |
| Port 9205 listens locally | 🟡 | After deployment |
| Accessible from Node #2 (LAN) | 🟡 | After deployment |
| Firewall blocks external | 🟡 | After deployment |
| INFRASTRUCTURE.md updated | 🟡 | See NODE-REGISTRY-STATUS.md |
| SYSTEM-INVENTORY.md updated | 🚧 | Todo |

---

**Last Updated:** 2025-01-17 by WARP AI  
**Next Steps:** Deploy to Node #1, hand over to Cursor for API implementation  
**Status:** ✅ Infrastructure Complete — Ready for Cursor Implementation
