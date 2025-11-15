# 37 — Agent Tools & Plugins Specification (MicroDAO)

*Докладна специфікація інструментів агентів, категорій безпеки, API-викликів, plugins lifecycle, capability-кодів, sandbox-контрактів та інтеграції через DAARION Tool Fabric*

---

## 1. Purpose & Scope

Документ визначає:

- повний список підтримуваних інструментів (tools),
- категорії інструментів за рівнями безпеки,
- правила використання,
- Plugins API (розширюваність),
- інтерфейс між агентом та Tool Proxy,
- capability-коди,
- сповіщення / події,
- обмеження (timeouts, rate limits, isolation),
- як підключаються інструменти DAARION Platforms (EnergyUnion, GREENFOOD, Water Union),
- як працюють інструменти в confidential mode.

---

## 2. Architectural Overview

```
Agent → Sandbox Runtime → Tool Proxy → Internal Services → DB/NATS
```

Ключові компоненти:

- **Tool Proxy** — єдина точка доступу агентів до інструментів.
- **PDP** — перевіряє `tool.<name>.invoke`.
- **Sandbox** — обмежує ресурси.
- **Plugins API** — дозволяє додавати нові інструменти без ризиків.

---

## 3. Tool Security Categories

Інструменти діляться на 4 категорії:

### 3.1 Category A — Safe Tools (default-enabled)

Не мають доступу до зовнішньої мережі, не можуть виконувати код.

| Tool       | Capability             | Опис                            |
| ---------- | ---------------------- | ------------------------------- |
| math       | tool.math.invoke       | базові обчислення               |
| text       | tool.text.invoke       | форматування тексту             |
| memory     | tool.memory.invoke     | створення коротких summary      |
| embeddings | tool.embeddings.invoke | генерація embedding'ів          |
| calendar   | tool.calendar.invoke   | маніпуляції з датами/таймзонами |

### 3.2 Category B — Controlled Tools (internal-only)

Працюють тільки через internal APIs.

| Tool         | Capability               | Доступ                           |
| ------------ | ------------------------ | -------------------------------- |
| search-lite  | tool.search.invoke       | внутрішній пошук                 |
| browser-lite | tool.browser_lite.invoke | обмежений перегляд HTML (без JS) |
| file         | tool.file.invoke         | читання з internal storage       |
| project      | tool.project.invoke      | створення/оновлення проектів     |
| task         | tool.task.invoke         | створення/оновлення задач        |

### 3.3 Category C — Sensitive Tools (restricted)

Вимагають додаткових capability.

| Tool       | Capability             | Опис                                  |
| ---------- | ---------------------- | ------------------------------------- |
| router     | tool.router.invoke     | взаємодія з DAARWIZZ Router           |
| llm        | tool.llm.invoke        | прямі виклики LLM (через токен-квоти) |
| agent      | tool.agent.invoke      | виклик іншого агента                  |
| data.query | tool.data_query.invoke | запити до структурованих даних        |

### 3.4 Category D — Critical Tools (governance-only)

Потребують схвалення Governance.

| Tool         | Capability               | Ризик                                          |
| ------------ | ------------------------ | ---------------------------------------------- |
| browser-full | tool.browser_full.invoke | доступ до інтернету                            |
| external_api | tool.external_api.invoke | сторонні API                                   |
| chain        | tool.chain.invoke        | ончейн-транзакції                              |
| platform     | tool.platform.invoke     | доступ до платформ DAARION (energy/food/water) |

---

## 4. Tool Capability Model

Кожен інструмент має capability:

```text
tool.<name>.invoke
```

При запуску:

```text
Agent Runtime → Tool Proxy → PDP(authorize)
```

Якщо capability відсутній → deny.

---

## 5. Tool Execution Contract

### 5.1 Request Format

```json
{
  "tool": "browser_lite",
  "args": {
    "url": "...",
    "max_bytes": 200000
  },
  "context": {
    "agent_run_id": "ar_123",
    "team_id": "t_555"
  }
}
```

### 5.2 Response Format

```json
{
  "ok": true,
  "output": "... sanitized result ...",
  "tokens_used": 123,
  "cost_1t": 0.00002
}
```

---

## 6. Tool Proxy Rules

### 6.1 All Calls Go Through Proxy

Агент не має прямого доступу до:

- внутрішніх сервісів,
- БД,
- зовнішнього інтернету.

### 6.2 PDP Check

Перед кожним викликом:

```text
PDP(action=tool.<name>.invoke)
```

### 6.3 Usage Accounting

Tool Proxy інкрементує usage:

- tokens (LLM),
- compute units,
- tool invocations per day.

---

## 7. Timeouts & Limits per Category

| Category | Timeout | Rate Limit | Notes           |
| -------- | ------- | ---------- | --------------- |
| A        | 1–2s    | high       | безпечні        |
| B        | 1–3s    | medium     | тільки internal |
| C        | 3–5s    | low        | квоти/обмеження |
| D        | 5–10s   | very low   | governance-only |

---

## 8. Plugins API (Extensible Tools)

Plugins дозволяють стороннім розробникам або платформам додавати нові інструменти.

### 8.1 Plugin Manifest

```json
{
  "name": "greenfood.order",
  "version": "1.0.0",
  "entry": "plugin.js",
  "capabilities": [
    "tool.greenfood.order.invoke"
  ],
  "permissions": {
    "network": false,
    "filesystem": false,
    "internal_api": ["greenfood"]
  }
}
```

#### Allowed fields:

- `name`
- `version`
- `entry`
- `capabilities`
- `permissions`

---

### 8.2 Plugin Execution Flow

```text
Agent → Tool Proxy → Plugin Runtime → Internal Service
```

#### Plugin Runtime:

- запускається в окремому mini-sandbox,
- має read-only FS,
- немає network,
- отримує контекст:
  - agent_run_id,
  - team_id,
  - capability list.

---

### 8.3 Plugin Security Model

- Plugins НЕ отримують plaintext повідомлень.
- Plugins НЕ бачать user session.
- Plugins НЕ можуть:
  - запускати shell,
  - читати файл-систему,
  - робити сторонні HTTP-запити.

---

## 9. Built-in Tools (Full List)

### 9.1 Core Tools (Category A)

- math
- date
- calendar
- text
- memory
- embeddings
- table
- format

### 9.2 Internal Tools (Category B)

- project
- task
- file.storage
- search-lite
- browser-lite

### 9.3 Advanced Tools (Category C)

- llm
- router
- agent
- data.query

### 9.4 Platform Tools (Category D)

- platform.energy
- platform.food
- platform.water
- chain (controlled by Wallet)
- external_api (disabled by default)

---

## 10. Platform Tool Contracts (EnergyUnion, GREENFOOD)

### 10.1 GREENFOOD Tool

```text
tool.greenfood.order.invoke
```

Allow:

- створення замовлення,
- перегляд інвентарю продуктів.

Deny:

- змінювати ціни,
- модифікувати склад.

Input:

```json
{
  "tool":"greenfood.order",
  "args": { "product_id":"...", "qty":1 }
}
```

Output:

```json
{
  "order_id": "...",
  "status":"created"
}
```

---

### 10.2 EnergyUnion Tool

```text
tool.energy.meter.read
```

Allow:

- читати дані енергетики через Embassy.

Deny:

- оновлювати RWA дані.

Output:

```json
{
  "kwh": 123.5,
  "timestamp": "..."
}
```

---

## 11. Confidential Mode — Tool Restrictions

Якщо канал або команда має `confidential`:

- Tools НЕ отримують plaintext.
- browser-lite додає redaction:

  ```text
  [confidential section removed]
  ```

- memory-tool зберігає тільки summary (не raw).

---

## 12. Error Model

Tool Proxy повертає структуровані помилки:

| Code                    | Meaning              |
| ----------------------- | -------------------- |
| tool_capability_missing | агент не має прав    |
| tool_timeout            | перевищено час       |
| tool_restricted         | заборонене в режимі  |
| tool_invalid_args       | некоректні аргументи |
| tool_sandbox_violation  | порушено правила     |
| tool_internal_error     | помилка сервісу      |

---

## 13. Auditing & Logging

- запис кожного tool invocation:
  - tool name,
  - agent_run_id,
  - tokens used,
  - duration,
  - result (ok/error).

- plaintext не зберігається.

---

## 14. Governance Hooks

Governance може:

- вимикати/вмикати інструменти,
- змінювати rate limits,
- вимагати додатковий stake RINGK для категорії C/D,
- додавати або видаляти платформні інструменти,
- регулювати доступ до GreenFood/EnergyUnion.

---

## 15. Integration with Other Docs

Цей документ доповнює:

- `36_agent_runtime_isolation_and_sandboxing.md`
- `12_agent_runtime_core.md`
- `32_policy_service_PDP_design.md`
- `31_governance_policies_for_capabilities_and_quotas.md`
- `DAARION_city_platforms_catalog.md`

---

## 16. Завдання для Cursor

```text
You are a senior backend engineer. Implement Agent Tools & Plugins system using:
- 37_agent_tools_and_plugins_specification.md
- 36_agent_runtime_isolation_and_sandboxing.md
- 32_policy_service_PDP_design.md

Tasks:
1) Create Tool Proxy service.
2) Implement tool categories (A, B, C, D) with security rules.
3) Create tool execution contract (request/response format).
4) Integrate PDP checks for tool invocations.
5) Implement built-in tools (math, text, memory, embeddings, calendar, project, task, etc.).
6) Create Plugins API (Plugin Manifest, Plugin Runtime, Plugin Security Model).
7) Implement platform tool contracts (GREENFOOD, EnergyUnion).
8) Add confidential mode restrictions for tools.
9) Implement error model and auditing/logging.
10) Add governance hooks for tool management.

Output:
- list of modified files
- diff
- summary
```

---

## 17. Summary

Ця специфікація формує:

- повний набір інструментів,
- безпечну модель доступу,
- zero-trust взаємодію,
- механізм розширення через Plugins,
- жорстку ізоляцію,
- чіткі capability-коди,
- контроль вартості (compute cost),
- сумісність із confidential режимом,
- інтеграцію з PDP/PEP,
- можливість підключення платформ DAARION через безпечні tool-plugins.

Це — **DAARION Tool Fabric**, центральна платформа інструментів агентів.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


