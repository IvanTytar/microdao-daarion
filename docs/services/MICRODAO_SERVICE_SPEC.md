# MICRODAO SERVICE SPEC (PORT 7004)
# Version: 1.0.0

---

## 0. PURPOSE

`MicroDAO Service` — це базовий сервіс DAO-логіки для DAARION.city:

- створення та управління microDAO (райони, команди, проєкти),
- членство, ролі та entitlements (RBAC),
- пропозиції (proposals) та голосування (voting),
- інтеграція з ProjectBus, TeamDefinition та Agents Service,
- точка правди про те, хто що може в межах кожного microDAO.

**Фокус цієї версії (MVP):**

- Off-chain governance (Postgres + NATS),
- без обов'язкового підключення до on-chain токенів (місце закладене, але може бути пустим).

Порт за замовчуванням: **7004**.

---

## 1. CORE CONCEPTS

### 1.1. MicroDAO

Легка DAO-одиниця в екосистемі DAARION:

- має `microdao_id` (наприклад, `microdao-root`, `microdao-greenfood`),
- опис, місію, набір учасників,
- пов'язане з одним або кількома `project_id`,
- має власні:
  - ролі,
  - entitlements (доступи, дозволи),
  - voting-параметри.

### 1.2. Membership

Учасники microDAO:

- `user_id` (людина),
- `agent_id` (агент),
- `role_id` (роль у DAO),
- статус: `active`, `pending`, `banned`, `left`.

### 1.3. Roles & Entitlements

Ролі визначають, що можна робити в межах microDAO:

- `role_id`: `"owner"`, `"admin"`, `"member"`, `"observer"`, `"agent-core"`, ...
- кожна роль має набір `entitlements`:
  - `can_create_proposals`,
  - `can_vote`,
  - `can_manage_members`,
  - `can_manage_projects`,
  - `can_manage_teams`,
  - `can_manage_tokens` (закладка під on-chain).

### 1.4. Proposals & Voting

Пропозиції:

- створюються учасниками (люди/агенти) згідно entitlements,
- приклади:
  - додати нового агента в команду,
  - змінити пріоритети сервісів,
  - створити новий проект,
  - змінити політику доступу,
- мають статуси:
  - `draft`, `open`, `accepted`, `rejected`, `expired`.

Голосування:

- голоси від учасників microDAO,
- правила підрахунку/кворуму задаються у параметрах DAO.

---

## 2. HIGH-LEVEL ARCHITECTURE

```text
[ Users / Agents / UI ]
        ↓
[ Gateway (Telegram/Web/Matrix/Front) ]
        ↓
[ DAGI Router ]
        ↓
[ MicroDAO Service (7004) ]
        ↓
[ Postgres (microdao_db) + NATS (events) + Agents Service ]
```

MicroDAO Service:

* тримає модель DAO в Postgres,
* публікує події в NATS:

  * `microdao.<id>.events`,
* взаємодіє з:

  * Agents Service (щоб агенти розуміли, що їм дозволено),
  * ProjectBus (для створення/оновлення проектних каналів),
  * Mesh Directory (через параметри доступу для агентів).

---

## 3. DATA MODEL (MVP-Рівень)

### 3.1. microdao

```sql
CREATE TABLE microdao (
    microdao_id      TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    status           TEXT NOT NULL DEFAULT 'active',  -- active|archived|pending
    created_at       TIMESTAMP NOT NULL DEFAULT now(),
    created_by       TEXT NOT NULL,   -- user_id/agent_id
    meta             JSONB DEFAULT '{}'::jsonb
);
```

### 3.2. microdao_project

```sql
CREATE TABLE microdao_project (
    microdao_id   TEXT NOT NULL REFERENCES microdao(microdao_id),
    project_id    TEXT NOT NULL,
    PRIMARY KEY (microdao_id, project_id)
);
```

### 3.3. microdao_role

```sql
CREATE TABLE microdao_role (
    role_id       TEXT PRIMARY KEY,
    microdao_id   TEXT NOT NULL REFERENCES microdao(microdao_id),
    name          TEXT NOT NULL,
    description   TEXT,
    entitlements  JSONB NOT NULL,  -- { "can_create_proposals": true, ... }
    meta          JSONB DEFAULT '{}'::jsonb
);
```

### 3.4. microdao_member

```sql
CREATE TABLE microdao_member (
    microdao_id   TEXT NOT NULL REFERENCES microdao(microdao_id),
    subject_id    TEXT NOT NULL,   -- user_id or agent_id
    subject_type  TEXT NOT NULL,   -- 'user' | 'agent'
    role_id       TEXT NOT NULL REFERENCES microdao_role(role_id),
    status        TEXT NOT NULL DEFAULT 'active',  -- active|pending|banned|left
    joined_at     TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (microdao_id, subject_id, subject_type)
);
```

### 3.5. microdao_proposal

```sql
CREATE TABLE microdao_proposal (
    proposal_id   TEXT PRIMARY KEY,
    microdao_id   TEXT NOT NULL REFERENCES microdao(microdao_id),
    title         TEXT NOT NULL,
    description   TEXT,
    creator_id    TEXT NOT NULL,
    creator_type  TEXT NOT NULL,  -- 'user' | 'agent'
    status        TEXT NOT NULL DEFAULT 'open', -- draft|open|accepted|rejected|expired
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    opens_at      TIMESTAMP,
    closes_at     TIMESTAMP,
    params        JSONB DEFAULT '{}'::jsonb -- voting rules overrides, payload
);
```

### 3.6. microdao_vote

```sql
CREATE TABLE microdao_vote (
    proposal_id   TEXT NOT NULL REFERENCES microdao_proposal(proposal_id),
    voter_id      TEXT NOT NULL,
    voter_type    TEXT NOT NULL,  -- 'user' | 'agent'
    choice        TEXT NOT NULL,  -- 'yes'|'no'|'abstain'|custom
    weight        NUMERIC NOT NULL DEFAULT 1,
    voted_at      TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (proposal_id, voter_id, voter_type)
);
```

---

## 4. CONFIGURATION

ENV:

```env
MICRODAO_SERVICE_PORT=7004

MICRODAO_DB_DSN=postgres://...
MICRODAO_NATS_URL=nats://...

PROJECT_BUS_CONFIG_PATH=configs/project_bus_config.yaml
TEAM_DEFINITION_PATH=configs/team_definition.yaml
AGENT_REGISTRY_PATH=configs/AGENT_REGISTRY.yaml
```

---

## 5. PUBLIC HTTP API

### 5.1. `POST /microdaos`

Створити новий microDAO.

**Request:**

```json
{
  "microdao_id": "microdao-greenfood",
  "name": "GREENFOOD DAO",
  "description": "Управління екосистемою GREENFOOD AI-ERP",
  "created_by": "user:owner1"
}
```

**Response:**

```json
{
  "status": "ok",
  "microdao": {
    "microdao_id": "microdao-greenfood",
    "name": "GREENFOOD DAO",
    "description": "...",
    "status": "active"
  }
}
```

---

### 5.2. `GET /microdaos`

Список microDAO.

`GET /microdaos?status=active`

---

### 5.3. `GET /microdaos/{microdao_id}`

Деталі одного microDAO (включно з ролями/параметрами).

---

### 5.4. `POST /microdaos/{microdao_id}/members`

Додати учасника (людину/агента).

**Request:**

```json
{
  "subject_id": "ag_helion",
  "subject_type": "agent",
  "role_id": "agent-core"
}
```

**Response:**

```json
{
  "status": "ok",
  "member": {
    "microdao_id": "microdao-greenfood",
    "subject_id": "ag_helion",
    "subject_type": "agent",
    "role_id": "agent-core",
    "status": "active"
  }
}
```

---

### 5.5. `GET /microdaos/{microdao_id}/members`

Список учасників.

---

### 5.6. `POST /microdaos/{microdao_id}/proposals`

Створити пропозицію.

**Request:**

```json
{
  "title": "Додати нового агента до команди GREENFOOD",
  "description": "Пропоную додати vision_agent до team-greenfood.",
  "creator_id": "user:owner1",
  "creator_type": "user",
  "params": {
    "required_quorum": 0.5,
    "required_yes_ratio": 0.6
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "proposal": {
    "proposal_id": "prop-123",
    "status": "open"
  }
}
```

---

### 5.7. `POST /proposals/{proposal_id}/votes`

Голосування.

**Request:**

```json
{
  "voter_id": "user:member1",
  "voter_type": "user",
  "choice": "yes"
}
```

**Response:**

```json
{
  "status": "ok",
  "vote": {
    "proposal_id": "prop-123",
    "voter_id": "user:member1",
    "choice": "yes",
    "weight": 1
  }
}
```

---

### 5.8. `GET /microdaos/{microdao_id}/proposals`

Список пропозицій DAO.

---

### 5.9. `GET /proposals/{proposal_id}`

Деталі пропозиції + поточний стан голосування.

---

## 6. EVENT BUS (NATS)

MicroDAO Service публікує події:

* `microdao.{microdao_id}.events`

Приклади payload:

### 6.1. MicroDAO Created

```json
{
  "type": "microdao_created",
  "microdao_id": "microdao-greenfood",
  "name": "GREENFOOD DAO",
  "created_by": "user:owner1",
  "ts": "2025-11-24T10:00:00Z"
}
```

### 6.2. Member Added

```json
{
  "type": "member_added",
  "microdao_id": "microdao-greenfood",
  "subject_id": "ag_helion",
  "subject_type": "agent",
  "role_id": "agent-core",
  "ts": "2025-11-24T10:01:00Z"
}
```

### 6.3. Proposal Created

```json
{
  "type": "proposal_created",
  "microdao_id": "microdao-greenfood",
  "proposal_id": "prop-123",
  "title": "Додати vision_agent до команди GREENFOOD",
  "ts": "2025-11-24T10:05:00Z"
}
```

### 6.4. Proposal Finalized

```json
{
  "type": "proposal_finalized",
  "microdao_id": "microdao-greenfood",
  "proposal_id": "prop-123",
  "final_status": "accepted",
  "result": {
    "yes": 10,
    "no": 1,
    "abstain": 2,
    "quorum": 0.7
  },
  "ts": "2025-11-24T11:00:00Z"
}
```

---

## 7. INTEGRATION WITH OTHER SERVICES

### 7.1. Agents Service (7002)

Agents Service при кожному виклику:

* запитує MicroDAO Service (або кешує його рішення), щоб:

  * перевірити, чи має агент право:

    * відповідати в конкретному `project_id` / `microdao_id`,
    * виконувати певні дії (наприклад, створювати команду, керувати іншими агентами).

Простий варіант: HTTP-запит:

`GET /microdaos/{microdao_id}/members?subject_id=ag_helix&subject_type=agent`

Можливий кеш у Redis.

### 7.2. ProjectBus / TeamDefinition

При створенні microDAO + прив'язці project_id MicroDAO Service може:

* генерувати (або оновлювати) записи в:

  * `project_bus_config.yaml`,
  * `team_definition.yaml` (або їх runtime-аналогах в БД),
* публікувати події:

  * `project.<project_id>.events` про появу нового microDAO/team.

### 7.3. Mesh Directory

MicroDAO Service може:

* впливати на видимість агентів:

  * наприклад, якщо агент виключений з microDAO → його інстанси в Directory позначаються з обмеженими правами в цьому проекті.

---

## 8. SECURITY / RBAC

Важливі моменти:

1. Усі операції (створення DAO, додавання членів, створення пропозицій, голосування) повинні проходити через перевірку entitlements:

   * `can_create_microdao`
   * `can_manage_members`
   * `can_create_proposals`
   * `can_vote`

2. MicroDAO Service не займається аутентифікацією — він приймає вже ідентифіковані `user_id` / `agent_id` (з gateway або auth-сервісу).

3. Системні агенти ( типу `ag_guardian`, `ag_cryptodetective` ) можуть мати особливі ролі з підвищеними entitlements (наприклад, аудит без права голосу).

---

## 9. HEALTHCHECK & METRICS

### 9.1. `GET /healthz`

```json
{
  "status": "ok",
  "db": "ok",
  "nats": "ok",
  "uptime_seconds": 1234
}
```

### 9.2. Prometheus

* `microdao_count{status}`
* `microdao_members_count{microdao_id}`
* `microdao_proposals_count{microdao_id,status}`
* `microdao_votes_total{microdao_id,proposal_id,choice}`

---

## 10. TEST PLAN (SHORT)

Unit/Integration-тести (pytest):

1. `test_create_microdao_and_get()`

   * створення DAO, перевірка читання.

2. `test_add_member_and_query()`

   * додати члена, перевірити список.

3. `test_create_proposal_and_vote()`

   * створити пропозицію, декілька голосів, підбиття результатів.

4. `test_entitlements_block_unauthorized_actions()`

   * спроба створення пропозиції користувачем без `can_create_proposals`.

5. `test_events_published_on_actions()`

   * перевірити, що при створенні DAO/пропозиції/результату йдуть NATS-івенти.

---

## 11. SUMMARY

MicroDAO Service (7004):

* є "governance ядром" для DAARION.city,
* формально описує:

  * хто до якого microDAO належить,
  * які ролі/entitlements має,
  * як приймаються рішення (proposals/voting),
* тісно інтегрований з:

  * Agents Service (поведінка агентів),
  * ProjectBus (потоки подій проектів),
  * Mesh Directory (видимість/скили/обмеження агентів).

Цей сервіс робить всі твої фрактальні команди та мережу агентів формально керованими через DAO-рівень.

