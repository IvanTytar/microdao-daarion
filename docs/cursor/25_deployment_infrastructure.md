# 25 — Deployment & Infrastructure (MicroDAO)

*Deployment процес, середовища, інфраструктура, CI/CD, моніторинг*

---

## 1. Purpose & Scope

Цей документ описує інфраструктуру розгортання та процеси деплою для:

- microdao (messenger + agents + governance + wallet);
- DAARION.city core (Second Me, Gift Fabric, Citizenship);
- інтеграційних модулів (Embassy, RWA, Energy Union, GREENFOOD та ін.);
- Event-driven шару (NATS/JetStream / Outbox).

Ціль:

- чітко визначити середовища (local/dev/staging/prod);
- описати основні компоненти інфра-стеку;
- стандартизувати CI/CD pipeline та керування міграціями;
- визначити моніторинг, логування, backup/restore.

---

## 2. Environments

### 2.1 Local

Призначення:

- швидка розробка;
- інтеграційні тести окремого розробника.

Особливості:

- Postgres (може бути Supabase local або Docker);
- NATS/JetStream локально (Docker);
- фронтенд (Next.js / React) — `localhost:3000`;
- backend/edge functions — `localhost:PORT`;
- спрощена конфігурація OAuth/Email.

### 2.2 Dev

Призначення:

- інтеграція гілок;
- тестування нових фіч командою.

Особливості:

- часто автодеплой з `develop` / `dev` гілки;
- нестабільне середовище, допускається breaking changes;
- окремі ресурси БД, NATS, storage.

### 2.3 Staging

Призначення:

- передпродакшн середовище, максимально наближене до прод;
- тестування релізів перед викоткою на prod;
- smoke-тести, регресія, перевірка міграцій.

Особливості:

- конфігурації максимально збігаються з prod;
- ті ж версії Postgres/NATS/Redis;
- мінімум тестових даних, максимально наближені сценарії.

### 2.4 Prod

Призначення:

- бойове середовище для реальних користувачів та агентів;
- висока доступність, резервування, SLA.

Особливості:

- реплікація БД;
- резервні копії (snapshots + PITR);
- горизонтальне масштабування критичних сервісів;
- жорсткі політики безпеки, rate limiting, WAF.

---

## 3. Core Infrastructure Components

### 3.1 Database Layer

- **Postgres** (Supabase / керований Postgres):
  - основні таблиці: `users`, `teams`, `channels`, `messages`, `projects`, `tasks`, `agents`, `wallets`, `staking_ringk`, `payouts`, `rwa_inventory`, `embassy_*`, `access_keys`, `capabilities`, `bundles`, `audit_log`, `outbox_events`.
  - схема й міграції описані в `27_database_schema_migrations.md`.

Рекомендації:

- один кластер на середовище (dev/staging/prod);
- не змішувати dev/staging/prod в одному кластері;
- використовувати read-replicas для prod (аналітика, довгі запити).

### 3.2 Event Bus

- **NATS JetStream** (або інший стейтовий event bus):
  - теми (topics) з `Data Model & Event Catalog`;
  - консьюмери: Wallet service, Gift Fabric, Embassies, Telemetry.

Роль:

- децентралізований шар подій;
- відв'язка інтерфейсу, агентів і бекенду;
- реалізація Outbox pattern (`outbox_events` → NATS).

### 3.3 Application Layer

- **API Gateway / Edge Functions**:
  - REST/gRPC/API для frontend, агентів, інтеграцій;
  - PEP (Policy Enforcement Point) для capability-check;
  - валідація access keys, підписів Embassy, rate limiting.

- **Domain Services** (можуть бути edge functions / окремі сервіси):
  - Messaging Service (channels/messages/followups);
  - Projects/Tasks Service;
  - Agent Orchestrator (agent_runs, router);
  - Wallet & Payouts;
  - Embassy Service;
  - Governance Service.

### 3.4 Frontend

- SPA/SSR (React/Next.js):
  - DAARION.city UI;
  - microdao messenger + agents;
  - admin-консоль (telemetry, управління платформи).

Рекомендації:

- окремі build'и для user-facing (місто) і admin/ops;
- environment-specific base URLs.

### 3.5 Object Storage

- зберігання файлів/документів/зображень:
  - user uploads (файли в каналах, документи);
  - логи агентів (якщо великі);
  - snapshot-и моделей/конфігів (якщо потрібно).

---

## 4. High-level Topology

Текстовий опис (спрощено):

- Frontend (Web) → API Gateway
- API Gateway → Postgres / NATS / Services
- Agent Mesh ↔ API Gateway ↔ NATS
- Embassy Webhooks ↔ API Gateway ↔ NATS ↔ Services
- Observability Stack (Prometheus/Grafana/Logs) → читає метрики з усіх компонентів

(Опційно можна додати Mermaid-діаграму у цьому файлі.)

---

## 5. Deployment Workflows

### 5.1 Local

- `docker-compose` / Supabase local:
  - `postgres`, `nats`, `minio` (опційно), `api`, `web`.
- Команди:
  - `npm run dev` (web);
  - `supabase db push` / `pnpm prisma migrate` / `golang-migrate up` (залежно від стеку);
  - запуск background workers для Outbox → NATS.

### 5.2 Dev

Trigger:

- push в `develop` / `dev` гілку.

Кроки:

1. CI: `lint`, `tests`, `typecheck`.
2. Build:
   - web (static/SSR bundle);
   - backend/edge functions (docker image або окремі функції).
3. Deploy:
   - apply DB migrations;
   - деплой API/edge;
   - деплой web (dev URL).
4. Smoke-тести:
   - healthcheck endpoints;
   - простий сценарій (login → створити канал → відправити повідомлення).

### 5.3 Staging

Trigger:

- merge/push у `main` з тегом `rc-*` або окрема `release/*` гілка.

Кроки:

1. CI повторює dev-пайплайн.
2. DB migrations:
   - запуск у режимі dry-run (якщо підтримується);
   - застосування на staging.
3. Deploy API, workers, web (staging domain).
4. Інтеграційні тести:
   - агенти, Embassy вебхуки, payouts, RWA, governance flows.

### 5.4 Prod

Trigger:

- тег `vX.Y.Z` або manual approval релізу.

Кроки:

1. Freeze staging (ті самі артефакти).
2. Backup prod DB (snapshot).
3. Apply migrations на prod.
4. Deploy API/edge з поетапним rollout (canary / по одному інстансу).
5. Deploy web (атомарна заміна, rollback через попередній build).
6. Post-deploy чек-лист:
   - логін/чат;
   - ворк агента;
   - простий payout симуляційний (якщо є test mode);
   - кілька Embassy викликів у test-конфігурації.

---

## 6. Configuration & Environment Variables

Приклад розділів `.env` (загальні ключі):

### 6.1 Database

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSLMODE` (prod: `require`)

### 6.2 NATS / Event Bus

- `NATS_URL`
- `NATS_USER`
- `NATS_PASSWORD`
- `NATS_STREAM_EVENTS` (ім'я стріму для event catalog)
- `NATS_CONSUMER_WALLET`
- `NATS_CONSUMER_EMBASSY`
- `NATS_CONSUMER_GIFT_FABRIC`

### 6.3 Auth / Security

- `JWT_SECRET` (для capability-token, якщо локально)
- `SESSION_SECRET`
- `E2EE_PUBLIC_KEY` / `E2EE_PRIVATE_KEY` (або інший механізм)
- `RATE_LIMIT_GLOBAL`
- `RATE_LIMIT_PER_KEY`

### 6.4 Embassy

- `EMBASSY_WEBHOOK_SECRET_ENERGY_UNION`
- `EMBASSY_WEBHOOK_SECRET_GREENFOOD`
- `EMBASSY_WEBHOOK_SECRET_WATER_UNION`
- `EMBASSY_WEBHOOK_SECRET_ESSENCE_STREAM`

### 6.5 Wallet / Chain

- `CHAIN_RPC_URL`
- `CHAIN_EXPLORER_URL`
- `WALLET_SAFE_ADDRESS` (якщо multi-sig)
- `WALLET_PRIVATE_KEY` (краще в KMS, не у .env)

---

## 7. Secrets Management

- Prod/staging secrets **не зберігати** у `.env` у репозиторії.
- Використовувати:
  - KMS (GCP/AWS/Azure) або
  - менеджер секретів (Vault, Doppler, SSM Parameter Store тощо).
- Workers/API при старті:
  - тягнуть секрети з KMS/secret manager;
  - кешують лише в пам'яті (не логувати).

Особливо чутливі:

- ключі Embassy Webhooks;
- wallet private keys / hot signer;
- JWT/Session secrets.

---

## 8. Database Migrations

Посилання: `27_database_schema_migrations.md`.

Правила:

1. Міграції **ніколи** не змінюють/ламають дані під час prod розгортання без попередніх data-migrations.
2. `up`/`down` повинні бути ідемпотентними (DROP IF EXISTS / CREATE IF NOT EXISTS).
3. Порядок виконання:
   - local: розробник запускає всі `000XXX_*.sql` + `seeds.sql`;
   - dev/staging/prod: CI/CD застосовує міграції у правильному порядку.

---

## 9. Event Bus & Outbox Pattern

- Event producer-и (API/Services) не відправляють події напряму в NATS у критичних шляхах — спочатку пишуть у `outbox_events`.
- Background worker:
  - читає `outbox_events` з `processed=false`;
  - публікує у NATS відповідний topic;
  - позначає `processed=true`, `processed_at=NOW()`.

Це зменшує ймовірність втрати подій при часткових збоях.

---

## 10. Monitoring & Logging

### 10.1 Метрики

- **API/Backend**:
  - latency per endpoint;
  - error rate (5xx, 4xx);
  - rate limiting triggers.

- **DB**:
  - connections;
  - slow queries;
  - реплікація (lag).

- **NATS/Event Bus**:
  - backlog per consumer;
  - delivery errors;
  - redeliveries.

- **Agents**:
  - кількість запусків;
  - середня тривалість run;
  - помилки агента (LLM/tool errors).

### 10.2 Логи

- централізований збір (ELK / Loki / Cloud Logging);
- кореляційні ID:
  - `X-Request-ID` на кожен HTTP-запит;
  - propagation у NATS payload (trace_id / correlation_id).

---

## 11. Backups & Restore

### 11.1 Backups

- Prod:
  - щоденні повні snapshots;
  - WAL / PITR (Point-In-Time Recovery) на 7–30 днів;
- Staging:
  - щоденні або раз на 2–3 дні (за потреби).

### 11.2 Restore Policy

- тестовий restore на окремий тимчасовий кластер мінімум раз на місяць;
- документований сценарій:
  - відновлення в новий кластер;
  - redirect трафіку (якщо потрібно).

---

## 12. Rollout Strategies

### 12.1 API/Backend

- **Canary**:
  - невеликий відсоток трафіку на новий реліз;
  - моніторинг помилок/латентності;
  - поступове збільшення.

- **Blue-Green**:
  - parallel stack (blue/green);
  - перемикання через load balancer/DNS.

### 12.2 Frontend

- атомарний switch build'ів (immutable artifacts);
- rollback = переключення на попередній build.

### 12.3 Feature Flags

- складні зміни (особливо агенти, Gift Fabric, RWA) — за feature flags:
  - flags зберігаються в БД або у спеціальному конфіг-сервісі;
  - викочуються спочатку на dev/staging, потім для частини користувачів у prod.

---

## 13. CI/CD Pipeline (Reference)

Псевдо-YAML для орієнтира:

```yaml
name: deploy

on:
  push:
    branches: [develop, main]
    tags: ['v*']

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build:web
      - run: npm run build:api

  migrate-and-deploy:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run DB migrations
        run: |
          ./scripts/migrate.sh up
      - name: Deploy API
        run: |
          ./scripts/deploy_api.sh
      - name: Deploy Web
        run: |
          ./scripts/deploy_web.sh
```

---

## 14. Завдання для Cursor

```text
You are a senior DevOps engineer. Set up deployment infrastructure using:
- 25_deployment_infrastructure.md
- 27_database_schema_migrations.md
- 05_coding_standards.md

Tasks:
1) Create docker-compose.yml for local development (postgres, nats, minio).
2) Create CI/CD pipeline configuration (GitHub Actions / GitLab CI).
3) Create deployment scripts (migrate.sh, deploy_api.sh, deploy_web.sh).
4) Set up environment variable templates (.env.example).
5) Create monitoring dashboard configuration (Grafana / Prometheus).

Output:
- list of modified files
- diff
- summary
```

---

## 15. Результат

Після впровадження цієї інфраструктури:

- чітко визначені середовища та процеси деплою;
- стандартизований CI/CD pipeline;
- готовність до масштабування та production deployment;
- моніторинг та логування для всіх компонентів;
- надійні backup/restore процеси.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


