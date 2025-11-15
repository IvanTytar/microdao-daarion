# 29 — Scaling & High Availability (MicroDAO)

*Масштабування, відмовостійкість, балансування навантаження, кластеризація сервісів DAARION.city / microDAO / Embassy / Wallet / Agents / Event Bus*

Це документ виробничого класу, який потрібний для:

- архітекторів,
- SRE,
- DevOps,
- інженерів, що відповідають за HA (High Availability),
- аудиторів, які перевіряють стійкість платформи.

Він відповідає на питання:

- як масштабуються сервіси;
- як забезпечується відмовостійкість;
- як працюють кластери (Postgres, NATS, агентна мережа);
- як працює автоматичне масштабування;
- як відбувається failover;
- як відновлюється місто після аварій.

---

## 1. Objectives

Платформа DAARION.city має підтримувати:

1. **Високу доступність (HA)**
   SLA: 99.5%–99.9% залежно від сервісу.

2. **Горизонтальне масштабування**
   Чат, агенти, Embassy події, обробка RWA, NATS — мають масштабуватись окремо.

3. **Event-driven архітектуру**
   Потоки через NATS/JetStream.

4. **Автоматичне відновлення після збоїв (self-healing)**.

5. **Zero-downtime деплой**.

---

## 2. High-level Architecture Overview

```
                     ┌─────────────────────────┐
                     │     Load Balancer        │
                     └──────────┬──────────────┘
                                │
                  ┌─────────────┴──────────────┐
                  │      API Gateway (PEP)      │
                  └─────────────┬──────────────┘
                                │
          ┌──────────────┬────────────┬──────────────┐
          │               │            │               │
      Messaging       Agents       Embassy         Wallet/RWA
      Service         Runtime      Gateway          Service
       (stateless)    (scalable)   (stateless)      (state + events)

                     ┌────────────────┐
                     │   NATS Cluster │
                     └────────────────┘
                              │
                    ┌───────────────────┐
                    │    Postgres HA    │
                    └───────────────────┘
```

Основний принцип — **кожен домен масштабується автономно**.

---

## 3. API Layer Scaling

### 3.1 API Gateway / Edge Functions

- Stateless
- Горизонтальне масштабування без обмежень
- Auto-scaling подіями:
  - RPS,
  - latency,
  - CPU,
  - queue length

### 3.2 Failover

- Health-check endpoints
- LB прибирає unhealthy інстанси
- Blue-Green або Canary rollout

---

## 4. Backend Domain Services Scaling

Статус сервісів DAARION:

| Service            | State         | Scale Mode                                     |
| ------------------ | ------------- | ---------------------------------------------- |
| Messaging          | Stateless     | Horizontal                                     |
| Projects/Tasks     | Stateless     | Horizontal                                     |
| Agent Orchestrator | Stateful (DB) | Horizontal (idempotent processing)             |
| Wallet             | Stateful      | Horizontal (through DB locking, NATS ordering) |
| Embassy            | Stateless     | Horizontal                                     |
| Telemetry          | Stateless     | Horizontal                                     |

### 4.1 Stateless Services

- Messaging
- Channels
- Projects
- Embassy Gateway
- Telemetry
- Governance API

Масштабуються **лінійно** кількістю інстансів.

### 4.2 Stateful Services

#### 🔹 Wallet Service

Потребує:

- row-level locks для `payout.claim`
- idempotent `payout.generated`
- deduplicated NATS consumer

#### 🔹 Agent Orchestrator

Потребує:

- «at least once» NATS delivery
- run-idempotency (`agent_runs.id`)
- partitioning agent runs

---

## 5. Agents Scaling

### 5.1 Типи агентів

1. **Private agents (per-user/team)**
2. **Global agents (Router / Planner / Observer)**
3. **Embassy agents (interpreters for RWA)**

### 5.2 Як вони масштабуються

```text
User → API → enqueue → Agent Runtime Pool
```

Agent Runtime Pool:

- десятки/сотні ізольованих воркерів;
- один агент run не блокує інші;
- автоматичний autoscaling від:
  - queue depth,
  - throughput,
  - LLM latency.

### 5.3 Isolation Model

Для кожного агентного run:

- окремий підпроцес / worker / container
- можливість sandbox-обмеження

---

## 6. NATS JetStream Scaling & HA

### 6.1 Кластер

Рекомендована конфігурація для прод:

- **3 або 5 вузлів** JetStream
- Replication Factor = 3 для стрімів
- Consumer durability = `durable=true`
- Ack policy = explicit

### 6.2 Потоки (streams)

Структура тем:

```
chat.*
project.*
task.*
agent.run.*
wallet.*
embassy.*
oracle.*
rwa.*
governance.*
audit.*
```

### 6.3 Failure Scenarios

| Failure                | Наслідок            | Відновлення                        |
| ---------------------- | ------------------- | ---------------------------------- |
| 1 вузол падає          | Кворум зберігається | Автоматичний failover              |
| 2 вузли падають (із 3) | Стрім read-only     | Зберегти дані, обмеження на writes |
| Корупція стріму        | Канарний споживач   | Auto-resync                        |

---

## 7. Postgres High Availability

### 7.1 Архітектура

- Primary + at least 1–2 replicas
- Synchronous replication (якщо SLA 99.9)
- Архівування WAL (PITR)
- Автоматичний failover (pg_auto_failover або cloud-managed)

### 7.2 Таблиці з високими вимогами до консистентності

- `wallets`
- `staking_ringk`
- `payouts`
- `rwa_inventory`
- `access_keys`
- `bundles`
- `outbox_events`

Ці таблиці не допускають eventual consistency.

### 7.3 Query Optimization

- Index coverage for all hot-path queries
- Partitioning (опційно) для:
  - `messages`
  - `audit_log`
  - `outbox_events`

---

## 8. Outbox Pattern Scaling

### 8.1 Worker Pool

- 2–10 воркерів
- Кожен бере порцію подій
- Події після обробки маркуються `processed=true`

### 8.2 Guarantees

- At least once
- Ordering controlled by:
  - Partition key (team_id)
  - Consumer group

### 8.3 Failure Mode

- Pod kill → worker restarts → resumes work
- network flap → events re-delivered
- consumer crash → DLQ (dead letter queue)

---

## 9. Embassy Scaling

### 9.1 Incoming Webhooks

- Stateless API
- Unlimited horizontal scaling
- Signature verification CPU-cheap

### 9.2 Oracle bursts

Embassy може отримати "бурст" даних з Energy Union:

- 10k–100k meter readings
- обробляється пакетно
- Embassy → NATS → Wallet Service

Wallet Service **має бути autoscaled**:

- CPU > 70%
- NATS consumer lag > threshold

---

## 10. Wallet Scaling & RWA

### 10.1 Ключові вимоги

Wallet Service обробляє:

- payouts,
- claims,
- chain transactions,
- RWA reward distribution.

Системні вимоги:

- row-level lock на `payouts` при claim
- mutex на chain transaction
- idempotent TX submission

### 10.2 Autoscaling Logic

- ↑ CPU (chain operations heavy)
- ↑ NATS lag (payouts generated faster than processed)
- ↑ pending claim queue

---

## 11. Scaling Frontend

### 11.1 Static hosting

- CDN кешування
- SSR вимикається для важких сторінок (агентів, wallets)

### 11.2 Global edge distribution

- географічні PoP
- розподіл:
  - US-EAST
  - EU
  - South America
  - Asia

### 11.3 Feature Flag Rollout

- мінімізація ризику на проді
- partial enablement

---

## 12. Failover Strategies

### 12.1 API Layer

- LB → автоматична заміна unhealthy nodes
- Canary release на 5–10%

### 12.2 Postgres

- автоматичний failover на replica
- DNS/IP switch

### 12.3 NATS

- внутрішня виборність leader
- replica quorum

### 12.4 Agents

- job requeue → new worker takes over

### 12.5 Embassy

- stateless → fail instantly

### 12.6 Wallet

- idempotent DB writes → rescue after crash

---

## 13. Disaster Recovery (DR)

### 13.1 Scenarios

1. Data center outage
2. Corrupted WAL / snapshot
3. Global cloud outage (provider-wide)
4. Stuck NATS cluster
5. Chain RPC outage
6. Embassy key leak
7. Agent DDOS / infinite loops

### 13.2 Recovery Plan

- Hot standby region (multi-region Postgres)
- Backup event bus
- Secondary RPC provider
- Embassy secrets rotation
- Agent Sandbox re-creation

### 13.3 DR Tests

- щоквартальні DR-ротації
- restore Postgres snapshot
- swap RPC endpoints
- revoke all Embassy keys

---

## 14. Benchmark Targets

| Компонент       | Ціль                   |
| --------------- | ---------------------- |
| Messages        | 500 msg/sec            |
| Agent runs      | 30–100 runs/min/worker |
| Embassy         | 1000 webhook/sec       |
| Wallet payouts  | 50 payout/sec          |
| NATS throughput | 20k–50k events/sec     |
| Postgres        | p95 < 100 ms           |

---

## 15. Завдання для Cursor

```text
You are a senior DevOps/SRE engineer. Implement HA infrastructure using:
- 29_scaling_and_high_availability.md
- 25_deployment_infrastructure.md
- 26_security_audit.md

Tasks:
1) Set up Postgres HA with automatic failover.
2) Configure NATS JetStream cluster (3-5 nodes).
3) Implement autoscaling for API Gateway and domain services.
4) Set up health checks and monitoring for all services.
5) Implement Outbox Worker pool with proper scaling.
6) Configure load balancer with health checks.
7) Set up disaster recovery procedures.

Output:
- list of modified files
- diff
- summary
```

---

## 16. Summary

- Архітектура підтримує HA та autoscaling на кожному шарі.
- Сервіси ізольовані за доменами.
- NATS та Postgres у кластерному режимі.
- Wallet / RWA / Embassy — найбільш критичні частини.
- Масштабування агентів окреме, з autoscaling та sandbox isolation.
- Готова база для prod-grade розгортання.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


