# TASK_PHASE7_BACKEND_COMPLETION.md

## PHASE 7 — microDAO Console Backend Completion

### Goal

Доробити бекенд для **microdao-service** до production-ready стану:

- повний CRUD для microDAO;
- учасники (members) з ролями;
- проста казна (treasury) з балансами;
- налаштування (settings);
- PDP + Auth перевірки;
- базові NATS-події;
- інтеграція з існуючим фронтендом microDAO Console (MVP вже є).

---

## 0. Вихідні умови (вважати, що вже є)

З попереднього Phase 7 (MVP) вже створено:

- `migrations/008_create_microdao_core.sql` (схема БД);
- `services/microdao-service/main.py` (FastAPI-скелет, health endpoint);
- `services/microdao-service/models.py` (базові Pydantic-схеми);
- `services/microdao-service/requirements.txt`, `Dockerfile`;
- фронтенд:
  - `src/api/microdao.ts` (чернетка);
  - `src/features/microdao/MicrodaoListPage.tsx`;
  - `src/features/microdao/MicrodaoConsolePage.tsx` (MVP з tabs);
- інфраструктура:
  - `docker-compose.phase7.yml`;
  - `scripts/start-phase7.sh`, `scripts/stop-phase7.sh`.

Цей таск ДОПОВНЮЄ вже створене, НЕ переписує з нуля.

---

## 1. Database: верифікація та дрібний тюнінг

1. Відкрити `migrations/008_create_microdao_core.sql` і переконатися, що там є таблиці:

```sql
microdaos (
  id uuid primary key,
  external_id text unique not null,
  slug text unique not null,
  name text not null,
  description text,
  owner_user_id uuid not null references users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

microdao_members (
  id uuid primary key,
  microdao_id uuid not null references microdaos(id),
  user_id uuid not null references users(id),
  role text not null,        -- 'owner' | 'admin' | 'member' | 'guest'
  joined_at timestamptz not null default now()
);

microdao_treasury (
  id uuid primary key,
  microdao_id uuid not null references microdaos(id),
  token_symbol text not null,
  balance numeric(30, 8) not null default 0,
  updated_at timestamptz not null default now()
);

microdao_settings (
  id uuid primary key,
  microdao_id uuid not null references microdaos(id),
  key text not null,
  value jsonb
);
```

2. Додати індекси, якщо їх ще немає:

```sql
create index if not exists idx_microdao_members_user_id
  on microdao_members(user_id);

create index if not exists idx_microdao_members_microdao_id_role
  on microdao_members(microdao_id, role);

create index if not exists idx_microdao_treasury_microdao_id
  on microdao_treasury(microdao_id);
```

3. Переконатися, що міграція **застосована** до dev-БД.

---

## 2. Repository layer для microDAO

Створити/оновити `services/microdao-service/repository_microdao.py`:

### 2.1. Вважати, що вже є спільний модуль для БД

Подивитися, як це зроблено в `agents-service` / `messaging-service` (наприклад, `database.py` або `db.py` з `async_session` або `Pool`):

* використовувати **той самий підхід** (SQLAlchemy / asyncpg), НЕ вводити новий.

### 2.2. Оголосити інтерфейс

У `repository_microdao.py` реалізувати функції (асинхронні, якщо так прийнято):

```python
# Псевдо-інтерфейс, реалізувати згідно з існуючим стилем проєкту

async def create_microdao(db, *, owner_user_id: uuid.UUID, slug: str, name: str, description: str | None) -> MicrodaoRead: ...
async def update_microdao(db, *, microdao_id: uuid.UUID, data: MicrodaoUpdate) -> MicrodaoRead | None: ...
async def delete_microdao(db, *, microdao_id: uuid.UUID) -> None: ...
async def get_microdao_by_slug(db, slug: str) -> MicrodaoRead | None: ...
async def get_microdao_by_id(db, microdao_id: uuid.UUID) -> MicrodaoRead | None: ...
async def list_microdaos_for_user(db, user_id: uuid.UUID) -> list[MicrodaoRead]: ...
```

### 2.3. Members

```python
async def list_members(db, microdao_id: uuid.UUID) -> list[MicrodaoMember]: ...
async def add_member(db, microdao_id: uuid.UUID, user_id: uuid.UUID, role: str) -> MicrodaoMember: ...
async def remove_member(db, member_id: uuid.UUID) -> None: ...
```

Правила:

* при створенні microDAO — власник автоматично додається в `microdao_members` з `role='owner'`;
* при видаленні microDAO (`delete_microdao`) — або `is_active=false`, або м'яке видалення (краще `is_active=false`).

### 2.4. Treasury

```python
async def get_treasury_items(db, microdao_id: uuid.UUID) -> list[TreasuryItem]: ...
async def apply_treasury_delta(db, microdao_id: uuid.UUID, token_symbol: str, delta: Decimal) -> TreasuryItem: ...
```

* `delta` може бути додатним/від'ємним;
* гарантувати, що `balance` не йде в мінус без крайньої потреби (можна кидати помилку при `balance+delta < 0`).

### 2.5. Settings

```python
async def get_settings(db, microdao_id: uuid.UUID) -> dict[str, Any]: ...
async def upsert_setting(db, microdao_id: uuid.UUID, key: str, value: Any) -> None: ...
```

* повернути `dict[key] = value` для фронтенду.

---

## 3. Pydantic models — models.py

Оновити `services/microdao-service/models.py`:

```python
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class MicrodaoBase(BaseModel):
    slug: str
    name: str
    description: str | None = None


class MicrodaoCreate(MicrodaoBase):
    pass


class MicrodaoUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class MicrodaoRead(MicrodaoBase):
    id: str
    external_id: str
    owner_user_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class MicrodaoMember(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime


class TreasuryItem(BaseModel):
    token_symbol: str
    balance: Decimal


class MicrodaoSettings(BaseModel):
    values: dict[str, object]
```

За потреби вирівняти з уже існуючими типами в проєкті.

---

## 4. Routes: REST API для microDAO

Створити/оновити `services/microdao-service/routes_microdao.py`:

### 4.1. Auth + PDP клієнти

Створити `auth_client.py`, `pdp_client.py` (або використати спільні з інших сервісів, якщо вони вже є).

Мінімум:

```python
async def get_actor_identity(request) -> ActorIdentity: ...
async def check_permission(actor, action: str, resource: dict) -> None:
    # кинути HTTPException(403) якщо deny
```

### 4.2. Endpoints

```python
from fastapi import APIRouter, Depends, HTTPException
from .models import MicrodaoCreate, MicrodaoUpdate, MicrodaoRead, MicrodaoMember, TreasuryItem
from . import repository_microdao as repo

router = APIRouter(prefix="/microdao", tags=["microdao"])
```

#### GET `/microdao`

Повертає всі microDAO, де actor є member:

* `actor = get_actor_identity()`
* `repo.list_microdaos_for_user(db, actor.user_id)`

#### POST `/microdao`

Створює новий microDAO:

* PDP: `action="MICRODAO_CREATE"`
* `owner_user_id = actor.user_id`
* виклик `repo.create_microdao(...)`
* автоматично створити запис в `microdao_members` з `role='owner'`.

#### GET `/microdao/{slug}`

* знайти microDAO по `slug`;
* PDP: `action="MICRODAO_READ"`, `resource={"microdao_id": id}`;
* повернути `MicrodaoRead`.

#### PUT `/microdao/{slug}`

* PDP: `action="MICRODAO_MANAGE"`;
* дозволити тільки owner/admin;
* оновити `name/description/is_active`.

#### DELETE `/microdao/{slug}`

* PDP: `action="MICRODAO_MANAGE"`;
* `is_active=false` (soft delete).

---

## 5. Routes: Members / Treasury / Settings

### 5.1. Members

У `routes_members.py` (або в тому ж `routes_microdao.py`, якщо ти тримаєш все разом):

```python
GET    /microdao/{slug}/members
POST   /microdao/{slug}/members
DELETE /microdao/{slug}/members/{member_id}
```

Правила:

* тільки owner/admin можуть:
  * додавати членів;
  * видаляти членів;
  * змінювати роль (якщо імплементуєш PATCH).
* простий body для POST:
  * `user_id: str`
  * `role: str`

### 5.2. Treasury

```python
GET  /microdao/{slug}/treasury
POST /microdao/{slug}/treasury   # delta operation
```

* PDP: `READ_TREASURY` для GET, `MANAGE_TREASURY` для POST.

### 5.3. Settings

```python
GET  /microdao/{slug}/settings
POST /microdao/{slug}/settings   # { key, value }
```

---

## 6. NATS Events

У `main.py` microdao-service або в окремому модулі:

* Підключитися до NATS (використати той самий клієнт, що в інших сервісах).
* Функція helper:

```python
async def publish_event(subject: str, payload: dict) -> None: ...
```

Викликати:

* при `create_microdao`:
  * subject: `microdao.event.created`
* при `update_microdao`:
  * `microdao.event.updated`
* при додаванні/видаленні члена:
  * `microdao.event.member_added`
  * `microdao.event.member_removed`
* при оновленні treasury:
  * `microdao.event.treasury_updated`

Payload мінімальний:

```json
{
  "microdao_id": "...",
  "slug": "daarion-city",
  "actor_id": "user:...",
  "ts": "2025-11-24T12:00:00Z",
  "data": { ... }
}
```

---

## 7. Інтеграція в main.py

Оновити `services/microdao-service/main.py`:

* створити `app = FastAPI(...)`
* підключити `router`:

```python
from .routes_microdao import router as microdao_router
app.include_router(microdao_router)
# за потреби: members_router, treasury_router
```

* додати `/health` endpoint (якщо ще не зроблено).

---

## 8. Frontend: використати реальний бекенд

Оновити `src/api/microdao.ts`:

* `getMyMicrodaos() → GET /microdao`
* `getMicrodao(slug) → GET /microdao/{slug}`
* `createMicrodao(payload) → POST /microdao`
* `getMicrodaoMembers(slug) → GET /microdao/{slug}/members`
* `getMicrodaoTreasury(slug) → GET /microdao/{slug}/treasury`
* `getMicrodaoSettings(slug) → GET /microdao/{slug}/settings`

Потім оновити:

* `MicrodaoListPage.tsx`:
  * щоб брав дані з `getMyMicrodaos()`;
* `MicrodaoConsolePage.tsx`:
  * Overview → `getMicrodao(slug)`;
  * Members tab → `getMicrodaoMembers(slug)`;
  * Treasury tab → `getMicrodaoTreasury(slug)`.

---

## 9. Docker / Scripts

Оновити (якщо потрібно):

* `docker-compose.phase7.yml`:
  * переконатися, що `microdao-service` піднятий і залежить від Postgres та auth/pdp;
* `scripts/start-phase7.sh`:
  * додати команду застосування міграції `008` (як це робиться для інших);
* `scripts/stop-phase7.sh`:
  * зупинити microdao-service і пов'язані сервіси.

---

## 10. Acceptance Criteria

Вважати завдання виконаним, якщо:

* [ ] `/microdao` повертає список microDAO, де actor є member;
* [ ] `/microdao` (POST) створює новий microDAO і додає owner в members;
* [ ] `/microdao/{slug}` повертає деталі microDAO;
* [ ] `/microdao/{slug}/members` повертає список учасників;
* [ ] `/microdao/{slug}/treasury` повертає список токенів;
* [ ] PDP блокує доступ до чужих microDAO (403);
* [ ] MicrodaoListPage показує **реальні** microDAO із БД;
* [ ] MicrodaoConsolePage показує **реальні** Overview/Members/Treasury без mock-даних;
* [ ] всі тести/линт проходять успішно.

END OF TASK

