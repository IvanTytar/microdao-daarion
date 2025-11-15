# Інструкції для оновлення .docx документів

Цей документ містить інструкції для механічного оновлення Word документів (`.docx`), які не можна редагувати автоматично.

---

## 1. `microdao — Data Model & Event Catalog.docx`

### Крок 1: Додати новий розділ для таблиць access keys

**Де:** Після `Heading 3 "3.9 Integrations / Webhooks / Audit"`

**Що додати:**

```
Heading 3: 3.10 Access Keys & Capability Bundles
```

**SQL схема:**

```sql
create table access_keys (
  id text primary key,        -- ak_...
  subject_kind text not null, -- 'user' | 'agent' | 'integration' | 'embassy'
  subject_id text not null,   -- u_/ag_/...
  team_id text null,          -- t_..., якщо scoped до команди
  name text not null,
  status text not null check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  last_used_at timestamptz null
);

create table capabilities (
  id text primary key,        -- cap_...
  code text not null unique,  -- chat.message.send, wallet.stake.ringk, ...
  description text not null
);

create table access_key_caps (
  key_id text references access_keys(id) on delete cascade,
  cap_id text references capabilities(id) on delete cascade,
  primary key (key_id, cap_id)
);

create table bundles (
  id text primary key,        -- bundle_...
  name text not null unique,  -- role.Member / plan.Premium / agent.default
  created_at timestamptz not null default now()
);

create table bundle_caps (
  bundle_id text references bundles(id) on delete cascade,
  cap_id text references capabilities(id) on delete cascade,
  primary key (bundle_id, cap_id)
);
```

---

### Крок 2: Додати події в Event Catalog

**Де:** У розділі `6.3 Події (JSON, скорочено)`

**1. У список `topic` додати:**

- `access_key.created`
- `access_key.revoked`
- `access_key.used`

**2. Нижче, де йдуть payload-схеми, додати JSON-схеми:**

**access_key.created:**

```jsonc
// envelope.topic = "access_key.created"
"access_key_created": {
  "type": "object",
  "properties": {
    "key_id": { "type": "string" },
    "subject_kind": { "type": "string" },
    "subject_id": { "type": "string" },
    "team_id": { "type": ["string","null"] }
  },
  "required": ["key_id","subject_kind","subject_id"]
}
```

**access_key.revoked:**

```jsonc
// envelope.topic = "access_key.revoked"
"access_key_revoked": {
  "type": "object",
  "properties": {
    "key_id": { "type": "string" },
    "revoked_by": { "type": "string" },
    "revoked_at": { "type": "string", "format": "date-time" }
  },
  "required": ["key_id","revoked_by","revoked_at"]
}
```

**access_key.used:**

```jsonc
// envelope.topic = "access_key.used"
"access_key_used": {
  "type": "object",
  "properties": {
    "key_id": { "type": "string" },
    "subject_id": { "type": "string" },
    "action": { "type": "string" },
    "resource_kind": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" }
  },
  "required": ["key_id","subject_id","action","resource_kind","ts"]
}
```

---

## 2. `microdao — RBAC і Entitlements (MVP).docx`

### Крок 1: Оновити формулу доступу

**Де:** У розділі `2) Модель доступу`

**Знайти:** Нинішню формулу `allow = ...`

**Замінити на:**

```text
allow =
  RBAC(role, action, resource)
  ∧ Entitlement(plan, RINGK_staked)
  ∧ Capability(key, action, resource)
  ∧ ACL(resource)
  ∧ Mode(public|confidential)
```

**Додати після формули:**

> `Capability(key, …)` береться з bundles `bundle.role.*` + `bundle.plan.*` (детальніше див. `24_access_keys_capabilities_system.md`).

---

### Крок 2: Додати мапінг Entitlements → bundles

**Де:** У розділі `6) Entitlements від RINGK (стейк)`, в кінці розділу

**Додати:**

> **Мапінг Entitlements → capability-bundles**
>
> - плани `Freemium/Casual/Premium/Platformium` відповідають `bundle.plan.*`;
> - множники від стейку RINGK впливають на квоти для capabilities (`chat.message.send`, `agent.run.invoke`, `router.invoke`, `wallet.payout.claim`).

---

## 3. `microdao — Security Architecture & Threat Model (MVP).docx`

### Крок 1: Додати підрозділ про Access Keys & Policy Service

**Де:** У розділі `5. Авторизація`, після першого підрозділу (5.1/5.2)

**Додати:**

```
Heading 3: 5.x Access Keys & Policy Service (PDP/PEP)
```

**Текст:**

- Access keys перевіряються через PDP (Policy Decision Point / Policy Service)
- PEP (Policy Enforcement Point) живе в API Gateway та сервісах
- Використовується capability-token (JWT/opaque), який несе:
  - `sub` (user/agent/integration ID)
  - `team_id`
  - стиснений список `caps` (capabilities)

---

### Крок 2: Додати підрозділ про зберігання access keys

**Де:** У розділі `8. Зберігання та доступ`

**Додати:**

```
Heading 3: 8.x Зберігання access keys
```

**Текст:**

- Метадані зберігаються в таблиці `access_keys` (див. Data Model)
- Секрети (`secret`) зашифровані через KMS/HSM
- One-time reveal: після створення ключ не показується повторно
- Ротація: обов'язковий `expires_at`, періодична ротація ключів

---

### Крок 3: Додати абзац про агентний шар

**Де:** У розділі `11. Агентний шар`

**Додати:**

> Всі приватні агенти працюють виключно через Agent Access Keys з мінімальними capabilities. Для `mode='confidential'` агенти не отримують plaintext-повідомлень, тільки summary/embeddings (узгоджено з E2EE моделлю).

---

### Крок 4: Додати абзац про Wallet/Staking

**Де:** У розділі `12. Wallet/Staking/Токени`

**Додати:**

> Всі операції гаманця (`wallet.balance.view`, `wallet.stake.ringk`, `wallet.payout.claim`) завжди проходять через capability-check для ключа (user/agent). Перевірка виконується через PDP перед виконанням операції.

---

## 4. Перевірка

Після оновлення всіх `.docx` файлів перевір:

- ✅ У Data Model додано розділ 3.10 з таблицями access keys
- ✅ У Event Catalog додано 3 нові topics та їх JSON-схеми
- ✅ У RBAC оновлено формулу доступу та додано мапінг Entitlements → bundles
- ✅ У Security Architecture додано 4 нові розділи/абзаци про Access Keys

---

## 5. Посилання на Markdown документи

Всі деталі вже є в Markdown документах:

- `24_access_keys_capabilities_system.md` — повна специфікація
- `DAARION_city_platforms_catalog.md` — мапінг платформ
- `28_flows_wallet_embassy_energy_union.md` — sequence-діаграми

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


