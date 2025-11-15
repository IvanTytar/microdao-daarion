# 36 — Agent Runtime Isolation & Sandboxing (MicroDAO)

*Безпечна ізоляція приватних агентів, sandbox-модель, інструменти, обмеження доступу, мережеві політики, memory policy, E2EE, PDP/PEP інтеграція*

---

## 1. Purpose & Scope

Агенти — найбільш потужний і найбільш небезпечний компонент DAARION.city.

Цей документ визначає:

- як виконується код/логіка агентів,
- які гарантії безпеки надані,
- як працює sandbox,
- які дії дозволені/заборонені,
- як працює інтеграція з PDP,
- які інструменти agent може використовувати,
- як запобігти «втечі із sandbox» і зловживанням,
- як працює memory / summarization у приватних і confidential контекстах.

---

## 2. Threat Model

### 2.1 Загрози від агента

- перегляд приватних даних користувача,
- надмірні виклики LLM (cost explosion),
- шкідливі інструкції (prompt injection),
- доступ до чужих команд,
- маніпуляція гаманцем,
- неконтрольований код (плагін, tool),
- «втеча» в мережу,
- створення небезпечних запитів до Embassy/Wallet.

### 2.2 Загрози для агента

- обмеження через PDP,
- відсутність доступу до plaintext у confidential mode,
- можливі rate-limits,
- відключення інструментів.

---

## 3. Agent Runtime Architecture

```
User/Team → API Gateway (PEP) → Agent Orchestrator → Agent Runtime Sandbox → LLM/Tools
```

Агент виконується в **ізольованому контейнері/воркері**, який:

- обмежений у CPU/RAM,
- не має доступу до файлової системи поза sandbox,
- не має прямого мережевого доступу,
- не має доступу до БД,
- має доступ тільки до дозволених API через internal gateway.

---

## 4. Sandbox Security Model

### 4.1 Isolation Levels

| Layer      | Isolation                            |
| ---------- | ------------------------------------ |
| Process    | кожен агент-run = окремий воркер     |
| Filesystem | read-only FS, tmpfs для runtime      |
| Network    | за замовчуванням повністю відключена |
| Memory     | очищується після кожного run         |
| Tools      | whitelisted                          |
| Logs       | фільтруються, не містять plaintext   |

### 4.2 Namespaces / cgroups

Sandbox використовує:

- CPU limits,
- Memory limits,
- PID isolation,
- Network namespace,
- Seccomp (drop dangerous syscalls).

### 4.3 Banned syscalls

- `fork()`
- `execve()` (крім заздалегідь дозволених sandbox tools)
- `socket()`
- `mount`
- `open` (поза `/tmp/sandbox`)
- `ptrace`

---

## 5. Network Policy

### 5.1 Default: NO NETWORK

Агенти НЕ можуть:

- робити HTTP-запити в інтернет,
- дзвонити сторонні API,
- створювати сокети.

### 5.2 Allowed network flows

Дозволяється ТІЛЬКИ через internal gateway:

| Target                     | Purpose          |
| -------------------------- | ---------------- |
| `/internal/llm/chat`       | LLM inference    |
| `/internal/llm/embeddings` | embeddings       |
| `/internal/router/*`       | tool routing     |
| `/internal/tools/*`        | safe tools       |
| `/internal/usage/*`       | usage accounting |

Sandbox не має прямого доступу до:

- Wallet,
- Embassy,
- RWA,
- DB,
- Projects/Tasks,
- Messaging.

Усе це виконується через Orchestrator (як посередник).

---

## 6. Agent Permissions & PDP Integration

Перед кожним запуском агента:

```text
API Gateway → PDP → allow(agent.run.invoke)
```

Після цього Orchestrator створює sandbox-process.

Всередині sandbox:

- кожен виклик інструменту → PDP check:

  ```text
  action = tool.<name>.invoke
  ```

- якщо capability відсутня →拒否 (deny).

---

## 7. Tools Architecture

Tools = «дозволені інструменти» для агента.

### 7.1 Types of Tools

| Tool          | Доступ         | Ризик    |
| ------------- | -------------- | -------- |
| math          | локальний      | низький  |
| calendar      | internal       | низький  |
| browser-lite  | internal proxy | середній |
| code-executor | sandboxed      | високий  |
| memory        | індексація     | низький  |
| search-lite   | internal       | середній |

### 7.2 Tool Execution Model

```text
Agent → Sandbox → Tool Proxy → Allowed internal API
```

### 7.3 Tool Security Rules

- кожен tool має максимум runtime (timeout),
- memory cap,
- супутні rate-limits,
- PDP capability: `tool.<name>.invoke`.

### 7.4 Dangerous Tools (Require Chief Approval)

- browser (full internet),
- code execution with system calls,
- integration tools (webhooks, external calls).

---

## 8. Agent Memory Model

### 8.1 No persistent state (strict)

Агенти не зберігають:

- внутрішню пам'ять,
- plaintext історію,
- raw messages.

Після виконання:

- sandbox memory очищується,
- зберігається лише «summary» або «embeddings».

### 8.2 Co-Memory Integration

Агент може додавати summary у:

- `comemory_items`

- але не plaintext (особливо у confidential mode).

### 8.3 Confidential Mode

Якщо `team.mode == confidential`, агент:

- НЕ бачить plaintext,
- отримує:
  - embeddings,
  - short summary,
  - user roles,
  - мінімальні метадані.

---

## 9. Prompt Injection Protection

На рівні Orchestrator:

1. перевірка вводу користувача;
2. escaping of dangerous sequences;
3. instruction boundary:

   ```text
   system: "Агент працює ТІЛЬКИ в дозволених межах."
   ```

4. розділення user-prompts і instructions;
5. sandbox-level enforced policy.

---

## 10. Runtime Limits

### 10.1 CPU

- 0.2–1 vCPU на агент-run.

### 10.2 Memory

- 256–1024 MB.

### 10.3 Timeout

- 60–300 секунд (залежно від plan/role).

### 10.4 Parallel Agents

Залежить від:

- плану,
- стейку RINGK,
- governance policy.

Приклад:

```text
Freemium: max_parallel_runs = 1
Casual: 2–3
Premium: 5–10
Platformium: 10–20
```

---

## 11. File System Policy

- read-only root FS,
- дозволено:
  - `/tmp/sandbox` — ephemeral,
- не дозволено:
  - читання системних файлів,
  - запис поза `/tmp`,
  - файлові операції, що залишають слід.

---

## 12. Logging Policy

Агентні логи:

- не зберігають plaintext,
- не містять особистих даних,
- маскують небезпечні інструкції,
- зберігаються до 24–72 год (configurable),
- використовуються для debugging.

---

## 13. Chain-of-Thought Protection

Runtime приховує:

- reasoning chain,
- проміжні кроки LLM,
- внутрішні підказки.

LLM отримує:

- системну інструкцію,
- узгоджені інструментальні виклики,
- стислі контексти.

---

## 14. Deny-List Rules

Sandbox не дозволяє:

- зовнішні HTTP виклики,
- довільний TCP/UDP,
- відкриття файлів поза temp-сферою,
- доступ до DB,
- виконання shell команд,
- spawn процесів,
- код поза дозволеним toolset.

---

## 15. Escalation Prevention

### 15.1 Capability Escalation

- agent keys мають capabilities, що жорстко обмежені:
  - `agent.run.invoke`
  - `tool.*`

### 15.2 Tool Escalation

- немає можливості відкрити:
  - wallet endpoints,
  - governance endpoints,
  - embassy endpoints.

### 15.3 API Escalation

- agent sandbox не може викликати:
  - `/internal/wallet/*`
  - `/internal/embassy/*`
  - `/internal/rwa/*`
  - `/internal/projects/*`
  - `/internal/messages/*`

---

## 16. Governance Hooks for Agents

Governance дозволяє налаштовувати:

- максимальну кількість агентів,
- доступні інструменти,
- тайм-ліміти,
- cost per run,
- доступні потужності (через stake RINGK),
- whitelist/blacklist tools.

---

## 17. Observability

### 17.1 Metrics

- number of runs,
- tokens used,
- average runtime,
- tool usage,
- error rate.

### 17.2 Tracing

- кожен run:
  - trace_id,
  - span_id,
  - parent_id.

### 17.3 Logs

- agent-run logs per run,
- sampled/error-prone runs зберігаються довше.

---

## 18. Agent Cost Control

Механізм, описаний у Document 30:

- облік compute (1T),
- ліміти per plan & stake RINGK,
- cost estimates до старту,
- hard cap.

Example cost policy:

```text
max_cost_per_run = 0.02 1T
max_cost_per_day = 0.5 1T
```

---

## 19. Failure Modes

### 19.1 Infinite loops

Sandbox має:

- max compute instructions,
- max steps,
- timeout.

### 19.2 Crash / OOM Kill

Orchestrator:

- маркує run як failed,
- додає подію `agent.run.failed`.

### 19.3 Network abuse

Неможливе через strict firewall.

### 19.4 Prompt takeover

Захищено instruction boundary.

---

## 20. Integration with Other Docs

Цей документ доповнює:

- `12_agent_runtime_core.md`
- `13_agent_memory_system.md`
- `30_cost_optimization_and_token_economics_infrastructure.md`
- `32_policy_service_PDP_design.md`
- `33_api_gateway_security_and_pep.md`
- `26_security_audit.md`

---

## 21. Завдання для Cursor

```text
You are a senior backend engineer. Implement Agent Runtime Isolation & Sandboxing using:
- 36_agent_runtime_isolation_and_sandboxing.md
- 12_agent_runtime_core.md
- 32_policy_service_PDP_design.md

Tasks:
1) Create sandbox environment with process isolation (cgroups, namespaces).
2) Implement network policy (default deny, allow-list for internal APIs).
3) Set up filesystem policy (read-only root, tmpfs for /tmp/sandbox).
4) Implement syscall filtering (seccomp, banned syscalls).
5) Create tool proxy system for safe tool execution.
6) Integrate PDP checks for tool invocations.
7) Implement memory cleanup after each run.
8) Add prompt injection protection.
9) Set up runtime limits (CPU, memory, timeout).
10) Implement logging policy (no plaintext, masking).
11) Add observability (metrics, tracing, logs).

Output:
- list of modified files
- diff
- summary
```

---

## 22. Summary

Модель безпеки Agent Runtime гарантує:

- повну ізоляцію кожного агентного run,
- безпечні інструменти,
- zero-trust доступ до внутрішніх сервісів,
- E2EE сумісність confidential mode,
- контроль compute-витрат,
- відсутність витоку даних від команд до команд,
- неможливість ескалації доступів,
- захист від prompt injection,
- детальну observability.

Агенти перетворюються з «небезпечної чорної скриньки» у **контрольовану, передбачувану, економічно-керовану частину DAARION OS**.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


