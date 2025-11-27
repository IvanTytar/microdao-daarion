# Environment Configuration для DAARION Production

**Важливо:** Ніколи не комітити реальні секрети в Git!

---

## 📂 Структура ENV файлів

```text
/opt/daarion/
├── .env                    # Головний файл (використовується docker-compose)
├── env/
│   ├── app.env            # Загальні змінні застосунку
│   ├── db.env             # PostgreSQL
│   ├── redis.env          # Redis
│   ├── nats.env           # NATS
│   ├── agents.env         # Agents Service
│   ├── city.env           # City Service
│   ├── secondme.env       # Second Me Service
│   └── monitoring.env     # Prometheus/Grafana
└── .env.example           # Шаблон (в Git)
```

---

## 🔑 Генерація секретів

```bash
# JWT Secret (64 символи)
openssl rand -hex 32

# Encryption Key (32 символи)
openssl rand -hex 16

# Database Password
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25

# Registration Secret (для Matrix, Phase 4+)
openssl rand -base64 32
```

---

## 📝 .env (Головний файл)

```env
# =============================================================================
# DAARION Production Environment
# =============================================================================

# Environment
APP_ENV=production
NODE_ENV=production

# Domain
APP_BASE_URL=https://app.daarion.space
APP_DOMAIN=daarion.space

# Database (PostgreSQL)
DATABASE_URL=postgresql://daarion_user:CHANGE_ME_DB_PASSWORD@postgres:5432/daarion
POSTGRES_USER=daarion_user
POSTGRES_PASSWORD=CHANGE_ME_DB_PASSWORD
POSTGRES_DB=daarion

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_PASSWORD=CHANGE_ME_REDIS_PASSWORD

# NATS
NATS_URL=nats://nats:4222
NATS_CLUSTER_ID=daarion-cluster

# Security
JWT_SECRET=CHANGE_ME_JWT_SECRET_64_CHARS
JWT_EXPIRY=7d
ENCRYPTION_KEY=CHANGE_ME_ENCRYPTION_KEY_32_CHARS

# Services URLs (internal)
AUTH_SERVICE_URL=http://auth-service:7000
AGENTS_SERVICE_URL=http://agents-service:7002
CITY_SERVICE_URL=http://city-service:7001
SECONDME_SERVICE_URL=http://secondme-service:7003
MICRODAO_SERVICE_URL=http://microdao-service:7004

# City Config
CITY_DEFAULT_ROOMS=general,welcome,builders
SECONDME_AGENT_ID=ag_secondme_global

# Monitoring
PROMETHEUS_RETENTION=15d
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_GRAFANA_PASSWORD

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# =============================================================================
# Advanced (Optional)
# =============================================================================

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# CORS
CORS_ORIGINS=https://app.daarion.space,https://daarion.space
CORS_CREDENTIALS=true

# File Upload
MAX_FILE_SIZE=10MB
UPLOAD_DIR=/data/uploads

# Telemetry (Optional)
TELEMETRY_ENABLED=false
SENTRY_DSN=

# Feature Flags (MVP)
FEATURE_CITY_ROOMS=true
FEATURE_SECOND_ME=true
FEATURE_AGENTS=true
FEATURE_MICRODAO=true
FEATURE_MATRIX=false
```

---

## 🔐 env/app.env

```env
# Application Configuration
APP_NAME=DAARION
APP_VERSION=1.0.0
APP_ENV=production
APP_DEBUG=false

APP_BASE_URL=https://app.daarion.space
APP_DOMAIN=daarion.space

# Security
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Session
SESSION_LIFETIME=604800
SESSION_SECURE=true
SESSION_SAME_SITE=strict
```

---

## 🗄️ env/db.env

```env
# PostgreSQL Configuration
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=daarion_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=daarion

# Connection Pool
POSTGRES_POOL_MIN=2
POSTGRES_POOL_MAX=10

# Timeouts
POSTGRES_CONNECT_TIMEOUT=10
POSTGRES_STATEMENT_TIMEOUT=30000

# SSL (Production)
POSTGRES_SSL_MODE=prefer
```

---

## 📦 env/redis.env

```env
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_DB=0

# Connection
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000

# Presence System
PRESENCE_TTL=40
PRESENCE_HEARTBEAT_INTERVAL=20
```

---

## 📡 env/nats.env

```env
# NATS Configuration
NATS_URL=nats://nats:4222
NATS_CLUSTER_ID=daarion-cluster

# JetStream
NATS_JETSTREAM_ENABLED=true
NATS_JETSTREAM_DOMAIN=daarion

# Connection
NATS_MAX_RECONNECTS=10
NATS_RECONNECT_WAIT=2s
```

---

## 🤖 env/agents.env

```env
# Agents Service Configuration
AGENTS_SERVICE_PORT=7002

# Database
DATABASE_URL=${DATABASE_URL}

# NATS
NATS_URL=${NATS_URL}

# LLM Proxy (якщо є)
LLM_PROXY_URL=http://llm-proxy:8000

# Quotas
AGENT_TOKENS_PER_MINUTE=10000
AGENT_RUNS_PER_DAY=100
AGENT_CONCURRENT_RUNS=5

# Execution
AGENT_TIMEOUT_SECONDS=30
AGENT_MAX_TOKENS=2000
```

---

## 🏙️ env/city.env

```env
# City Service Configuration
CITY_SERVICE_PORT=7001

# Database
DATABASE_URL=${DATABASE_URL}

# Redis (Presence)
REDIS_URL=${REDIS_URL}

# Default Rooms
CITY_DEFAULT_ROOMS=general,welcome,builders,science,energy

# Presence
PRESENCE_TTL=40
PRESENCE_CLEANUP_INTERVAL=60
```

---

## 🧬 env/secondme.env

```env
# Second Me Service Configuration
SECONDME_SERVICE_PORT=7003

# Database
DATABASE_URL=${DATABASE_URL}

# Agents Core Integration
AGENTS_SERVICE_URL=${AGENTS_SERVICE_URL}
SECONDME_AGENT_ID=ag_secondme_global

# Context
SECONDME_CONTEXT_MESSAGES=10
SECONDME_MAX_PROMPT_LENGTH=5000
```

---

## 📊 env/monitoring.env

```env
# Prometheus
PROMETHEUS_PORT=9090
PROMETHEUS_RETENTION=15d
PROMETHEUS_SCRAPE_INTERVAL=15s

# Grafana
GF_SERVER_ROOT_URL=https://app.daarion.space/grafana/
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
GF_AUTH_ANONYMOUS_ENABLED=false
GF_USERS_ALLOW_SIGN_UP=false

# Alerting (Optional)
GF_SMTP_ENABLED=false
```

---

## 🔒 Security Best Practices

### 1. Permissions
```bash
# Встановити правильні permissions
chmod 600 /opt/daarion/.env
chmod 600 /opt/daarion/env/*.env
chown root:docker /opt/daarion/.env
```

### 2. Git Ignore
```gitignore
# В .gitignore додати:
.env
env/*.env
!env/*.env.example
```

### 3. Backup Secrets
```bash
# Зберегти секрети в безпечному місці
# Наприклад, в 1Password, Vault, або encrypted file

# Backup command:
tar -czf daarion-secrets-$(date +%Y%m%d).tar.gz env/ .env
gpg --symmetric --cipher-algo AES256 daarion-secrets-*.tar.gz
rm daarion-secrets-*.tar.gz
# Зберегти .gpg файл у безпечному місці
```

---

## 🔄 Rotation Policy

### Регулярно змінювати:
- **JWT_SECRET**: кожні 90 днів
- **Database passwords**: кожні 90 днів
- **Redis password**: кожні 90 днів
- **Grafana admin password**: кожні 30 днів

### Процедура rotation:
1. Згенерувати новий секрет
2. Оновити `.env` файл
3. Перезапустити affected services:
   ```bash
   docker compose -f docker-compose.all.yml restart auth-service
   ```
4. Перевірити що все працює
5. Видалити старий секрет з backup

---

## 📋 Deployment Checklist

- [ ] Всі `CHANGE_ME_*` замінені на реальні секрети
- [ ] Секрети згенеровані через `openssl rand`
- [ ] `.env` файл має permissions 600
- [ ] `.env` додано в `.gitignore`
- [ ] Backup секретів створено та збережено в безпечному місці
- [ ] `APP_BASE_URL` вказує на правильний домен
- [ ] Database credentials унікальні та сильні
- [ ] JWT_SECRET має мінімум 64 символи
- [ ] Grafana admin password змінений з дефолтного

---

## 🧪 Testing ENV Config

```bash
# Перевірка що всі змінні завантажуються
docker compose -f docker-compose.all.yml config

# Перевірка конкретного сервісу
docker compose -f docker-compose.all.yml run --rm auth-service env | grep JWT

# Debug mode (тільки на dev!)
docker compose -f docker-compose.all.yml up auth-service
# Шукати в логах завантаження ENV
```

---

## 🚨 Troubleshooting

### Проблема: Service не бачить ENV змінні
**Рішення:**
```yaml
# В docker-compose.all.yml додати:
services:
  auth-service:
    env_file:
      - .env
      - env/app.env
    environment:
      - APP_ENV=${APP_ENV}
```

### Проблема: Секрет не працює
**Діагностика:**
```bash
# Перевірити що немає зайвих пробілів
cat .env | grep JWT_SECRET | od -c

# Перевірити що файл має Unix line endings
file .env
```

---

## 📚 Наступні кроки

1. ➡️ **Database Migrations** (`docs/DEPLOY_MIGRATIONS.md`)
2. ➡️ **Services Startup** (`docs/DEPLOY_SERVICES.md`)
3. ➡️ **Smoke Tests** (`docs/DEPLOY_SMOKETEST_CHECKLIST.md`)

---

**Статус:** ✅ ENV Configuration Guide Complete  
**Версія:** 1.0.0  
**Дата:** 24 листопада 2025

