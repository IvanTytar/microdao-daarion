# 🚀 MVP Deployment на НОДА1 — Комплексний Аналіз

**Версія:** 1.0.0  
**Дата:** 25 листопада 2025  
**Статус:** Ready for Execution  
**НОДА1 IP:** 144.76.224.179  
**Domain:** gateway.daarion.city

---

## 📊 Executive Summary

Після аналізу інфраструктури маємо:

### ✅ Що готово:
1. **Phase 1-3 код готовий** (Frontend MVP, Agents Core, City MVP, Second Me)
2. **Міграції БД готові** (001-010)
3. **Docker Compose готовий** (`docker-compose.all.yml`)
4. **Сервіси зібрані** (agents, city, secondme, microdao)
5. **Nginx/SSL працює** на НОДА1 (`gateway.daarion.city`)

### ⚠️ Потенційні ризики:
1. **Мультимодальна система в процесі** (Router v1.1.0, Telegram Enhanced)
2. **Щоденні зміни** на обох нодах
3. **Невідомий стан production БД** на НОДА1
4. **Можливі конфлікти портів** (хоча перевірка показує що немає)

### 🎯 Рекомендована стратегія:
**Staged Deployment** з isolation + rollback plan

---

## 🗺️ Інфраструктурна Картина

### НОДА1 (Production)
```
144.76.224.179 (Hetzner GEX44)
├── DAGI Stack (17+ сервісів) ✅ ПРАЦЮЄ
│   ├── Router (9102) — в процесі оновлення до v1.1.0 multimodal
│   ├── Gateway (9300) — Telegram Gateway Enhanced
│   ├── DevTools (8008)
│   ├── Swapper (8890-8891)
│   ├── Frontend (8899) — існуючий
│   ├── PostgreSQL (5432) ⚠️ PRODUCTION DB
│   ├── Redis (6379)
│   ├── Neo4j (7687, 7474)
│   ├── Qdrant (6333, 6334)
│   ├── Grafana (3000)
│   └── Prometheus (9090)
│
├── Nginx (80, 443) ✅ SSL Let's Encrypt
│   └── gateway.daarion.city → працює
│
└── /opt/microdao-daarion (project root)
```

### НОДА2 (Development)
```
192.168.1.244 (MacBook Pro M4 Max)
├── Розробка Phase 1-3 ✅
├── Мультимодальні сервіси (STT, OCR, Web Search, Vector DB)
└── /Users/apple/github-projects/microdao-daarion
```

### Phase 1-3 MVP (треба додати до НОДА1)
```
Нові сервіси:
├── agents-service (7002) — Phase 2
├── city-service (7001) — Phase 3
├── secondme-service (7003) — Phase 3
└── microdao-service (7004) — Phase 7

Нові API endpoints:
├── /api/agents/* → 7002
├── /api/city/* → 7001
├── /api/secondme/* → 7003
└── /api/microdao/* → 7004

WebSocket:
└── /ws/city/* → 7001
```

---

## 🔍 Аналіз Конфліктів

### ✅ Порти (Немає конфліктів!)
| Існуючі (НОДА1) | Нові (MVP) | Статус |
|-----------------|------------|--------|
| 9102 (Router) | 7002 (Agents) | ✅ OK |
| 9300 (Gateway) | 7001 (City) | ✅ OK |
| 8008 (DevTools) | 7003 (Second Me) | ✅ OK |
| 8890 (Swapper) | 7004 (MicroDAO) | ✅ OK |
| 8899 (Frontend) | - | ⚠️ Може потребувати оновлення |

### ⚠️ База Даних (Критично!)
**Ситуація:**
- НОДА1 має **production PostgreSQL** (`daarion_memory`)
- MVP потребує **нові таблиці** (міграції 007-010)
- Невідомо чи існуючі таблиці не конфліктують

**Рішення:**
1. **Backup перед міграцією** (обов'язково!)
2. **Перевірити існуючі таблиці** перед застосуванням міграцій
3. **Rollback план** готовий

### ⚠️ Nginx Config (Потребує оновлення)
**Існуючий config:**
```
/etc/nginx/sites-available/daarion
├── /telegram/webhook → 9300
└── /helion/telegram/webhook → 9300
```

**Треба додати:**
```nginx
location /api/agents/ { proxy_pass http://127.0.0.1:7002/; }
location /api/city/ { proxy_pass http://127.0.0.1:7001/; }
location /api/secondme/ { proxy_pass http://127.0.0.1:7003/; }
location /api/microdao/ { proxy_pass http://127.0.0.1:7004/; }
location /ws/city/ { 
    proxy_pass http://127.0.0.1:7001/ws/city/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 🎯 Deployment Strategy: STAGED ROLLOUT

### Фаза 0: PRE-FLIGHT (На НОДА2)
**Мета:** Підготовка коду
```bash
cd /Users/apple/github-projects/microdao-daarion

# 1. Commit всі зміни
git add .
git commit -m "Phase 1-3: Ready for NODE1 deployment"
git push origin main

# 2. Перевірити що всі файли на місці
ls -la services/{agents,city,secondme,microdao}-service/
ls -la migrations/00{7,8,9,10}_*.sql
```

**Checklist:**
- [ ] Git push виконано
- [ ] Всі сервіси мають Dockerfile
- [ ] Міграції 007-010 існують
- [ ] docker-compose.all.yml оновлено (якщо потрібно)

---

### Фаза 1: BACKUP & ANALYSIS (На НОДА1)
**Мета:** Захистити production і зібрати інформацію

```bash
# SSH на НОДА1
ssh root@144.76.224.179
cd /opt/microdao-daarion

# 1. Backup PostgreSQL (КРИТИЧНО!)
docker exec daarion-postgres pg_dump -U postgres daarion_memory > \
  /root/backups/daarion_memory_$(date +%Y%m%d_%H%M%S).sql

# 2. Перевірити існуючі таблиці
docker exec daarion-postgres psql -U postgres -d daarion_memory -c "\dt"

# 3. Перевірити існуючі сервіси
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 4. Перевірити порти
sudo netstat -tulpn | grep LISTEN | grep -E "700[1-4]|9102|9300"

# 5. Перевірити Nginx config
cat /etc/nginx/sites-available/daarion
```

**Checklist:**
- [ ] Backup БД створено (перевірити розмір файлу!)
- [ ] Список таблиць збережено
- [ ] Порти 7001-7004 вільні
- [ ] Nginx config збережено

---

### Фаза 2: CODE SYNC (На НОДА1)
**Мета:** Синхронізувати код з GitHub

```bash
cd /opt/microdao-daarion

# 1. Перевірити поточний стан
git status
git log --oneline -5

# 2. Pull нових змін
git fetch origin
git pull origin main

# 3. Перевірити що файли прибули
ls -la services/{agents,city,secondme,microdao}-service/Dockerfile
ls -la migrations/007_*.sql migrations/008_*.sql migrations/009_*.sql migrations/010_*.sql
```

**Checklist:**
- [ ] Git pull успішний
- [ ] Нові сервіси присутні
- [ ] Міграції 007-010 на місці

---

### Фаза 3: ENVIRONMENT CONFIG (На НОДА1)
**Мета:** Налаштувати змінні оточення

```bash
cd /opt/microdao-daarion

# 1. Backup існуючого .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 2. Додати нові змінні
cat >> .env << 'EOF'

# ============================================================================
# PHASE 1-3 MVP SERVICES
# ============================================================================

# Service URLs
AGENTS_SERVICE_URL=http://agents-service:7002
CITY_SERVICE_URL=http://city-service:7001
SECONDME_SERVICE_URL=http://secondme-service:7003
MICRODAO_SERVICE_URL=http://microdao-service:7004

# City Configuration
CITY_DEFAULT_ROOMS=general,welcome,builders,science,energy
SECONDME_AGENT_ID=ag_secondme_global

# WebSocket
WS_BASE_URL=wss://gateway.daarion.city/ws

# Frontend (якщо потрібно оновити)
VITE_API_BASE_URL=https://gateway.daarion.city/api
VITE_WS_BASE_URL=wss://gateway.daarion.city/ws

EOF

# 3. Перевірити
tail -20 .env
```

**Checklist:**
- [ ] .env backup створено
- [ ] Нові змінні додано
- [ ] Синтаксис правильний

---

### Фаза 4: DATABASE MIGRATIONS (На НОДА1)
**Мета:** Застосувати міграції 007-010

⚠️ **КРИТИЧНА ФАЗА — МОЖЛИВІСТЬ ROLLBACK**

```bash
cd /opt/microdao-daarion

# Перевірити які міграції вже застосовані (якщо є tracking)
# або вручну перевірити чи існують таблиці

# Застосувати міграції (ПО ОДНІЙ!)
echo "Applying 007_create_agents_tables.sql..."
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  migrations/007_create_agents_tables.sql

echo "Applying 008_create_microdao_core.sql..."
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  migrations/008_create_microdao_core.sql

echo "Applying 009_create_dao_core.sql..."
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  migrations/009_create_dao_core.sql

echo "Applying 010_create_city_backend.sql..."
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  migrations/010_create_city_backend.sql

# Перевірити що таблиці створені
docker exec daarion-postgres psql -U postgres -d daarion_memory -c "\dt" | \
  grep -E "agents|city|secondme|microdao"
```

**Якщо помилка:**
```bash
# ROLLBACK: Відновити з backup
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  /root/backups/daarion_memory_YYYYMMDD_HHMMSS.sql
```

**Checklist:**
- [ ] Міграція 007 успішна
- [ ] Міграція 008 успішна
- [ ] Міграція 009 успішна
- [ ] Міграція 010 успішна
- [ ] Нові таблиці підтверджені

---

### Фаза 5: DOCKER BUILD (На НОДА1)
**Мета:** Зібрати нові сервіси

```bash
cd /opt/microdao-daarion

# Build нових сервісів (один за одним для діагностики)
docker compose -f docker-compose.all.yml build agents-service
docker compose -f docker-compose.all.yml build city-service
docker compose -f docker-compose.all.yml build secondme-service
docker compose -f docker-compose.all.yml build microdao-service

# Перевірити що образи створені
docker images | grep -E "agents-service|city-service|secondme|microdao"
```

**Checklist:**
- [ ] agents-service образ створено
- [ ] city-service образ створено
- [ ] secondme-service образ створено
- [ ] microdao-service образ створено

---

### Фаза 6: SERVICE STARTUP (На НОДА1)
**Мета:** Запустити нові сервіси (БЕЗ перезапуску існуючих!)

```bash
cd /opt/microdao-daarion

# Запустити ТІЛЬКИ нові сервіси
docker compose -f docker-compose.all.yml up -d agents-service city-service secondme-service microdao-service

# Моніторити старт (перші 30 секунд критичні)
docker compose -f docker-compose.all.yml logs -f agents-service city-service secondme-service microdao-service

# В окремому терміналі перевірити health
watch -n 2 "docker ps | grep -E 'agents-service|city-service|secondme|microdao'"
```

**Що моніторити:**
- [ ] Контейнери запустилися (не в Restarting стані)
- [ ] Логи не містять критичних помилок
- [ ] БД з'єднання успішні
- [ ] Health endpoints відповідають

---

### Фаза 7: NGINX UPDATE (На НОДА1)
**Мета:** Додати нові endpoints до Nginx

```bash
# Backup існуючого config
sudo cp /etc/nginx/sites-available/daarion \
  /etc/nginx/sites-available/daarion.backup.$(date +%Y%m%d_%H%M%S)

# Додати нові location blocks (ПЕРЕД останньою фігурною дужкою сервера)
sudo vim /etc/nginx/sites-available/daarion
```

**Додати цей блок:**
```nginx
    # ========================================================================
    # PHASE 1-3 MVP API ENDPOINTS
    # ========================================================================

    location /api/agents/ {
        proxy_pass http://127.0.0.1:7002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }

    location /api/city/ {
        proxy_pass http://127.0.0.1:7001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }

    location /api/secondme/ {
        proxy_pass http://127.0.0.1:7003/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }

    location /api/microdao/ {
        proxy_pass http://127.0.0.1:7004/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }

    # WebSocket для City
    location /ws/city/ {
        proxy_pass http://127.0.0.1:7001/ws/city/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
```

```bash
# Перевірити синтаксис
sudo nginx -t

# Якщо OK — reload
sudo systemctl reload nginx

# Перевірити статус
sudo systemctl status nginx
```

**Checklist:**
- [ ] Backup Nginx config створено
- [ ] Нові location blocks додано
- [ ] `nginx -t` успішний
- [ ] `systemctl reload nginx` успішний

---

### Фаза 8: SMOKE TESTS (На НОДА1)
**Мета:** Перевірити що все працює

```bash
# 1. Health checks (локально)
curl http://localhost:7001/health  # City
curl http://localhost:7002/health  # Agents
curl http://localhost:7003/health  # Second Me
curl http://localhost:7004/health  # MicroDAO

# 2. Health checks (через Nginx/SSL)
curl https://gateway.daarion.city/api/city/health
curl https://gateway.daarion.city/api/agents/health
curl https://gateway.daarion.city/api/secondme/health
curl https://gateway.daarion.city/api/microdao/health

# 3. City Rooms API
curl https://gateway.daarion.city/api/city/rooms | jq

# 4. WebSocket (через wscat або websocat)
websocat wss://gateway.daarion.city/ws/city/rooms/general
```

**Expected Results:**
- [ ] Всі health endpoints → 200 OK
- [ ] City Rooms API → 5 default rooms
- [ ] WebSocket → connection established

---

### Фаза 9: MONITORING (На НОДА1)
**Мета:** Переконатися що система стабільна

```bash
# 1. Перевірити логи (перші 5 хвилин)
docker compose -f docker-compose.all.yml logs --tail=100 -f agents-service city-service

# 2. Перевірити ресурси
docker stats --no-stream

# 3. Перевірити Prometheus metrics (якщо доступний)
curl http://localhost:9090/api/v1/query?query=up | jq

# 4. Grafana (якщо налаштований)
# Відкрити http://localhost:3000 і перевірити дашборди
```

**Checklist:**
- [ ] Немає error логів (перші 5 хвилин)
- [ ] CPU/RAM в нормі
- [ ] Prometheus бачить нові таргети
- [ ] Grafana показує метрики

---

## 🚨 Rollback Plan

### Якщо Фаза 6 (Service Startup) failed:

```bash
# 1. Зупинити нові сервіси
docker compose -f docker-compose.all.yml stop agents-service city-service secondme-service microdao-service

# 2. Видалити контейнери
docker compose -f docker-compose.all.yml rm -f agents-service city-service secondme-service microdao-service

# 3. Відкатити БД
docker exec -i daarion-postgres psql -U postgres -d daarion_memory < \
  /root/backups/daarion_memory_YYYYMMDD_HHMMSS.sql

# 4. Система повернулась до початкового стану
```

### Якщо Фаза 7 (Nginx Update) failed:

```bash
# Відновити Nginx config
sudo cp /etc/nginx/sites-available/daarion.backup.YYYYMMDD_HHMMSS \
  /etc/nginx/sites-available/daarion

# Reload
sudo systemctl reload nginx
```

---

## 📋 Final Checklist

### Pre-Deployment:
- [ ] Git push з НОДА2 виконано
- [ ] Backup БД на НОДА1 створено (і перевірено!)
- [ ] .env файл оновлено
- [ ] Nginx backup створено

### Deployment:
- [ ] Git pull на НОДА1 успішний
- [ ] Міграції 007-010 застосовані
- [ ] Нові сервіси зібрані
- [ ] Нові сервіси запущені
- [ ] Nginx config оновлено
- [ ] Nginx reload успішний

### Post-Deployment:
- [ ] Health checks: 4/4 ✅
- [ ] City Rooms API працює
- [ ] WebSocket підключення працює
- [ ] Логи без критичних помилок
- [ ] Існуючі DAGI сервіси працюють стабільно
- [ ] Monitoring налаштовано

---

## 🎯 Success Criteria

**MVP вважається успішно задеплоєним якщо:**

1. ✅ Всі 4 нові сервіси запущені і healthy
2. ✅ API endpoints доступні через `https://gateway.daarion.city/api/*`
3. ✅ WebSocket працює через `wss://gateway.daarion.city/ws/city/*`
4. ✅ City Rooms API повертає 5 default rooms
5. ✅ Існуючі DAGI сервіси НЕ постраждали
6. ✅ Prometheus/Grafana бачать нові сервіси
7. ✅ Немає критичних помилок в логах (перші 30 хвилин)

---

## 🔮 Next Steps (Після успішного deployment)

1. **Frontend Integration** — Оновити Frontend (port 8899) для роботи з новими API
2. **Multimodal Integration** — Коли документи готові, інтегрувати STT/OCR/Web Search
3. **Load Testing** — Перевірити навантаження на нові сервіси
4. **Documentation Update** — Оновити INFRASTRUCTURE.md з новими сервісами
5. **Monitoring Dashboards** — Створити Grafana дашборди для Phase 1-3

---

## 📞 Emergency Contacts

**Якщо щось йде не так:**
- Backup БД: `/root/backups/daarion_memory_*.sql`
- Rollback command: `docker compose -f docker-compose.all.yml stop ...`
- Nginx restore: `sudo cp /etc/nginx/sites-available/daarion.backup.* ...`

---

**Документ створено:** Cursor AI Assistant  
**Для проєкту:** MicroDAO DAARION  
**Останнє оновлення:** 2025-11-25

