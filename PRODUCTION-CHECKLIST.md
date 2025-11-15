# Production Readiness Checklist

This checklist ensures DAGI Stack is ready for production deployment.

## ✅ Pre-Production Verification

### Security
- [x] `.env` in `.gitignore` - secrets protected
- [x] `.env.example` documented - all variables explained
- [x] Secret generation commands provided
- [ ] All `.env` values filled with real credentials
- [ ] RBAC_SECRET_KEY generated (`openssl rand -hex 32`)
- [ ] Bot tokens configured (Telegram/Discord)

### Infrastructure
- [x] `docker-compose.yml` configured - 5 services defined
- [x] Dockerfiles created for all services
- [x] `.dockerignore` optimized
- [x] Health checks configured (30s interval)
- [x] Networks and volumes defined
- [ ] Disk space available (10GB+)
- [ ] RAM available (4GB+)

### Testing
- [x] `smoke.sh` test suite created
- [ ] Smoke tests passing (run `./smoke.sh`)
- [ ] Router health check passing
- [ ] DevTools health check passing
- [ ] CrewAI health check passing
- [ ] RBAC health check passing
- [ ] Gateway health check passing

### Observability
- [x] Structured JSON logging implemented
- [x] Request IDs for tracing
- [x] Log levels configurable (LOG_LEVEL)
- [x] Service names in logs
- [ ] Log rotation configured (optional)
- [ ] Monitoring dashboards (future)

### Documentation
- [x] README.md comprehensive
- [x] Architecture diagram included
- [x] Quick start guide
- [x] Services overview
- [x] Configuration examples
- [x] DEPLOYMENT.md created
- [x] CHANGELOG.md maintained
- [x] PHASE-2-COMPLETE.md summary

### Configuration
- [x] `router-config.yml` validated
- [x] Routing rules prioritized
- [x] Timeouts configured
- [ ] LLM provider URLs verified
- [ ] Ollama model pulled (if using local)

---

## 🚀 Deployment Steps

### 1. Initial Setup

```bash
# Clone repository
git clone https://github.com/daarion/dagi-stack.git
cd dagi-stack

# Configure environment
cp .env.example .env
nano .env

# Generate secrets
export RBAC_SECRET_KEY=$(openssl rand -hex 32)
echo "RBAC_SECRET_KEY=$RBAC_SECRET_KEY" >> .env
```

### 2. Pre-flight Check

```bash
# Verify Docker
docker --version
docker-compose --version

# Verify resources
df -h | grep /var/lib/docker
free -h

# Validate configuration
cat .env | grep -v '^#' | grep '='
```

### 3. Service Startup

```bash
# Start all services
docker-compose up -d

# Wait for health checks
sleep 30

# Verify all healthy
docker-compose ps
```

### 4. Smoke Test

```bash
# Run test suite
./smoke.sh

# Expected: All tests passing
```

### 5. Manual Verification

```bash
# Test Router
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "mode": "chat", "metadata": {}}'

# Test DevTools
curl -X POST http://localhost:8008/fs/read \
  -H "Content-Type: application/json" \
  -d '{"path": "README.md"}'

# Test CrewAI
curl -X GET http://localhost:9010/workflow/list

# Test RBAC
curl -X POST http://localhost:9200/rbac/resolve \
  -H "Content-Type: application/json" \
  -d '{"dao_id": "greenfood-dao", "user_id": "tg:12345"}'

# Test Gateway
curl http://localhost:9300/health
```

---

## 🔧 Production Configuration

### Environment Variables (Required)

```bash
# Bots
TELEGRAM_BOT_TOKEN=your_token_here
DISCORD_BOT_TOKEN=your_token_here

# LLM
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# Security
RBAC_SECRET_KEY=your_generated_secret_here

# Ports (optional, defaults)
ROUTER_PORT=9102
GATEWAY_PORT=9300
DEVTOOLS_PORT=8008
CREWAI_PORT=9010
RBAC_PORT=9200
```

### Firewall Rules

```bash
# Allow external access (Gateway only)
sudo ufw allow 9300/tcp

# Block internal services from external access
sudo ufw deny 8008/tcp
sudo ufw deny 9010/tcp
sudo ufw deny 9200/tcp

# Allow Router if needed externally
sudo ufw allow 9102/tcp
```

### Nginx Reverse Proxy (Optional)

```nginx
server {
    listen 80;
    server_name gateway.daarion.city;
    
    location / {
        proxy_pass http://localhost:9300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 📊 Monitoring

### Health Checks

```bash
# Create health check cron job
cat > /etc/cron.d/dagi-health << 'CRON'
*/5 * * * * root /opt/dagi-stack/smoke.sh > /var/log/dagi-health.log 2>&1
CRON
```

### Log Monitoring

```bash
# View live logs
docker-compose logs -f

# Check for errors
docker-compose logs | grep -i error

# Service-specific logs
docker-compose logs router | tail -100
```

### Disk Usage

```bash
# Check Docker volumes
docker system df

# Clean up if needed
docker system prune -a
```

---

## 🔄 Maintenance

### Daily Tasks
- [ ] Check health endpoints
- [ ] Review error logs
- [ ] Monitor disk usage

### Weekly Tasks
- [ ] Run smoke tests
- [ ] Check for Docker image updates
- [ ] Review RBAC database size
- [ ] Backup configurations

### Monthly Tasks
- [ ] Update dependencies
- [ ] Security patches
- [ ] Performance optimization
- [ ] Capacity planning

---

## 🐛 Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs <service>

# Check resources
docker stats

# Restart service
docker-compose restart <service>
```

### Health check fails

```bash
# Test manually
curl http://localhost:<port>/health

# Check container status
docker-compose ps

# Check network
docker network ls
docker network inspect dagi-network
```

### LLM timeout

```bash
# Increase timeout in router-config.yml
timeout_ms: 60000

# Restart router
docker-compose restart router

# Check Ollama
curl http://localhost:11434/api/tags
```

---

## 📞 Escalation

If issues persist:
1. Check GitHub Issues: https://github.com/daarion/dagi-stack/issues
2. Discord support: https://discord.gg/daarion
3. Email: dev@daarion.city

---

**Last updated**: 2024-11-15
**Version**: 0.2.0
