# 27 — Database Schema & Migrations (MicroDAO)

*Повна виробнича специфікація*

---

## 1. Purpose & Scope

Цей документ описує:

- повну схему бази даних microDAO / DAARION.city (всі таблиці);
- модулі: Messaging, Teams, RBAC, Projects, Docs/Co-Memory, Agents, Wallet, Staking, Payouts, Embassy, Capability System, RWA;
- порядок міграцій;
- правила naming-конвенцій;
- seed-дані для initial bootstrap;
- інтеграцію з Event Catalog;
- DevOps pipeline для застосування міграцій (local → staging → prod);
- rollback policy.

Документ є «джерелом істини» для інженерів.

---

## 2. High-level Structure of the Database

### Домени:

1. Auth / Users
2. Teams (microDAO ядра)
3. RBAC & Roles
4. Channels / Messages / Follow-ups / Co-Memory
5. Projects / Tasks
6. Agents / Agent Runs / Tooling
7. Wallet / Staking / Payouts
8. RWA (Real-World Assets)
9. Embassy Module (Webhooks, External Identity, Oracles)
10. Capability System (Access Keys, Bundles)
11. Audit & Telemetry
12. Event Catalog Support (Outbox pattern)

---

## 3. Naming Conventions

### Префікси ID:

- `u_` — user
- `t_` — team
- `c_` — channel
- `m_` — message
- `f_` — followup
- `doc_` — document
- `p_` — project
- `task_` — task
- `ag_` — agent
- `run_` — agent run
- `ak_` — access key
- `cap_` — capability
- `bundle_` — capability bundle
- `rwa_` — RWA certificate
- `emb_` — embassy identity
- `hook_` — webhook
- `evt_` — outbox event

### Таблиці у snake_case

### Версії міграцій:

`000001_init.sql`, `000002_users_teams.sql`, `000003_rbac.sql` …

---

## 4. Full Schema by Modules

Нижче — структурована схема по розділах.

Це основа для міграцій (варіант C).

---

### 4.1 Users & Auth

```sql
create table users (
  id text primary key,           -- u_...
  email text unique not null,
  created_at timestamptz default now(),
  last_login_at timestamptz
);

create table sessions (
  session_id text primary key,
  user_id text references users(id) on delete cascade,
  created_at timestamptz default now(),
  expires_at timestamptz
);
```

---

### 4.2 Teams / microDAO

```sql
create table teams (
  id text primary key,          -- t_...
  name text not null,
  slug text unique not null,
  mode text not null check (mode in ('public','confidential')),
  created_at timestamptz default now()
);

create table team_members (
  team_id text references teams(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  role text not null,           -- Owner | Guardian | Member
  viewer_type text not null,    -- reader | commenter | contributor
  primary key (team_id, user_id)
);
```

---

### 4.3 Channels / Messages / Follow-ups / Co-Memory

```sql
create table channels (
  id text primary key,            -- c_...
  team_id text references teams(id),
  name text not null,
  created_at timestamptz default now()
);

create table messages (
  id text primary key,           -- m_...
  channel_id text references channels(id),
  user_id text references users(id),
  body text,                     -- plaintext or encrypted
  created_at timestamptz default now(),
  metadata jsonb
);

create table followups (
  id text primary key,           -- f_...
  message_id text references messages(id) on delete cascade,
  type text,                     -- agent/tool/summary...
  payload jsonb,
  created_at timestamptz default now()
);

create table comemory_items (
  id text primary key,
  team_id text references teams(id),
  embeddings vector(1536),
  summary text,
  source_message text,
  created_at timestamptz default now()
);
```

---

### 4.4 Projects / Tasks

```sql
create table projects (
  id text primary key,              -- p_...
  team_id text references teams(id),
  name text not null,
  created_at timestamptz default now()
);

create table tasks (
  id text primary key,              -- task_...
  project_id text references projects(id),
  title text not null,
  status text not null,
  assignee text references users(id),
  created_at timestamptz default now()
);
```

---

### 4.5 Agents / Tooling

```sql
create table agents (
  id text primary key,            -- ag_...
  team_id text references teams(id),
  name text,
  config jsonb,
  created_at timestamptz default now()
);

create table agent_runs (
  id text primary key,            -- run_...
  agent_id text references agents(id),
  input jsonb,
  output jsonb,
  created_at timestamptz default now(),
  status text
);
```

---

### 4.6 Wallet / Staking / Payouts

```sql
create table wallets (
  user_id text primary key references users(id),
  address text unique
);

create table staking_ringk (
  id text primary key,
  user_id text references users(id),
  amount numeric not null,
  lock_until timestamptz,
  created_at timestamptz default now()
);

create table payouts (
  id text primary key,
  user_id text references users(id),
  amount numeric,
  symbol text,                -- KWT, 1T, DAAR…
  created_at timestamptz default now()
);
```

---

### 4.7 RWA (Real-World Assets)

```sql
create table rwa_inventory (
  id text primary key,             -- rwa_...
  team_id text references teams(id),
  type text,                       -- energy/food/water/etc
  quantity numeric,
  metadata jsonb,
  updated_at timestamptz default now()
);
```

---

### 4.8 Embassy Module

```sql
create table embassy_identities (
  id text primary key,           -- emb_...
  external_id text,
  platform text,                 -- energy_union/greenfood/etc
  metadata jsonb
);

create table embassy_webhooks (
  id text primary key,           -- hook_...
  platform text,
  secret text,
  url text,
  created_at timestamptz default now()
);

create table oracles (
  id text primary key,
  platform text,
  payload jsonb,
  created_at timestamptz default now()
);
```

---

### 4.9 Capability System (Access Keys / Bundles)

```sql
create table access_keys (
  id text primary key,        -- ak_...
  subject_kind text not null, -- user/agent/integration/embassy
  subject_id text not null,
  team_id text,
  name text not null,
  status text not null check (status in ('active','revoked','expired')),
  created_at timestamptz default now(),
  expires_at timestamptz,
  last_used_at timestamptz
);

create table capabilities (
  id text primary key,        -- cap_...
  code text not null unique,
  description text not null
);

create table access_key_caps (
  key_id text references access_keys(id) on delete cascade,
  cap_id text references capabilities(id) on delete cascade,
  primary key (key_id, cap_id)
);

create table bundles (
  id text primary key,        -- bundle_...
  name text not null unique,
  created_at timestamptz default now()
);

create table bundle_caps (
  bundle_id text references bundles(id) on delete cascade,
  cap_id text references capabilities(id) on delete cascade,
  primary key (bundle_id, cap_id)
);
```

---

### 4.10 Audit & Telemetry

```sql
create table audit_log (
  id text primary key,
  user_id text,
  team_id text,
  action text,
  resource_kind text,
  data jsonb,
  created_at timestamptz default now()
);
```

---

### 4.11 Outbox Events (Event Catalog)

```sql
create table outbox_events (
  id text primary key,          -- evt_...
  topic text not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  processed boolean default false
);
```

---

## 5. Migration Order (Critical)

### 000001_init.sql

Users, Sessions.

### 000002_microdao_core.sql

Teams, Members, Channels, Messages, Follow-ups.

### 000003_projects_tasks.sql

Projects, Tasks.

### 000004_agents.sql

Agents, Agent Runs.

### 000005_wallet_staking_payouts.sql

Wallet, Staking, Payouts.

### 000006_rwa.sql

RWA Inventory.

### 000007_embassy.sql

Embassy identities, Webhooks, Oracles.

### 000008_access_keys_capabilities.sql

Access Keys, Capabilities, Bundles.

### 000009_audit_outbox.sql

Audit Log + Outbox Events.

---

## 6. Seed Data

### RBAC Roles

- Owner, Guardian, Member, Visitor.

### Capability bundles

- `bundle.role.Owner`
- `bundle.role.Guardian`
- `bundle.role.Member`
- `bundle.role.Visitor`
- `bundle.plan.Freemium` / `Casual` / `Premium` / `Platformium`

### Initial capabilities

- `chat.message.send`
- `chat.message.read`
- `wallet.balance.view`
- `wallet.stake.ringk`
- `router.invoke`
- `agent.run.invoke`
- `rwa.inventory.update`
- `embassy.rwa.claim`

---

## 7. Integration with Event Catalog

Всі важливі сутності пишуть події в `outbox_events`.

Основні topics:

- `chat.message.created`
- `project.created`
- `task.created`
- `agent.run.completed`
- `staking.locked`
- `payout.generated`
- `rwa.inventory.updated`
- `access_key.created`
- `access_key.revoked`
- `audit.event`

---

## 8. Local / Staging / Prod Migration Process

1. `supabase db reset` (local only)
2. `supabase db push` → локальні міграції
3. CI запускає `pg_prove` або `pgtap` (опційно)
4. Staging застосовує ті ж міграції
5. Prod застосовує з confirm gate

---

## 9. Rollback Policy

- Кожна міграція має `-- down` секцію з DROP TABLE IF EXISTS.
- Для критичних таблиць rollback дозволено тільки до staging, на prod — лише forward-fix.
- Outbox events не відкочуються.
- RWA-поведінка не rollback'иться ніколи.

---

## 10. Завдання для Cursor

```text
You are a senior backend engineer. Generate SQL migration files based on:
- 27_database_schema_migrations.md
- 24_access_keys_capabilities_system.md
- 02_architecture_basics.md
- 05_coding_standards.md

Tasks:
1) Create migration files in order: 000001_init.sql through 000009_audit_outbox.sql
2) Each migration should include:
   - CREATE TABLE statements
   - Indexes for foreign keys and frequently queried columns
   - Constraints (CHECK, UNIQUE, FOREIGN KEY)
   - Comments for each table/column
3) Create seed data SQL file for initial capabilities and bundles
4) Add rollback (-- down) sections for each migration

Output:
- list of migration files
- diff
- summary
```

---

## 11. Результат

Після створення цього документа:

- повна схема БД задокументована як «джерело істини»;
- чіткий порядок міграцій для послідовного застосування;
- готовність до генерації реальних SQL-файлів (варіант C);
- інтеграція з Event Catalog через Outbox pattern;
- чітка політика rollback для безпеки.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


