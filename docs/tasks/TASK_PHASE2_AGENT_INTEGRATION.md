# TASK: PHASE 2 — Agent Integration (agent_filter + DAGI Router + Agent Runtime)

**Goal:**
Зробити Messenger повноцінно агентним:
- новий сервіс agent_filter, який вирішує, коли й який агент відповідає;
- розширити DAGI Router, щоб маршрутизувати події з Messenger до агентів;
- реалізувати agent-runtime-service, який читає історію каналів, викликає LLM і постить відповіді назад у Messenger.

**Existing:**
- Messenger Module (Matrix-aware, Full Stack) вже реалізований:
  - messaging-service (FastAPI, 9 endpoints + WS)
  - matrix-gateway API spec (services/matrix-gateway/API_SPEC.md)
  - DB schema (channels, messages, channel_members, message_reactions, channel_events)
  - frontend /messenger (ChannelList, MessageList, MessageComposer, WS)
  - NATS, Synapse, matrix-gateway, messaging-service у docker-compose.messenger.yml
- Документація:
  - docs/MESSENGER_MODULE_COMPLETE.md
  - docs/MESSAGING_ARCHITECTURE.md
  - docs/messaging-erd.dbml
  - docs/MESSENGER_TESTING_GUIDE.md

**PHASE 2 складається з 3 підзадач:**

---

## 1) Сервіс agent_filter

**Create new service:** `services/agent-filter/`

**Files:**
- `services/agent-filter/main.py`
- `services/agent-filter/models.py`
- `services/agent-filter/rules.py`
- `services/agent-filter/config.yaml`
- `services/agent-filter/requirements.txt`
- `services/agent-filter/Dockerfile`
- `services/agent-filter/README.md`

**Tech:**
- Python + FastAPI
- NATS JetStream client (python-nats)
- Config з YAML

### 1.1 Models (models.py)

Define Pydantic models:

```python
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class MessageCreatedEvent(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    sender_id: str
    sender_type: Literal["human", "agent"]
    microdao_id: str
    created_at: datetime

class FilterDecision(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    microdao_id: str
    decision: Literal["allow", "deny", "modify"]
    target_agent_id: Optional[str] = None
    rewrite_prompt: Optional[str] = None

class ChannelContext(BaseModel):
    microdao_id: str
    visibility: Literal["public", "private", "microdao"]
    allowed_agents: list[str] = []
    disabled_agents: list[str] = []

class FilterContext(BaseModel):
    channel: ChannelContext
    sender_is_owner: bool = False
    sender_is_admin: bool = False
    sender_is_member: bool = True
    local_time: Optional[datetime] = None
```

### 1.2 Rules (rules.py)

Implement:

```python
def decide(event: MessageCreatedEvent, ctx: FilterContext) -> FilterDecision:
    """
    Baseline rules v1:
    - Якщо event.sender_type == "agent" → decision = "deny" (щоб не було loop).
    - Якщо channel.visibility == "microdao" і є default assistant агента для microDAO:
        - target_agent_id = цей агент (поки можна жорстко прописати в config або заглушка).
    - Якщо час у quiet_hours (23:00–07:00 з config.yaml):
        - decision = "modify"
        - rewrite_prompt = "Відповідай стисло і тільки якщо запит важливий. Не ініціюй розмову сам."
    - Якщо агент заборонений у цьому каналі (agent_id у disabled_agents) → decision = "deny".
    - Якщо немає жодного кандидата → decision = "deny".
    """
    pass
```

**config.yaml:**
```yaml
nats:
  servers: ["nats://nats:4222"]
  messaging_subject: "messaging.message.created"
  decision_subject: "agent.filter.decision"
rules:
  quiet_hours:
    start: "23:00"
    end: "07:00"
  default_agents:
    "microdao:daarion": "agent:sofia"
```

### 1.3 main.py

- Підняти FastAPI:
  - `GET /health` → `{ "status": "ok" }`
  - `POST /internal/agent-filter/test` → приймає MessageCreatedEvent, викликає rules.decide(...), повертає FilterDecision.

- На startup:
  - підʼєднатися до NATS
  - підписатися на subject `messaging.message.created`

**Алгоритм обробки:**
1. Deserialize payload у MessageCreatedEvent.
2. Підібрати ChannelContext:
   - `GET /internal/messaging/channels/{channel_id}/context` (потрібно додати цей endpoint у messaging-service, якщо ще нема).
   - Очікуваний response:
   ```json
   {
     "microdao_id": "...",
     "visibility": "microdao",
     "allowed_agents": ["agent:sofia"],
     "disabled_agents": []
   }
   ```
3. Побудувати FilterContext.
4. Викликати rules.decide(event, ctx).
5. Опублікувати FilterDecision у NATS:
   - subject: `agent.filter.decision`
   - payload: `decision.json()`

### 1.4 Dockerfile + README

- Dockerfile подібний до messaging-service.
- README.md:
  - як запускати локально,
  - як тестувати `/internal/agent-filter/test`,
  - приклад NATS payload.

---

## 2) Розширення DAGI Router під messaging.inbound

**Goal:**
- DAGI Router має слухати `agent.filter.decision` і на основі allow-рішень створювати AgentInvocation і штовхати в `router.invoke.agent`.

### 2.1 NATS subscription

У `services/router/` (або де реалізований DAGI Router):

- Підписка на subject: `agent.filter.decision`.

**Очікуваний payload:** FilterDecision (див. вище).

**Алгоритм:**
- Якщо `decision != "allow"` → ігноруємо.
- Якщо `decision == "allow"` і `target_agent_id` не заданий → логування + ігнор.
- Інакше: побудувати AgentInvocation:

```json
{
  "agent_id": "<target_agent_id>",
  "entrypoint": "channel_message",
  "payload": {
    "channel_id": "<channel_id>",
    "message_id": "<message_id>",
    "matrix_event_id": "<matrix_event_id>",
    "microdao_id": "<microdao_id>",
    "rewrite_prompt": "<rewrite_prompt>"
  }
}
```

Опублікувати у NATS:
- subject: `router.invoke.agent`
- payload: AgentInvocation JSON.

### 2.2 Моделі

Додати в Router:

```python
from pydantic import BaseModel
from typing import Literal

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: dict
```

### 2.3 Конфіг

Файл `router_config.yaml` (або аналог):

```yaml
messaging_inbound:
  enabled: true
  source_subject: "agent.filter.decision"
  target_subject: "router.invoke.agent"
```

### 2.4 HTTP debug endpoint

Додати в Router:

**POST /internal/router/test-messaging**

Body: FilterDecision

Behavior:
- прогнати той самий код, який обробляє NATS event,
- повернути AgentInvocation JSON без публікації у NATS.

---

## 3) Agent Runtime integration з Messenger

**Goal:**
- Реалізувати agent-runtime-service, який:
  - читає контекст каналу (останні повідомлення),
  - читає памʼять агента,
  - викликає LLM через LLM Proxy,
  - постить відповідь у канал через messaging-service.

**Create service:** `services/agent-runtime/`

**Files:**
- `services/agent-runtime/main.py`
- `services/agent-runtime/models.py`
- `services/agent-runtime/llm_client.py`
- `services/agent-runtime/messaging_client.py`
- `services/agent-runtime/memory_client.py`
- `services/agent-runtime/config.yaml`
- `services/agent-runtime/requirements.txt`
- `services/agent-runtime/Dockerfile`
- `services/agent-runtime/README.md`

### 3.1 Models (models.py)

```python
from pydantic import BaseModel
from typing import Literal
from datetime import datetime

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: dict

class ChannelContextMessage(BaseModel):
    sender_id: str
    sender_type: Literal["human", "agent"]
    content: str
    created_at: datetime
```

### 3.2 NATS subscription

**main.py:**
- Підʼєднатись до NATS.
- Підписатися на `router.invoke.agent`.

**Алгоритм:**
1. Deserialize AgentInvocation.
2. Якщо `entrypoint != "channel_message"` → поки що ігноруємо (або лог).
3. Витягти:
   - `agent_id`
   - `channel_id`, `message_id`, `matrix_event_id`, `microdao_id`, `rewrite_prompt` з payload.
4. Завантажити blueprint агента:
   ```http
   GET /internal/agents/{agent_id}/blueprint
   ```
   Очікуваний response:
   ```json
   {
     "id": "...",
     "name": "Sofia-Prime",
     "model": "gpt-4.1",
     "instructions": "System prompt...",
     "capabilities": {...}
   }
   ```
5. Завантажити історію каналу:
   ```http
   GET /internal/messaging/channels/{channel_id}/messages?limit=50
   ```
   → вернути список повідомлень у форматі ChannelContextMessage.

6. Витягти останнє human-повідомлення як user input.

7. Запитати памʼять:
   ```http
   POST /internal/agent-memory/query
   {
     "agent_id": "<agent_id>",
     "microdao_id": "<microdao_id>",
     "channel_id": "<channel_id>",
     "query": "<останній текст користувача>"
   }
   ```
   Очікуваний response: список релевантних фрагментів knowledge base.

8. Побудувати промпт для LLM (llm_client.py):
   - system: інструкції з blueprint +, якщо є, rewrite_prompt
   - context: останні N повідомлень (з імʼям, роллю, часом)
   - memory: релевантні фрагменти
   - user: останній текст користувача

9. Викликати LLM через LLM Proxy:
   ```http
   POST /internal/llm/proxy
   {
     "model": "<з blueprint>",
     "messages": [ {"role": "...", "content": "..."}, ... ]
   }
   ```
   Очікуваний response:
   ```json
   { "content": "<текст відповіді>" }
   ```

10. Надіслати відповідь у канал:
    ```http
    POST /internal/agents/{agentId}/post-to-channel
    {
      "channel_id": "<channel_id>",
      "text": "<llm response>"
    }
    ```
    Цей endpoint вже повинен існувати у messaging-service (як внутрішній).

11. (optional v1) Записати в памʼять:
    ```http
    POST /internal/agent-memory/store
    {
      "agent_id": "<agent_id>",
      "microdao_id": "<microdao_id>",
      "channel_id": "<channel_id>",
      "content": {
        "user_message": "...",
        "agent_reply": "..."
      }
    }
    ```

### 3.3 HTTP debug endpoint

**main.py:**

**POST /internal/agent-runtime/test-channel**

Body: AgentInvocation

Behavior:
- викликає ту саму логіку, що NATS handler,
- але замість реального POST до `/internal/agents/{agentId}/post-to-channel` просто повертає згенерований текст і зібраний prompt (обережно, без секретів у логах).

### 3.4 Docker + README

- Dockerfile за шаблоном інших сервісів.
- README.md:
  - як запускати локально,
  - як тестувати через `/internal/agent-runtime/test-channel`,
  - як дивитись NATS events.

---

## 4) Інтеграція в docker-compose та документацію

### 4.1 docker-compose

- Додати `agent-filter`, `router` (якщо ще не доданий), `agent-runtime` у загальний docker-compose (або створити окремий `docker-compose.agents.yml`).
- Забезпечити доступ до:
  - NATS
  - messaging-service
  - agent-memory-service (якщо вже існує) / stub
  - agents-service (blueprints) / stub
  - llm-proxy-service / stub

### 4.2 Документація

Оновити/додати:
- `docs/MESSAGING_ARCHITECTURE.md` — помітити, що PHASE 2 реалізовано.
- `docs/MESSENGER_COMPLETE_SPECIFICATION.md` — додати розділ "Agent Integration (PHASE 2)" з посиланнями на нові сервіси.
- При потребі: окремий `docs/AGENT_INTEGRATION_PHASE2.md` з коротким описом flow.

---

## Acceptance Criteria

- ✅ Human → пише в канал → agent_filter приймає event → DAGI Router відправляє AgentInvocation → Agent Runtime читає історію й памʼять → агент відповідає в той самий канал → повідомлення відображається у /messenger і в Element.
- ✅ Є мінімум один робочий агент (наприклад, Sofia-Prime), який стабільно відповідає в одному каналі microDAO.
- ✅ Всі сервіси стартують через docker-compose, health-checkи зелені.

---

**Version:** 1.0.0  
**Date:** 2025-11-24  
**Priority:** High  
**Estimated Time:** 4 weeks




