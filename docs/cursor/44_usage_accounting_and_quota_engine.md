# 44 — Usage Accounting & Quota Engine (MicroDAO)

*Usage Engine: лічильники, квоти, облік вартості, PDP інтеграція, rate limits, soft/hard limits, попередження, економічна стабільність DAARION OS.*

---

## 1. Purpose & Scope

Usage Engine — це **центральна система**, яка:

- обліковує використання ресурсів,
- застосовує квоти відповідно до планів (Freemium → Platformium),
- коригує ліміти через стейк RINGK,
- блокує надмірне використання,
- сигналізує API Gateway про warnings/hard-stops,
- інтегрується з PDP та Governance.

Вона контролює витрати:

- LLM-токени
- agent runs
- router invokes
- embassy events
- storage
- wallet tx
- compute (1T)

---

## 2. Usage Engine Architecture

```text
API Gateway / Agents / Embassy / Tools
       ↓
 Usage Accounting Proxy
       ↓
Quota Engine (core)
       ↓
Postgres / Redis (counters)
       ↓
PDP (authorization)
```

---

## 3. Usage Metrics (Canonical List)

### 3.1 Compute / LLM:

- `llm_tokens_input`
- `llm_tokens_output`
- `llm_cost_1t`

### 3.2 Agents:

- `agent_runs`
- `agent_parallel_runs`
- `agent_tools_used`

### 3.3 Router:

- `router.invoke`
- `router.steps`

### 3.4 Embassy:

- `embassy.events_received`
- `embassy.energy.update`
- `embassy.food.update`
- `embassy.water.update`

### 3.5 RWA:

- `rwa_processed_records`

### 3.6 Wallet:

- `wallet.tx`
- `payout.claims`

### 3.7 File Storage:

- `storage.bytes_uploaded`
- `storage.bytes_retained`

---

## 4. Quota Types

### 4.1 Hard quotas

Перевищення → STOP + 403 error.

Приклади:

- LLM tokens per month
- agent runs per day
- embassy events per day
- browser-lite usage per hour
- wallet tx per 10 min

### 4.2 Soft quotas

Перевищення → тротлінг, warning headers.

Приклади:

- router.invoke per minute
- search queries

### 4.3 Compute cost ceilings

Обмеження:

- per run (`max_cost_per_run`)
- per day
- per month

---

## 5. Quota Formula

Кожна квота =

```text
effective_quota = base_quota(plan) × multiplier(stake)
```

Де:

### 5.1 Base quota

Визначається планом:

- Freemium → найнижча
- Casual
- Premium
- Platformium → максимальні

### 5.2 Multiplier

Функція:

```text
multiplier = f(RINGK_staked)
```

Приклад:

| RINGK Stake | Multiplier |
| ----------- | ---------- |
| 0           | 1.0        |
| 1000        | 1.25       |
| 5000        | 1.5        |
| 20000       | 2.0        |

---

## 6. Counters (Storage Model)

### 6.1 Redis (fast counters)

Проміжні лічильники для:

- agent_runs
- tokens_per_minute
- embassy_events
- router_invokes

Приклад ключів:

```text
usage:team:{team_id}:llm_month
usage:team:{team_id}:agent_day
usage:user:{user_id}:wallet_tx_hour
```

### 6.2 Postgres (durable counters)

- щоденні/місячні агрегати,
- історія usage,
- перерахунок після crash.

```sql
create table usage_daily (
  team_id text,
  metric text,
  value bigint,
  day date
);
```

---

## 7. Quota Engine (Decision Logic)

```text
allow =
   usage(current) < quota(effective)
```

1. Виклик надходить від API Gateway.
2. Usage Engine інкрементує провізорний лічильник.
3. Перевіряє квоту.
4. Якщо ок → PDP підтверджує дію.
5. Якщо переповнення → deny.

---

## 8. Warning Thresholds

При 80–90% використання:

```text
X-DAARION-Usage-Warning: <metric> near limit
```

UI може показувати:

- «Залишилось 10% LLM бюджету»
- «Агентні запуски майже вичерпані»

---

## 9. Rate Limiting Integration

Quota Engine тісно працює з rate limits:

- soft RL: попередження
- hard RL: блокування на період

Періоди:

- 1 хвилина
- 10 хвилин
- година
- доба
- місяць

---

## 10. PDP Integration

При оцінці дії:

```text
PDP checks:
  - capability
  - role
  - plan
  - ACL
  - quotas (via Usage Engine)
```

Usage Engine повертає PDP:

- `quota_ok = true/false`
- `quota_remaining`
- `cost_estimate`

---

## 11. Cost Accounting (1T Integration)

1. LLM Proxy обчислює:

```text
cost_1t = tokens × price_per_token
```

2. Router/Agent додає:

```text
cost_1t += tool_cost
```

3. Usage Engine додає:

```text
team_monthly_compute += cost_1t
```

4. PDP блокує, якщо:

```text
team_monthly_compute > compute_quota
```

---

## 12. Embassy / RWA Quotas

Щоб уникнути спаму і фродових оновлень:

| Domain | Limit              |
| ------ | ------------------ |
| energy | 10 000 updates/day |
| food   | 5 000 updates/day  |
| water  | 5 000 updates/day  |

Також:

```text
max_events_per_minute (per platform)
```

---

## 13. Agent Run Limits

Окремі ліміти:

- max_runs_per_day
- max_parallel_runs
- max_tools_per_run
- max_llm_tokens_per_run
- max_cost_per_run

---

## 14. Storage/Files Quotas

На команду:

```text
Freemium: 100MB
Casual: 500MB
Premium: 5GB
Platformium: 25GB+
```

---

## 15. Wallet/Chain Quotas

З метою безпеки:

```text
max_wallet_tx_per_hour = 2
max_claims_per_day = 10
max_stake_ops_per_day = 5
```

---

## 16. Usage Correction / Reconciliation

Раз на добу:

- Redis → PostgreSQL sync
- anomaly detection
- usage recalculation для long tasks (agent runs)
- звірка tokens_used з LLM Proxy

---

## 17. Governance Controls

Governance може:

- підвищувати/знижувати квоти,
- змінювати compute price,
- вимикати окремі метрики,
- вводити "emergency cap",
- змінювати stake multipliers.

---

## 18. Abuse / Fraud Protection

Виявляє:

- різкі стрибки usage,
- автоматичні цикли агентів,
- LLM infinite loops,
- embassy spam,
- wallet brute-force,
- chain-попит аномальний.

Система автоматично може:

- знизити квоти тимчасово,
- заблокувати агентів,
- призупинити Embassy platform,
- вимкнути інструменти.

---

## 19. Observability

Метрики:

- usage per minute/day/month
- quota remaining
- cost per run
- agent tokens used
- embassy event rate
- router invoke rate
- anomaly score

Графіки в Grafana:

- per сервіс
- per команду
- per користувача
- per домен (RWA/Energy/Food/Water)

---

## 20. Error Model

Коди помилок Usage Engine:

| Code                 | Meaning                         |
| -------------------- | ------------------------------- |
| quota_exceeded       | перевищено квоту                |
| cost_exceeded        | обчислювальний бюджет вичерпано |
| rate_limited         | надто багато дій                |
| anomaly_detected     | підозрілий патерн               |
| agent_parallel_limit | забагато агентів                |
| tokens_limit         | LLM usage overflow              |

---

## 21. Example Scenarios

### 21.1 LLM Overflow

- Користувач запитує великий контекст → tokens_used > quota → deny.

### 21.2 Embassy Spam

- EnergyUnion шле 10k events/min → throttling → deny.

### 21.3 Infinite Agent Loop

- Агент намагається робити 50 runs/min → deny.

---

## 22. Integration with Other Docs

Цей документ доповнює:

- `32_policy_service_PDP_design.md`
- `30_cost_optimization_and_token_economics_infrastructure.md`
- `31_governance_policies_for_capabilities_and_quotas.md`
- `40_rwa_energy_food_water_flow_specs.md`
- `38_private_agents_lifecycle_and_management.md`

---

## 23. Завдання для Cursor

```text
You are a senior backend engineer. Implement Usage Accounting & Quota Engine using:
- 44_usage_accounting_and_quota_engine.md
- 32_policy_service_PDP_design.md
- 30_cost_optimization_and_token_economics_infrastructure.md

Tasks:
1) Create Usage Engine service architecture (Usage Accounting Proxy, Quota Engine, Redis/Postgres counters).
2) Define Usage Metrics (LLM tokens, agent runs, router invokes, embassy events, RWA, wallet tx, storage).
3) Implement Quota Types (Hard quotas, Soft quotas, Compute cost ceilings).
4) Implement Quota Formula (base_quota(plan) × multiplier(stake)).
5) Create Counters Storage Model (Redis for fast counters, Postgres for durable counters).
6) Implement Quota Engine Decision Logic (usage check, quota validation, PDP integration).
7) Add Warning Thresholds (80-90% usage warnings).
8) Integrate Rate Limiting (soft/hard limits, time periods).
9) Integrate with PDP (quota_ok, quota_remaining, cost_estimate).
10) Implement Cost Accounting (1T integration, LLM Proxy cost calculation, team monthly compute).
11) Add Embassy/RWA Quotas (per domain limits, max_events_per_minute).
12) Implement Agent Run Limits (max_runs_per_day, max_parallel_runs, max_tools_per_run, max_llm_tokens_per_run, max_cost_per_run).
13) Add Storage/Files Quotas (per plan limits).
14) Implement Wallet/Chain Quotas (max_wallet_tx_per_hour, max_claims_per_day, max_stake_ops_per_day).
15) Add Usage Correction / Reconciliation (Redis → PostgreSQL sync, anomaly detection, usage recalculation).
16) Add Governance Controls (quota updates, compute price changes, emergency cap, stake multipliers).
17) Implement Abuse / Fraud Protection (anomaly detection, automatic quota reduction, agent blocking, embassy suspension).
18) Add Observability (metrics, Grafana dashboards).
19) Implement Error Model (quota_exceeded, cost_exceeded, rate_limited, anomaly_detected, agent_parallel_limit, tokens_limit).

Output:
- list of modified files
- diff
- summary
```

---

## 24. Summary

Usage Engine:

- гарантує економічну стабільність системи,
- контролює всі ресурси,
- застосовує квоти,
- працює з PDP, Agents, Embassy, Wallet, Tools,
- захищає систему від зловживань,
- базується на Redis + Postgres,
- повністю конфігурується Governance,
- забезпечує масштабовану, передбачувану, справедливу модель використання DAARION OS.

Це — **центральний обліковий шар платформи**.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


