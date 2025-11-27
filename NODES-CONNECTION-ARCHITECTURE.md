# 🔗 Node #1 ↔ Node #2 Connection Architecture

## 📋 Overview

Як Node #1 (Production Server) та Node #2 (Development Node) поєднуються та взаємодіють.

---

## 🌐 Network Topology

### Node #1 (Production)
- **IP:** `144.76.224.179` (Public)
- **Location:** Hetzner Cloud (Germany)
- **Role:** Production Router + Gateway + All Services
- **Uptime:** 24/7

### Node #2 (Development)
- **IP:** `192.168.1.244` (Local) / `localhost` (Local)
- **Location:** Local Network (MacBook Pro M4 Max)
- **Role:** Development + Testing + Backup Router
- **Uptime:** On-demand

---

## 🔌 Connection Methods

### 1. **Node Registry Service** (Primary)

**Service:** `dagi-node-registry`  
**Port:** 9205  
**Location:** Node #1 only  
**Purpose:** Централізований реєстр всіх нод

**How it works:**
- Node #1 має Node Registry Service (порт 9205)
- Node #2 може реєструватися в Node Registry
- Node Registry зберігає інформацію про всі ноди:
  - Node ID, IP, статус
  - Доступні сервіси та порти
  - Heartbeat tracking
  - Node profiles (LLM configs, capabilities)

**API Endpoints:**
```bash
# Register node
POST http://144.76.224.179:9205/api/v1/nodes/register

# Send heartbeat
POST http://144.76.224.179:9205/api/v1/nodes/{node_id}/heartbeat

# Get all nodes
GET http://144.76.224.179:9205/api/v1/nodes

# Get node info
GET http://144.76.224.179:9205/api/v1/nodes/{node_id}
```

**Database:** PostgreSQL (`node_registry` database)
- Table: `nodes` - Core node registry
- Table: `node_profiles` - Node capabilities
- Table: `heartbeat_log` - Historical heartbeat data

---

### 2. **NATS JetStream** (Message Broker)

**Service:** `dagi-nats`  
**Ports:** 4222 (Client), 6222 (Cluster), 8222 (Monitoring)  
**Location:** Node #1 only  
**Purpose:** Асинхронна комунікація між нодами

**How it works:**
- Node #1 має NATS JetStream сервер
- Node #2 може підключатися до NATS як клієнт
- Ноди обмінюються повідомленнями через NATS topics:
  - `node.{node_id}.events` - події ноди
  - `node.{node_id}.tasks` - завдання для ноди
  - `system.broadcast` - системні повідомлення

**Connection:**
```bash
# Node #2 підключається до Node #1 NATS
nats://144.76.224.179:4222
```

**Use cases:**
- Event logging
- Task distribution
- Real-time notifications
- Inter-node communication

---

### 3. **Direct HTTP/HTTPS** (API Calls)

**How it works:**
- Node #2 може робити HTTP запити до Node #1 сервісів
- Node #1 має публічний IP та домени

**Endpoints:**
```bash
# DAGI Router
http://144.76.224.179:9102/health
https://gateway.daarion.city/api/router

# Gateway
http://144.76.224.179:9300/health
https://gateway.daarion.city/telegram/webhook

# Swapper Service
http://144.76.224.179:8890/health

# Node Registry
http://144.76.224.179:9205/api/v1/nodes
```

**Security:**
- Firewall rules на Node #1
- HTTPS через Nginx Gateway
- Authentication через RBAC Service

---

### 4. **SSH** (Management)

**How it works:**
- Node #2 може SSH до Node #1 для управління
- Використовується для deployment та налаштування

**Connection:**
```bash
ssh root@144.76.224.179
```

**Use cases:**
- Code deployment (git pull)
- Service management (docker-compose)
- Configuration updates
- Log viewing

---

### 5. **GitHub** (Code Sync)

**How it works:**
- Обидві ноди синхронізуються через GitHub
- Node #2 (development) → push to GitHub
- Node #1 (production) → pull from GitHub

**Workflow:**
```bash
# On Node #2 (development)
git add .
git commit -m "feat: new feature"
git push origin main

# On Node #1 (production)
git pull origin main
docker-compose up -d --build
```

---

## 📊 Current Connection Status

### ✅ Active Connections

1. **Node Registry:**
   - Node #1: Running (port 9205)
   - Node #2: Can register (if configured)

2. **NATS:**
   - Node #1: Running (ports 4222, 6222, 8222)
   - Node #2: Can connect (if configured)

3. **HTTP/HTTPS:**
   - Node #1: Public endpoints available
   - Node #2: Can make requests

4. **SSH:**
   - Node #1: Accessible
   - Node #2: Can connect

5. **GitHub:**
   - Both nodes: Synced via `git@github.com:IvanTytar/microdao-daarion.git`

---

## 🔧 Configuration

### Node #1 Services (for Node #2 connection)

```yaml
# docker-compose.yml
services:
  dagi-node-registry:
    ports:
      - "9205:9205"
    # Allows Node #2 to register
  
  dagi-nats:
    ports:
      - "4222:4222"  # Client connections
      - "6222:6222"  # Cluster
      - "8222:8222"  # Monitoring
    # Allows Node #2 to connect as client
```

### Node #2 Configuration (to connect to Node #1)

```bash
# Node Registry URL
NODE_REGISTRY_URL=http://144.76.224.179:9205

# NATS URL
NATS_URL=nats://144.76.224.179:4222

# Router URL (for API calls)
ROUTER_URL=http://144.76.224.179:9102

# Gateway URL
GATEWAY_URL=https://gateway.daarion.city
```

---

## 🎯 Use Cases

### 1. **Node Discovery**
- Node #2 реєструється в Node Registry на Node #1
- Node #1 знає про всі доступні ноди
- Можна знайти Node #2 через Node Registry API

### 2. **Task Distribution**
- Node #1 може відправляти завдання на Node #2 через NATS
- Node #2 виконує завдання та повертає результат

### 3. **Event Logging**
- Node #2 відправляє події на Node #1 через NATS
- Node #1 зберігає логи в централізованому місці

### 4. **Service Proxy**
- Node #2 може використовувати сервіси Node #1 через HTTP
- Наприклад: використання Router, Gateway, RAG Service

### 5. **Backup & Failover**
- Node #2 може працювати як backup для Node #1
- При недоступності Node #1, Node #2 може взяти на себе функції

---

## 🔒 Security

### Firewall Rules (Node #1)

```bash
# Allow Node Registry from LAN
ufw allow from 192.168.1.0/24 to any port 9205

# Allow NATS from LAN
ufw allow from 192.168.1.0/24 to any port 4222

# Allow SSH from specific IPs
ufw allow from 192.168.1.244 to any port 22

# Block external access to internal services
ufw deny 9205/tcp
ufw deny 4222/tcp
```

### Authentication

- **Node Registry:** API keys або token-based auth
- **NATS:** Username/password або TLS certificates
- **HTTP APIs:** RBAC Service (port 9200)
- **SSH:** SSH keys

---

## 📈 Monitoring

### Node Registry Health
```bash
curl http://144.76.224.179:9205/health
```

### NATS Status
```bash
curl http://144.76.224.179:8222/varz
```

### Node Connection Status
```bash
# Get all registered nodes
curl http://144.76.224.179:9205/api/v1/nodes

# Get specific node
curl http://144.76.224.179:9205/api/v1/nodes/node-2-macbook-m4max
```

---

## 🚀 Future Enhancements

1. **VPN Connection** - Secure tunnel між нодами
2. **Service Mesh** - Advanced routing та load balancing
3. **Automatic Failover** - Automatic switch to backup node
4. **Multi-region Support** - Nodes in different regions
5. **Real-time Sync** - Real-time data synchronization

---

**Status:** ✅ Documented  
**Date:** 2025-11-22  
**Version:** 1.0

