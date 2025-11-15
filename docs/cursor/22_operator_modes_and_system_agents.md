# 22 — Operator Modes & System Agents (MicroDAO)

Приватні агенти, агент-спільноти, операторські режими, агент DAO і агент-гаманець

Цей документ визначає системну архітектуру внутрішніх агентів MicroDAO, їхні операторські режими, взаємодію з доступами, правилами, ключами та внутрішньою криптографією спільноти.

Документ узгоджений із попередніми специфікаціями (12–20).

---

# 1. Основні типи системних агентів

MicroDAO має три фундаментальні типи агентів:

- **особисті агенти** (Personal Agents),
- **агенти спільноти** (Team Agents / Shared Agents),
- **агенти-протоколісти** (System Protocol Agents):  
  DAO Agent, Wallet Agent, Bridges Agent, Governance Agent тощо.

Кожен тип має свою власну памʼять, права доступу та операторські можливості.

---

# 2. Особистий агент (Personal Agent)

### 2.1. Призначення  
Особистий агент — це "внутрішній супутник" людини в екосистемі microDAO:

- знає особистий контекст,
- веде особистий Co-Memory простір,
- допомагає у приватних нотатках, документах, нагадуваннях,
- працює як приватний інтерфейс до DAGI,
- не має доступу до командних просторів, якщо не надано спеціальний дозвіл.

### 2.2. Права  
Особистий агент оперує винятково у:

- `personal_space`,
- особистих документах,
- особистих навчальних даних,
- особистих локальних задачах.

Доступи до спільних проектів даються явно через Governance/Access Agent у вигляді entitlements.

### 2.3. Операторський режим  
Особистий агент може бути оператором **лише в особистому просторі**:

```ts
operatorMode: {
  enabled: true,
  scopes: ["personal"],
  allowedTools: [
    "create_personal_note",
    "create_personal_task",
    "personal_digest",
    "organize_notes"
  ],
  schedule: "*/20 * * * *", // кожні 20 хвилин (приклад)
  maxActionsPerHour: 10
}
```

---

# 3. Спільний агент (Team/Shared Agent)

### 3.1. Призначення

Це агенти:

* Team Assistant,
* Messenger Agent,
* Projects Agent,
* Followups Agent,
* Memory Agent,
* Attention Agent,
* Knowledge Guide,
* Bridges Agent,
* Governance Agent.

Вони працюють на рівні microDAO (колективний простір).

### 3.2. Права

Спільні агенти можуть отримувати доступ до:

* каналів,
* проектів,
* документів Knowledge Space,
* ритуалів узгодження,
* Co-Memory microDAO.

Доступи обмежуються entitlements — кожен агент бачить лише те, що дозволено.

### 3.3. Операторські повноваження

Командні агенти можуть працювати як "оператори" на рівні спільноти:

```ts
operatorMode: {
  enabled: true,
  scopes: ["team","project","channel"],
  allowedTools: [
    "summarize_project",
    "daily_digest",
    "check_task_status",
    "highlight_critical",
    "sync_event"
  ],
  schedule: "0 * * * *", // щогодини
  maxActionsPerHour: 30
}
```

Операторські дії **завжди логуються** в Co-Memory.

---

# 4. Protocol Agents: DAO Agent і Wallet Agent

Ці агенти не є "учасниками" в комунікації, а швидше **протокольними модулями**.

---

# 4.1. DAO Agent

Роль: `"dao_protocol_agent"`

### Призначення

DAO Agent відповідає за:

* зв'язок із зовнішнім DAO-протоколом (якщо microDAO його має),
* синхронізацію правил із контрактами,
* оновлення локальних правил на основі зовнішніх церемоній,
* відправку ритуалів узгодження в DAO-контракт (якщо дозволено).

### Інтерфейс (tools)

```ts
tools: [
  "sync_policies_onchain",
  "fetch_dao_proposals",
  "submit_ritual_to_dao",
  "resolve_dao_result"
]
```

### Оператор-режим

DAO Agent завжди працює **строго у командному масштабі** і лише за дозволами Governance Agent.

---

# 4.2. Wallet Agent

Роль: `"wallet_interface_agent"`

### Призначення

Wallet Agent — це **інтерфейс** між microDAO/агентами та:

* криптографічним підписом,
* зовнішніми гаманцями користувачів,
* фізичними ключами (Tangem-подібні),
* системою capability-доступів.

Wallet Agent **не зберігає приватні ключі**.

Він:

* формує пояснення:

  * "що саме підписується",
  * "чому це потрібно",
  * "які наслідки";

* відправляє payload на зовнішній Signer;
* отримує підписаний результат і повертає агенту, що ініціював дію.

### Tools

```ts
tools: [
  "prepare_signature_payload",
  "request_signature",
  "verify_signature",
  "get_wallet_state"
]
```

---

# 5. Модель operatorMode

Операторський режим є **частиною конфігурації кожного агента**.

```ts
interface OperatorModeConfig {
  enabled: boolean;
  scopes: ("personal" | "team" | "project" | "channel")[];
  allowedTools: string[];
  schedule?: string;         // CRON або natural language
  maxActionsPerHour?: number;
}
```

У `AgentConfig`:

```ts
interface AgentConfig {
  ...
  operatorMode?: OperatorModeConfig;
}
```

### 5.1. Scopes

* `"personal"` — особистий простір користувача;
* `"team"` — командний рівень microDAO;
* `"project"` — окремий проєкт;
* `"channel"` — конкретний канал/чат.

### 5.2. Режими

Типовий розподіл:

| Тип агента       | operatorMode             |
| ---------------- | ------------------------ |
| Personal Agent   | personal                 |
| Team Assistant   | team                     |
| Projects Agent   | team,project             |
| Followups Agent  | team,project             |
| Memory Agent     | team                     |
| Attention Agent  | team                     |
| Governance Agent | team                     |
| Wallet Agent     | team (тільки з дозволом) |
| DAO Agent        | team (тільки з дозволом) |

### 5.3. Принципи безпеки operatorMode

1. **Усі операторські дії логуються**.
2. **Жоден агент не може діяти поза своїми scopes**.
3. **Усі небезпечні дії потребують підтвердження Governance Agent**.
4. **Wallet Agent не може діяти без підтвердження людини**.
5. **OperatorMode можна вимкнути** для будь-якого агента в налаштуваннях microDAO.

---

# 6. Модель системних агентів у БД

### Таблиця `system_agents`

* id
* team_id
* type (`personal`, `team`, `protocol`)
* role
* operator_enabled
* config_json (включає operatorMode)
* created_at

### Таблиця `agent_permissions`

* id
* agent_id
* resource_kind
* resource_id
* scopes (json array)
* created_at

### Таблиця `operator_logs`

* id
* agent_id
* action
* payload_json
* context
* created_at

---

# 7. Інтеграція з доступами та ключами (Governance Agent)

OperatorMode завжди працює у звʼязці з:

* entitlements,
* symbolic keys,
* governance_policies.

Наприклад:

* Personal Agent має ключ рівня `personal-scope`.
* Projects Agent має ключ `project-operator`.
* DAO Agent має ключ `protocol-access`, який Governance Agent може видати або анулювати.

---

# 8. UI-інтеграція

### 8.1. Сторінка Агентів

У профілі агента:

* показати блок **"Режим оператора"**:

  * увімкнено/вимкнено,
  * дозволені дії,
  * сфери дії,
  * розклад.

### 8.2. Налаштування microDAO

Окремий розділ:

* "Системні агенти"

  * Personal Agent (індивідуальний)
  * Team Agents (список)
  * Protocol Agents

### 8.3. Журнал операторських дій

* список автоматичних дій агентів,
* фільтри: агент → проєкт → тип дії.

---

# 9. Інструкції для Cursor

Приклад:

```
Implement Operator Modes & System Agents using:

- 22_operator_modes_and_system_agents.md
- 12_agent_runtime_core.md
- 18_governance_access_agent.md
- microdao — RBAC and Entitlements (MVP)
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Extend AgentConfig with operatorMode field.

2) Add operatorMode guards to runAgentTurn().

3) Create database tables:

   - system_agents
   - agent_permissions
   - operator_logs

4) Implement API:

   - GET/POST/PATCH /agents/:id/operator_mode
   - GET /agents/:id/operator_logs

5) Create UI:

   - Agent profile: Operator Mode section.
   - System Agents page.
   - Operator Logs page.

Output:

- list of files
- diff
- summary
```

---

# 10. Результат

Після впровадження цього модуля:

* приватні агенти можуть працювати як персональні оператори;
* командні агенти можуть працювати як "ритуальні організатори" microDAO;
* DAO Agent та Wallet Agent стають безпечними протокольними модулями;
* усі дії мають чіткі межі, правила і логування;
* система стає самокерованою, але контрольованою через дух спільноти.


