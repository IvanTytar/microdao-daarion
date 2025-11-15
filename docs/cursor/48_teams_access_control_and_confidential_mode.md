# 48 — Teams Access Control & Confidential Mode (MicroDAO)

*Командні доступи, ролі, членство, ACL, confidential mode, індексація, інструменти, агенти, governance-політики. Канонічна специфікація microDAO команд.*

---

## 1. Purpose & Scope

Цей документ визначає:

- структуру команд (microDAO),
- ролі та дозволи,
- ACL для ресурсів,
- поведінку Confidential Mode,
- вплив на агентів, інструменти, чат, LLM Proxy, Router, Wallet, Embassy, Projects/Tasks,
- правила Governance.

Це центральний рівень контролю безпеки й приватності у DAARION.city.

---

## 2. Team (microDAO) Model

Команда = організаційний домен, який має:

- учасників (members),
- ролі,
- командні налаштування,
- власну економіку (1T / KWT / RINGK стейк),
- власний набір агентів,
- власні канали,
- власні ACL.

---

## 3. Team Roles

| Role         | Capabilities                                            | Опис                 |
| ------------ | ------------------------------------------------------- | -------------------- |
| **Owner**    | повний контроль, зміна налаштувань, звільнення Guardian | creator of team      |
| **Guardian** | майже все, крім знищення команди                        | security + oversight |
| **Admin**    | керування каналами/агентами/ресурсами                   | operational          |
| **Member**   | доступ до основних інструментів                         | worker               |
| **Guest**    | читання + обмежені інструменти                          | limited              |
| **Agent**    | системний агент команди                                 | restricted           |

Команда може мати:

- 1 owner
- 0–N guardians
- 0–N admins
- 0–N members
- 0–N guests
- 0–N private agents

---

## 4. Role Capability Mapping

### Owner

- повний доступ
- оновлювати план
- додавати/видаляти членів
- змінювати confidential mode
- випускати токени команди (якщо дозволено governance)

### Guardian

- контролює security sensitive
- додавання агентів
- доступ до private channels
- керування ACL
- активація E2EE

### Admin

- створення каналів
- створення проектів
- керування задачами
- запуск agent flows

### Member

- участь у каналах
- запуск агентів (якщо дозволено)
- створення задач у публічних проєктах

### Guest

- читання
- обмежені інструменти
- немає доступу до agent visibility

### Agent

- діє через PDP
- може діяти лише у дозволених каналах/проєктах
- не має власних ролей

---

## 5. Team-Level ACL

У команді існує ACL для кожного типу ресурсу:

```text
RESOURCE → [allowed_roles]
```

Приклад:

### Projects

```text
create: [owner, guardian, admin]
read: [owner, guardian, admin, member]
update: [owner, guardian, admin]
delete: [owner, guardian]
```

### Channels

```text
create: [owner, guardian, admin]
read/write: залежить від channel.acl
```

### Agents

```text
create: [owner, guardian]
update: [owner, guardian]
run: [owner, guardian, member] (опційно)
```

### Wallet

```text
view: [owner, guardian]
tx: [owner]
claim: [owner, guardian]
```

### Embassy Data

```text
read: [owner, guardian]
write: none (тільки embassy service)
```

---

## 6. Team States

Команда може перебувати в станах:

- **active** — нормальна робота
- **locked** — тимчасове блокування (борги, порушення)
- **confidential** — підвищена приватність
- **suspended** — потребує KYC / security audit
- **archived** — команда закрита

---

## 7. Confidential Mode

Confidential Mode — це **режим максимального захисту** для команд.

### Увімкнення:

лише Owner або Guardian

### Поведінка:

#### 7.1 LLM Proxy

- не бачить plaintext повідомлень
- використовує summary-only режим
- vision вимкнено
- embedding робиться з redacted тексту

#### 7.2 Agents

- не отримують plaintext
- не можуть використовувати tools категорії C/D
- не можуть використовувати platform tools
- autonomy знижується на 1 рівень
- не можуть запускати subagents

#### 7.3 Messaging

- повідомлення не зберігаються у plaintext
- DM канал між Owner та Guardian → E2EE only
- file attachments encrypt-only
- retention: 0–30 днів

#### 7.4 Projects/Tasks

- task description → summary-only
- файли завжди E2EE
- agent-run logs → redacted

#### 7.5 Wallet/RWA

- доступ обмежений Owner/Guardian
- payouts проходять без content-level history
- RWA дані теж redacted

---

## 8. Team Privacy Layers

Рівні приватності:

| Level        | Description                       |
| ------------ | --------------------------------- |
| open         | звичайний режим                   |
| restricted   | менш видимі канали                |
| private      | DM-like behavior                  |
| confidential | максимальний захист, summary-only |

---

## 9. Team Settings Schema

```json
{
  "team_id": "t_444",
  "name": "GreenFood Hub",
  "plan": "Premium",
  "confidential": true,
  "settings": {
    "agents_enabled": true,
    "allow_subagents": false,
    "allow_router_flows": true,
    "file_storage_limit_mb": 5000,
    "agent_default_autonomy": "low"
  },
  "acl_overrides": {
    "wallet.view": ["owner","guardian"],
    "wallet.tx": ["owner"],
    "projects.create": ["owner","guardian","admin"]
  }
}
```

---

## 10. PDP Integration

PDP оцінює дію:

- роль користувача
- ACL ресурсу
- командний стан
- confidential mode
- usage
- план команди
- stake RINGK

Висновок:

```text
allow | deny | require-confirmation
```

---

## 11. Governance Controls

Governance може:

- змінювати allowed roles
- визначати максимальну автономію агентів
- вмикати/вимикати confidential mode для певного плану
- вводити policy templates для ACL
- встановлювати KYC-вимоги
- заморожувати команди, що порушили правила

---

## 12. Membership Lifecycle

### Create Team:

- Owner створює
- Дається початковий ACL

### Invite Member:

- Owner/Admin може запросити → role=member

### Promote:

- Member → Admin → Guardian

### Demote:

- лише Owner може демотити Guardian

### Remove:

- Owner або Guardian (якщо не Owner)

---

## 13. Agent Integration Rules

Агенти:

- самі не мають ролей
- використовують access keys
- діють тільки через PDP
- бачать тільки те, що канал/проект дозволяє
- у confidential mode → summary-only
- не можуть змінювати ACL
- не можуть виконувати wallet.tx

---

## 14. Examples

### Example 1 — Створення приватного каналу

```text
roles: [owner, guardian]
confidential: false
```

### Example 2 — Канал для автономного агента

```text
roles: [owner, guardian, member]
agents_allowed: [ag_777]
confidential: false
```

### Example 3 — Канал у confidential mode

```text
type: confidential
agents_allowed: []
raw disabled
summary-only
```

---

## 15. Integration with Other Docs

Цей документ доповнює:

- `47_messaging_channels_and_privacy_layers.md`
- `32_policy_service_PDP_design.md`
- `36_agent_runtime_isolation_and_sandboxing.md`
- `45_llm_proxy_and_multimodel_routing.md`
- `46_router_orchestrator_design.md`
- `40_rwa_energy_food_water_flow_specs.md`

---

## 16. Завдання для Cursor

```text
You are a senior backend engineer. Implement Teams Access Control & Confidential Mode using:
- 48_teams_access_control_and_confidential_mode.md
- 32_policy_service_PDP_design.md
- 47_messaging_channels_and_privacy_layers.md

Tasks:
1) Define Team Roles (Owner, Guardian, Admin, Member, Guest, Agent) with capabilities.
2) Implement Role Capability Mapping (per role permissions).
3) Create Team-Level ACL (Projects, Channels, Agents, Wallet, Embassy Data).
4) Implement Team States (active, locked, confidential, suspended, archived).
5) Add Confidential Mode (LLM Proxy behavior, Agents restrictions, Messaging rules, Projects/Tasks rules, Wallet/RWA rules).
6) Implement Team Privacy Layers (open, restricted, private, confidential).
7) Create Team Settings Schema (JSON config with settings and ACL overrides).
8) Integrate with PDP (role, ACL, team state, confidential mode, usage, plan, stake evaluation).
9) Add Governance Controls (allowed roles, agent autonomy, confidential mode activation, ACL templates, KYC requirements, team freezing).
10) Implement Membership Lifecycle (Create Team, Invite Member, Promote, Demote, Remove).
11) Add Agent Integration Rules (no roles, access keys, PDP-only, channel/project permissions, confidential mode restrictions, no ACL changes, no wallet.tx).

Output:
- list of modified files
- diff
- summary
```

---

## 17. Summary

Система команд (microDAO):

- має строгі ролі та ACL
- повністю інтегрована з PDP
- визначає дозволи для projects/tasks/wallet/agents
- підтримує confidential mode (summary-only, no plaintext, no vision)
- гарантує приватність даних
- дозволяє побудову складних робочих просторів
- є фундаментом безпеки та організації в DAARION OS

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


