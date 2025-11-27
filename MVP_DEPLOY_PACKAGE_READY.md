# 🚀 MVP DEPLOYMENT PACKAGE — READY TO DEPLOY!

**Дата:** 25 листопада 2025  
**Статус:** ✅ READY FOR EXECUTION  
**Target:** NODE1 (144.76.224.179)

---

## 📦 Що створено:

### 1. **Deployment Script** ⭐
**`scripts/deploy-mvp-node1.sh`**

Автоматизований deployment з 7 фазами:
- Phase 0: Pre-flight checks (git status, push)
- Phase 1: Backup PostgreSQL
- Phase 2: Sync code from GitHub
- Phase 3: Apply migrations (007, 008, 010)
- Phase 4: Build Docker images
- Phase 5: Start services
- Phase 6: Health checks
- Phase 7: Summary

**Використання:**
```bash
cd /Users/apple/github-projects/microdao-daarion
./scripts/deploy-mvp-node1.sh
```

---

### 2. **Rollback Script** 🔄
**`scripts/rollback-mvp-node1.sh`**

Швидкий rollback якщо щось пішло не так:
- Зупиняє MVP сервіси
- Видаляє контейнери
- Опційно відновлює backup БД

**Використання:**
```bash
./scripts/rollback-mvp-node1.sh
```

---

### 3. **Nginx Configuration** 🌐
**`nginx/mvp-routes.conf`**

Ready-to-use Nginx routes для:
- `/api/city/` → City Service (7001)
- `/ws/city/` → City WebSocket
- `/api/secondme/` → Second Me (7003)
- `/api/agents/` → Agents Service (7014)
- `/ws/agents/` → Agents WebSocket
- `/api/microdao/` → MicroDAO Service (7015)

**Manual installation (на NODE1):**
```bash
# 1. Backup existing config
sudo cp /etc/nginx/sites-available/daarion /etc/nginx/sites-available/daarion.backup.$(date +%Y%m%d_%H%M%S)

# 2. Add routes from nginx/mvp-routes.conf to your Nginx config

# 3. Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. **Service Specifications** 📄
**`docs/services/`**
- `AGENTS_SERVICE_SPEC.md` (7014)
- `CITY_SERVICE_SPEC.md` (7001)
- `SECONDME_SERVICE_SPEC.md` (7003)
- `MICRODAO_SERVICE_SPEC.md` (7015)

---

## 🎯 Фінальні Порти (РЕАЛЬНІ з коду):

| Service | Port | Health Check | Notes |
|---------|------|--------------|-------|
| **City** | 7001 | `/health` | Public Rooms, Presence, WebSocket |
| **Second Me** | 7003 | `/health` | Personal AI assistant |
| **Agents** | 7014 | `/health` | Agent Core, invoke/reply |
| **MicroDAO** | 7015 | `/health` | Governance, proposals, voting |

⚠️ **Note:** Порти відрізняються від початкових специфікацій! Використовуємо реальні порти з коду.

---

## ✅ Pre-Deployment Checklist:

**На NODE2 (MacBook):**
- [ ] Всі зміни committed і pushed до GitHub
- [ ] `scripts/deploy-mvp-node1.sh` має executable права
- [ ] `scripts/rollback-mvp-node1.sh` має executable права

**На NODE1 (перевірити перед deployment):**
- [ ] PostgreSQL працює (port 5432)
- [ ] NATS працює (port 4222)
- [ ] Redis працює (port 6379)
- [ ] Є вільне місце (docker images ~2GB)
- [ ] Nginx працює і доступний

---

## 🚀 DEPLOYMENT PROCEDURE:

### **Варіант A: Automatic (Рекомендовано)**

```bash
# На NODE2 (MacBook)
cd /Users/apple/github-projects/microdao-daarion

# Commit changes (if any)
git add .
git commit -m "MVP Phase 1-3: Ready for deployment"
git push origin main

# Run deployment script
./scripts/deploy-mvp-node1.sh
```

**Тривалість:** ~10-15 хвилин

**Що робить:**
- ✅ Автоматичний backup БД
- ✅ Sync коду з GitHub
- ✅ Міграції БД
- ✅ Build Docker images
- ✅ Start сервісів
- ✅ Health checks

---

### **Варіант B: Manual (Step-by-step)**

Якщо хочеш повний контроль:

#### 1. **На NODE2: Commit & Push**
```bash
git add .
git commit -m "MVP Phase 1-3: Ready for deployment"
git push origin main
```

#### 2. **SSH на NODE1**
```bash
ssh root@144.76.224.179
cd /opt/microdao-daarion
```

#### 3. **Backup БД**
```bash
mkdir -p /root/backups
docker exec daarion-postgres pg_dump -U postgres daarion > \
  /root/backups/daarion_$(date +%Y%m%d_%H%M%S).sql
```

#### 4. **Sync Code**
```bash
git pull origin main
```

#### 5. **Міграції**
```bash
docker exec -i daarion-postgres psql -U postgres -d daarion < migrations/007_create_agents_tables.sql
docker exec -i daarion-postgres psql -U postgres -d daarion < migrations/008_create_microdao_core.sql
docker exec -i daarion-postgres psql -U postgres -d daarion < migrations/010_create_city_backend.sql
```

#### 6. **Build Images**
```bash
docker build -t daarion-agents-service:latest ./services/agents-service
docker build -t daarion-city-service:latest ./services/city-service
docker build -t daarion-secondme-service:latest ./services/secondme-service
docker build -t daarion-microdao-service:latest ./services/microdao-service
```

#### 7. **Start Services**
```bash
# Create docker-compose.mvp.yml (script creates it automatically)
docker compose -f docker-compose.mvp.yml up -d
```

#### 8. **Health Checks**
```bash
curl http://localhost:7001/health  # City
curl http://localhost:7003/health  # Second Me
curl http://localhost:7014/health  # Agents
curl http://localhost:7015/health  # MicroDAO
```

#### 9. **Update Nginx**
```bash
# Add routes from nginx/mvp-routes.conf
sudo vim /etc/nginx/sites-available/daarion
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🧪 SMOKE TESTS:

```bash
# На NODE1 (або локально через SSH tunnel)

# 1. City Service
curl https://gateway.daarion.city/api/city/health
curl https://gateway.daarion.city/api/city/rooms

# 2. Second Me
curl https://gateway.daarion.city/api/secondme/health

# 3. Agents Service
curl https://gateway.daarion.city/api/agents/health
curl https://gateway.daarion.city/api/agents/registry

# 4. MicroDAO Service
curl https://gateway.daarion.city/api/microdao/health
curl https://gateway.daarion.city/api/microdao/

# 5. WebSocket (через wscat або websocat)
wscat -c wss://gateway.daarion.city/ws/city/rooms/general
```

---

## 📊 MONITORING:

### Logs:
```bash
# На NODE1
docker logs -f daarion-city-service
docker logs -f daarion-agents-service
docker logs -f daarion-secondme-service
docker logs -f daarion-microdao-service

# All together
docker compose -f docker-compose.mvp.yml logs -f
```

### Resource Usage:
```bash
docker stats --no-stream | grep daarion
```

### Service Status:
```bash
docker ps | grep -E "agents|city|secondme|microdao"
```

---

## 🚨 ROLLBACK:

Якщо щось пішло не так:

```bash
# Automatic
./scripts/rollback-mvp-node1.sh

# Manual
ssh root@144.76.224.179
cd /opt/microdao-daarion
docker compose -f docker-compose.mvp.yml down
docker rm -f daarion-agents-service daarion-city-service daarion-secondme-service daarion-microdao-service

# Restore DB (if needed)
docker exec -i daarion-postgres psql -U postgres -d daarion < /root/backups/daarion_YYYYMMDD_HHMMSS.sql
```

---

## ⚠️ ВІДОМІ ОБМЕЖЕННЯ:

### 1. **City Service - PostGIS**
Міграція `010_create_city_backend.sql` НЕ містить `regions/areas` таблиць з GEOMETRY.
- Поки що City працює без геопросторових функцій
- Living Map працює з простими JSON координатами
- PostGIS буде додано в Phase 2

### 2. **Second Me - Vector DB**
Код Second Me НЕ інтегрований з Vector DB (port 8898).
- Поки що працює без довгострокової пам'яті
- Тільки short-term memory в PostgreSQL
- Vector DB інтеграція - Phase 2

### 3. **Config Files**
Сервіси очікують config files:
- `configs/AGENT_REGISTRY.yaml`
- `configs/team_definition.yaml`
- `configs/project_bus_config.yaml`

Якщо їх немає — сервіси працюють з defaults.

### 4. **Multimodal**
Multimodal сервіси (STT, OCR, Web Search, Geo-agent) — **Phase 2**.
MVP працює без них.

---

## ✅ SUCCESS CRITERIA:

MVP вважається успішно deployed якщо:

1. ✅ Всі 4 сервіси запущені (`docker ps`)
2. ✅ Health checks повертають 200 OK
3. ✅ City Rooms API повертає список кімнат
4. ✅ Agents API повертає registry
5. ✅ Nginx routes працюють (публічні endpoints)
6. ✅ WebSocket з'єднання встановлюються
7. ✅ Немає критичних помилок в логах (перші 15 хв)
8. ✅ Існуючі DAGI сервіси працюють стабільно

---

## 📞 NEXT STEPS (після deployment):

### Phase 2: Multimodal Integration
- Router v2.0 з multimodal API
- STT/OCR/Web Search/Vector DB на NODE1
- Geo-agent для City Service

### Phase 3: Production Hardening
- Monitoring dashboards (Grafana)
- Alerting (Prometheus)
- Log aggregation (Loki)
- Performance tuning

### Phase 4: Matrix Integration
- Matrix Synapse deployment
- Element Web client
- NATS ↔ Matrix bridge

---

## 🎉 READY TO GO!

**Все готово для deployment!**

**Запуск:**
```bash
cd /Users/apple/github-projects/microdao-daarion
./scripts/deploy-mvp-node1.sh
```

**Нехай щастить! 🚀**

---

**Створено:** Cursor AI Assistant  
**Проєкт:** MicroDAO DAARION  
**Версія:** MVP Phase 1-3  
**Дата:** 2025-11-25

