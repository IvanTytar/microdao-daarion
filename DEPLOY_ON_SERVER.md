# DAARION MVP — Production Deployment Guide

**Домен:** https://app.daarion.space  
**Сервер:** VPS Ubuntu 22.04 LTS  
**Версія:** 1.0.0 MVP

---

## 🎯 Quick Start

```bash
# 1. Clone repository
git clone https://github.com/yourorg/microdao-daarion.git
cd microdao-daarion

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in all CHANGE_ME_* values

# 3. Run deployment
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh

# 4. Run smoke tests
# Follow docs/DEPLOY_SMOKETEST_CHECKLIST.md
```

**Estimated time:** 30-45 minutes

---

## 📚 Detailed Documentation

### Pre-deployment:
1. **[DNS Setup](docs/DEPLOY_DNS_SETUP.md)** — Configure DNS records
2. **[Environment Config](docs/DEPLOY_ENV_CONFIG.md)** — Set up .env files

### Deployment:
3. **[SSL/HTTPS Setup](docs/DEPLOY_SSL_SETUP.md)** — Configure Caddy
4. **[Database Migrations](docs/DEPLOY_MIGRATIONS.md)** — Apply all migrations
5. **[Services Deployment](docs/DEPLOY_SERVICES.md)** — Start all services

### Post-deployment:
6. **[Smoke Tests](docs/DEPLOY_SMOKETEST_CHECKLIST.md)** — Verify everything works
7. **[Monitoring](docs/DEPLOY_MONITORING.md)** — Set up monitoring
8. **[Security](docs/DEPLOY_SECURITY.md)** — Harden security

---

## 🚀 Architecture

```
Internet
   │
   ├─> Caddy (Port 443) → SSL Termination
   │       │
   │       └─> Gateway (Port 80 internal)
   │               │
   │               ├─> Frontend (React/Vite)
   │               ├─> City Service (Port 7001)
   │               ├─> Agents Service (Port 7002)
   │               ├─> Second Me Service (Port 7003)
   │               ├─> MicroDAO Service (Port 7004)
   │               └─> Auth Service (Port 7000)
   │
   ├─> PostgreSQL (internal only)
   ├─> Redis (internal only)
   ├─> NATS (internal only)
   └─> Grafana (optional: /grafana/)
```

---

## ✅ Prerequisites

### Server Requirements:
- **OS:** Ubuntu 22.04 LTS
- **CPU:** 4+ cores
- **RAM:** 16+ GB
- **Disk:** 256+ GB NVMe
- **Network:** Static IP, ports 80/443 open

### Software:
- Docker 24+
- Docker Compose 2.20+
- Git
- OpenSSL

### Domain:
- Control over DNS records for `daarion.space`

---

## 🔧 Initial Server Setup

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Install Docker Compose
sudo apt install docker-compose-plugin -y

# 4. Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 5. Create deployment directory
sudo mkdir -p /opt/daarion
sudo chown $USER:$USER /opt/daarion
cd /opt/daarion
```

---

## 🌐 DNS Configuration

### Required Records:
```
Type: A, Name: @, Value: <YOUR_SERVER_IP>
Type: A, Name: app, Value: <YOUR_SERVER_IP>
```

### Verification:
```bash
dig app.daarion.space +short
# Should return your server IP
```

**See:** [docs/DEPLOY_DNS_SETUP.md](docs/DEPLOY_DNS_SETUP.md)

---

## 🔐 Environment Configuration

### 1. Copy example:
```bash
cp .env.example .env
```

### 2. Generate secrets:
```bash
# JWT Secret
openssl rand -hex 32

# Database Password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25

# Redis Password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25

# Grafana Password
openssl rand -base64 16
```

### 3. Edit .env:
Replace all `CHANGE_ME_*` values with generated secrets.

**See:** [docs/DEPLOY_ENV_CONFIG.md](docs/DEPLOY_ENV_CONFIG.md)

---

## 🗄️ Database Migrations

```bash
# Run migration script
chmod +x scripts/migrate.sh
./scripts/migrate.sh
```

**Verification:**
```bash
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT COUNT(*) FROM city_rooms;"
# Expected: 5
```

**See:** [docs/DEPLOY_MIGRATIONS.md](docs/DEPLOY_MIGRATIONS.md)

---

## 🚀 Deployment

### Automated:
```bash
chmod +x scripts/deploy-prod.sh
./scripts/deploy-prod.sh
```

### Manual:
```bash
# 1. Create network
docker network create daarion-network

# 2. Start services
docker compose -f docker-compose.all.yml up -d

# 3. Start Caddy
docker compose -f docker-compose.caddy.yml up -d

# 4. Check status
docker ps | grep daarion
```

---

## ✅ Verification

### 1. Health Checks:
```bash
curl -I https://app.daarion.space/health
# Expected: HTTP/2 200

curl https://app.daarion.space/city/rooms | jq
# Expected: Array of 5 rooms
```

### 2. SSL Certificate:
```bash
echo | openssl s_client -servername app.daarion.space \
  -connect app.daarion.space:443 2>/dev/null | \
  openssl x509 -noout -dates
```

### 3. WebSocket:
Open `https://app.daarion.space/city/rooms` in browser, check DevTools → Network → WS

---

## 🧪 Smoke Tests

Run comprehensive smoke tests:

```bash
# Follow checklist
cat docs/DEPLOY_SMOKETEST_CHECKLIST.md
```

**Critical tests:**
- [ ] HTTPS works
- [ ] City Rooms API returns data
- [ ] WebSocket connections establish
- [ ] Second Me responds
- [ ] No errors in logs

---

## 📊 Monitoring

### Docker Stats:
```bash
docker stats
```

### Service Logs:
```bash
docker logs -f daarion-gateway
docker logs -f daarion-city-service
docker logs -f daarion-caddy
```

### Grafana (optional):
```
https://app.daarion.space/grafana/
Username: admin
Password: <from .env>
```

---

## 🔒 Security Checklist

- [ ] All secrets changed from defaults
- [ ] PostgreSQL not exposed externally
- [ ] Redis not exposed externally
- [ ] NATS not exposed externally
- [ ] Grafana protected with strong password
- [ ] Firewall configured (ufw)
- [ ] SSL certificate valid
- [ ] Security headers present

**See:** [docs/DEPLOY_SECURITY.md](docs/DEPLOY_SECURITY.md)

---

## 🛠️ Maintenance

### Backup:
```bash
# Database backup
docker compose -f docker-compose.all.yml exec postgres \
  pg_dump -U daarion_user daarion > backup_$(date +%Y%m%d).sql
gzip backup_*.sql
```

### Updates:
```bash
git pull origin main
docker compose -f docker-compose.all.yml pull
docker compose -f docker-compose.all.yml up -d
```

### Restart:
```bash
docker compose -f docker-compose.all.yml restart <service_name>
```

### Stop:
```bash
./scripts/stop-prod.sh
```

---

## 🚨 Troubleshooting

### Service won't start:
```bash
docker logs <container_name>
docker compose -f docker-compose.all.yml config
```

### Database connection fails:
```bash
docker compose -f docker-compose.all.yml exec postgres \
  psql -U daarion_user -d daarion -c "SELECT 1;"
```

### SSL certificate issues:
```bash
docker logs daarion-caddy | grep -i "acme\|certificate"
```

### WebSocket connection fails:
- Check Caddy configuration in `Caddyfile`
- Verify `@websocket` directive present
- Check browser console for errors

---

## 📞 Support

- **Documentation:** `docs/` directory
- **Issues:** GitHub Issues
- **Logs:** `/var/log/daarion/` and `docker logs`

---

## 🎉 Success Criteria

Deployment is successful when:

1. ✅ `https://app.daarion.space` loads without errors
2. ✅ SSL certificate is valid (Let's Encrypt)
3. ✅ All Docker containers are running (`docker ps`)
4. ✅ City Rooms API returns 5 default rooms
5. ✅ WebSocket connections work
6. ✅ Second Me responds to prompts
7. ✅ No critical errors in logs
8. ✅ Database has all tables (10 migrations)

---

**Deployed:** _______________ (date)  
**Version:** 1.0.0 MVP  
**Status:** Production Ready 🚀

