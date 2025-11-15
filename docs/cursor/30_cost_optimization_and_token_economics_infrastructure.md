# 30 — Cost Optimization & Token Economics Infrastructure (MicroDAO)

*Оптимізація витрат інфраструктури та зв'язок з токеномікою (RINGK, 1T, KWT, DAAR/DAARION)*

---

## 1. Purpose & Scope

Цей документ описує, як:

- технічні витрати (LLM, інфраструктура, зберігання, мережа, моніторинг) пов'язані з:
  - токенами **RINGK** (стейк / ліміти),
  - **1T** (обчислювальні потоки),
  - **KWT** (енергетичні потоки),
  - **DAAR/DAARION** (глобальна міська економіка);
- вводити технічні ліміти, щоби:
  - платформа залишалась економічно стійкою;
  - не було «безкоштовного» спалювання бюджету;
  - користувачі бачили прозорі сигнали вартості.

Ціль: зробити так, щоб архітектура не лише масштабувалась (див. `29_scaling_and_high_availability.md`), а й **не розвалювала економіку**.

---

## 2. Основні центри витрат

### 2.1 LLM / AI / Agents

- Виклики великих моделей (hosted / власні).
- Токени контексту (input/output).
- Паралельні агенти, багатоінструментальні ланцюги.
- Фонові агенти (спостерігачі/аналітики).

### 2.2 Compute & Networking

- API/Backend CPU/RAM.
- Agent Runtime pool.
- Embassy Gateway (спайки вебхуків).
- Wallet Service / chain RPC.

### 2.3 Storage

- Postgres (об'єм + IOPS).
- Object storage (файли, логи агентів, документи).
- Long-term logs / audit.

### 2.4 Observability

- Метрики (Prometheus, Cloud Monitoring).
- Логи (ELK/Loki/Cloud).
- Traces (якщо є).

---

## 3. Принципи оптимізації

1. **Немає «нескінченного безкоштовного» LLM**
   Кожен агентний виклик → лічильник → квота → кореляція з токенами/планами.

2. **Бюджети на рівні:**
   - користувача,
   - команди (microDAO),
   - платформи (GreenFood, Energy Union).

3. **Економічні сигнали в UI**
   Користувач бачить:
   - «Скільки обчислювального бюджету залишилось»;
   - «Які дії дорогі».

4. **Soft- та hard-limits**
   - Soft-limits → попередження/тротлінг.
   - Hard-limits → зупинка / пропозиція оновити план / збільшити стейк.

---

## 4. Зв'язок токенів з технічною економікою

### 4.1 RINGK (стейк / права / ліміти)

RINGK — базовий стейковий токен, який:

- визначає **довгострокову участь**;
- впливає на:
  - quota мультиплікатори (LLM, storage, bandwidth);
  - пріоритет обробки;
  - доступ до Platformium-рівня.

Формула (концептуально):

```text
effective_quota = base_quota(plan) × f(RINGK_staked)
```

Де `f(RINGK_staked)` — piecewise-функція (step / log):

- 0 RINGK → 1.0×
- X RINGK → 1.5×
- Y RINGK → 2.0× …

### 4.2 1T (compute-шар)

1T — токен, пов'язаний з обчислювальною потужністю:

- кожен LLM-виклик / агентний run / роутинг DAARWIZZ має **внутрішню собівартість** в 1T-еквіваленті;
- внутрішньо ведеться облік:
  - `compute_units_used` → конвертується в 1T (offchain/onchain settlement);
- для кожної команди:
  - `monthly_compute_budget_1T`;
  - якщо план → включає X 1T / місяць.

### 4.3 KWT (energy-шар)

KWT — енергетичний токен (див. Energy Union):

- залежно від того, чи обчислення живляться «зеленим» контуром:
  - частина витрат в 1T «покривається» через локальне енергопостачання;
- для data-центрів / вузлів:
  - `kwh → KWT` → subsidy / incentive.

### 4.4 DAAR / DAARION (міський рівень)

- DAAR/DAARION визначають:
  - статус резидента;
  - участь у міській економіці, Gift Fabric;
- через governance → можуть змінювати:
  - ціни 1T для певних категорій;
  - пільги для платформ (GreenFood, соціальні ініціативи).

---

## 5. Технічні ліміти та Entitlements

Загальна формула:

```text
allow_action =
  RBAC ∧ Capability ∧ ACL ∧ Mode
  ∧ (usage < quota(plan, stake))
```

З боку інфраструктури:

### 5.1 Quotas (per user / team / platform)

Приклади метрик:

- `agent_runs_per_day`
- `tokens_llm_per_day`
- `router_invocations_per_day`
- `messages_per_day`
- `storage_mb_per_team`
- `embassy_events_per_day`
- `wallet_tx_per_day`

Для кожного плану:

| План        | LLM-токени / місяць | Agent runs / день | Storage / team | Embassy events / місяць |
| ----------- | ------------------- | ----------------- | -------------- | ----------------------- |
| Freemium    | N1                  | R1                | S1             | E1                      |
| Casual      | N2                  | R2                | S2             | E2                      |
| Premium     | N3                  | R3                | S3             | E3                      |
| Platformium | N4                  | R4                | S4             | E4                      |

Множиться на `f(RINGK_staked)`.

### 5.2 Механіка використання

- Worker/API перед кожною дорогою операцією:
  - інкрементує usage;
  - порівнює з quotas;
  - якщо близько до ліміту:
    - soft-warning → UI/notification;
  - якщо перевищено:
    - hard-stop → 429 / custom error.

---

## 6. Autoscaling vs. Cost Guards

### 6.1 Autoscaling з budget-обмеженнями

Класичне autoscaling (CPU/RPS) → може «роздути» рахунок.

Тому на рівні SRE:

- визначається **max_instances_per_service** per environment;
- для дорогих компонентів:
  - Agent Runtime,
  - Wallet Service,
  - Embassy,
  - LLM Proxies;

застосовується:

```text
desired_instances = min(
  autoscaler_recommendation,
  max_instances_budget
)
```

### 6.2 Burst-мод

Для подій типу Energy Union / Embassy:

- дозволяється короткий burst (наприклад, ×2–3 від норми) при:
  - наявності RWA/енергетичного покриття;
- bursts логуються, накладається governance policy.

---

## 7. LLM / Agents Cost Controls

### 7.1 На рівні агента

Кожен агент має конфіг:

- `max_tokens_per_run`
- `max_cost_per_run` (у внутрішніх одиницях / 1T-еквівалент)
- `max_parallel_runs`
- `allowed_tools` (частина з них дорогі, напр. browser/crawler)

Agent Orchestrator:

- перед запуском оцінює потенційний cost;
- при chain-of-thought / multi-step run:
  - веде контрліміти (break if too expensive).

### 7.2 На рівні користувача/команди

- кожен run → запис у таблицю usage:
  - `team_id`, `agent_id`, `compute_cost`, `tokens_used`, `ts`;
- менеджер або Owner бачить usage dashboard:
  - по агентах;
  - по членах команди;
  - по типам задач.

---

## 8. Послуговування RWA/Embassy з економічними обмеженнями

### 8.1 Embassy Limits

- Кількість оброблених webhook'ів per платформа:
  - `events_per_minute` / `events_per_day`;
- Для платформи:
  - `free_tier` (для соціальних / важливих ініціатив);
  - `sponsored_tier` (оплачується з RWA фонду);
  - `commercial_tier` (необхідний стейк / плата 1T/DAARION).

### 8.2 Oracle Inputs

- Oracle'и можуть бути дорогими (обсяг даних).
- Вводяться:
  - batch-обмеження;
  - ліміти по `payload_size`;
  - price per oracle event (у 1T-еквіваленті).

---

## 9. Wallet / Chain / Gas Optimization

### 9.1 Bundle-транзакції

- Об'єднувати можливі tx:
  - payout claims → batch claim, якщо можливо;
  - aggregation перед ончейном.

### 9.2 Chain Selection

- Використовувати:
  - L2 / sidechain з низьким gas;
  - minimal calldata.

### 9.3 Offchain-first

- Стейт RWA, стейку, usage:
  - максимально offchain (Postgres + NATS + audit_log);
  - ончейн тільки фіналізація.

---

## 10. Analytics для економіки

### 10.1 Збір метрик

Збираються агрегати:

- `llm_tokens_per_team_per_day`
- `agent_runs_per_team_per_day`
- `events_embassy_per_platform_per_day`
- `wallet_tx_per_day`
- `gas_spent_per_day`
- `kwh_used_for_compute` (якщо є energy integration)

### 10.2 Дашборди

Для:

- технічної команди:
  - cost per component (LLM, API, NATS, DB, Chain);
- продуктової/економічної:
  - cost per feature / platform / cohort;
- governance:
  - чи треба змінити планові ліміти/ціни.

---

## 11. Governance Controls

### 11.1 Політики

Governance Agent (див. попередні документи) може:

- змінювати:
  - quotas (N1–N4, R1–R4…);
  - цінові коефіцієнти (1T per token, KWT subsidies);
  - правила bursts / high-priority flows;
- вводити:
  - пільги для окремих платформ/районів міста;
  - обмеження для надмірних споживачів.

### 11.2 Процес

1. Пропозиція (proposal) з новими параметрами.
2. Голосування DAAR/DAARION.
3. Після прийняття:
   - оновлення конфігів у Capability/Entitlements Registry;
   - deployment змін в PDP/Pricing Service;
   - журнал подій: `governance.policy.updated`.

---

## 12. Практичні граничні значення (рекомендації MVP)

Орієнтовні базові параметри для MVP (приклад):

- Freemium:
  - `agent_runs_per_day` — 20
  - `llm_tokens_per_day` — 20k–50k
- Casual:
  - `agent_runs_per_day` — 100
  - `llm_tokens_per_day` — 100k–200k
- Premium:
  - `agent_runs_per_day` — 500
  - `llm_tokens_per_day` — 1M
- Platformium:
  - за домовленістю; ліміти → контракт + stake RINGK.

Множники `f(RINGK_staked)`:

- 0 RINGK — ×1.0
- 1000 RINGK — ×1.25
- 5000 RINGK — ×1.5
- 20000 RINGK — ×2.0

(значення можна винести в окрему конфіг/таблицю і коригувати governance'ом).

---

## 13. Завдання для Cursor

```text
You are a senior backend engineer. Implement cost optimization and token economics using:
- 30_cost_optimization_and_token_economics_infrastructure.md
- 24_access_keys_capabilities_system.md
- 29_scaling_and_high_availability.md

Tasks:
1) Create usage tracking tables (agent_runs_usage, llm_tokens_usage, etc.).
2) Implement quota checking middleware in API Gateway.
3) Integrate RINGK stake multipliers into quota calculations.
4) Create cost estimation service for agent runs.
5) Implement soft/hard limits with UI notifications.
6) Create usage dashboards for teams/owners.
7) Add governance hooks for quota policy updates.

Output:
- list of modified files
- diff
- summary
```

---

## 14. Висновок

- Інфраструктура не повинна «зливати» бюджет LLM/compute без зв'язку з токеномікою.
- Усі ключові операції (агенти, Embassy, Wallet, RWA) мають:
  - квоти,
  - usage-облік,
  - прив'язку до планів і стейку RINGK,
  - внутрішній 1T-еквівалент.
- Governance може змінювати правила, але технічна основа — у quotas, метриках та PDP.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


