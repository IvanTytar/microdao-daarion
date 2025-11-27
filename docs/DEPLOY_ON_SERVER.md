# Deploy DAARION on Server

**Version:** 1.0.0  
**Phase:** INFRA — Production Deployment  
**Last Updated:** 24 листопада 2025

---

## 🎯 Overview

This guide covers deploying DAARION on a production server (VPS/dedicated server) with:
- Single domain entry point
- SSL/TLS certificates
- Production-ready configuration
- Monitoring & backups

---

## 📋 Prerequisites

### Server Requirements

**Minimum:**
- 4 CPU cores
- 8GB RAM
- 50GB SSD storage
- Ubuntu 22.04 LTS (or similar)

**Recommended:**
- 8 CPU cores
- 16GB RAM
- 100GB SSD storage
- Ubuntu 22.04 LTS

### Domain Setup

- Domain pointing to server IP (e.g., `daarion.example.com`)
- DNS A record configured
- Port 80/443 accessible

---

## 🚀 Installation Steps

### 1. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 2. Install Additional Tools

```bash
# PostgreSQL client (for migrations)
sudo apt install postgresql-client -y

# Node.js (for frontend build)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# nginx (for SSL termination)
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 3. Clone Repository

```bash
# Create app directory
sudo mkdir -p /opt/daarion
sudo chown $USER:$USER /opt/daarion

# Clone
cd /opt/daarion
git clone https://github.com/your-org/daarion.git .

# Or download release
# wget https://github.com/your-org/daarion/archive/v1.0.0.tar.gz
# tar -xzf v1.0.0.tar.gz
```

### 4. Configure Environment

```bash
# Create .env file
cp .env.example .env

# Edit with your values
nano .env
```

**Important variables:**

```env
# Domain
DOMAIN=daarion.example.com

# Database
DATABASE_URL=postgresql://daarion_user:STRONG_PASSWORD@postgres:5432/daarion

# Redis
REDIS_URL=redis://redis:6379/0

# NATS
NATS_URL=nats://nats:4222

# Secrets
JWT_SECRET=GENERATE_STRONG_SECRET_HERE
INTERNAL_SECRET=GENERATE_STRONG_SECRET_HERE

# Matrix
MATRIX_HOMESERVER=http://matrix-synapse:8008
SYNAPSE_SERVER_NAME=matrix.daarion.example.com

# Production mode
NODE_ENV=production
APP_ENV=production
```

**Generate secrets:**

```bash
# JWT Secret
openssl rand -base64 32

# Internal Secret
openssl rand -hex 32
```

### 5. Build Frontend

```bash
# Install dependencies
npm install

# Build production bundle
npm run build

# Verify dist/ directory exists
ls -la dist/
```

### 6. Apply Database Migrations

```bash
# Start only PostgreSQL first
docker compose -f docker-compose.all.yml up -d postgres

# Wait for PostgreSQL
sleep 10

# Apply migrations
for migration in migrations/*.sql; do
    echo "Applying: $migration"
    PGPASSWORD=YOUR_PASSWORD psql -h localhost -U daarion_user -d daarion -f "$migration"
done
```

### 7. Start All Services

```bash
# Start full stack
docker compose -f docker-compose.all.yml up -d

# Check status
docker compose -f docker-compose.all.yml ps

# View logs
docker compose -f docker-compose.all.yml logs -f gateway
```

---

## 🔒 SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

Create external nginx config:

```bash
sudo nano /etc/nginx/sites-available/daarion
```

**Config:**

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name daarion.example.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS with proxy to gateway
server {
    listen 443 ssl http2;
    server_name daarion.example.com;
    
    # SSL certificates (will be added by certbot)
    ssl_certificate /etc/letsencrypt/live/daarion.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daarion.example.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Proxy to gateway container
    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Client body size
    client_max_body_size 100M;
}
```

**Enable site:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/daarion /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**Get SSL certificate:**

```bash
# Request certificate
sudo certbot --nginx -d daarion.example.com

# Auto-renewal (cron)
sudo certbot renew --dry-run
```

### Option 2: Self-signed (Development only)

```bash
# Generate certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/daarion.key \
    -out /etc/ssl/certs/daarion.crt

# Update nginx config to use these certs
```

---

## 🔧 Production Configuration

### 1. Update docker-compose for Production

Modify `docker-compose.all.yml`:

```yaml
# Example changes for production
services:
  postgres:
    restart: always
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - /opt/daarion/data/postgres:/var/lib/postgresql/data
  
  gateway:
    restart: always
    # Expose on localhost only (nginx proxies from host)
    ports:
      - "127.0.0.1:80:80"
```

### 2. Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 3. Resource Limits

Add to `docker-compose.all.yml`:

```yaml
services:
  living-map-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 📊 Monitoring

### Logs

```bash
# All services
docker compose -f docker-compose.all.yml logs -f

# Specific service
docker compose -f docker-compose.all.yml logs -f living-map-service

# Last 100 lines
docker compose -f docker-compose.all.yml logs --tail=100
```

### Health Checks

```bash
# Gateway health
curl https://daarion.example.com/health

# Individual services
docker compose -f docker-compose.all.yml ps
```

### Monitoring Stack

Access Prometheus & Grafana (if enabled):
- Prometheus: `https://daarion.example.com/api/prometheus/`
- Grafana: `https://daarion.example.com/api/grafana/`

---

## 💾 Backup Strategy

### 1. Database Backup

**Script:** `scripts/backup-db.sh`

```bash
#!/bin/bash
BACKUP_DIR="/opt/daarion/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker exec daarion-postgres pg_dump -U postgres daarion \
    > $BACKUP_DIR/daarion_$DATE.sql

# Compress
gzip $BACKUP_DIR/daarion_$DATE.sql

# Keep last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: daarion_$DATE.sql.gz"
```

**Cron (daily at 2 AM):**

```bash
crontab -e
# Add:
0 2 * * * /opt/daarion/scripts/backup-db.sh >> /var/log/daarion-backup.log 2>&1
```

### 2. Volume Backup

```bash
# Backup volumes
docker run --rm \
    -v daarion_postgres_data:/data \
    -v /opt/daarion/backups:/backup \
    alpine tar czf /backup/postgres_$(date +%Y%m%d).tar.gz /data
```

---

## 🔄 Updates & Maintenance

### Update DAARION

```bash
cd /opt/daarion

# Pull latest
git pull origin main

# Rebuild frontend
npm run build

# Restart services
docker compose -f docker-compose.all.yml up -d --build

# Apply new migrations if any
./scripts/migrate.sh
```

### Zero-downtime Updates (Advanced)

Use blue-green deployment or rolling updates:

```bash
# Scale up new version
docker compose -f docker-compose.all.yml up -d --scale living-map-service=2

# Wait for health checks
sleep 30

# Scale down old version
docker compose -f docker-compose.all.yml up -d --scale living-map-service=1
```

---

## 🐛 Troubleshooting

### Services not starting

```bash
# Check logs
docker compose -f docker-compose.all.yml logs

# Check resources
docker stats

# Restart specific service
docker compose -f docker-compose.all.yml restart living-map-service
```

### Database connection issues

```bash
# Connect to database
docker exec -it daarion-postgres psql -U postgres -d daarion

# Check connections
SELECT * FROM pg_stat_activity;
```

### High memory usage

```bash
# Check memory
docker stats --no-stream

# Restart heavy services
docker compose -f docker-compose.all.yml restart living-map-service
```

---

## 📈 Performance Tuning

### PostgreSQL

Add to docker-compose:

```yaml
postgres:
  command: 
    - "postgres"
    - "-c"
    - "max_connections=200"
    - "-c"
    - "shared_buffers=256MB"
```

### NGINX Cache

Add to nginx config:

```nginx
# Cache zone
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=daarion_cache:10m max_size=1g;

# In location blocks
proxy_cache daarion_cache;
proxy_cache_valid 200 5m;
```

---

## 🔐 Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS enabled
- [ ] Firewall configured
- [ ] Regular backups automated
- [ ] Monitoring enabled
- [ ] Log rotation configured
- [ ] Non-root user for Docker
- [ ] Secrets in environment variables (not in code)
- [ ] Regular security updates

---

## 📚 Related Documentation

- [Deployment Overview](./DEPLOYMENT_OVERVIEW.md)
- [Infrastructure Guide](../INFRASTRUCTURE.md)
- [Phase INFRA Ready](../PHASE_INFRA_READY.md)

---

**🎉 DAARION — Production Ready!**

