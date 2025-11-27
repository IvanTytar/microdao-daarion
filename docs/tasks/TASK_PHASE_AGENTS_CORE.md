# TASK_PHASE_AGENTS_CORE.md

DAARION — AGENTS CORE IMPLEMENTATION

## 0. Ціль

Реалізувати ядро агентної системи:

- agent registry
- agent filtering
- agent.invoke → agent.reply
- NATS subjects
- quota & rate-limits
- agent-runs logging
- agent console API
- agent presence

Все на основі Data Model & Event Catalog.

---

## 1. Структура

```
services/
  agents/
    agent_filter.py
    agent_router.py
    agent_executor.py
    models.py
    schemas.py
    routes.py
    nats/
      subjects.py
      publisher.py
      subscriber.py
```

---

## 2. NATS Subjects

### Publish:

- `integration.matrix.message` (stub)
- `agents.invoke`
- `agents.reply`
- `agents.error`
- `agents.telemetry`
- `agents.runs.created`
- `agents.runs.finished`

### Subscribe:

- `message.created`
- `task.created`
- `event.user.action`

---

## 3. agent_filter.py

Функції:

```python
def filter_message(message):
    # - detect spam
    # - detect commands
    # - route to agent if needed
    # - block restricted content
    pass
```

Вихід:

- "allow"
- "deny"
- "agent:<agentId>"

---

## 4. agent_router.py

Логіка:

```python
def route(agent_id, payload):
    # publish to NATS -> agents.invoke
    pass
```

---

## 5. agent_executor.py

Stub реалізація:

- виклик локальної LLM (gRPC/HTTP)
- timeout
- tokens count
- save run in DB

---

## 6. API endpoints

### POST `/agents/{id}/invoke`

### GET `/agents/{id}/runs`

### GET `/agents/{id}`

---

## 7. Quotas

limits:

- tokens/minute
- runs/day
- users/day

---

## 8. Acceptance Criteria

- агент отримує запит
- агент відповідає через WS
- runs логуються
- quotas працюють
- agent_filter перехоплює підозрілі повідомлення
- NATS події працюють

---

## 9. Команда до Cursor

**"Реалізувати Agents Core згідно TASK_PHASE_AGENTS_CORE.md.  
Створити всі файли й інтеграцію з NATS."**

