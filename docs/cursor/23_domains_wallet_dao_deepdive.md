# 23 — Domains, Wallet Agent & DAO Agent Deep Dive (MicroDAO)

Технічна специфікація мультидоменного роутингу, Wallet Agent протоколу та DAO Agent синхронізації

Цей документ деталізує три критичних технічних компоненти MicroDAO:

1. **Мульти-тенант домени та роутінг**

2. **Wallet Agent: безпечний підпис дій**

3. **DAO Agent: звʼязок із зовнішнім DAO-протоколом**

Документ інтегрований із попередніми модулями (12–22).

---

# 1. MULTI-TENANT DOMAINS & ROUTING

MicroDAO має підтримувати:

- піддомени формату `*.daarion.city`,
- власні домени адміністраторів microDAO,
- гнучке маршрутизаційне дерево,
- коректну інтеграцію front/back-end,
- автоматичні SSL-сертифікати,
- безпечне розмежування команд.

---

## 1.1. Модель БД

### Таблиця `teams` (microDAO)

```ts
teams:
- id: string
- slug: string            // "greenfood", "musiclab"
- primary_domain_id: string | null
- created_at
```

### Таблиця `domains`

```ts
domains:
- id: string
- team_id: string
- host: string            // "greenfood.daarion.city", "mydao.org"
- status: "pending" | "active" | "disabled"
- is_primary: boolean
- verified_at: Date | null
- created_at
```

---

## 1.2. Алгоритм визначення `currentTeamId` по домену

На початку кожного HTTP-запиту:

```
host := request.headers["Host"]

1) спробувати знайти host у domains:
   SELECT team_id FROM domains 
   WHERE host = $host AND status = 'active';

2) якщо знайшли → currentTeamId = team_id.

3) якщо ні — це, можливо, піддомен DAARION.city:
   slug = host.split('.')[0]
   SELECT id FROM teams WHERE slug = $slug;

4) якщо знайшли → currentTeamId = id.

5) інакше → 404 або сторінка Onboarding ("microDAO не знайдено")
```

---

## 1.3. Підтримка двох режимів UI

### Режим 1 — Піддомен / власний домен

URL:

```
greenfood.daarion.city/
mydao.org/
```

Усі маршрути стають:

```
/ → головна команда
/projects
/agents
/settings
```

**Без /t/:teamId** — тому що `teamId` вже визначено з домену.

### Режим 2 — Центральний домен (наприклад, app.daarion.city)

URL:

```
app.daarion.city/t/:teamId/agents
```

Цей режим потрібен:

* для розробки,
* для адміністрування,
* для роботи всередині DAARION.city як централізованої платформи.

---

## 1.4. Налаштування кастомного домену (UX)

### Потік:

1. Адмін відкриває: **Settings → Domain**

2. Поле: "Поточний домен: `greenfood.daarion.city`"

3. Поле: "Додати власний домен" → `mydao.org`

4. Система показує інструкцію:

   ```
   Створіть CNAME:
   mydao.org → domains.daarion.city
   ```

5. Домен створюється зі статусом `pending`.

6. DNS checker (кожні 10 хв) змінює статус на `active`, коли знайдено CNAME.

7. Автоматичний ACME/SSL випуск.

8. Домен стає primary.

---

# 2. WALLET AGENT — ПРОТОКОЛ БЕЗПЕЧНОГО ПІДПИСУ

Wallet Agent — це **інтерфейс** між microDAO і зовнішніми гаманцями:

* браузерні (MetaMask, WalletConnect),
* мобільні,
* апаратні (Tangem-подібні).

Wallet Agent **ніколи не отримує приватний ключ**.

---

## 2.1. Потік підпису дії

Порядок:

### Етап 1 — Агент хоче виконати дію

Наприклад: Governance Agent хоче оновити правило.

```ts
walletAgent.prepare_signature_payload({
  action: "update_policy",
  params: {...}
});
```

Wallet Agent:

1. Валідатор: "Чи має агент право робити це?"
2. Створює запис у `sign_requests`.
3. Формує `human_description`.
4. Показує людині Approval UI.

---

## 2.2. Модель `sign_requests`

```ts
sign_requests:
- id
- team_id
- type                    // "governance_update", "dao_submit", ...
- payload_json            // те, що треба підписати
- human_description
- created_by_agent_id
- created_by_user_id?     // якщо ініціатор — людина
- status: "pending" | "signed" | "rejected"
- created_at
- updated_at
```

---

## 2.3. UX у фронтенді

Коли є новий `sign_request`:

* у UI зʼявляється:

  * "Агент пропонує підписати дію"
  * опис,
  * кнопки:

    * "Підписати"
    * "Скасувати"

Коли користувач натискає "Підписати":

1. фронт надсилає `payload` у wallet provider (MetaMask / WC / Tangem SDK),
2. отримує `signature`,
3. викликає:

   ```
   POST /sign_requests/:id/confirm
   {
     signature: "0x..."
   }
   ```

---

## 2.4. Таблиця `sign_results`

```ts
sign_results:
- id
- sign_request_id
- signature
- tx_hash? 
- confirmed_at
- status: "broadcasted" | "failed"
```

---

## 2.5. Wallet Agent Tools

```ts
tools: [
  "prepare_signature_payload",   // формує sign_request
  "request_signature",           // запит до користувача (UI)
  "verify_signature",            // перевірка
  "get_wallet_state"             // поточні адреси, мережі, доступи
]
```

Wallet Agent — це декларативна прослойка між дією і підписом користувача.

---

# 3. DAO AGENT — СИНХРОНІЗАЦІЯ З ON-CHAIN DAO

Не кожному microDAO потрібен on-chain DAO.

Але архітектура має підтримувати:

* звʼязок з DAO-контрактами,
* синхронізацію ритуалів узгодження microDAO з DAO-голосуваннями,
* оновлення локальних правил після голосування,
* відправку результатів у DAO-контракт.

---

## 3.1. Модель задач DAO Agent

### 1) Fetch external proposals

```
fetch_dao_proposals(team_id)
```

Тягне список пропозицій з DAO-контракту чи API.

### 2) Map rituals to proposals

```
map_ritual_to_proposal(ritual_id, proposal_id)
```

Звʼязує локальний ритуал і зовнішню пропозицію.

### 3) Submit local result to DAO

```
submit_ritual_result(ritual_id)
```

Використовує Wallet Agent для підпису.

### 4) Sync policy

```
sync_policies_onchain()
```

Порівнює локальні правила з DAO-версією.

---

## 3.2. Модель БД

### Таблиця `dao_proposals`

```ts
dao_proposals:
- id
- team_id
- proposal_id_onchain
- title
- body
- status: "open" | "closed"
- result: "accepted" | "rejected" | "pending"
- mapped_ritual_id: string | null
- created_at
```

### Таблиця `dao_sync_logs`

Журнал синхронізації.

```ts
dao_sync_logs:
- id
- team_id
- action_type
- payload_json
- created_at
```

---

## 3.3. DAO Agent Tools

```ts
tools: [
  "fetch_dao_proposals",
  "sync_policies_onchain",
  "submit_ritual_result",
  "resolve_dao_result"
]
```

---

# 4. Інтеграція з Governance Agent та OperatorMode

DAO Agent працює лише тоді, коли:

* Governance Agent дозволяє це (entitlement),
* Wallet Agent підписує дії людиною.

OperatorMode у DAO Agent:

```ts
operatorMode: {
  enabled: true,
  scopes: ["team"],
  allowedTools: [
    "fetch_dao_proposals",
    "sync_policies_onchain"
  ],
  schedule: "0 */6 * * *", // кожні 6 годин
  maxActionsPerHour: 5
}
```

**Оновлення правил або відправка результатів ритуалу завжди вимагає людського підпису.**

---

# 5. API ЕНДПОЇНТИ

## 5.1. Domains API

```
GET /domains?team_id
POST /domains
PATCH /domains/:id
DELETE /domains/:id
```

## 5.2. Wallet API

```
GET /sign_requests?team_id
POST /sign_requests
POST /sign_requests/:id/confirm
POST /sign_requests/:id/reject
```

## 5.3. DAO API

```
GET /dao/proposals?team_id
POST /dao/sync
POST /dao/ritual/:id/submit
```

---

# 6. Інструкції для Cursor

```
Use 23_domains_wallet_dao_deepdive.md to implement:

1) Multi-tenant domain routing (backend + frontend)

2) Domains management UI (admin area)

3) Wallet Agent protocol:

   - sign_requests
   - sign_results
   - prepare_signature_payload
   - confirm/reject endpoints

4) DAO Agent backend model:

   - dao_proposals
   - dao_sync_logs
   - mapping rituals <-> proposals

5) Guard all DAO Agent actions with:

   - Governance/Access entitlements
   - Wallet signature flow

6) Add operatorMode guards where appropriate
```

---

# 7. Результат

Після впровадження:

* кожне microDAO може мати власний домен без конфігураційної плутанини,
* Wallet Agent забезпечує безпечний і прозорий протокол підпису,
* DAO Agent може синхронізуватися з зовнішніми DAO-протоколами,
* архітектура стає розширюваною для міжпросторових і міжмережевих інтеграцій,
* operatorMode забезпечує контрольований автоматизм без ризиків.
