---
title: API Specification (MVP) — DAARION.city & MicroDAO
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---

# API Specification (MVP) — DAARION.city & MicroDAO

**Документ описує мінімальний набір API-ендпоінтів для запуску MVP-версії MicroDAO, інтегрованої з DAARION.city.**

Фокус:

* створення та реєстрація MicroDAO
* робота з реєстром DAO та платформ
* базові операції Wallet (DAAR/DAARION)
* реєстрація вендорів та створення платформ
* PDP-перевірки
* базові Agent / Router виклики (stub-рівень)

---

# 1. Загальні принципи

* Транспорт: **HTTPS / JSON**
* Auth: **Bearer Token (user / service token)**
* Стиль: REST-like з чіткими ресурсами
* Усі критичні операції проходять через PDP
* Ідентифікатори DAO/платформ/користувачів — `UUID` / `string` (визначається реалізацією)

Базовий префікс:

```text
/api/v1
```

---

# 2. Auth & Context

Контекст користувача / сервісу визначається:

* токеном авторизації (user/service)
* DAO-контекстом (якщо вказано `X-DAO-ID` у заголовках)

Приклад заголовків:

```http
Authorization: Bearer <token>
X-DAO-ID: <dao_id>   # опційно, якщо дія виконується в межах конкретного DAO
```

---

# 3. DAOFactory API

## 3.1 Створення MicroDAO

**POST** `/api/v1/dao`

Створює новий MicroDAO (A3 або A4).

### Умови

* PDP: `policy.dao.create`
* токен користувача

### Request

```json
{
  "name": "string",
  "description": "string",
  "type": "public | private",    
  "level": "A3 | A4",            
  "settings": {
    "visibility": "catalog | invite-only"
  }
}
```

### Response

```json
{
  "dao_id": "string",
  "level": "A3 | A4",
  "name": "string",
  "parent_dao_id": null,
  "federation_mode": "none",
  "created_at": "2025-..."
}
```

---

## 3.2 Отримати DAO за id

**GET** `/api/v1/dao/{dao_id}`

### Response

```json
{
  "dao_id": "string",
  "name": "string",
  "description": "string",
  "level": "A1 | A2 | A3 | A4",
  "type": "platform | public | private",
  "parent_dao_id": "string | null",
  "federation_mode": "none | member | superdao",
  "settings": { ... }
}
```

---

## 3.3 Список DAO (каталог)

**GET** `/api/v1/dao`

Параметри:

* `level` (опційно): `A1|A2|A3|A4`
* `type` (опційно): `platform|public|private`

### Response

```json
{
  "items": [
    {
      "dao_id": "string",
      "name": "string",
      "level": "A2",
      "type": "platform"
    }
  ]
}
```

---

# 4. Registry API (DAO & Platforms)

## 4.1 Реєстр платформ (тільки A2)

**GET** `/api/v1/platforms`

### Response

```json
{
  "items": [
    {
      "dao_id": "string",
      "name": "Helion",
      "slug": "helion",
      "description": "Energy platform",
      "level": "A2"
    }
  ]
}
```

---

# 5. Wallet API (DAAR / DAARION)

## 5.1 Отримати баланс користувача

**GET** `/api/v1/wallet/me`

### Response

```json
{
  "user_id": "string",
  "balances": [
    { "symbol": "DAAR", "amount": "123.45" },
    { "symbol": "DAARION", "amount": "0.50" }
  ]
}
```

---

## 5.2 Перевірка базових прав доступу (допоміжний метод)

**POST** `/api/v1/wallet/check-access`

Перевіряє, чи достатньо токенів для певної дії (корисно для UI).

### Request

```json
{
  "check": "dao.create | vendor.register | platform.create"
}
```

### Response

```json
{
  "allowed": true,
  "reason": null
}
```

або

```json
{
  "allowed": false,
  "reason": "INSUFFICIENT_DAARION_BALANCE"
}
```

---

# 6. Vendor & Platform API

## 6.1 Реєстрація вендора на платформі

**POST** `/api/v1/platforms/{platform_id}/vendors`

### Умови

* PDP: `policy.vendor.register` (мінімум 0.01 DAARION у стейкінгу)

### Request

```json
{
  "display_name": "GreenFarm UA",
  "contact": {
    "email": "owner@example.com"
  }
}
```

### Response

```json
{
  "vendor_id": "string",
  "platform_id": "string",
  "status": "approved | pending"
}
```

---

## 6.2 Створення платформи (A2)

**POST** `/api/v1/platforms`

### Умови

* PDP: `policy.platform.create` (мінімум 1 DAARION у стейкінгу)

### Request

```json
{
  "name": "Helion",
  "slug": "helion",
  "description": "Energy platform",
  "domain": "energy"
}
```

### Response

```json
{
  "dao_id": "string",          
  "name": "Helion",
  "level": "A2",
  "type": "platform"
}
```

---

# 7. PDP API

## 7.1 Перевірка політики

**POST** `/api/v1/pdp/check`

### Request

```json
{
  "policy": "policy.dao.create",
  "resource": {
    "type": "dao",
    "id": null
  },
  "context": {
    "dao_level": "A3",
    "user_id": "string"
  }
}
```

### Response

```json
{
  "decision": "allow | deny | require-elevation",
  "reason": "string | null"
}
```

> У продакшн-коді сервіси зазвичай викликають PDP напряму, а не через публічний API. Ендпоінт може використовуватись для діагностики, дебагу або внутрішніх адміністративних інструментів.

---

# 8. Agents & Router API (MVP Stub)

## 8.1 Запуск агента в DAO (simple invoke)

**POST** `/api/v1/dao/{dao_id}/agents/{agent_id}/invoke`

### Умови

* PDP: `policy.agent.run`

### Request

```json
{
  "input": "string",
  "metadata": {
    "origin": "admin-console | user-chat | system"
  }
}
```

### Response

```json
{
  "run_id": "string",
  "status": "queued | running | completed | failed",
  "output": "string | null"
}
```

---

## 8.2 Створення Router flow (спрощено)

**POST** `/api/v1/router/flows`

### Request

```json
{
  "dao_id": "string",
  "name": "Onboard new member",
  "steps": [
    { "type": "agent", "agent_id": "welcome-agent" },
    { "type": "agent", "agent_id": "policy-explainer" }
  ]
}
```

### Response

```json
{
  "flow_id": "string",
  "status": "created"
}
```

---

# 9. Events (System → Clients)

Події можуть відправлятися через Webhook / WebSocket / NATS (деталі реалізації залежать від інфраструктури).

Мінімальний набір подій:

* `dao.created`
* `platform.created`
* `vendor.registered`
* `agent.run.completed`

Приклад payload:

```json
{
  "event": "dao.created",
  "data": {
    "dao_id": "string",
    "name": "string",
    "level": "A3",
    "created_by": "user_id"
  },
  "ts": "2025-..."
}
```

---

# 10. Статуси та помилки

## 10.1 HTTP-статуси

* `200 OK` — успішний запит
* `201 Created` — ресурс створено
* `400 Bad Request` — некоректні дані
* `401 Unauthorized` — відсутня/некоректна авторизація
* `403 Forbidden` — PDP = deny
* `404 Not Found` — ресурс не знайдено
* `409 Conflict` — конфлікт станів
* `500 Internal Server Error` — внутрішня помилка

## 10.2 Приклад помилки

```json
{
  "error": "ACCESS_DENIED",
  "message": "PDP denied action 'platform.create' for this user.",
  "details": {
    "policy": "policy.platform.create"
  }
}
```

---

# 11. Подальший розвиток API

Цей документ описує **MVP-шар**. Надалі можливі розширення:

* детальний Wallet API (транзакції, стейкінг, payout-и)
* повна OpenAPI-специфікація
* окремий Agent Runtime API (streams, tools, multi-step flows)
* Notification API (email / push / in-app)

На рівні MVP цього набору достатньо, щоб:

* створювати DAO
* реєструвати платформи
* реєструвати вендорів
* керувати базовими правами доступу
* запускати прості агенти та оркестраційні флоу.

---

## 12. Integration with Other Docs

Цей документ інтегрується з:

- `api.md` — повна API специфікація (розширена версія)
- `core-services-mvp.md` — реалізація core-сервісів (Wallet, DAOFactory, Registry, PDP)
- `pdp_access.md` — PDP та система доступів
- `microdao-architecture.md` — архітектура A1-A4
- `superdao-federation.md` — SuperDAO та федерації
- `tokenomics/city-tokenomics.md` — токеноміка

---

## 13. Changelog

### v1.0.0 — 2024-11-14
- Початкова версія MVP API специфікації
- Додано DAOFactory API (створення, отримання, список DAO)
- Додано Registry API (реєстр платформ)
- Додано Wallet API (баланси, перевірка доступу)
- Додано Vendor & Platform API (реєстрація вендорів, створення платформ)
- Додано PDP API (перевірка політик)
- Додано Agents & Router API (stub-рівень)
- Додано Events (системні події)

---

**Версія:** 1.0.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*

