# Node Registry Service

**Version:** 0.1.0-stub  
**Status:** 🟡 Stub Implementation (Infrastructure Ready)  
**Port:** 9205 (Internal only)

Central registry for DAGI network nodes (Node #1, Node #2, Node #N).

---

## Overview

Node Registry Service provides:
- **Node Registration** — Register new nodes in DAGI network
- **Heartbeat Tracking** — Monitor node health and availability
- **Node Discovery** — Query available nodes and their capabilities
- **Profile Management** — Store node profiles (LLM configs, services, capabilities)

---

## Current Implementation

### ✅ Completed (Infrastructure)
- FastAPI application with /health and /metrics endpoints
- Docker container configuration
- PostgreSQL database schema
- docker-compose integration
- Deployment script for Node #1

### 🚧 To Be Implemented (by Cursor)
- Full REST API endpoints
- Node registration logic
- Heartbeat mechanism
- Database integration (SQLAlchemy models)
- Prometheus metrics export
- Node discovery algorithms

---

## Quick Start

### Local Development

```bash
# Install dependencies
cd services/node-registry
pip install -r requirements.txt

# Set environment variables
export NODE_REGISTRY_DB_HOST=localhost
export NODE_REGISTRY_DB_PORT=5432
export NODE_REGISTRY_DB_NAME=node_registry
export NODE_REGISTRY_DB_USER=node_registry_user
export NODE_REGISTRY_DB_PASSWORD=your_password
export NODE_REGISTRY_HTTP_PORT=9205
export NODE_REGISTRY_ENV=development
export NODE_REGISTRY_LOG_LEVEL=debug

# Run service
python -m app.main
```

Service will start on http://localhost:9205

### Docker (Recommended)

```bash
# Build image
docker-compose build node-registry

# Start service
docker-compose up -d node-registry

# Check logs
docker-compose logs -f node-registry

# Check health
curl http://localhost:9205/health
```

### Deploy to Node #1 (Production)

```bash
# From Node #2 (MacBook)
./scripts/deploy-node-registry.sh
```

This will:
1. Initialize PostgreSQL database
2. Configure environment variables
3. Build Docker image
4. Start service
5. Configure firewall rules (internal access only)
6. Verify deployment

---

## API Endpoints

### Health & Monitoring

#### GET /health
Health check endpoint (used by Docker, Prometheus, etc.)

**Response:**
```json
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

#### GET /metrics
Prometheus-compatible metrics endpoint

**Response:**
```json
{
  "service": "node-registry",
  "uptime_seconds": 3600.5,
  "total_nodes": 2,
  "active_nodes": 1,
  "timestamp": "2025-01-17T14:30:00Z"
}
```

### Node Management (Stub - To Be Implemented)

#### POST /api/v1/nodes/register
Register a new node

**Status:** 501 Not Implemented (stub)

#### POST /api/v1/nodes/{node_id}/heartbeat
Update node heartbeat

**Status:** 501 Not Implemented (stub)

#### GET /api/v1/nodes
List all registered nodes

**Status:** 501 Not Implemented (stub)

#### GET /api/v1/nodes/{node_id}
Get specific node information

**Status:** 501 Not Implemented (stub)

---

## Database Schema

### Tables

#### `nodes`
Core node registry

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | VARCHAR(255) | Unique node identifier (e.g. node-1-hetzner-gex44) |
| node_name | VARCHAR(255) | Human-readable name |
| node_role | VARCHAR(50) | production, development, backup |
| node_type | VARCHAR(50) | router, gateway, worker, etc. |
| ip_address | INET | Public IP |
| local_ip | INET | Local network IP |
| hostname | VARCHAR(255) | DNS hostname |
| status | VARCHAR(50) | online, offline, maintenance, degraded |
| last_heartbeat | TIMESTAMP | Last heartbeat time |
| registered_at | TIMESTAMP | Registration timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| metadata | JSONB | Additional node metadata |

#### `node_profiles`
Node capabilities and configurations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | UUID | Foreign key to nodes.id |
| profile_name | VARCHAR(255) | Profile identifier |
| profile_type | VARCHAR(50) | llm, service, capability |
| config | JSONB | Profile configuration |
| enabled | BOOLEAN | Profile active status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### `heartbeat_log`
Historical heartbeat data

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| node_id | UUID | Foreign key to nodes.id |
| timestamp | TIMESTAMP | Heartbeat timestamp |
| status | VARCHAR(50) | Node status at heartbeat |
| metrics | JSONB | System metrics (CPU, RAM, etc.) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_REGISTRY_DB_HOST | postgres | PostgreSQL host |
| NODE_REGISTRY_DB_PORT | 5432 | PostgreSQL port |
| NODE_REGISTRY_DB_NAME | node_registry | Database name |
| NODE_REGISTRY_DB_USER | node_registry_user | Database user |
| NODE_REGISTRY_DB_PASSWORD | - | Database password (required) |
| NODE_REGISTRY_HTTP_PORT | 9205 | HTTP server port |
| NODE_REGISTRY_ENV | production | Environment (development/production) |
| NODE_REGISTRY_LOG_LEVEL | info | Log level (debug/info/warning/error) |

---

## Security

### Network Access
- **Port 9205:** Internal network only (Node #1, Node #2, DAGI nodes)
- **Public Access:** Blocked by firewall (UFW rules)
- **Authentication:** To be implemented (API keys, JWT)

### Firewall Rules (Node #1)
```bash
# Allow from local network
ufw allow from 192.168.1.0/24 to any port 9205 proto tcp

# Allow from Docker network
ufw allow from 172.16.0.0/12 to any port 9205 proto tcp

# Deny from external
ufw deny 9205/tcp
```

---

## Database Initialization

### Manual Setup

```bash
# On Node #1
ssh root@144.76.224.179

# Copy SQL script to container
docker cp services/node-registry/migrations/init_node_registry.sql dagi-postgres:/tmp/

# Run initialization
docker exec -i dagi-postgres psql -U postgres < /tmp/init_node_registry.sql

# Verify
docker exec dagi-postgres psql -U postgres -d node_registry -c "\dt"
```

### Via Deployment Script

The `deploy-node-registry.sh` script automatically:
1. Checks if database exists
2. Creates database and user if needed
3. Generates secure password
4. Saves password to .env

---

## Monitoring & Health

### Docker Health Check
```bash
docker inspect dagi-node-registry | grep -A 5 Health
```

### Prometheus Scraping
Add to prometheus.yml:
```yaml
scrape_configs:
  - job_name: 'node-registry'
    static_configs:
      - targets: ['node-registry:9205']
    scrape_interval: 30s
```

### Grafana Dashboard
Add panel with query:
```promql
up{job="node-registry"}
```

---

## Development

### Testing Locally

```bash
# Run with development settings
export NODE_REGISTRY_ENV=development
python -m app.main

# Access interactive API docs
open http://localhost:9205/docs
```

### Adding New Endpoints

1. Edit `app/main.py`
2. Add route with `@app.get()` or `@app.post()`
3. Add Pydantic models for request/response
4. Implement database logic (when ready)
5. Test via /docs or curl
6. Update this README

---

## Troubleshooting

### Service won't start
```bash
# Check logs
docker logs dagi-node-registry

# Check database connection
docker exec dagi-postgres pg_isready

# Check environment variables
docker exec dagi-node-registry env | grep NODE_REGISTRY
```

### Database connection error
```bash
# Verify database exists
docker exec dagi-postgres psql -U postgres -l | grep node_registry

# Verify user exists
docker exec dagi-postgres psql -U postgres -c "\du" | grep node_registry_user

# Test connection
docker exec dagi-postgres psql -U node_registry_user -d node_registry -c "SELECT 1"
```

### Port not accessible
```bash
# Check firewall rules
sudo ufw status | grep 9205

# Check if service is listening
netstat -tlnp | grep 9205

# Test from Node #2
curl http://144.76.224.179:9205/health
```

---

## Next Steps (for Cursor)

1. **Implement Database Layer**
   - SQLAlchemy models for nodes, profiles, heartbeat
   - Database connection pool
   - Migration system (Alembic)

2. **Implement API Endpoints**
   - Node registration with validation
   - Heartbeat updates with metrics
   - Node listing with filters
   - Profile CRUD operations

3. **Add Authentication**
   - API key-based auth
   - JWT tokens for inter-node communication
   - Rate limiting

4. **Add Monitoring**
   - Prometheus metrics export
   - Health check improvements
   - Performance metrics

5. **Add Tests**
   - Unit tests (pytest)
   - Integration tests
   - API endpoint tests

---

## Links

- [INFRASTRUCTURE.md](../../INFRASTRUCTURE.md) — Infrastructure overview
- [WARP.md](../../WARP.md) — Main developer guide
- [docker-compose.yml](../../docker-compose.yml) — Service configuration

---

**Last Updated:** 2025-01-17  
**Maintained by:** Ivan Tytar & DAARION Team  
**Status:** 🟡 Infrastructure Ready — Awaiting Cursor implementation
