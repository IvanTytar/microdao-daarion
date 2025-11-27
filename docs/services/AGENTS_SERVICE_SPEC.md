# AGENTS SERVICE SPEC (PORT 7002)
# Version: 1.0.0

---

## 0. PURPOSE

`Agents Service` — це центральний сервіс текстових агентів DAGI:

- надає API для виклику Helion, Helix, Metamorph та інших текстових агентів;
- інтегрується з DAGI Router / ProjectBus / Mesh Directory;
- застосовує:
  - Agent Registry,
  - Context Router,
  - Silence Policy,
  - Throttling,
  - TeamDefinition/ProjectBus контекст.

Це логічний "Runtime осередок" для текстової частини DAGI.

Порт за замовчуванням (NODE1/NODE2): **7002**.

---

## 1. HIGH-LEVEL ARCHITECTURE

```text
[ Gateway (Telegram/Web/Matrix/...) ]
         ↓
  [ DAGI Router (gateway.daarion.city) ]
         ↓
    [ Agents Service (7002) ]
         ↓
   [ LLM Providers / Swapper / DAGI Mesh ]
```

Agents Service отримує **RouterEvent-like** запити від DAGI Router (або внутрішніх сервісів) та:

1. Визначає, які агенти доступні (через AgentRegistry + Mesh Directory + TeamDefinition).
2. Обирає найвідповіднішого/декількох (Context Router).
3. Перевіряє Silence Policy.
4. Застосовує throttling.
5. Викликає відповідний LLM / backend агента.
6. Повертає відповідь + metadata.

---

## 2. DEPENDENCIES

### 2.1. Внутрішні модулі

Agents Service використовує:

* `configs/AGENT_REGISTRY.yaml`
* `configs/AGENT_REGISTRY_SCHEMA.yaml`
* `services/agent_registry_loader.py`
* `services/agent_context_router.py`
* `services/agent_silence_policy.py`
* `services/agent_throttle.py`
* `services/agent_mesh_directory.py`
* `configs/team_definition.yaml`
* `configs/project_bus_config.yaml`

### 2.2. Зовнішні сервіси

* **LLM Provider / Swapper Service** (NODE1/NODE2)
* **NATS** (або інший event-bus) для:

  * ProjectBus,
  * Mesh Directory,
  * M2M-комунікації між агентами.
* **PostgreSQL / Redis** (опційно) для:

  * кешу відповідей,
  * logging / traces.

---

## 3. CONFIGURATION

ENV-змінні:

```env
AGENTS_SERVICE_PORT=7002

AGENT_REGISTRY_PATH=configs/AGENT_REGISTRY.yaml
AGENT_REGISTRY_SCHEMA_PATH=configs/AGENT_REGISTRY_SCHEMA.yaml

TEAM_DEFINITION_PATH=configs/team_definition.yaml
PROJECT_BUS_CONFIG_PATH=configs/project_bus_config.yaml

MESH_DIRECTORY_MODE=inprocess   # "inprocess" | "nats" | "http"
MESH_DIRECTORY_NATS_SUBJECT_BASE=agent.directory

LLM_PROVIDER_BASE_URL=http://localhost:8890  # або інший super-service/swapper

AGENT_THROTTLE_LIMIT_PER_MINUTE=3
AGENT_THROTTLE_WINDOW_SECONDS=60
```

---

## 4. PUBLIC API (HTTP)

### 4.1. `POST /agents/invoke`

Основний endpoint для DAGI Router та внутрішніх сервісів.

**Request:**

```json
{
  "event": {
    "event_id": "tg:123",
    "source": "telegram",
    "chat": { "id": "123", "type": "group" },
    "user": { "id": "user1", "username": "alex" },
    "team_id": "team-daariandao-core",
    "project_id": "proj-daariandao",
    "text": "helix, перевір api",
    "attachments": {
      "images": [],
      "docs": [],
      "audio": [],
      "geo": [],
      "tables": []
    },
    "flags": {
      "command": null,
      "reply_to": null,
      "confidential_mode": "public"
    }
  },
  "options": {
    "force_agent_id": null,          // якщо заповнено, обійти context router
    "allow_panel_mode": true,        // дозволити кільком агентам відповісти
    "max_agents": 2                  // верхня межа для panel-режиму
  }
}
```

**Response (успішний сценарій):**

```json
{
  "status": "ok",
  "replies": [
    {
      "agent_id": "ag_helix",
      "text": "Ось аналіз API ...",
      "meta": {
        "model": "HELIX_ENGINEER_MODEL",
        "tokens_in": 123,
        "tokens_out": 256,
        "latency_ms": 900
      }
    }
  ],
  "context": {
    "project_id": "proj-daariandao",
    "team_id": "team-daariandao-core",
    "reply_mode": "panel"
  }
}
```

**Response (ніхто не має відповідати):**

```json
{
  "status": "silent",
  "reason": "no_agent_or_policy",
  "context": {
    "project_id": "proj-daariandao",
    "team_id": "team-daariandao-core"
  }
}
```

**Response (throttling):**

```json
{
  "status": "throttled",
  "reason": "rate_limit",
  "agent_id": "ag_helion"
}
```

---

### 4.2. `GET /agents/registry`

Повертає список агентів (тільки для адміністраторів / системних агентів):

**Response:**

```json
{
  "agents": [
    {
      "agent_id": "ag_helion",
      "name": "Helion",
      "role": "assistant",
      "priority": 5,
      "model": "HELION_TEXT_MODEL",
      "skills": ["допоможи", "поясни"],
      "modalities": ["text"],
      "description": "Головний асистент DAARION."
    }
  ]
}
```

---

### 4.3. `GET /agents/instances`

Проксі до Mesh Directory (видно інстанси):

```json
{
  "instances": [
    {
      "agent_id": "ag_helion",
      "instance_id": "ag_helion@noda1-01",
      "node_id": "NODA1",
      "status": "online",
      "project_ids": ["proj-daariandao"],
      "microdao_id": "microdao-root",
      "last_seen": 1732450200.123
    }
  ]
}
```

---

## 5. INTERNAL LOGIC

### 5.1. Pipeline для `/agents/invoke`

Покроковий алгоритм:

1. **Parse event**

   * прийняти `event` (RouterEvent-сумісний payload),
   * витягнути `project_id`, `team_id`, `chat.id`.

2. **Load TeamDefinition**

   * знайти команду по `team_id` (або по `project_id` → команди, які працюють у цьому проекті),
   * зчитати `reply_mode`:

     * `single` / `panel` / `silent`,
     * `max_agents_per_message`.

3. **Load AgentRegistry & MeshDirectory**

   * завантажити список агентів із registry,
   * для кожного, хто в TeamDefinition:

     * перевірити, чи є онлайн інстанси (Mesh Directory).

4. **Context Router**

   * побудувати `AgentDescriptor` для кожного доступного агента (з skills, priority),
   * викликати `select_best_agent(event, descriptors)`:

     * для `single`: обрати 1,
     * для `panel`: обрати до `max_agents_per_message`,
     * для `silent`: можна одразу повернути `status: silent`.

5. **Silence Policy** (per-agent)
   Для кожного кандидата:

   * `should_agent_reply(agent_id, event)`:

     * прямі згадки,
     * команди,
     * приватні чати,
     * контекстна релевантність.

   Якщо жоден не проходить → `status: silent`.

6. **Throttling** (per-agent, per-chat)
   Для кожного, хто пройшов silence policy:

   * `throttle.can_reply(agent_id, chat_id)`:

     * якщо ні → позначити `throttled`,
   * якщо хоча б один агент може відповідати → продовжуємо.

7. **Invoke agents (LLM Provider)**
   Для кожного дозволеного агента:

   * сформувати system prompt (на основі `AGENT_REGISTRY`, ролі, skills),
   * сформувати user/context prompt (із події),
   * відправити в LLM Provider / Swapper Service:

     * `POST /llm/invoke` (або NATS subject `llm.invoke`).

8. **Aggregate response**

   * зібрати `replies` (до N агентів),
   * зібрати `meta` (latency, tokens),
   * повернути у DAGI Router HTTP-відповідь.

---

## 6. INTEGRATION WITH DAGI ROUTER

### 6.1. З боку DAGI Router

При текстовій гілці (без мультимодальності):

```python
# dagi_router.py (схематично)
resp = http.post("http://agents-service:7002/agents/invoke", json={
    "event": router_event_dict,
    "options": {
        "force_agent_id": None,
        "allow_panel_mode": True,
        "max_agents": 2
    }
})
```

Router далі:

* бере `resp["replies"]`,
* конвертує в повідомлення для Gateway (Telegram/Web/Matrix),
* застосовує свої policy (наприклад, фільтрацію ненормативу, якщо треба).

---

## 7. NATS / PROJECT BUS INTEGRATION

Agents Service також:

1. Слухає ProjectBus:

   * `project.<project_id>.chat.mixed` (через DAGI Router),
   * `project.<project_id>.tasks` (можна робити автоматичну обробку задач).

2. Може публікувати події:

   * `project.<project_id>.agents` (наприклад, "Helix взяв task t123"),
   * `project.<project_id>.m2m.*` (M2M/R2D2 комунікація).

Це дозволяє:

* агентам працювати в командах,
* не тільки як chatbot, а як учасники mesh-процесів.

---

## 8. HEALTHCHECK & METRICS

### 8.1. Healthcheck

`GET /healthz`:

```json
{
  "status": "ok",
  "registry_loaded": true,
  "mesh_directory_mode": "inprocess",
  "uptime_seconds": 12345
}
```

### 8.2. Prometheus метрики

* `agents_invocations_total{agent_id, project_id, status}`
* `agents_throttled_total{agent_id}`
* `agents_silent_decisions_total{reason}`
* `agents_llm_latency_ms_bucket{agent_id, le=...}`

---

## 9. LOGGING

Кожен виклик `/agents/invoke` логувати:

* `event_id`, `source`, `chat.id`, `project_id`, `team_id`,
* кандидатів агентів + scores (debug-level),
* остаточно обраних агентів,
* статус: `ok` / `silent` / `throttled` / `error`,
* latency LLM.

Формат: JSON-лог для подальшого аналізу (ELK / Loki / Grafana).

---

## 10. TEST PLAN (SHORT)

Unit-тести (pytest):

1. `test_single_agent_selection()`

   * один агент у команді, простий текст, немає throttling → відповідає.

2. `test_panel_mode_two_agents()`

   * `reply_mode: panel`, `max_agents_per_message: 2`,
   * питання, релевантне Helix і Guardian → відповідають двоє.

3. `test_silence_policy_mentions()`

   * повідомлення без згадок і без ключових слів → `status: silent`.

4. `test_throttling_per_agent()`

   * 4 виклики поспіль у межах 60 сек,
   * `limit_per_minute=3`,
   * 4-й → `status: throttled`.

5. `test_team_definition_loading()`

   * агрегація команд з `team_definition.yaml`,
   * мапінг на project_id.

---

## 11. SUMMARY

Agents Service (7002) — це:

* офіційний текстовий runtime DAGI,
* точка входу для Helion/Helix/Metamorph та інших текстових агентів,
* шар, який:

  * "бачить" всю конфігурацію агентів (Registry),
  * "бачить" живі інстанси (Mesh Directory),
  * враховує TeamDefinition/ProjectBus,
  * контролює поведінку агентів у чатах (silence/panel/throttle).

Після реалізації цього сервісу DAGI Router зможе:

* делегувати всю текстову логіку в єдиний, стандартизований компонент,
* який легко масштабувати між НОДА1/НОДА2 і далі.

