# ✅ Node Registry Service — Deployment Checklist

**Version:** 1.0.0  
**Date:** 2025-01-17  
**Status:** Ready for Production

---

## 📋 Pre-Deployment Checklist

### Local Verification (Node #2)

- [ ] **Test service locally**
  ```bash
  cd services/node-registry
  pip install -r requirements.txt
  export NODE_REGISTRY_ENV=development
  export NODE_REGISTRY_DB_HOST=localhost
  export NODE_REGISTRY_DB_NAME=node_registry
  python -m app.main
  ```

- [ ] **Verify endpoints**
  ```bash
  curl http://localhost:9205/health
  curl http://localhost:9205/metrics
  curl http://localhost:9205/docs  # Interactive API docs
  ```

- [ ] **Test node registration**
  ```bash
  curl -X POST http://localhost:9205/api/v1/nodes/register \
    -H "Content-Type: application/json" \
    -d '{"hostname": "test-node", "ip": "192.168.1.100", "role": "test", "labels": ["test"]}'
  ```

- [ ] **Test heartbeat**
  ```bash
  curl -X POST http://localhost:9205/api/v1/nodes/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"node_id": "node-test", "status": "online"}'
  ```

- [ ] **List nodes**
  ```bash
  curl http://localhost:9205/api/v1/nodes
  ```

- [ ] **Run tests** (if available)
  ```bash
  cd services/node-registry
  pytest tests/
  ```

---

## 🚀 Production Deployment (Node #1)

### Step 1: Push to GitHub

- [ ] **Commit changes**
  ```bash
  git add services/node-registry/
  git add docker-compose.yml
  git add scripts/deploy-node-registry.sh
  git add NODE-REGISTRY-*.md
  git commit -m "feat: Node Registry Service - Full implementation"
  git push origin main
  ```

### Step 2: Pull on Node #1

- [ ] **SSH to Node #1 and pull latest**
  ```bash
  ssh root@144.76.224.179
  cd /opt/microdao-daarion
  git pull origin main
  ```

### Step 3: Initialize Database

- [ ] **Run SQL migration**
  ```bash
  # On Node #1
  cd /opt/microdao-daarion
  
  # Copy SQL file to container
  docker cp services/node-registry/migrations/001_create_node_registry_tables.sql dagi-postgres:/tmp/
  
  # Execute migration
  docker exec -i dagi-postgres psql -U postgres < /tmp/001_create_node_registry_tables.sql
  
  # Verify tables
  docker exec dagi-postgres psql -U postgres -d node_registry -c "\dt"
  ```

- [ ] **Generate secure password**
  ```bash
  # Generate password
  PASSWORD=$(openssl rand -base64 32)
  
  # Add to .env
  echo "NODE_REGISTRY_DB_PASSWORD=$PASSWORD" >> .env
  
  # Verify
  grep NODE_REGISTRY_DB_PASSWORD .env
  ```

### Step 4: Build and Start Service

- [ ] **Build Docker image**
  ```bash
  docker-compose build node-registry
  ```

- [ ] **Start service**
  ```bash
  docker-compose up -d node-registry
  ```

- [ ] **Check container status**
  ```bash
  docker-compose ps | grep node-registry
  docker logs dagi-node-registry --tail 50
  ```

### Step 5: Configure Firewall

- [ ] **Set UFW rules**
  ```bash
  # Allow from local network
  ufw allow from 192.168.1.0/24 to any port 9205 proto tcp comment 'Node Registry - LAN'
  
  # Allow from Docker network
  ufw allow from 172.16.0.0/12 to any port 9205 proto tcp comment 'Node Registry - Docker'
  
  # Deny from external
  ufw deny 9205/tcp comment 'Node Registry - Block external'
  
  # Verify rules
  ufw status | grep 9205
  ```

### Step 6: Verify Deployment

- [ ] **Health check**
  ```bash
  curl http://localhost:9205/health
  # Expected: {"status":"healthy",...,"database":{"connected":true,...}}
  ```

- [ ] **Metrics check**
  ```bash
  curl http://localhost:9205/metrics
  ```

- [ ] **Check database connectivity**
  ```bash
  docker exec dagi-postgres psql -U node_registry_user -d node_registry -c "SELECT COUNT(*) FROM nodes;"
  ```

### Step 7: Register Nodes

- [ ] **Register Node #1 (Production)**
  ```bash
  # Option A: Using bootstrap tool (if installed on Node #1)
  python -m tools.dagi_node_agent.bootstrap \
    --role production-router \
    --labels router,gateway,production \
    --registry-url http://localhost:9205
  
  # Option B: Manual API call
  curl -X POST http://localhost:9205/api/v1/nodes/register \
    -H "Content-Type: application/json" \
    -d '{
      "hostname": "gateway.daarion.city",
      "ip": "144.76.224.179",
      "role": "production-router",
      "labels": ["router", "gateway", "production"]
    }'
  ```

- [ ] **Register Node #2 (Development) from MacBook**
  ```bash
  # From Node #2
  python -m tools.dagi_node_agent.bootstrap \
    --role development-router \
    --labels router,development,mac,gpu \
    --registry-url http://192.168.1.244:9205
  ```

- [ ] **Verify node registration**
  ```bash
  # List all nodes
  curl http://localhost:9205/api/v1/nodes
  
  # Get specific node
  curl http://localhost:9205/api/v1/nodes/node-1-hetzner-gex44
  ```

---

## 🧪 Post-Deployment Testing

### Functional Tests

- [ ] **Test node listing**
  ```bash
  # All nodes
  curl http://144.76.224.179:9205/api/v1/nodes
  
  # Filter by role
  curl "http://144.76.224.179:9205/api/v1/nodes?role=production-router"
  
  # Filter by label
  curl "http://144.76.224.179:9205/api/v1/nodes?label=gateway"
  
  # Filter by status
  curl "http://144.76.224.179:9205/api/v1/nodes?status=online"
  ```

- [ ] **Test heartbeat updates**
  ```bash
  curl -X POST http://144.76.224.179:9205/api/v1/nodes/heartbeat \
    -H "Content-Type: application/json" \
    -d '{"node_id": "node-1-hetzner-gex44", "status": "online"}'
  
  # Verify heartbeat timestamp updated
  curl http://144.76.224.179:9205/api/v1/nodes/node-1-hetzner-gex44 | grep last_heartbeat
  ```

- [ ] **Test role profiles**
  ```bash
  curl http://144.76.224.179:9205/api/v1/profiles/production-router
  ```

### Network Access Tests

- [ ] **Test from Node #2 (internal network)**
  ```bash
  # From MacBook
  curl http://144.76.224.179:9205/health
  ```

- [ ] **Verify external access blocked**
  ```bash
  # From external machine (should fail or timeout)
  curl --max-time 5 http://144.76.224.179:9205/health
  ```

### Integration Tests

- [ ] **DAGI Router integration** (future)
  ```bash
  # Test router can fetch node list
  curl http://dagi-router:9102/api/nodes
  ```

- [ ] **Prometheus scraping** (future)
  ```bash
  # Verify metrics endpoint is scrapable
  curl http://144.76.224.179:9205/metrics | grep node_registry
  ```

---

## 📊 Monitoring Setup

### Prometheus Configuration

- [ ] **Add scrape job to prometheus.yml**
  ```yaml
  scrape_configs:
    - job_name: 'node-registry'
      static_configs:
        - targets: ['node-registry:9205']
      scrape_interval: 30s
  ```

- [ ] **Reload Prometheus**
  ```bash
  docker-compose restart prometheus
  ```

### Grafana Dashboard

- [ ] **Create dashboard for Node Registry**
  - Panel: Node Registry uptime
  - Panel: Total registered nodes
  - Panel: Active vs offline nodes
  - Panel: Nodes by role
  - Panel: Recent heartbeats

### Health Check Alerts

- [ ] **Configure alerting** (optional)
  ```yaml
  # prometheus/alerts/node_registry.yml
  groups:
    - name: node_registry
      rules:
        - alert: NodeRegistryDown
          expr: up{job="node-registry"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node Registry is down"
  ```

---

## 🔄 Operational Tasks

### Regular Maintenance

- [ ] **Weekly: Check node heartbeats**
  ```bash
  docker exec dagi-postgres psql -U postgres -d node_registry -c \
    "SELECT node_id, last_heartbeat, status FROM nodes ORDER BY last_heartbeat DESC;"
  ```

- [ ] **Weekly: Clean old heartbeat logs** (if needed)
  ```bash
  docker exec dagi-postgres psql -U postgres -d node_registry -c \
    "DELETE FROM heartbeat_log WHERE timestamp < NOW() - INTERVAL '30 days';"
  ```

- [ ] **Monthly: Review registered nodes**
  ```bash
  curl http://144.76.224.179:9205/api/v1/nodes | jq '.[] | {node_id, role, status, last_heartbeat}'
  ```

### Backup

- [ ] **Backup node_registry database**
  ```bash
  docker exec dagi-postgres pg_dump -U postgres node_registry > backups/node_registry_$(date +%Y%m%d).sql
  ```

---

## 📚 Documentation Updates

- [ ] **Update INFRASTRUCTURE.md**
  - Add Node Registry to services table (Port 9205)
  - Add environment variables section

- [ ] **Update SYSTEM-INVENTORY.md**
  - Add node-registry service to inventory
  - Update total service count (17 → 18)

- [ ] **Update WARP.md**
  - Add Node Registry service restart command
  - Add node registration examples

---

## ✅ Final Verification

- [ ] Service running on Node #1
- [ ] Database initialized with schema
- [ ] Firewall configured (internal only)
- [ ] Node #1 registered and heartbeat working
- [ ] Node #2 registered and heartbeat working
- [ ] Health endpoint responding
- [ ] Metrics endpoint responding
- [ ] API endpoints functional
- [ ] Documentation updated
- [ ] Monitoring configured

---

## 🎉 Deployment Complete!

**Node Registry Service is now live and ready for production use.**

### Next Steps:
1. Integrate with DAGI Router for node discovery
2. Set up automated heartbeat cron jobs for each node
3. Add authentication/authorization
4. Implement Prometheus metrics export
5. Create Grafana dashboard

---

**Deployed by:** [Your Name]  
**Date:** [Deployment Date]  
**Status:** ✅ Production Ready
