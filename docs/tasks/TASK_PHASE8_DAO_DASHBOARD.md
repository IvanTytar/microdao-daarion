# TASK_PHASE8_DAO_DASHBOARD.md

## PHASE 8 — DAO Dashboard (Governance + Treasury + Voting)

### Goal

Завершити **DAO-рівень governance** поверх вже готового microDAO Console:

- створити **dao-service** (бекенд) з повним CRUD;
- додати **governance models** (simple / quadratic / delegated);
- реалізувати **proposals + votes + treasury**;
- інтегрувати з **PDP/Auth** (Phase 4);
- зробити **DAO Dashboard UI** (frontend);
- підключити **NATS-події** для живого оновлення.

Фінальний результат:  
DAO Dashboard, який показує стан DAO (учасники, казна, пропозиції, голосування) і дозволяє керувати governance.

---

## 0. Вихідні умови

Вважати, що в репозиторії вже є:

- **Phase 1–7 завершені** (Messenger, Agents, LLM, Security, Passkey, Agent Hub, microDAO Console);
- База даних (PostgreSQL) з таблицями `users`, `microdaos`, `microdao_members`, `microdao_treasury`, `microdao_settings`;
- **auth-service**, **pdp-service**, **usage-engine**, **messaging-service**, **agents-service**, **microdao-service**;
- Frontend (React/TS), з:
  - `MicrodaoListPage.tsx`, `MicrodaoConsolePage.tsx`;
  - auth/pdp інтеграцією;
  - Agent Hub UI.

Цей таск додає **новий шар DAO** поверх існуючих microDAO.

---

## 1. Database: DAO Core Schema

Створити нову міграцію:

`migrations/009_create_dao_core.sql`

### 1.1. Таблиці

```sql
-- 1) DAO (верхній рівень governance)
create table if not exists dao (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  microdao_id uuid not null references microdaos(id),
  owner_user_id uuid not null references users(id),
  governance_model text not null default 'simple',   -- 'simple' | 'quadratic' | 'delegated'
  voting_period_seconds integer not null default 604800, -- 7 днів
  quorum_percent integer not null default 20,       -- 20%
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_dao_microdao_id on dao(microdao_id);
create index if not exists idx_dao_owner_user_id on dao(owner_user_id);


-- 2) DAO Members (над microdao_members)
create table if not exists dao_members (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  user_id uuid not null references users(id),
  role text not null, -- 'owner' | 'admin' | 'member' | 'guest'
  joined_at timestamptz not null default now()
);

create index if not exists idx_dao_members_user_id on dao_members(user_id);
create index if not exists idx_dao_members_dao_id_role on dao_members(dao_id, role);


-- 3) DAO Treasury (агрегований шар над microdao_treasury, але на рівні DAO)
create table if not exists dao_treasury (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  token_symbol text not null,
  contract_address text,
  balance numeric(30, 8) not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_dao_treasury_token
  on dao_treasury(dao_id, token_symbol);


-- 4) DAO Proposals
create table if not exists dao_proposals (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'draft', -- 'draft' | 'active' | 'passed' | 'rejected' | 'executed'
  governance_model_override text,       -- optional override
  quorum_percent_override integer
);

create unique index if not exists uq_dao_proposals_slug
  on dao_proposals(dao_id, slug);


-- 5) DAO Votes
create table if not exists dao_votes (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references dao_proposals(id) on delete cascade,
  voter_user_id uuid not null references users(id),
  vote_value text not null,          -- 'yes' | 'no' | 'abstain'
  weight numeric(30, 8) not null,    -- actual weight after applying model
  raw_power numeric(30, 8),          -- до обробки
  created_at timestamptz not null default now()
);

create index if not exists idx_dao_votes_proposal_id on dao_votes(proposal_id);
create unique index if not exists uq_dao_votes_proposal_voter
  on dao_votes(proposal_id, voter_user_id);


-- 6) DAO Roles (додатковий шар, якщо потрібні нестандартні ролі)
create table if not exists dao_roles (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  code text not null,
  name text not null,
  description text
);

create unique index if not exists uq_dao_roles_code
  on dao_roles(dao_id, code);


-- 7) DAO Role Assignments
create table if not exists dao_role_assignments (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  user_id uuid not null references users(id),
  role_code text not null,
  assigned_at timestamptz not null default now()
);

create index if not exists idx_dao_role_assignments_user
  on dao_role_assignments(user_id);


-- 8) DAO Audit Log
create table if not exists dao_audit_log (
  id uuid primary key default gen_random_uuid(),
  dao_id uuid not null references dao(id) on delete cascade,
  actor_user_id uuid references users(id),
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dao_audit_log_dao_id
  on dao_audit_log(dao_id);
```

Перевірити, що міграція застосовується без помилок.

---

## 2. Backend: `dao-service` (FastAPI)

Створити новий сервіс:

`services/dao-service/`:

* `main.py`
* `models.py`
* `repository_dao.py`
* `repository_proposals.py`
* `repository_votes.py`
* `governance_engine.py`
* `nats_events.py`
* `auth_client.py` / `pdp_client.py` (як thin-обгортки над існуючими)
* `requirements.txt`
* `Dockerfile`
* `README.md`

### 2.1. models.py

Оголосити Pydantic-схеми (адаптувати до стилю проєкту):

```python
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class DaoBase(BaseModel):
  slug: str
  name: str
  description: str | None = None


class DaoCreate(DaoBase):
  governance_model: str | None = None
  voting_period_seconds: int | None = None
  quorum_percent: int | None = None


class DaoUpdate(BaseModel):
  name: str | None = None
  description: str | None = None
  governance_model: str | None = None
  voting_period_seconds: int | None = None
  quorum_percent: int | None = None
  is_active: bool | None = None


class DaoRead(DaoBase):
  id: str
  microdao_id: str
  owner_user_id: str
  governance_model: str
  voting_period_seconds: int
  quorum_percent: int
  is_active: bool
  created_at: datetime
  updated_at: datetime


class DaoMember(BaseModel):
  id: str
  user_id: str
  role: str
  joined_at: datetime


class DaoTreasuryItem(BaseModel):
  token_symbol: str
  contract_address: str | None = None
  balance: Decimal


class ProposalBase(BaseModel):
  slug: str
  title: str
  description: str | None = None


class ProposalCreate(ProposalBase):
  start_at: datetime | None = None
  end_at: datetime | None = None


class ProposalRead(ProposalBase):
  id: str
  dao_id: str
  created_by_user_id: str
  created_at: datetime
  start_at: datetime | None
  end_at: datetime | None
  status: str
  governance_model_override: str | None
  quorum_percent_override: int | None


class VoteCreate(BaseModel):
  vote_value: str  # 'yes' | 'no' | 'abstain'


class VoteRead(BaseModel):
  id: str
  proposal_id: str
  voter_user_id: str
  vote_value: str
  weight: Decimal
  raw_power: Decimal | None
  created_at: datetime


class DaoOverview(BaseModel):
  dao: DaoRead
  members_count: int
  active_proposals_count: int
  treasury_items: list[DaoTreasuryItem]
```

---

## 3. Repository layer

### 3.1. `repository_dao.py`

Реалізувати:

```python
async def list_dao_for_user(db, user_id: uuid.UUID) -> list[DaoRead]: ...
async def get_dao_by_slug(db, slug: str) -> DaoRead | None: ...
async def create_dao(db, *, microdao_id, owner_user_id, data: DaoCreate) -> DaoRead: ...
async def update_dao(db, *, dao_id, data: DaoUpdate) -> DaoRead | None: ...
async def soft_delete_dao(db, *, dao_id) -> None: ...
async def list_members(db, dao_id) -> list[DaoMember]: ...
async def add_member(db, dao_id, user_id, role) -> DaoMember: ...
async def remove_member(db, member_id) -> None: ...
async def get_treasury_items(db, dao_id) -> list[DaoTreasuryItem]: ...
```

### 3.2. `repository_proposals.py`

```python
async def list_proposals(db, dao_id: uuid.UUID) -> list[ProposalRead]: ...
async def get_proposal(db, proposal_id: uuid.UUID) -> ProposalRead | None: ...
async def get_proposal_by_slug(db, dao_id, slug) -> ProposalRead | None: ...
async def create_proposal(db, dao_id, created_by_user_id, data: ProposalCreate) -> ProposalRead: ...
async def update_proposal_status(db, proposal_id, status: str) -> ProposalRead | None: ...
```

### 3.3. `repository_votes.py`

```python
async def list_votes_for_proposal(db, proposal_id) -> list[VoteRead]: ...
async def create_or_update_vote(db, proposal_id, voter_user_id, vote_value, weight, raw_power) -> VoteRead: ...
```

---

## 4. Governance Engine

Файл: `services/dao-service/governance_engine.py`

Реалізувати три моделі:

```python
async def calculate_voting_power_simple(actor, dao: DaoRead) -> Decimal:
  # 1 user = 1 голос
  return Decimal(1)

async def calculate_voting_power_quadratic(actor, dao: DaoRead, base_power: Decimal) -> Decimal:
  # weight = sqrt(base_power)
  # base_power може бути, наприклад, кількістю токенів з treasury або окремої таблиці
  from decimal import Decimal, getcontext
  getcontext().prec = 28
  return base_power.sqrt()

async def calculate_voting_power_delegated(actor, dao: DaoRead, delegation_graph) -> Decimal:
  # з урахуванням делегацій
  ...
```

Також функцію **обчислення результату**:

```python
async def evaluate_proposal_outcome(
  dao: DaoRead,
  proposal: ProposalRead,
  votes: list[VoteRead]
) -> dict:
  # рахуємо total weight, yes/no/abstain, quorum, чи passed
  ...
```

---

## 5. NATS Events

Файл: `services/dao-service/nats_events.py`

Функція:

```python
async def publish_event(subject: str, payload: dict) -> None: ...
```

Викликати з backend:

* при створенні DAO:
  `dao.event.created`
* при оновленні DAO:
  `dao.event.updated`
* при оновленні treasury:
  `dao.event.treasury_updated`
* при створенні пропозиції:
  `dao.event.proposal_created`
* при активації/закритті пропозиції:
  `dao.event.proposal_status_changed`
* при голосуванні:
  `dao.event.vote_cast`

---

## 6. Routes (FastAPI)

У `services/dao-service/main.py` створити FastAPI app з router'ами:

### 6.1. Auth/PDP

Створити `auth_client.py`, `pdp_client.py` (як у інших сервісах):

```python
async def get_actor_identity(request) -> ActorIdentity: ...
async def check_permission(actor, action: str, resource: dict) -> None:
  # кинути HTTPException(403) якщо deny
```

### 6.2. DAO Routes

Файл: `routes_dao.py`:

```python
router = APIRouter(prefix="/dao", tags=["dao"])
```

Endpoints:

1. `GET /dao`

   * повертає DAO, де actor є членом:
   * `list_dao_for_user(db, actor.user_id)`

2. `POST /dao`

   * PDP: `DAO_CREATE`
   * body: `DaoCreate`
   * потрібно вказати `microdao_id` (як поле або через контекст)
   * створюємо DAO, додаємо owner у `dao_members` з роллю `owner`.

3. `GET /dao/{slug}`

   * PDP: `DAO_READ`
   * повертає `DaoRead` + агреговану інформацію (можна через `DaoOverview`).

4. `PUT /dao/{slug}`

   * PDP: `DAO_MANAGE`
   * оновити `name/description/governance_model/...`.

5. `DELETE /dao/{slug}`

   * PDP: `DAO_MANAGE`
   * `is_active=false`.

### 6.3. Members Routes

`GET /dao/{slug}/members`
`POST /dao/{slug}/members`
`DELETE /dao/{slug}/members/{memberId}`

### 6.4. Treasury Routes

`GET /dao/{slug}/treasury`
`POST /dao/{slug}/treasury` (delta-операція: `token_symbol`, `delta`)

### 6.5. Proposals & Votes

`GET /dao/{slug}/proposals`
`POST /dao/{slug}/proposals`
`GET /dao/{slug}/proposals/{proposalSlug}`
`POST /dao/{slug}/proposals/{proposalSlug}/activate`
`POST /dao/{slug}/proposals/{proposalSlug}/close`

`GET /dao/{slug}/proposals/{proposalSlug}/votes`
`POST /dao/{slug}/proposals/{proposalSlug}/votes` (create/update vote)

---

## 7. Frontend: DAO Dashboard

У фронтенді створити структуру:

`src/api/dao.ts`
`src/features/dao/DaoListPage.tsx`
`src/features/dao/DaoDashboardPage.tsx`
`src/features/dao/components/...`

### 7.1. API Client

У `src/api/dao.ts`:

```ts
export async function getMyDaos(): Promise<DaoSummary[]> { ... }
export async function getDao(slug: string): Promise<DaoOverview> { ... }
export async function createDao(payload: DaoCreatePayload): Promise<DaoRead> { ... }
export async function getDaoMembers(slug: string): Promise<DaoMember[]> { ... }
export async function getDaoTreasury(slug: string): Promise<DaoTreasuryItem[]> { ... }
export async function getDaoProposals(slug: string): Promise<DaoProposal[]> { ... }
export async function createDaoProposal(slug: string, payload: ProposalCreatePayload): Promise<DaoProposal> { ... }
export async function getDaoProposal(slug: string, proposalSlug: string): Promise<DaoProposalDetail> { ... }
export async function castVote(slug: string, proposalSlug: string, payload: VotePayload): Promise<VoteRead> { ... }
```

Типи — у цьому ж файлі або в `types/dao.ts`.

### 7.2. Сторінки

#### `/dao`

`DaoListPage.tsx`:

* список DAO картками:

  * назва
  * опис
  * governance модель
  * кількість учасників, активних пропозицій
* кнопка "Створити DAO" (dialog → createDao)

#### `/dao/:slug`

`DaoDashboardPage.tsx`:

Tabs:

* Overview:

  * загальна інформація
  * короткі stats (members, proposals, treasury)
* Proposals:

  * список пропозицій
  * кнопка "Створити пропозицію"
  * статуси, дедлайни
* Proposal detail:

  * окрема панель (може бути drawer/side-panel або окрема сторінка)
  * кнопка Vote (Yes/No/Abstain)
  * показ quorum, результатів
* Treasury:

  * список токенів, баланси
  * простий графік
* Members:

  * таблиця учасників
  * роль
* Activity:

  * стрічка подій DAO (з `dao_audit_log` або NATS)

---

## 8. WebSocket / Live Updates (MVP)

Опційно для цієї фази (якщо є час):

* у `dao-service`:

```python
@router.websocket("/ws/dao-events")
async def dao_events_ws(ws: WebSocket):
  # підписка на NATS dao.event.* і пуш у клієнт
  ...
```

* на фронті `useDaoEvents(slug)`:

  * фільтрувати тільки події конкретного DAO;
  * оновлювати списки proposals/treasury.

Якщо часу мало — можна залишити це на наступну фазу, але місце під WS варто зарезервувати.

---

## 9. Інтеграція з microDAO Console

У `MicrodaoConsolePage.tsx` додати:

* секцію `Governance`:

  * якщо для даного microDAO існує DAO → кнопка:

    * "Відкрити DAO Dashboard"
    * `navigate('/dao/' + daoSlug)`
  * якщо не існує DAO → кнопка:

    * "Створити DAO Governance"
    * виклик `createDao({ microdaoId, slug, name, ... })`
      (можна автогенерувати slug з microDAO slug).

---

## 10. Docker / Scripts

Оновити:

* `docker-compose.phase8.yml` (або доповнити існуючий compose):

  * `dao-service` (порт, наприклад, 7016)
* `scripts/start-phase8.sh`:

  * застосування `009` міграції;
  * запуск `dao-service` разом з іншими сервісами.

---

## 11. Acceptance Criteria

Вважати Phase 8 виконаною, якщо:

* [ ] `009_create_dao_core.sql` застосовується без помилок;
* [ ] Запущено `dao-service` з `/health` endpoint;
* [ ] `GET /dao` повертає DAO, де actor є членом;
* [ ] `POST /dao` створює DAO, додає owner у members і публікує `dao.event.created`;
* [ ] `GET /dao/{slug}` повертає overview DAO (включно з members_count, active_proposals_count, treasury_items);
* [ ] `POST /dao/{slug}/proposals` створює пропозицію, `dao.event.proposal_created` публікується;
* [ ] `POST /dao/{slug}/proposals/{proposalSlug}/votes` створює/оновлює голос;
* [ ] у фронтенді `/dao` показує реальні DAO з БД;
* [ ] у фронтенді `/dao/:slug` показує Overview/Proposals/Treasury/Members з реальних endpoint'ів (без mock);
* [ ] PDP блокує доступ до DAO, де actor не є членом (403).

END OF TASK

