# 31 — Governance Policies for Capabilities & Quotas (MicroDAO)

*Політики DAO для управління доступами, квотами, використанням ресурсів (LLM/compute), RWA-потоками та енергетичними економічними параметрами*

---

## 1. Purpose & Scope

Цей документ визначає, як **Governance (DAARION DAO)** керує:

- наборами capabilities,
- ролями й планами (Freemium → Platformium),
- квотами LLM / агенти / каналами / Embassy,
- compute-вартістю (1T),
- енергетичними потоками (KWT),
- RWA доступами,
- стейком RINGK.

Модель відповідає концепції:

```
Governance → Policy Registry → Capability System → PDP → API/Agents
```

Це «конституція» доступів у DAARION.city.

---

## 2. Actors

### 2.1 Governance Token Holders

Мають DAAR/DAARION — голосують за зміни політик.

### 2.2 Governance Agent

Служба, що:

- приймає пропозиції (proposal),
- рахує голоси,
- застосовує політики,
- оновлює capability bundles,
- змінює entitlements,
- логуює події: `governance.policy.updated`.

### 2.3 Capability Registry

Внутрішнє джерело прав:

- role bundles,
- plan bundles,
- custom bundles,
- platform bundles.

### 2.4 Policy Service (PDP)

Перевіряє доступи:

```text
allow = RBAC ∧ Plan ∧ Stake(RINGK) ∧ Capabilities ∧ ACL ∧ Mode
```

---

## 3. Типи політик (policy types)

Політика може змінювати будь-який з таких параметрів:

### 3.1 Capability Policies

- додавання capability в role-bundle,
- вилучення capability,
- зміна опису capability,
- змінення пріоритетів.

### 3.2 Plan & Entitlement Policies

- N1–N4 ліміти LLM-токенів,
- R1–R4 ліміти agent-run'ів,
- Embassy events quotas,
- Storage quotas,
- Router.invoke quotas,
- спеціальні тарифи.

### 3.3 Stake / RINGK Policies

- зміна функції `f(RINGK_staked)` (множники квот),
- мінімальний стейк для Platformium,
- параметри lock-періоду.

### 3.4 1T Compute Policies

- compute-вартість LLM токена (напр. 0.001 1T/1000 токенів),
- cost-per-agent-run,
- cost-per-router-hop,
- cost-per-embassy-event,
- burst price adjustments.

### 3.5 KWT Energy Policies

- коефіцієнти `kWh → KWT`,
- subsidies = `1T discount` для платформ з локальним енергетичним покриттям,
- обмеження RWA-енергетичних оновлень.

### 3.6 RWA Access Policies

- які команди можуть мати `rwa.inventory.update`,
- ліміти орієнтирів для oracle input,
- RWA reward distribution rules.

### 3.7 Governance Process Policies

- наявність кворуму,
- % голосів для прийняття,
- час тривалості голосування.

---

## 4. Governance Policy Lifecycle

### 4.1 Пропозиція ("policy proposal")

Будь-який Guardian/Owner команди або DAARION громадянин зі статусом Level≥N може створити proposal:

```json
{
  "policy_type": "capability.update",
  "bundle_id": "bundle_role_member",
  "changes": [
    { "add_cap": "chat.message.delete" }
  ],
  "reason": "Потрібно дозволити модерацію"
}
```

### 4.2 Валідатор

Governance Agent перевіряє:

- чи всі capability-коди існують,
- чи bundle існує,
- чи немає конфлікту (наприклад, розширення прав visitor),
- чи user має право подати цю пропозицію.

### 4.3 Голосування

Власники DAAR/DAARION голосують:

- `yes`,
- `no`,
- `abstain`.

Метрики голосування:

- quorum ≥ X%,
- approval ≥ Y%,
- voting duration (3–7 днів).

### 4.4 Застосування

Governance Agent:

- оновлює записи в таблицях:
  - `bundles`,
  - `bundle_caps`,
  - `capabilities`,
  - `entitlements`,
- викликає `policy.update()` на PDP (гаряча перезагрузка конфігу),
- пише подію:

```json
{
  "topic":"governance.policy.updated",
  "policy_id":"gov_123",
  "bundle_updated":"bundle_role_member",
  "changes":[ "..."],
  "timestamp":"..."
}
```

### 4.5 Аудит

Вся операція реєструється в `audit_log`.

---

## 5. Governance Policy Structure (Schema)

Пропозиція реалізується у форматі:

```json
{
  "policy_id": "gov_policy_001",
  "title": "Increase compute quotas for Premium",
  "policy_type": "plan.entitlement.update",
  "target": "plan.Premium",
  "operations": [
    {
      "op": "set_quota",
      "metric": "llm_tokens_per_month",
      "value": 2000000
    },
    {
      "op": "set_quota",
      "metric": "agent_runs_per_day",
      "value": 1500
    }
  ],
  "metadata": {
    "proposed_by": "u_abc",
    "team": null
  }
}
```

Підтримувані `op`:

- `add_cap`
- `remove_cap`
- `set_quota`
- `increase_quota`
- `decrease_quota`
- `set_stake_multiplier`
- `set_compute_price`
- `set_energy_subsidy`
- `freeze_capabilities`
- `enable_burst_mode`
- `disable_burst_mode`
- `add_rwa_type`
- `remove_rwa_type`

---

## 6. Policy Application Rules (Critical)

### Rule 1 — No Privilege Escalation

Capability не може бути додано до bundle рівня:

- visitor → admin (Owner/Guardian),
- plan.Freemium → platformium (без vote).

### Rule 2 — Plan Hierarchy

Плани мають порядок:

```text
Freemium < Casual < Premium < Platformium
```

Заборонено:

- зменшувати квоти нижче рівнів нижчих планів.

### Rule 3 — Capability Consistency

Capability не може ламати fundamental правила:

- `wallet.stake.ringk` тільки owner/member команди;
- `embassy.energy.update` тільки платформи;
- `governance.policy.manage` тільки Guardian/Owner/DAO.

### Rule 4 — Conflict Detection

Governance Agent перед застосуванням перевіряє:

- чи не створює політика циклічних залежностей,
- чи не робить visitor прав адміну,
- чи не робить entitlements негативними,
- чи не створює «free infinite compute».

### Rule 5 — Reversible

Будь-яка політика повинна мати можливість:

- або бути скасованою новою політикою,
- або мати rollback-сценарій (хоча б логічний).

---

## 7. Policy Registry (Reference Implementation)

Policy Registry — це централізований конфіг:

### 7.1 Таблиці

```sql
create table governance_policies (
  id text primary key,
  policy_type text not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  applied_at timestamptz,
  applied boolean default false,
  proposed_by text references users(id)
);
```

Записи:

- зберігають повну історію політик;
- при `applied=true` → immutable.

---

## 8. PDP Integration

Після застосування політик Governance Agent викликає:

```
POST /pdp/reload
```

Або публікує подію:

```
topic: governance.policy.updated
```

PDP:

- оновлює кэш:
  - bundle → caps
  - plan → quotas
  - stake multiplier
  - compute pricing
  - allowed RWA actions

Гарантує:

- нові політики починають діяти **миттєво**;
- старі токени (cap-token) → відкидаються якщо несумісні.

---

## 9. Example Policies

### 9.1 Розширення доступів Premium

```json
{
  "policy_type": "capability.update",
  "target": "bundle_plan_premium",
  "operations": [
    { "op": "add_cap", "value": "embassy.intent.read" },
    { "op": "add_cap", "value": "rwa.inventory.update" }
  ]
}
```

### 9.2 Зменшення compute-вартості (1T)

```json
{
  "policy_type": "compute.price",
  "target": "1T",
  "operations": [
    { "op": "set_compute_price", "value": 0.0008 }
  ]
}
```

### 9.3 Зміна множника стейку

```json
{
  "policy_type": "stake.multiplier",
  "target": "RINGK",
  "operations": [
    { "op": "set_stake_multiplier", "range": "5000", "value": 1.5 }
  ]
}
```

### 9.4 Ввімкнути burst-mode

```json
{
  "policy_type": "burst_mode",
  "operations": [
    { "op": "enable_burst_mode", "x_factor": 3, "duration": 3600 }
  ]
}
```

---

## 10. Governance-Safe Defaults

- Caps не можуть бути назавжди відключені для owner.
- Embassy caps тільки для платформ.
- RWA caps тільки для сертифікованих платформ.
- Compute-ціни мають нижні межі, щоб захистити економіку.
- Burst-mode має час і ліміт.

---

## 11. Security Considerations

### 11.1 Replay Protection

Кожна політика має `policy_id` та timestamp.

### 11.2 Immutable History

Після `applied=true` рядок в таблиці є незмінним.

### 11.3 Double-application Guard

Governance Agent перевіряє `applied=false`.

### 11.4 PDP не довіряє UI

Усі capability-операції перевіряються на бекенді.

---

## 12. Audit & Transparency

- Усі політики:
  - публічні,
  - переглядаються резидентами,
  - мають changelog,
  - доступні через API:
    - `GET /governance/policies`.

- Audit log записує:
  - хто подав пропозицію,
  - хто голосував,
  - застосовані зміни.

---

## 13. Governance Failover Procedures

### 13.1 Якщо Governance Agent недоступний

- PDP повертає попередні політики.
- API не приймає нові пропозиції (fail-safe).
- Відновлення через re-deploy.

### 13.2 Якщо Policy Registry пошкоджено

- Використовується backup snapshot.
- Governance Agent перевіряє consistency з bundles.

### 13.3 Якщо політика зламала доступи

- Emergency rollback policy:

```json
{
  "policy_type": "policy.rollback",
  "target": "policy_id",
  "reason": "breaks rights"
}
```

---

## 14. Integration with Other Docs

Цей документ доповнює:

- `24_access_keys_capabilities_system.md`
- `26_security_audit.md`
- `29_scaling_and_high_availability.md`
- `30_cost_optimization_and_token_economics_infrastructure.md`
- `27_database_schema_migrations.md`

---

## 15. Завдання для Cursor

```text
You are a senior backend engineer. Implement Governance Policies system using:
- 31_governance_policies_for_capabilities_and_quotas.md
- 24_access_keys_capabilities_system.md
- 30_cost_optimization_and_token_economics_infrastructure.md

Tasks:
1) Create governance_policies table.
2) Implement Governance Agent service (proposal validation, voting, application).
3) Create Policy Registry with caching.
4) Implement policy operations (add_cap, set_quota, set_stake_multiplier, etc.).
5) Add conflict detection and validation rules.
6) Integrate with PDP for hot-reload of policies.
7) Add audit logging for all policy changes.

Output:
- list of modified files
- diff
- summary
```

---

## 16. Summary

Система Governance у DAARION.city:

- керує capability-наборами,
- визначає квоти й compute-вартість,
- регулює RWA й енергетичні потоки,
- підтримує стейкову модель RINGK,
- має формальний policy lifecycle,
- повністю інтегрується в PDP.

Це забезпечує масштабовану, безпечну, економічно стійку систему доступів.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


