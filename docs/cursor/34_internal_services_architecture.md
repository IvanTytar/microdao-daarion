# 34 — Internal Services Architecture (MicroDAO)

*Архітектура внутрішніх сервісів, їхні ролі, API, дані, залежності, взаємодія з PDP, Gateway, NATS, DB*

---

## 1. Purpose & Scope

Цей документ описує:

- які внутрішні сервіси існують,
- їхню відповідальність,
- текучку даних,
- API кожного сервісу,
- які таблиці вони контролюють,
- які події вони публікують у NATS,
- залежності між сервісами,
- що можна відокремити у мікросервіси, а що залишити монолітом,
- їх роль у масштабуванні та HA.

Це **карта всіх backend-компонентів DAARION.city**.

---

## 2. High-Level Service Landscape

```
                      ┌──────────────────────────┐
                      │    API Gateway (PEP)     │
                      └───────────────┬──────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                     │
           Public API                            Internal Service Mesh
```

Внутрішні сервіси:

1. **User/Team Service**
2. **Messaging Service**
3. **Projects/Tasks Service**
4. **Agent Orchestrator**
5. **LLM Proxy Service**
6. **Router/Planner Service (DAARWIZZ)**
7. **Wallet Service**
8. **RWA Inventory Service**
9. **Embassy Gateway Service**
10. **Oracle Processor**
11. **Governance Service**
12. **Capability Registry Service**
13. **Quota/Usage Service**
14. **Outbox Worker**
15. **Telemetry/Logs Service**
16. **Auth/Session Service**
17. **File Storage/Docs Service**

Усі сервіси є **modular**, але можуть бути реалізовані або як microservices, або як modular monolith.

---

## 3. Core Principles

- **Stateless там, де можливо** → просте масштабування.
- **Stateful там, де потрібно (wallet, RWA)** → обережні транзакції.
- **Event-driven** через NATS.
- **PDP-централізована авторизація**.
- **Outbox pattern** для гарантій доставки подій.
- **Strong ACID** тільки на критичних таблицях.
- **Soft eventual-consistency** на неважливих частинах.

---

## 4. Internal Services Overview

### 4.1 User & Team Service

#### Відповідальність:

- Users, teams, memberships.
- Roles: Owner, Guardian, Member, Visitor.
- Viewer types: reader/commenter/contributor.
- Team mode: public/confidential.

#### Таблиці:

- `users`
- `teams`
- `team_members`

#### API (internal):

- `GET /internal/team/:id`
- `POST /internal/team/create`
- `POST /internal/team/member/add`
- `POST /internal/team/member/remove`

#### Події (NATS):

- `team.member.joined`
- `team.member.left`

---

### 4.2 Messaging Service

#### Відповідальність:

- Channels, messages, followups.
- Co-memory embeddings.
- Confidential mode enforcement (via Gateway).

#### Таблиці:

- `channels`
- `messages`
- `followups`
- `comemory_items`

#### API:

- `POST /internal/message/send`
- `GET /internal/channel/:id/messages`
- `POST /internal/comemory/index`

#### Події:

- `chat.message.created`
- `comemory.item.created`

---

### 4.3 Projects & Tasks Service

#### Відповідальність:

- Projects, tasks, workflow.

#### Таблиці:

- `projects`
- `tasks`

#### Події:

- `project.created`
- `task.created`
- `task.updated`

---

### 4.4 Agent Orchestrator

#### Відповідальність:

- запуск приватних агентів;
- трекінг `agent_runs`;
- sandbox execution.

#### Таблиці:

- `agents`
- `agent_runs`

#### Події:

- `agent.run.started`
- `agent.run.completed`

#### API:

- `POST /internal/agent/run`
- `POST /internal/agent/finish`
- `GET /internal/agent/run/:id/status`

---

### 4.5 LLM Proxy Service

#### Завдання:

- централізований доступ до LLM (OpenAI / local models).
- облік токенів.
- нормалізація моделей.

#### API:

- `POST /internal/llm/chat`
- `POST /internal/llm/embeddings`

#### Event:

- `llm.tokens.used`

---

### 4.6 Router / Planner (DAARWIZZ)

#### Відповідальність:

- run multi-agent routing pipeline;
- orchestration of tools;
- intent recognition;
- complex "flows".

#### API:

- `POST /internal/router/route`
- `POST /internal/router/plan`

#### Events:

- `router.invoked`
- `router.completed`

---

### 4.7 Wallet Service

#### Відповідальність:

- стейк RINGK;
- генерація payout'ів;
- claim payout;
- зв'язок з блокчейном.

#### Таблиці:

- `wallets`
- `staking_ringk`
- `payouts`

#### API:

- `POST /internal/wallet/stake`
- `POST /internal/wallet/payout/claim`
- `GET /internal/wallet/balance/:user`

#### Events:

- `staking.locked`
- `payout.generated`
- `payout.claimed`

---

### 4.8 RWA Inventory Service

#### Відповідальність:

- облік energy/food/water/etc.
- інтеграція з Embassy.
- оновлення RWA стоків.

#### Таблиці:

- `rwa_inventory`

#### Events:

- `rwa.inventory.updated`

---

### 4.9 Embassy Gateway Service

#### Відповідальність:

- прийом підписаних webhook'ів від платформ (EnergyUnion, GREENFOOD).
- HMAC перевірка.
- PDP авторизація (embassy keys).
- генерація подій для NATS.

#### Таблиці:

- `embassy_identities`
- `embassy_webhooks`

#### API:

- `POST /embassy/energy`
- `POST /embassy/rwa`

#### Events:

- `embassy.event.received`
- `embassy.energy.update`
- `embassy.rwa.claim`

---

### 4.10 Oracle Processor

#### Відповідальність:

- обробка потоків енергетичних даних;
- нормалізація;
- створення `oracles`.

#### Таблиці:

- `oracles`

#### Events:

- `oracle.reading.published`

---

### 4.11 Governance Service

#### Відповідальність:

- пропозиції,
- голосування,
- застосування політик,
- оновлення bundles/caps/quotas.

#### Таблиці:

- `governance_policies`

#### Events:

- `governance.policy.updated`

---

### 4.12 Capability Registry Service

#### Відповідальність:

- управління:
  - capabilities,
  - bundles,
  - bundle_caps,
  - plan entitlements.

#### Таблиці:

- `capabilities`
- `bundles`
- `bundle_caps`
- `access_keys`
- `access_key_caps`

---

### 4.13 Usage Service

#### Відповідальність:

- підрахунок usage:
  - agent runs,
  - LLM tokens,
  - embassy events,
  - router invokes,
  - wallet transactions.

#### Таблиці:

(опціонально)

- `usage_agent_runs`
- `usage_llm`
- `usage_storage`
- `usage_router`

Або ж використовує event-driven pipeline.

---

### 4.14 Outbox Worker

#### Відповідальність:

- читання `outbox_events` з БД;
- публікація у NATS;
- маркування `processed`.

#### Таблиця:

- `outbox_events`

---

### 4.15 Telemetry / Logs Service

#### Відповідальність:

- прийом логів з фронтенду,
- прийом internal logs,
- агрегація в аналітичні стріми.

#### Events:

- `telemetry.client.event`
- `telemetry.error`
- `telemetry.screen_view`

---

### 4.16 Auth / Session Service

#### Відповідальність:

- login,
- OTP/Magic-link,
- session cookies.

#### Таблиці:

- `sessions` (опціонально)

---

### 4.17 File Storage / Docs Service

#### Відповідальність:

- завантаження файлів у каналах,
- документи,
- архіви,
- прев'ю.

Технічно:

- Minio/S3 + Postgres references.

---

## 5. Dependency Graph

Умовний граф залежностей:

```
User/Team → Messaging → Projects/Tasks → Agents → Router
                    ↓            ↓        ↓
                 RWA       Wallet       Embassy
                    ↓           ↓         ↓
                  Oracle → Usage → Governance → PDP
```

Простіший вигляд:

```
API Gateway (PEP)
      ↓ PDP
      ↓
Internal Services
      ↓
DB + NATS
```

---

## 6. Internal API Standards

Всі внутрішні сервіси мають:

- JSON-only API,
- версію `/internal/v1/...`,
- заборона на виклик ззовні (тільки з Gateway),
- сервісні ключі (internal service key),
- PDP перевіряє **internal capabilities**:
  - `service.mint.payout`
  - `service.write.oracles`
  - `service.update.capabilities`
  - `service.read.internal_logs`

---

## 7. Horizontal Scaling Responsibilities

### Stateless services:

- Messaging
- Projects/Tasks
- Embassy Gateway
- Telemetry
- Router/Planner (частково)
- LLM Proxy

### Stateful services:

- Wallet
- RWA
- Governance
- Capability Registry
- Usage Service (підрахунок)

---

## 8. Event Streams (NATS Topics)

**chat.***

**project.***

**task.***

**agent.run.***

**embassy.***

**oracle.***

**rwa.inventory.***

**wallet.***

**governance.***

**usage.***

**telemetry.***

---

## 9. Outbox Pattern (Mandatory)

Всі сервіси, що створюють події:

- пишуть у `outbox_events (processed=false)`,
- Outbox Worker публікує у NATS,
- записує `processed=true`.

Це гарантує **at-least-once delivery**.

---

## 10. Cross-service Transaction Rules

Дозволені:

- DB transaction → outbox insert → commit
- Outbox Worker → publish event

Заборонені:

- DB transaction → direct NATS publish → commit
- Cross-service DB транзакції

---

## 11. Security Boundaries

| Service             | Sensitive? | Notes                     |
| ------------------- | ---------- | ------------------------- |
| Wallet              | HIGH       | Chain operations, payouts |
| Embassy             | HIGH       | RWA, energy events        |
| Capability Registry | HIGH       | controls all access       |
| Governance          | HIGH       | updates policies          |
| Usage               | MEDIUM     | affects quotas            |
| Agents              | MEDIUM     | potential abuse           |
| Messaging           | MEDIUM     | privacy                   |
| Router              | HIGH       | tool access               |
| LLM Proxy           | HIGH       | cost centre               |

---

## 12. Suggested Deployment Model

### Option A — Modular Monolith (MVP)

Окремі модулі всередині одного репозиторію.

Переваги:

- мінімальні затрати,
- простий деплой,
- контроль consistency.

### Option B — Microservices (Prod-Scale)

Розділяються:

- Wallet,
- Embassy,
- Router,
- LLM Proxy,
- Agent Orchestrator,
- Messaging,
- Projects,
- Governance,
- Capability Registry,
- Usage.

---

## 13. Failure Isolation

Сервіс повинен не ламати інших.

Наприклад:

- Wallet падає → Messaging працює далі.
- Embassy перевантажений → Agent Runs працюють.
- Router overloaded → Wallet стабільний.

Це досягається:

- NATS,
- independent autoscaling,
- clear API boundaries.

---

## 14. Minimal Monitoring Set per Service

Для кожного:

- CPU/Memory
- Requests/sec
- Error rate
- Latency
- DB queries
- NATS event lag
- Circuit breaker status
- Quota usage

---

## 15. Integration with Other Docs

Цей документ доповнює:

- `33_api_gateway_security_and_pep.md`
- `32_policy_service_PDP_design.md`
- `29_scaling_and_high_availability.md`
- `28_flows_wallet_embassy_energy_union.md`
- `27_database_schema_migrations.md`

---

## 16. Завдання для Cursor

```text
You are a senior backend architect. Design internal services architecture using:
- 34_internal_services_architecture.md
- 33_api_gateway_security_and_pep.md
- 32_policy_service_PDP_design.md

Tasks:
1) Create service interfaces for all 17 services.
2) Define internal API contracts.
3) Implement Outbox Worker for event publishing.
4) Set up NATS event streams for all services.
5) Create service discovery mechanism (if microservices).
6) Implement cross-service communication patterns.
7) Add monitoring and observability for each service.

Output:
- list of modified files
- diff
- summary
```

---

## 17. Summary

Цей документ задає основу:

- хто за що відповідає,
- які дані де живуть,
- які події кожен сервіс генерує,
- як сервіси взаємодіють,
- де потрібна строгість ACID,
- як працює event-driven архітектура,
- де є stateful точки опори.

Це ключова частина всієї backend-карти міста.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


