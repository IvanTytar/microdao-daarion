# 32 — Policy Service PDP Design (MicroDAO)

*Архітектура Policy Decision Point (PDP), кешування, резолюція прав, квоти, інтеграція з API Gateway / Agents / Embassy*

---

## 1. Purpose & Scope

PDP — це центральний компонент авторизації платформи **DAARION.city / microDAO / Embassy / Agents / Wallet**.

Він відповідає за:

- розв'язання прав доступу на основі:
  - RBAC,
  - Capability Bundles,
  - Entitlements (плани),
  - Stake (RINGK),
  - ACL,
  - Mode (public/confidential),
  - Quotas,
- кешування конфігів доступів,
- видачу дозволу або заборони на кожну дію,
- роботу у high-load середовищах,
- інтеграцію з API Gateway (PEP),
- безпечну роботу з Agent Mesh, Embassy, Wallet, RWA.

Це ключовий документ для розробників API, агентного шару та бекенду.

---

## 2. PDP Formula

PDP приймає рішення за єдиною формулою:

```text
allow =
  RBAC(role, action, resource)                   AND
  Entitlement(plan, stake_RINGK)                 AND
  Capability(key, action, resource)              AND
  ACL(resource, subject)                         AND
  Mode(resource_mode, subject_type)              AND
  Quota(subject, action)                         AND
  SecurityContext(subject, key_status)
```

Кожен блок працює незалежно.

---

## 3. PDP Inputs

PDP приймає запит такого вигляду:

```json
{
  "subject": {
    "id": "u_123",
    "type": "user"             // user | agent | integration | embassy
  },
  "team_id": "t_456",
  "action": "task.create",
  "resource": {
    "id": "p_001",
    "team_id": "t_456",
    "mode": "public"           // або confidential
  },
  "key_id": "ak_789",
  "context": {
    "ip": "1.2.3.4",
    "ua": "Mozilla/5.0",
    "timestamp": 1700000000
  }
}
```

PDP повинен дати відповідь:

```json
{ "allow": true, "reason": "ok" }
```

або:

```json
{ "allow": false, "reason": "quota_exceeded" }
```

---

## 4. PDP Architecture Overview

```
                    ┌─────────────────────────┐
                    │     Policy Registry      │
                    │ (bundles, caps, plans)  │
                    └───────────┬────────────┘
                                │
                     ┌──────────┴───────────┐
                     │        PDP Core       │
                     │  (decision engine)    │
                     └──────────┬───────────┘
                                │
         ┌──────────────────────┼─────────────────────────┐
         │                      │                         │
     API Gateway (PEP)       Agent Mesh                Embassy
```

---

## 5. Internal Modules

### 5.1 Module: Role Resolver

- Визначає роль користувача в команді:
  - Owner
  - Guardian
  - Member
  - Visitor

Запит у БД (кешований):

```sql
SELECT role, viewer_type FROM team_members WHERE ...
```

### 5.2 Module: Capability Resolver

Для `key_id` PDP збирає:

- capabilities з `access_key_caps`
- capabilities з `bundle.role.*`
- capabilities з `bundle.plan.*`
- capabilities з `bundle.agent.*`
- capabilities з `bundle.platform.*` (для платформи)

Фінальний набір — **унія всіх capability-джерел**.

### 5.3 Module: Entitlements

План (`Freemium`, `Casual`, `Premium`, `Platformium`) → базові квоти:

- LLM-токени
- Agent runs
- Router invokes
- Embassy events
- Storage
- Wallet claims

Далі застосовується stake-множник:

```text
effective_quota = base_quota × f(RINGK_staked)
```

### 5.4 Module: Quota Manager

Робить такі перевірки:

- usage < effective_quota
- якщо usage близько до межі → warning-флаг
- якщо перевищено → deny

### 5.5 Module: ACL Resolver

ACL ресурсу (якщо встановлено):

- список дозволених user_id/team_id,
- список заборонених user_id/team_id.

### 5.6 Module: Confidential Mode Resolver

Важливо для каналів/чату:

```text
if resource.mode == confidential:
    if subject.type == 'agent':
        deny reading plaintext
```

Agents не бачать plaintext у confidential-режимі.

### 5.7 Module: Key Status Checker

Перевіряє:

- чи активний ключ,
- чи не expired,
- чи не revoked,
- чи не over-rate-limit.

---

## 6. PDP Data Sources

PDP отримує дані з:

### 6.1 Capability Registry

Таблиці:

- `capabilities`
- `bundles`
- `bundle_caps`
- `access_keys`
- `access_key_caps`

### 6.2 Role/Team Registry

- `team_members`
- `teams`

### 6.3 Usage Metrics (Per Team/User)

- `usage_agent_runs`
- `usage_llm_tokens`
- `usage_embassy_events`
- `usage_storage`
- `usage_router_invokes`
- `usage_wallet_tx`

(Можуть бути або materialized views, або окремі таблиці.)

### 6.4 Resource Metadata

- `channels`
- `projects`
- `tasks`
- `rwa_inventory`

---

## 7. PDP Cache Design

PDP має бути **дуже швидким**, тому більшість даних кешуються.

### 7.1 Static Cache (Long-term)

Завантажується при старті PDP:

- capabilities list,
- bundles,
- bundle_caps.

Оновлюється:

- при події `"governance.policy.updated"`.

### 7.2 Dynamic Cache (Short-term)

Кешуються на 10–60 секунд:

- role for (user_id, team_id)
- caps for (key_id)
- quotas for (team_id)
- stake multipliers

### 7.3 Usage Cache

Usage counter зберігається:

- у Redis або Memcache,
- синхронізується з БД регулярно.

---

## 8. PDP Decision Algorithm (Pseudocode)

```python
def pdp_decide(request):
    # 1) Key status
    if key_is_invalid(request.key_id):
        return deny("key_invalid")

    # 2) Role
    role = get_role(request.subject, request.team_id)
    if not role:
        return deny("no_role")

    # 3) Capability
    if not has_capability(request.key_id, request.action):
        return deny("capability_missing")

    # 4) RBAC matrix
    if not rbac_allows(role, request.action):
        return deny("rbac_denied")

    # 5) ACL
    if acl_blocks(request.resource, request.subject):
        return deny("acl_block")

    # 6) Confidential mode
    if is_confidential(request.resource) and is_agent(request.subject):
        if request.action in ["chat.message.read"]:
            return deny("confidential_mode_restriction")

    # 7) Quotas
    if exceeds_quota(request.subject, request.action):
        return deny("quota_exceeded")

    return allow()
```

---

## 9. PDP Integration with API Gateway (PEP)

API Gateway виконує:

1. Аутентифікацію
2. Витяг ключа (user session / access key)
3. Виклик PDP:

```
POST /pdp/decide
{
  subject: {...},
  team_id: "...",
  action: "...",
  resource: {...}
}
```

4. Отримує відповідь allow/deny
5. Продовжує або блокує запит
6. Збирає usage (LLM tokens, bytes, etc.)

---

## 10. PDP Integration with Agents

### 10.1 Agent run

Перед кожним `agent.run.invoke`:

- PDP перевіряє capability → `agent.run.invoke`
- PDP перевіряє квоти → `agent_runs_per_day`

### 10.2 Tools

Кожен tool має окремий action:

- `tool.browser`
- `tool.code`
- `tool.search`

Plugins:

```text
tool.<plugin_name>.invoke
```

### 10.3 Confidential-mode

Агенти отримують summary замість plaintext.

---

## 11. PDP Integration with Embassy

Embassy keys використовують capabilities:

- `embassy.rwa.claim`
- `embassy.energy.update`
- `embassy.intent.read`

При події:

```
POST /embassy/rwa
```

API Gateway викликає PDP:

```
authorize(embassy_key, action=embassy.rwa.claim)
```

PDP перевіряє:

- ключ дійсний,
- capability збігається,
- quota embassy events не перевищена,
- ACL платформи.

---

## 12. PDP Integration with Wallet

Перед кожним:

- `wallet.balance.view`
- `wallet.stake.ringk`
- `wallet.payout.claim`

PDP:

- перевіряє capability для користувача,
- перевіряє стейк (stake multipliers),
- перевіряє квоту на wallet tx,
- перевіряє ACL команди.

---

## 13. PDP Integration with Governance

Після прийняття governance policy:

`governance.policy.updated`

PDP:

- скидає кеш bundles,
- оновлює entitlement-конфіги,
- застосовує stake multipliers,
- ідентифікає можливі конфлікти.

---

## 14. PDP Logging & Audit

Кожне рішення PDP опціонально логують:

- action,
- subject,
- team,
- result,
- latency,
- quotas status.

Для chathistory-sensitive дій → minimal metadata.

---

## 15. PDP Performance Targets

- p95 latency < 3 ms (кешований)
- p99 latency < 8 ms
- 5k–20k rps у проді
- 1–3 GB RAM кешу достатньо

---

## 16. PDP Failure Modes & Recovery

### 16.1 Cache Corruption

→ Reload from Policy Registry
→ Governance Agent перевіряє consistency

### 16.2 DB Unavailable

→ PDP переходить у fail-safe режим (deny critical ops, allow read-only)

### 16.3 Overloaded PDP

→ Horizontal autoscaling
→ Rate limit API upstream

### 16.4 Governance Hotfix

→ Manual override policies
→ Emergency shutdown of dangerous capabilities

---

## 17. Security Considerations

- PDP не довіряє API Gateway
- PDP не довіряє клієнту
- Кеш capabilities підписано
- Governance updates підписані
- Embassy events мають HMAC-підписи
- Confidential mode ніколи не віддає plaintext агенту

---

## 18. Завдання для Cursor

```text
You are a senior backend engineer. Implement Policy Decision Point (PDP) using:
- 32_policy_service_PDP_design.md
- 24_access_keys_capabilities_system.md
- 31_governance_policies_for_capabilities_and_quotas.md

Tasks:
1) Create PDP service with decision engine.
2) Implement internal modules (Role Resolver, Capability Resolver, Entitlements, Quota Manager, ACL Resolver, Confidential Mode Resolver, Key Status Checker).
3) Implement caching layer (static cache, dynamic cache, usage cache).
4) Create PDP decision algorithm.
5) Integrate with API Gateway (PEP).
6) Add PDP logging and audit.
7) Implement failure modes and recovery.

Output:
- list of modified files
- diff
- summary
```

---

## 19. Summary

PDP — основа безпеки та економічної стійкості міста:

- централізує право доступу,
- інтегрується з governance,
- застосовує квоти,
- керує usage,
- забезпечує ізоляцію агентів,
- гарантує E2EE-приватність,
- контролює Embassy/RWA/Wallet потоки,
- підтримує масштабованість і HA.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


