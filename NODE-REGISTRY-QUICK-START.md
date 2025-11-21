# 🚀 Node Registry — Quick Start

**1-минутний гайд для швидкого старту**

---

## ✅ Що готово

Node Registry Service **повністю реалізовано** (Infrastructure + Full API by Cursor):
- ✅ FastAPI application з повним API
- ✅ SQLAlchemy ORM models (Node, NodeProfile)
- ✅ CRUD operations (register, heartbeat, list, get)
- ✅ PostgreSQL database (node_registry) зі схемою
- ✅ Docker image configuration
- ✅ docker-compose integration
- ✅ Deployment script з firewall rules
- ✅ Bootstrap tool для автоматичної реєстрації
- ✅ Unit та integration tests

---

## 🚀 Deploy на Node #1 (Production)

### Швидкий старт (з автоматичними скриптами):
```bash
# 1. Ініціалізувати БД (якщо city-db є)
./scripts/init_node_registry_db.sh

# 2. Запустити сервіс
docker-compose up -d node-registry

# 3. Протестувати API
./scripts/test_node_registry.sh

# 4. Зареєструвати ноду
python3 -m tools.dagi_node_agent.bootstrap --role test-node --labels test

# 5. Перевірити в Router
curl http://localhost:9102/nodes
```

### Deployment script (повний deploy):
```bash
./scripts/deploy-node-registry.sh
```

Скрипт автоматично:
1. Перевірить з'єднання з Node #1
2. Ініціалізує базу даних
3. Згенерує secure password
4. Зб'є Docker image
5. Запустить сервіс
6. Налаштує firewall
7. Перевірить deployment

### Manual deploy:
```bash
# 1. SSH до Node #1
ssh root@144.76.224.179
cd /opt/microdao-daarion

# 2. Ініціалізувати БД
docker exec -i dagi-postgres psql -U postgres < services/node-registry/migrations/init_node_registry.sql

# 3. Додати password до .env
echo "NODE_REGISTRY_DB_PASSWORD=$(openssl rand -base64 32)" >> .env

# 4. Запустити
docker-compose up -d --build node-registry

# 5. Перевірити
curl http://localhost:9205/health
```

---

## 🧪 Тестування локально (Node #2)

```bash
# Install dependencies
cd services/node-registry
pip install -r requirements.txt

# Run
export NODE_REGISTRY_ENV=development
python -m app.main

# Test
curl http://localhost:9205/health
open http://localhost:9205/docs
```

---

## 📊 Endpoints

### Node Registry Service (Port 9205)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/health` | GET | ✅ Working | Health check (with DB) |
| `/metrics` | GET | ✅ Working | Prometheus metrics |
| `/` | GET | ✅ Working | Service info |
| `/api/v1/nodes/register` | POST | ✅ **Working** | Register/update node |
| `/api/v1/nodes/heartbeat` | POST | ✅ **Working** | Update heartbeat |
| `/api/v1/nodes` | GET | ✅ **Working** | List nodes (filters: role, label, status) |
| `/api/v1/nodes/{id}` | GET | ✅ **Working** | Get node details |
| `/api/v1/profiles/{role}` | GET | ✅ **Working** | Get role profile |

### DAGI Router Integration (Port 9102)

| Endpoint | Method | Status | Description |
|----------|--------|--------|-------------|
| `/nodes` | GET | ✅ **NEW** | List nodes (proxy to Registry, filter by role) |

---

## 🗄️ Database

**Database:** `node_registry`  
**User:** `node_registry_user`  
**Tables:**
- `nodes` (2 rows: Node #1, Node #2 pre-registered)
- `node_profiles` (empty)
- `heartbeat_log` (empty)

---

## 🔌 Configuration

**Port:** 9205 (internal only)  
**Access:** LAN/VPN only, no public internet

**Environment:**
```bash
NODE_REGISTRY_DB_HOST=postgres
NODE_REGISTRY_DB_PORT=5432
NODE_REGISTRY_DB_NAME=node_registry
NODE_REGISTRY_DB_USER=node_registry_user
NODE_REGISTRY_DB_PASSWORD=***auto-generated***
NODE_REGISTRY_HTTP_PORT=9205
NODE_REGISTRY_ENV=production
NODE_REGISTRY_LOG_LEVEL=info
```

---

## 🔧 Management

```bash
# Start
docker-compose up -d node-registry

# Restart
docker-compose restart node-registry

# Logs
docker logs -f dagi-node-registry

# Stop
docker-compose stop node-registry

# Test API
./scripts/test_node_registry.sh

# Test Bootstrap
./scripts/test_bootstrap.sh

# Initialize DB (if needed)
./scripts/init_node_registry_db.sh
```

---

## 📚 Full Documentation

- **Detailed Status:** [NODE-REGISTRY-STATUS.md](./NODE-REGISTRY-STATUS.md)
- **Setup Guide:** [README_NODE_REGISTRY_SETUP.md](./README_NODE_REGISTRY_SETUP.md)
- **Service README:** [services/node-registry/README.md](./services/node-registry/README.md)
- **API Docs:** [docs/node_registry/overview.md](./docs/node_registry/overview.md)
- **Deploy Script:** [scripts/deploy-node-registry.sh](./scripts/deploy-node-registry.sh)
- **Test Scripts:** `scripts/test_node_registry.sh`, `scripts/test_bootstrap.sh`

---

## ✅ Виконано Cursor

Усі компоненти реалізовані:
- ✅ Database models (SQLAlchemy: Node, NodeProfile)
- ✅ API logic (registration, heartbeat, listing)
- ✅ CRUD operations (`crud.py`)
- ✅ Pydantic schemas (`schemas.py`)
- ✅ Bootstrap tool (`tools/dagi_node_agent/bootstrap.py`)
- ✅ Unit та integration tests
- ⚠️ Authentication (future enhancement)

**Status:** ✅ Ready for Production Deployment

---

**Created:** 2025-01-17 by WARP AI  
**For:** DAGI Stack Network Management
