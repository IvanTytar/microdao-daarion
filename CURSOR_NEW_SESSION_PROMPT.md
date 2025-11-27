# 🚀 Cursor New Session Prompt — DAARION Deployment Context

**Скопіюй це повідомлення в нове діалогове вікно Cursor:**

---

## Контекст Проєкту

Я працюю над **MicroDAO DAARION** — платформою для мікро-спільнот з AI агентами.

**Репозиторій:** `/Users/apple/github-projects/microdao-daarion`  
**GitHub:** `git@github.com:IvanTytar/microdao-daarion.git`

---

## 🖥️ Інфраструктура (2 ноди)

### НОДА1 (Production)
- **IP:** 144.76.224.179
- **SSH:** `root@144.76.224.179`
- **Location:** Hetzner GEX44 (Germany)
- **Project Root:** `/opt/microdao-daarion`
- **Domain:** `gateway.daarion.city` (SSL готовий)
- **Що працює:** DAGI Stack (17+ сервісів):
  - Router (9102), Bot Gateway (9300), DevTools (8008)
  - Swapper (8890), Frontend (8899)
  - PostgreSQL (5432), Redis (6379), Neo4j (7687/7474)
  - Qdrant (6333), Grafana (3000), Prometheus (9090)
  - Nginx з Let's Encrypt SSL

### НОДА2 (Development)
- **MacBook Pro M4 Max** (16 cores, 64GB RAM, 40-core GPU)
- **Local IP:** 192.168.1.244 (updated 2025-11-23)
- **Project Root:** `/Users/apple/github-projects/microdao-daarion`
- **Role:** Development + Testing

---

## 📚 Обов'язковий Контекст (прочитай перед відповіддю!)

**Центральні документи:**
1. **`INFRASTRUCTURE.md`** — повна інфраструктура проєкту (1025 lines)
2. **`docs/infrastructure_quick_ref.ipynb`** — швидкий довідник
3. **`docs/DEPLOY_NODE1_MVP_PHASES.md`** — план deployment Phase 1-3 на НОДА1

**MVP Deploy документація (вже створена):**
- `DEPLOY_ON_SERVER.md` — головний deployment guide
- `docs/DEPLOY_DNS_SETUP.md` — DNS конфігурація
- `docs/DEPLOY_SSL_SETUP.md` — SSL/HTTPS з Caddy
- `docs/DEPLOY_ENV_CONFIG.md` — Environment змінні
- `docs/DEPLOY_MIGRATIONS.md` — Database migrations
- `docs/DEPLOY_SMOKETEST_CHECKLIST.md` — Smoke tests
- `MVP_DEPLOY_COMPLETE.md` — фінальний звіт

---

## 🎯 Поточна Задача

**Мета:** Задеплоїти Phase 1-3 (Frontend MVP, Agents Core, City MVP) на НОДА1

**Статус:**
- ✅ Phase 1-3 код готовий (розроблено на НОДА2)
- ✅ MVP Deploy документація створена
- ✅ План deployment на НОДА1 створений (`docs/DEPLOY_NODE1_MVP_PHASES.md`)
- ⏳ Треба: Інтегрувати Phase 1-3 в існуючий DAGI Stack на НОДА1

**Нові сервіси для deployment:**
- Agents Service (port 7002)
- City Service (port 7001)
- Second Me Service (port 7003)
- MicroDAO Service (port 7004)

**Конфлікти портів:** ✅ Немає (перевірено)

---

## 🔧 Стратегія Deployment

**Рекомендований підхід:** Інтеграція в існуючий `docker-compose.all.yml`

**Переваги:**
- Використовує існуючу БД (PostgreSQL на НОДА1)
- Використовує існуючий Redis
- Використовує існуючий Nginx/SSL
- Спільний моніторинг (Grafana/Prometheus)

**Що потрібно:**
1. Оновити `docker-compose.all.yml` з новими сервісами
2. Створити deployment script `scripts/deploy-phase1-3-node1.sh`
3. Оновити Nginx config для нових API endpoints
4. Застосувати міграції БД (001-010)
5. Запустити smoke tests

---

## 📊 Phases Status

| Phase | Назва | Статус | Документація |
|-------|-------|--------|--------------|
| Phase 1 | Frontend MVP | ✅ Complete | `PHASE1_FRONTEND_MVP_COMPLETE.md` |
| Phase 2 | Agents Core | ✅ Complete | `PHASE2_AGENTS_CORE_COMPLETE.md` |
| Phase 3 | City MVP (Frontend) | ✅ Complete | `PHASE3_FINISHER_COMPLETE.md` |
| Phase 3 | City Backend | ✅ Complete | `PHASE3_CITY_BACKEND_COMPLETE.md` |
| **MVP Deploy** | **Docs Created** | ✅ **Done** | `MVP_DEPLOY_COMPLETE.md` |
| **DEPLOY NODE1** | **Phase 1-3 → NODE1** | ⏳ **IN PROGRESS** | `docs/DEPLOY_NODE1_MVP_PHASES.md` |

---

## 🗂️ Проєкт Structure (важливі папки)

```
/Users/apple/github-projects/microdao-daarion/
├── docs/
│   ├── INFRASTRUCTURE.md ⭐
│   ├── infrastructure_quick_ref.ipynb ⭐
│   ├── DEPLOY_NODE1_MVP_PHASES.md ⭐
│   ├── DEPLOY_*.md (DNS, SSL, ENV, Migrations, etc.)
│   └── tasks/ (TASK_PHASE_*.md)
├── services/
│   ├── agents-service/ (Phase 2)
│   ├── city-service/ (Phase 3)
│   ├── secondme-service/ (Phase 3)
│   └── microdao-service/ (Phase 7)
├── migrations/ (001-010 SQL files)
├── scripts/
│   ├── deploy-prod.sh
│   ├── stop-prod.sh
│   └── deploy-phase1-3-node1.sh (треба створити)
├── docker-compose.all.yml ⭐
├── DEPLOY_ON_SERVER.md
└── MVP_DEPLOY_COMPLETE.md
```

---

## 🔑 Ключові Технології

**Backend:**
- FastAPI (Python 3.11)
- PostgreSQL 15
- Redis 7
- NATS JetStream

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- TanStack Query (React Query)

**Infrastructure:**
- Docker + Docker Compose
- Nginx (SSL reverse proxy)
- Let's Encrypt (auto-renewal)
- Prometheus + Grafana

**Domains:**
- `gateway.daarion.city` → 144.76.224.179 (НОДА1)
- `daarion.city` → TBD

---

## 💬 Що мені потрібно зараз

**Прошу тебе:**
1. Прочитати `INFRASTRUCTURE.md` (хоча б перші 200 рядків) ⭐
2. Прочитати `docs/DEPLOY_NODE1_MVP_PHASES.md` ⭐
3. Створити **deployment package** для НОДА1:
   - Оновлений `docker-compose.all.yml`
   - Deployment script `scripts/deploy-phase1-3-node1.sh`
   - Nginx config snippet
   - Migration helper (якщо потрібно)

**Або:**
- Дати мені покрокову інструкцію для manual deployment через SSH

---

## 🎨 Стиль Комунікації

- Відповідай **українською мовою** ✅
- Використовуй CODE REFERENCES для існуючого коду (startLine:endLine:filepath)
- Використовуй MARKDOWN CODE BLOCKS для нового коду
- Будь конкретним та практичним
- Якщо створюєш файли — створюй повністю ready-to-use версії

---

## 🚨 Важливо!

**Перед відповіддю обов'язково прочитай:**
1. `INFRASTRUCTURE.md` (весь файл або хоча б 200 перших рядків)
2. `docs/DEPLOY_NODE1_MVP_PHASES.md`

**Не вигадуй структуру проєкту!** Вона вже існує і задокументована.

**Порти на НОДА1 (зайняті):**
- 9102 (Router), 9300 (Gateway), 8008 (DevTools), 8890 (Swapper)
- 5432 (PostgreSQL), 6379 (Redis), 7687/7474 (Neo4j), 6333 (Qdrant)
- 3000 (Grafana), 9090 (Prometheus), 8899 (Frontend)

**Вільні порти для Phase 1-3:**
- 7001 (City Service), 7002 (Agents Service), 7003 (Second Me), 7004 (MicroDAO)

---

## 🎯 Expected Output

**Якщо створюєш deployment package:**
- ✅ Повний `docker-compose.all.yml` з Phase 1-3 сервісами
- ✅ Робочий `scripts/deploy-phase1-3-node1.sh` (bash script)
- ✅ Nginx config snippet для `/etc/nginx/sites-available/daarion`
- ✅ Інструкція по запуску (README або inline)

**Якщо даєш manual інструкцію:**
- ✅ Покрокові SSH команди
- ✅ Exact values (ports, paths, domains)
- ✅ Verification steps
- ✅ Rollback plan

---

## 📞 Quick Reference

**Domains:**
- Production: `https://gateway.daarion.city`
- API Base: `https://gateway.daarion.city/api/`
- WebSocket: `wss://gateway.daarion.city/ws/`

**SSH:**
```bash
ssh root@144.76.224.179
cd /opt/microdao-daarion
```

**Health Checks:**
```bash
# Existing services
curl http://localhost:9102/health  # Router
curl http://localhost:9300/health  # Gateway
curl http://localhost:8890/health  # Swapper

# New services (after deployment)
curl http://localhost:7001/health  # City Service
curl http://localhost:7002/health  # Agents Service
curl http://localhost:7003/health  # Second Me
```

---

## ✅ Ready to Start

Я готовий продовжити роботу над deployment Phase 1-3 на НОДА1.

**Що потрібно зробити далі?**

---

**Дата:** 24 листопада 2025  
**Версія промпту:** 1.0.0  
**Автор:** Ivan Tytar + Cursor AI Assistant


