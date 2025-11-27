# TASK PHASE 9 — LIVING MAP (FULL STACK SERVICE)

Version: 1.0  
Status: READY FOR IMPLEMENTATION  
Scope: Backend + WebSocket + NATS + Minimal Frontend Hook

## 1. Context

DAARION уже має:

- core сервіси:
  - `messaging-service` (Matrix-aware Messenger)
  - `agent-runtime`, `agent-filter`, `dagi-router`
  - `llm-proxy`, `memory-orchestrator`, `toolcore`
  - `auth-service`, `pdp-service`, `usage-engine`
  - `agents-service` (Agent Hub + lifecycle)
  - `microdao-service` (microDAO Console)
  - `dao-service` (DAO Dashboard)
  - `city-service`, `space-service`
- інфраструктуру:
  - PostgreSQL
  - NATS JetStream
  - docker-compose для різних фаз
  - WebSocket-потоки для окремих модулів

Потрібен **єдиний "Living Map" шар**, який агрегує стан всієї мережі:

- City (microDAO, метрики)
- Space (DAO-планети, ноди)
- Nodes (ресурси, алерти)
- Agents (статус, використання)
- DAO (голосування, proposals)
- Messaging (активність каналів)

і видає це:

- через `GET /living-map/snapshot` (full-state)
- через `GET /living-map/history` (event log)
- через `GET /living-map/entities` (каталог сутностей)
- через `WS /living-map/stream` (живий потік подій).

Цей таск — **backend + API + NATS + WS + базовий frontend hook**.

---

## 2. Goals

1. Створити сервіс `living-map-service` (FastAPI), порт `7017`.
2. Зібрати стан мережі з існуючих сервісів **в один snapshot**.
3. Підписатися на ключові NATS-сабджекти й зберігати історію в `living_map_history`.
4. Віддавати:
   - `snapshot` (HTTP)
   - `history` (HTTP)
   - `real-time stream` (WS).
5. Додати мінімальну фронтенд-обгортку `useLivingMapFull` (React hook) для інтеграції з 2D/3D UI.

---

## 3. Architecture Overview

### 3.1. New service: `living-map-service`

- Stack: Python 3 + FastAPI + uvicorn
- Port: `7017`
- Responsibilities:
  - Агрегувати дані з:
    - `city-service` (city snapshot)
    - `space-service` (planets/nodes/events)
    - `agents-service` (agents, metrics, events)
    - `microdao-service` (microDAOs)
    - `dao-service` (dao, proposals, votes)
    - `usage-engine` (LLM/tool usage summary)
  - Нормалізувати в **єдину структуру сцени**:
    - `scene.layers.city`
    - `scene.layers.space`
    - `scene.layers.nodes`
    - `scene.layers.agents`
    - `scene.meta` (timestamps, version)
  - Підписуватись на NATS-subject'и й створювати event log.
  - Видавати snapshot/history + WebSocket stream.

### 3.2. Data sources (HTTP)

Очікувані існуючі/доступні ендпоінти (можна створити прості адаптери, якщо їх ще нема):

- `city-service`:
  - `GET http://city-service:7001/api/city/snapshot`
- `space-service`:
  - `GET http://space-service:7002/api/space/scene` або окремо planets/nodes/events
- `agents-service`:
  - `GET http://agents-service:7014/agents` (list)
  - `GET http://agents-service:7014/agents/metrics` (summary)
- `microdao-service`:
  - `GET http://microdao-service:7015/microdaos` (list)
- `dao-service`:
  - `GET http://dao-service:7016/dao` (list)
  - `GET http://dao-service:7016/dao/proposals/summary`
- `usage-engine`:
  - `GET http://usage-engine:7013/internal/usage/summary?period_hours=24`

Якщо чогось немає — зробити простий adapter/placeholder з mock даними всередині `living-map-service`.

### 3.3. NATS Subjects

Потрібно підписатися на:

- `city.event.*`
- `dao.event.*`
- `microdao.event.*`
- `node.metrics.*`
- `agent.event.*`
- `usage.llm.*`
- `usage.agent.*`
- `messaging.message.created`

(Якщо частина сабджектів ще не існує — підготувати consumer з graceful handling та вимкненими/placeholder subscriptions.)

---

## 4. API Specification

### 4.1. `GET /living-map/health`

Простий health-check.

```json
{
  "status": "ok",
  "service": "living-map-service",
  "version": "1.0.0",
  "time": "2025-11-24T12:34:56Z"
}
```

### 4.2. `GET /living-map/snapshot`

Агрегований стан усієї мережі.

Response (спрощений приклад):

```json
{
  "generated_at": "2025-11-24T12:34:56Z",
  "layers": {
    "city": {
      "microdaos_total": 12,
      "active_users": 57,
      "active_agents": 34,
      "health": "green",
      "items": [
        {
          "id": "microdao:7",
          "slug": "daarion-city",
          "name": "DAARION City",
          "status": "active",
          "agents": 9,
          "nodes": 3
        }
      ]
    },
    "space": {
      "planets": [
        {
          "id": "dao:daarion-core",
          "name": "DAARION CORE",
          "type": "dao",
          "orbits": ["node:gpu-1", "node:gpu-2"],
          "status": "active"
        }
      ],
      "nodes": [
        {
          "id": "node:gpu-1",
          "name": "NODE1",
          "cpu": 0.42,
          "gpu": 0.77,
          "memory": 0.63,
          "alerts": []
        }
      ]
    },
    "nodes": {
      "items": [
        {
          "id": "node:gpu-1",
          "microdao_id": "microdao:7",
          "status": "online",
          "metrics": {
            "cpu": 0.42,
            "gpu": 0.77,
            "ram": 0.63,
            "net_in": 12345,
            "net_out": 9876
          }
        }
      ]
    },
    "agents": {
      "items": [
        {
          "id": "agent:sofia",
          "name": "Sofia",
          "kind": "system",
          "microdao_id": "microdao:7",
          "status": "online",
          "usage": {
            "llm_calls_24h": 123,
            "tokens_24h": 45678
          }
        }
      ]
    }
  },
  "meta": {
    "source_services": [
      "city-service",
      "space-service",
      "agents-service",
      "microdao-service",
      "dao-service",
      "usage-engine"
    ]
  }
}
```

### 4.3. `GET /living-map/entities`

Плоский список сутностей з мінімальними даними для побудови legend/списків.

Query params:

* `type` (optional): `city|space|node|agent|dao|microdao|channel`
* `limit` (optional, default 100)

Response:

```json
{
  "items": [
    {
      "id": "microdao:7",
      "type": "microdao",
      "label": "DAARION City",
      "status": "active",
      "layer": "city"
    },
    {
      "id": "dao:daarion-core",
      "type": "dao",
      "label": "DAARION CORE DAO",
      "status": "active",
      "layer": "space"
    }
  ]
}
```

### 4.4. `GET /living-map/entities/{id}`

Детальний опис сутності (проксі до відповідного сервісу з нормалізацією).

Response (узагальнений):

```json
{
  "id": "agent:sofia",
  "type": "agent",
  "layer": "agents",
  "data": {
    "...": "raw or normalized fields"
  }
}
```

### 4.5. `GET /living-map/history`

Історія подій Living Map.

Query params:

* `since` (optional, ISO datetime)
* `limit` (optional, default 200)

Response:

```json
{
  "items": [
    {
      "id": "evt-uuid",
      "timestamp": "2025-11-24T12:30:00Z",
      "event_type": "node.metrics.update",
      "payload": {
        "node_id": "node:gpu-1",
        "cpu": 0.8,
        "gpu": 0.95
      }
    }
  ]
}
```

### 4.6. `WS /living-map/stream`

WebSocket-потік:

* Типи повідомлень:

  * `snapshot` — повний стан (на підключення та за потреби)
  * `event` — одинична подія
* Формат:

```json
{
  "kind": "event",
  "event_type": "agent.event.status",
  "timestamp": "2025-11-24T12:34:56Z",
  "payload": { ... }
}
```

---

## 5. Database Schema

Створити міграцію, наприклад: `migrations/010_create_living_map_tables.sql`.

```sql
CREATE TABLE IF NOT EXISTS living_map_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_living_map_history_timestamp
  ON living_map_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_living_map_history_event_type
  ON living_map_history (event_type);
```

---

## 6. Implementation Plan

### 6.1. Files to create

* `services/living-map-service/main.py`
* `services/living-map-service/models.py`
* `services/living-map-service/repository_history.py`
* `services/living-map-service/adapters/city_client.py`
* `services/living-map-service/adapters/space_client.py`
* `services/living-map-service/adapters/agents_client.py`
* `services/living-map-service/adapters/microdao_client.py`
* `services/living-map-service/adapters/dao_client.py`
* `services/living-map-service/adapters/usage_client.py`
* `services/living-map-service/nats_subscriber.py`
* `services/living-map-service/ws_stream.py`
* `services/living-map-service/Dockerfile`
* `services/living-map-service/requirements.txt`
* `docker-compose.phase9.yml` (або оновити загальний)
* `scripts/start-phase9.sh`
* `scripts/stop-phase9.sh`
* `migrations/010_create_living_map_tables.sql`
* Frontend:

  * `src/features/livingMap/hooks/useLivingMapFull.ts`

### 6.2. Minimal frontend hook

`useLivingMapFull.ts`:

* `GET /living-map/snapshot` → зберігає state
* Підключає WS `/living-map/stream`
* При `kind=event` оновлює локальний state (immutable update)
* Повертає:

  * `snapshot`
  * `events`
  * `isLoading`
  * `error`
  * `connectionStatus`

---

## 7. Security / Auth

* Всі HTTP-ендпоінти:

  * Перевірка JWT/Session через `auth-service` (ActorContext).
* Опціонально, `GET /living-map/snapshot` може мати:

  * `public_mode` (спрощений, анонімний)
  * або вимагати auth (рекомендовано).
* WS:

  * `Authorization: Bearer <token>` у заголовках.
* NATS:

  * лише internal subjects, використовувати існуючий NATS connection з параметрами як в інших сервісах.

---

## 8. TODO Checklist

Backend:

* [ ] Створити міграцію `010_create_living_map_tables.sql`
* [ ] Створити `living-map-service` структуру
* [ ] Реалізувати адаптери до інших сервісів (з timeout/retry)
* [ ] Реалізувати `GET /living-map/health`
* [ ] Реалізувати `GET /living-map/snapshot`
* [ ] Реалізувати `GET /living-map/entities`
* [ ] Реалізувати `GET /living-map/entities/{id}`
* [ ] Реалізувати `GET /living-map/history`
* [ ] Реалізувати `WS /living-map/stream`
* [ ] Реалізувати `nats_subscriber.py` для key subjects
* [ ] Інтегрувати Auth/PDP (як у інших сервісах)
* [ ] Додати Dockerfile + requirements.txt
* [ ] Оновити docker-compose/script'и
* [ ] Додати базові unit tests (snapshot builder)

Frontend:

* [ ] Створити `useLivingMapFull.ts`
* [ ] Протестувати запит snapshot + WS stream (можна через тимчасовий debug-компонент)

---

## 9. Acceptance Criteria

1. `docker-compose -f docker-compose.phase9.yml up -d` піднімає `living-map-service` без помилок.
2. `GET /living-map/health` повертає `status=ok`.
3. `GET /living-map/snapshot` повертає валідний JSON з `layers.city`, `layers.space`, `layers.nodes`, `layers.agents`.
4. `GET /living-map/history` повертає список подій, які приходять з NATS.
5. `WS /living-map/stream` надсилає:

   * при підключенні: `kind="snapshot"`
   * далі: `kind="event"` при нових подіях.
6. `useLivingMapFull` успішно підключається до API+WS і оновлює локальний state без TypeScript помилок.
7. Уся нова логіка проходить лінтер та тести.

---

END OF TASK

