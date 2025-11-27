# TASK_PHASE_CITY_BACKEND_FINISHER.md  

DAARION CITY — Backend Completion for Phase 3 (MVP)

Цей таск **закриває City Backend** до рівня, коли MVP можна деплоїти на сервер (daarion.space) і реально користуватись:

- Public Rooms (міські кімнати)
- Presence System (онлайн-статуси)
- Second Me (персональний агент MVP)
- City Home інтеграція (дані для дашборду міста)

Фронтенд уже реалізований (CityRoomsPage, SecondMePage, PresenceBar тощо),  
цей таск — про **backend-реалізацію API + WS + Redis + DB + інтеграцію з Agents Core**.

---

## 0. База / припущення

1. Primary DB: **PostgreSQL** (той самий, що й для microdao).  
2. Cache / presence: **Redis** (ok додати новий контейнер або використовувати існуючий).  
3. Message bus: **NATS JetStream** (вже є для Agents Core).  
4. HTTP API gateway: уже налаштований (`/api/...`, `/ws/...`), ти додаєш нові маршрути.  
5. Існує **Agents Core** з endpoints `/agents/{id}/invoke` і NATS-темами `agents.invoke` / `agents.reply`.

---

## 1. Структура Backend-модулів City

Створити (або доповнити, якщо частково вже є):

```text
services/
  city-service/
    __init__.py
    models.py
    schemas.py
    routes_city.py
    ws_city.py
    presence.py
    feed.py
    rooms.py
    repo.py
  secondme-service/
    __init__.py
    models.py
    schemas.py
    routes_secondme.py
    service_secondme.py
  common/
    redis_client.py      # якщо ще немає
```

І підключити:

* `routes_city.py` і `routes_secondme.py` до основного `main.py` (або відповідного API-aggregator service).
* `ws_city.py` — до WebSocket router'а (`/ws/...`).

---

## 2. PostgreSQL: нові таблиці

### 2.1 Таблиця `city_rooms`

```sql
create table city_rooms (
  id text primary key,              -- room_id, напр. "room_city_general"
  slug text not null unique,        -- "general", "science"
  name text not null,               -- "General", "Science"
  description text null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by text null              -- user_id (u_*)
);
create index ix_city_rooms_slug on city_rooms(slug);
```

### 2.2 Таблиця `city_room_messages`

```sql
create table city_room_messages (
  id text primary key,              -- ksuid/ulid, префікс m_city_
  room_id text not null references city_rooms(id) on delete cascade,
  author_user_id text null,         -- u_*
  author_agent_id text null,        -- ag_*
  body text not null,
  created_at timestamptz not null default now()
);
create index ix_city_room_messages_room_time on city_room_messages(room_id, created_at desc);
```

### 2.3 Таблиця `city_feed_events`

```sql
create table city_feed_events (
  id text primary key,              -- evt_city_*
  kind text not null,               -- 'room_message','agent_reply','system'
  room_id text null references city_rooms(id) on delete set null,
  user_id text null,
  agent_id text null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index ix_city_feed_time on city_feed_events(created_at desc);
```

### 2.4 Таблиця `secondme_sessions` (історія Second Me)

```sql
create table secondme_sessions (
  id text primary key,              -- smsess_*
  user_id text not null,            -- u_*
  created_at timestamptz not null default now()
);

create table secondme_messages (
  id text primary key,              -- smmsg_*
  session_id text not null references secondme_sessions(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index ix_secondme_messages_session_time on secondme_messages(session_id, created_at desc);
```

Для MVP: можна використовувати **одну активну session per user** (останню).

---

## 3. Redis: Presence System

Використати Redis як KV-store для онлайн-присутності:

* key: `presence:user:{user_id}` → value: `"online"`
* TTL: 40 секунд
* WS heartbeat кожні 20 секунд оновлює TTL

### Redis-клієнт

`common/redis_client.py`:

```python
import aioredis
from typing import Optional

_redis = None

async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = await aioredis.from_url(
            os.getenv("REDIS_URL", "redis://redis:6379/0"),
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis
```

---

## 4. HTTP API — City Rooms / Feed

### 4.1 Маршрути (routes_city.py)

Base prefix: **`/city`**.

#### GET `/city/rooms`

* Повертає список всіх кімнат.
* Query params: (optional) `limit`, `offset`.
* Response:

```json
[
  {
    "id": "room_city_general",
    "slug": "general",
    "name": "General",
    "description": "Головна кімната міста",
    "members_online": 42,
    "last_event": "2025-11-23T10:15:00Z"
  }
]
```

`members_online` рахувати через Redis:

* keys: `presence:user:*` → map users → rooms (див. нижче в Presence).

Для MVP можна:

* рахувати `members_online` приблизно: число унікальних `presence:user:*` (спрощено),
* або додати key `presence:room:{room_id}` (більш точно).

#### POST `/city/rooms`

Body:

```json
{
  "name": "Science",
  "slug": "science",
  "description": "Наукова кімната"
}
```

* Генерує `id = room_city_{slug}`.
* Створює запис у `city_rooms`.
* Віддає створену кімнату.

#### GET `/city/rooms/{room_id}`

Returns:

* room meta
* останні 50 повідомлень
* приблизний `members_online`

```json
{
  "room": {
    "id": "room_city_general",
    "name": "General",
    "description": "Головна кімната міста"
  },
  "messages": [
    {
      "id": "m_city_...",
      "author_user_id": "u_123",
      "author_agent_id": null,
      "body": "Привіт місто!",
      "created_at": "..."
    }
  ],
  "members_online": 12
}
```

#### POST `/city/rooms/{room_id}/messages`

* Body:

```json
{
  "body": "Текст повідомлення"
}
```

* Запис у `city_room_messages`.
* Запис у `city_feed_events` з kind = `"room_message"`.
* Публікація WS event (див. WS нижче).
* Повертає створене повідомлення.

#### GET `/city/feed`

* Повертає останні N (наприклад, 20) подій:

```json
[
  {
    "id": "evt_city_...",
    "kind": "room_message",
    "room_id": "room_city_general",
    "user_id": "u_123",
    "payload": {"body": "Текст...", "snippet": "..."},
    "created_at": "..."
  }
]
```

---

## 5. WebSocket — City Rooms + Presence

### 5.1 City Rooms WS (`ws_city.py`)

Шлях (через already existing WS server):

```
/ws/city/rooms/{room_id}
```

Події (JSON):

* Вхідні від клієнта:

```json
{ "event": "room.join", "room_id": "room_city_general" }
{ "event": "room.leave", "room_id": "room_city_general" }
{ "event": "room.message.send", "room_id": "...", "body": "..." }
```

* Вихідні до клієнтів:

```json
{ "event": "room.message", "room_id": "...", "message": { ... } }
{ "event": "room.join", "room_id": "...", "user_id": "u_123" }
{ "event": "room.leave", "room_id": "...", "user_id": "u_123" }
{ "event": "room.presence", "room_id": "...", "user_id": "u_123", "status": "online" }
```

При `room.message.send`:

1. зберегти в DB (`city_room_messages`)
2. зберегти в `city_feed_events`
3. розіслати WS подію `room.message` усім підписникам

### 5.2 Presence WS (`/ws/city/presence`)

* Вхідні:

```json
{ "event": "presence.heartbeat", "user_id": "u_123" }
```

Обробка:

1. `SETEX presence:user:u_123 "online" 40`
2. broadcast (опційно) `presence.update`:

```json
{ "event": "presence.update", "user_id": "u_123", "status": "online" }
```

3. Періодично (background task, наприклад кожні 30 сек):

   * сканувати `presence:user:*`,
   * якщо TTL минув (Redis сам видаляє keys), ws-клієнтам можна розіслати `presence.update` зі статусом `"offline"` (або робити lazy-оновлення при наступних запитах).

---

## 6. Backend для Second Me

### 6.1 Service logic (`secondme-service/service_secondme.py`)

Функції:

```python
async def get_or_create_session(user_id: str) -> SecondMeSession:
    # бере останню сесію або створює нову

async def get_last_messages(user_id: str, limit: int = 5) -> list[SecondMeMessage]:
    # повертає останні 5 повідомлень з secondme_messages

async def invoke_second_me(user_id: str, prompt: str) -> SecondMeMessage:
    # 1. get_or_create_session
    # 2. зберегти user-повідомлення
    # 3. зібрати короткий контекст (останні N повідомлень)
    # 4. викликати Agents Core:
    #    POST /agents/{second_me_agent_id}/invoke
    #    або NATS publish agents.invoke
    # 5. зберегти assistant-відповідь
    # 6. повернути відповідь
```

`second_me_agent_id` поки можна:

* або hardcode (один глобальний Second Me agent),
* або зберігати у таблиці `users` / `agents` як поле.

Для MVP — допустимо hardcode у конфігу.

### 6.2 API (`routes_secondme.py`)

#### POST `/secondme/invoke`

Body:

```json
{ "prompt": "..." }
```

З HTTP-контексту брати `user_id` (із JWT).
Викликати `invoke_second_me`, повернути:

```json
{
  "reply": "Текст відповіді",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

#### GET `/secondme/history`

Query: (optional) `limit`, default 5.
Повернути:

```json
[
  {"role": "user", "content": "...", "created_at": "..."},
  {"role": "assistant", "content": "...", "created_at": "..."}
]
```

---

## 7. Інтеграція з Agents Core

Для Second Me використати стандартний шлях:

* або **HTTP-level**:

  ```text
  POST /agents/{second_me_agent_id}/invoke
  {
    "input": "...prompt+context...",
    "context": { "user_id": "...", "kind": "secondme" }
  }
  ```

* або **NATS** (якщо вже зручно):

  ```json
  {
    "event": "agents.invoke",
    "agent_id": "ag_secondme",
    "payload": {
      "input": "...", 
      "user_id": "u_123",
      "source": "secondme"
    }
  }
  ```

Для MVP допустимо використати HTTP-виклик до Agents Core service.

---

## 8. Конфігурація (ENV)

Додати змінні:

```env
REDIS_URL=redis://redis:6379/0
SECONDME_AGENT_ID=ag_secondme_global
CITY_DEFAULT_ROOMS=general,welcome,builders
```

При старті `city-service`:

* якщо `CITY_DEFAULT_ROOMS` порожній → створити дефолтні кімнати:

  * `room_city_general` ("General")
  * `room_city_welcome` ("Welcome")
  * `room_city_builders` ("Builders")

---

## 9. Acceptance Criteria

### 9.1 Public Rooms

* `GET /city/rooms` повертає список кімнат.
* `POST /city/rooms` створює кімнату, видно в фронтенді.
* `GET /city/rooms/{room_id}` повертає кімнату та останні повідомлення.
* `POST /city/rooms/{room_id}/messages`:

  * зберігає повідомлення в DB,
  * відправляє WS-івент `room.message`,
  * додає запис у `city_feed_events`.

### 9.2 Presence

* при підключенні фронтенду до `/ws/city/presence` і надсиланні `presence.heartbeat`:

  * Redis має ключ `presence:user:<user_id>` із TTL ~40с;
  * інші клієнти отримують `presence.update` (online).

* при припиненні heartbeat ключ зникає → статус offline (або lazily оновлюється).

### 9.3 Second Me

* `POST /secondme/invoke`:

  * робить виклик до Agents Core,
  * повертає текст відповіді,
  * історія зберігається у `secondme_messages`.

* `GET /secondme/history` повертає останні N записів.

### 9.4 City Home

* `GET /city/feed` повертає події (room messages мінімум).
* Frontend City Home (вже реалізований) отримує всі необхідні дані через API.

---

## 10. Команда до Cursor

**"Реалізувати backend для City MVP згідно TASK_PHASE_CITY_BACKEND_FINISHER.md.
Створити city-service (rooms, feed, presence) та secondme-service.
Інтегрувати з Redis (presence) та Agents Core (Second Me).
Не змінювати існуючий фронтенд, тільки підключити API."**

