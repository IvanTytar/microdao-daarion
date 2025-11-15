---
title: API Reference — DAARION.city & MicroDAO
version: 1.1.0
status: canonical
last_updated: 2024-11-14
---

> **Цей документ є актуальною API специфікацією для DAARION.city & MicroDAO.**  
> Повна версія API з усіма ендпоінтами. Для MVP-версії див. `api-mvp.md`.

# API Reference — DAARION.city & MicroDAO

*Мінімальний набір MVP-ендпоінтів для інтеграції з DAARION.city*

---

## 1. Overview

Цей документ описує мінімальний набір API endpoints для:

- **Wallet Service** — баланси, транзакції, staking, payouts
- **DAOFactory** — створення MicroDAO, емісія GOV/UTIL/REP
- **Registry** — реєстрація DAO, агентів, платформ
- **Vendor/Platform Registration** — реєстрація вендорів та платформ
- **Token-Gated Access** — перевірки DAAR/DAARION
- **Public Channel** — для інтеграції з сайтом
- **PDP Check** — Policy Decision Point endpoint
- **Agent Runtime / Router** — запуск агентів та роутера
- **System Events** — WebSocket підписка на події

**Base URL:** `https://api.microdao.xyz/v1`

**Authentication:** Bearer Token (JWT)

---

## 2. Wallet API

### 2.1 Get Balances

```http
GET /wallet/balances
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "balances": [
    {
      "symbol": "DAAR",
      "balance": "100.50",
      "staked": "50.00"
    },
    {
      "symbol": "DAARION",
      "balance": "2.5",
      "staked": "1.0"
    },
    {
      "symbol": "RINGK",
      "balance": "0",
      "staked": "0"
    }
  ]
}
```

---

### 2.2 Check Token Eligibility

```http
GET /wallet/eligibility?action={action}
Authorization: Bearer {token}
```

**Query Parameters:**
- `action`: `dao.create` | `vendor.register` | `platform.create`

**Response 200:**
```json
{
  "eligible": true,
  "reason": "balance(DAAR) >= 1.00",
  "required": {
    "DAAR": 1.0,
    "DAARION": 0.01
  },
  "current": {
    "DAAR": 100.50,
    "DAARION": 2.5
  }
}
```

---

### 2.3 Stake Tokens

```http
POST /wallet/stake
Authorization: Bearer {token}
Content-Type: application/json

{
  "symbol": "DAARION",
  "amount": "1.0"
}
```

**Response 200:**
```json
{
  "success": true,
  "transaction_id": "tx_123",
  "staked": {
    "symbol": "DAARION",
    "amount": "1.0",
    "total_staked": "2.0"
  }
}
```

---

### 2.4 Get Payouts

```http
GET /wallet/payouts?status={status}
Authorization: Bearer {token}
```

**Query Parameters:**
- `status`: `generated` | `claimed` | `failed`

**Response 200:**
```json
{
  "payouts": [
    {
      "id": "p_123",
      "symbol": "KWT",
      "amount": "250.00",
      "rwa_ref": "rwa_456",
      "status": "generated",
      "created_at": "2024-11-14T10:00:00Z"
    }
  ]
}
```

---

### 2.5 Claim Payout

```http
POST /wallet/payouts/{payoutId}/claim
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "payout_id": "p_123",
  "claimed_at": "2024-11-14T10:05:00Z",
  "new_balance": {
    "symbol": "KWT",
    "balance": "250.00"
  }
}
```

---

## 3. DAOFactory API

### 3.1 Create MicroDAO

```http
POST /dao/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My MicroDAO",
  "type": "community",  // community | personal
  "mode": "public",     // public | confidential
  "payment_token": "DAAR"  // DAAR | DAARION
}
```

**PDP Check:**
- Перевіряє `balance(DAAR) >= 1.00` або `balance(DAARION) >= 0.01`
- Списує 1 DAAR (або еквівалент в DAARION)

**Response 201:**
```json
{
  "dao_id": "dao_123",
  "name": "My MicroDAO",
  "slug": "my-microdao",
  "type": "community",
  "level": "A3",  // A3 (public) or A4 (private)
  "mode": "public",
  "created_at": "2024-11-14T10:00:00Z"
}
```

---

### 3.2 Mint GOV Token

```http
POST /dao/{daoId}/tokens/mint
Authorization: Bearer {token}
Content-Type: application/json

{
  "token_type": "GOV",
  "amount": "1000"
}
```

**PDP Check:**
- Перевіряє `balance(DAAR) >= 1.00`
- Списує 1 DAAR

**Response 200:**
```json
{
  "success": true,
  "token_type": "GOV",
  "amount": "1000",
  "transaction_id": "tx_456"
}
```

---

### 3.3 Mint UTIL Token

```http
POST /dao/{daoId}/tokens/mint
Authorization: Bearer {token}
Content-Type: application/json

{
  "token_type": "UTIL",
  "amount": "5000"
}
```

**PDP Check:**
- Перевіряє `balance(DAAR) >= 1.00`
- Списує 1 DAAR

**Response 200:**
```json
{
  "success": true,
  "token_type": "UTIL",
  "amount": "5000",
  "transaction_id": "tx_789"
}
```

---

### 3.4 Mint REP Token

```http
POST /dao/{daoId}/tokens/mint
Authorization: Bearer {token}
Content-Type: application/json

{
  "token_type": "REP",
  "amount": "1",
  "recipient_id": "u_123"
}
```

**PDP Check:**
- Перевіряє `balance(DAAR) >= 1.00`
- Списує 1 DAAR

**Response 200:**
```json
{
  "success": true,
  "token_type": "REP",
  "amount": "1",
  "recipient_id": "u_123",
  "transaction_id": "tx_012"
}
```

---

## 4. Registry API

### 4.1 Register DAO in Registry

```http
POST /registry/dao/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "dao_id": "dao_123",
  "name": "My MicroDAO",
  "type": "community",
  "level": "A3",
  "metadata": {
    "description": "Description of DAO",
    "tags": ["tech", "community"]
  }
}
```

**Response 201:**
```json
{
  "success": true,
  "registry_id": "reg_123",
  "dao_id": "dao_123",
  "registered_at": "2024-11-14T10:00:00Z"
}
```

---

### 4.2 Register Agent

```http
POST /registry/agent/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "agent_id": "agent_123",
  "dao_id": "dao_123",
  "name": "Team Assistant",
  "role": "team_assistant",
  "capabilities": [
    "agent.run.invoke",
    "chat.message.send",
    "project.task.create"
  ]
}
```

**Response 201:**
```json
{
  "success": true,
  "registry_id": "reg_456",
  "agent_id": "agent_123",
  "registered_at": "2024-11-14T10:00:00Z"
}
```

---

### 4.3 Register Platform (A2)

```http
POST /registry/platform/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "platform_code": "greenfood",
  "name": "GREENFOOD",
  "dao_id": "dao_789",
  "level": "A2",
  "metadata": {
    "domain": "агро/харчові продукти",
    "owner": "GREENFOOD microDAO"
  }
}
```

**PDP Check:**
- Перевіряє `staked(DAARION) >= 1.00`
- Перевіряє роль Owner або Guardian

**Response 201:**
```json
{
  "success": true,
  "registry_id": "reg_789",
  "platform_code": "greenfood",
  "dao_id": "dao_789",
  "registered_at": "2024-11-14T10:00:00Z"
}
```

---

## 5. Vendor/Platform Registration API

### 5.1 Register Vendor

```http
POST /platforms/{platformCode}/vendors/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "vendor_name": "My Farm",
  "vendor_type": "producer"
}
```

**PDP Check:**
- Перевіряє `staked(DAARION) >= 0.01`
- Перевіряє доступ до платформи

**Response 201:**
```json
{
  "success": true,
  "vendor_id": "vendor_123",
  "platform_code": "greenfood",
  "registered_at": "2024-11-14T10:00:00Z"
}
```

---

### 5.2 Get Platform Info

```http
GET /platforms/{platformCode}
```

**Response 200:**
```json
{
  "platform_code": "greenfood",
  "name": "GREENFOOD",
  "dao_id": "dao_789",
  "level": "A2",
  "status": "active",
  "metadata": {
    "domain": "агро/харчові продукти",
    "owner": "GREENFOOD microDAO"
  }
}
```

---

## 6. Token-Gated Access API

### 6.1 Check Access

```http
POST /access/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "action": "dao.create",
  "resource": "dao",
  "context": {
    "dao_level": "A3"
  }
}
```

**Response 200:**
```json
{
  "allow": true,
  "reason": "balance(DAAR) >= 1.00",
  "checked_at": "2024-11-14T10:00:00Z"
}
```

**Response 403:**
```json
{
  "allow": false,
  "reason": "insufficient_balance",
  "required": {
    "DAAR": 1.0,
    "DAARION": 0.01
  },
  "current": {
    "DAAR": 0.5,
    "DAARION": 0.005
  }
}
```

---

## 7. Public Channel API

### 7.1 Get Public Channel Info

```http
GET /channels/{slug}/public
```

**Response 200:**
```json
{
  "id": "daarion-city-general",
  "team_id": "daarion-city",
  "title": "Загальний канал міста",
  "slug": "general",
  "description": "Публічний канал для обговорення міських питань",
  "message_count": 1234,
  "member_count": 567,
  "is_public": true,
  "team": {
    "id": "daarion-city",
    "name": "DAARION.city",
    "slug": "daarion"
  }
}
```

---

### 7.2 Get Public Messages

```http
GET /channels/{slug}/public/messages?limit=50&before={message_id}
```

**Response 200:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "sender": {
        "id": "user_456",
        "name": "Олександр",
        "avatar_url": "https://..."
      },
      "body": "Привіт, місто!",
      "created_at": "2024-11-14T10:00:00Z",
      "reactions": []
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "msg_124"
  }
}
```

---

### 7.3 Post Message (Authenticated)

```http
POST /channels/{slug}/public/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "body": "Повідомлення від користувача"
}
```

**Response 201:**
```json
{
  "id": "msg_125",
  "sender": {
    "id": "user_789",
    "name": "Марія"
  },
  "body": "Повідомлення від користувача",
  "created_at": "2024-11-14T10:05:00Z"
}
```

---

### 7.4 Join Public Channel

```http
POST /channels/{slug}/public/join
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Ім'я Користувача",
  "viewer_type": "member"  // member | visitor
}
```

**Response 200:**
```json
{
  "user_id": "user_789",
  "access_token": "jwt-token",
  "membership": {
    "role": "member",
    "viewer_type": "member"
  }
}
```

---

## 8. TokenBridge API

### 8.1 Exchange UTIL → DAAR

```http
POST /bridge/exchange
Authorization: Bearer {token}
Content-Type: application/json

{
  "from_token": "UTIL",
  "to_token": "DAAR",
  "amount": "100",
  "dao_id": "dao_123"
}
```

**Response 200:**
```json
{
  "success": true,
  "exchange_rate": 0.85,
  "from": {
    "token": "UTIL",
    "amount": "100"
  },
  "to": {
    "token": "DAAR",
    "amount": "85"
  },
  "transaction_id": "tx_345"
}
```

---

## 9. DAARsales / DAARIONsales API

### 9.1 Buy DAAR

```http
POST /sales/daar/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount_usdt": "100",
  "payment_method": "USDT"  // USDT | POL
}
```

**Response 200:**
```json
{
  "success": true,
  "daar_received": "100",
  "transaction_id": "tx_678",
  "new_balance": {
    "DAAR": "200.50"
  }
}
```

---

### 9.2 Exchange DAAR → DAARION

```http
POST /sales/daarion/exchange
Authorization: Bearer {token}
Content-Type: application/json

{
  "daar_amount": "100"
}
```

**Response 200:**
```json
{
  "success": true,
  "daarion_received": "1",
  "exchange_rate": 100,
  "transaction_id": "tx_901",
  "new_balance": {
    "DAARION": "3.5"
  }
}
```

---

## 10. PDP Check API

### 10.1 Check Access (PDP)

```http
POST /pdp/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": {
    "id": "u_123",
    "type": "user"  // user | agent | integration | embassy
  },
  "team_id": "t_456",
  "action": "dao.create",
  "resource": {
    "id": "dao_001",
    "team_id": "t_456",
    "mode": "public"
  },
  "key_id": "ak_789",
  "context": {
    "ip": "1.2.3.4",
    "ua": "Mozilla/5.0",
    "timestamp": 1700000000
  }
}
```

**Response 200:**
```json
{
  "allow": true,
  "reason": "ok",
  "checked_at": "2024-11-14T10:00:00Z"
}
```

**Response 403:**
```json
{
  "allow": false,
  "reason": "insufficient_balance",
  "details": {
    "required": {
      "DAAR": 1.0,
      "DAARION": 0.01
    },
    "current": {
      "DAAR": 0.5,
      "DAARION": 0.005
    }
  }
}
```

---

## 11. Agent Runtime / Router API

### 11.1 Run Agent

```http
POST /agent/run
Authorization: Bearer {token}
Content-Type: application/json

{
  "agent_id": "agent_123",
  "input": "Створи задачу з обговорення в каналі #general",
  "context": {
    "team_id": "t_456",
    "channel_id": "c_789",
    "confidential": false
  }
}
```

**Response 200:**
```json
{
  "run_id": "run_123",
  "agent_id": "agent_123",
  "status": "running",
  "created_at": "2024-11-14T10:00:00Z"
}
```

---

### 11.2 Get Agent Run Status

```http
GET /agent/run/{runId}/status
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "run_id": "run_123",
  "status": "completed",
  "result": {
    "task_id": "task_456",
    "message": "Задачу створено успішно"
  },
  "created_at": "2024-11-14T10:00:00Z",
  "completed_at": "2024-11-14T10:00:05Z"
}
```

---

### 11.3 Router Invoke (DAARWIZZ)

```http
POST /router/invoke
Authorization: Bearer {token}
Content-Type: application/json

{
  "input": "Підготуй звіт по проєкту за останній місяць",
  "goal": "Generate monthly project report",
  "constraints": {
    "max_cost": "10.0",
    "max_steps": 10
  },
  "context": {
    "team_id": "t_456",
    "agent_run_id": "ar_777",
    "confidential": false
  },
  "mode": "auto",  // auto | structured | hybrid
  "tools": ["math", "project", "llm"]
}
```

**Response 200:**
```json
{
  "run_id": "router_123",
  "status": "planning",
  "plan": [
    {
      "step": 1,
      "tool": "project",
      "action": "get_project_summary",
      "args": {
        "project_id": "p_001"
      }
    },
    {
      "step": 2,
      "tool": "llm",
      "action": "generate_report",
      "args": {
        "template": "monthly_report"
      }
    }
  ],
  "created_at": "2024-11-14T10:00:00Z"
}
```

---

### 11.4 Get Router Run Status

```http
GET /router/run/{runId}/status
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "run_id": "router_123",
  "status": "done",
  "result": {
    "report_url": "https://...",
    "steps_completed": 2,
    "cost": "8.5"
  },
  "created_at": "2024-11-14T10:00:00Z",
  "completed_at": "2024-11-14T10:00:15Z"
}
```

---

## 12. System Events API

### 12.1 Subscribe to Events (WebSocket)

```http
GET /events/subscribe?streams={streams}
Authorization: Bearer {token}
Upgrade: websocket
```

**Query Parameters:**
- `streams`: Comma-separated list of streams (e.g., `dao,wallet,agent`)

**WebSocket Messages:**

**Event: `dao.created`**
```json
{
  "event_id": "evt_123",
  "ts": "2024-11-14T10:00:00Z",
  "domain": "dao",
  "type": "dao.created",
  "version": 1,
  "actor": {
    "id": "u_123",
    "kind": "user"
  },
  "payload": {
    "dao_id": "dao_456",
    "name": "My MicroDAO",
    "type": "community",
    "level": "A3",
    "mode": "public"
  },
  "meta": {
    "team_id": "dao_456",
    "trace_id": "trace_abc"
  }
}
```

**Event: `vendor.registered`**
```json
{
  "event_id": "evt_124",
  "ts": "2024-11-14T10:05:00Z",
  "domain": "platform",
  "type": "vendor.registered",
  "version": 1,
  "actor": {
    "id": "u_123",
    "kind": "user"
  },
  "payload": {
    "vendor_id": "vendor_789",
    "platform_code": "greenfood",
    "vendor_name": "My Farm",
    "vendor_type": "producer"
  },
  "meta": {
    "platform_code": "greenfood",
    "trace_id": "trace_def"
  }
}
```

**Event: `platform.created`**
```json
{
  "event_id": "evt_125",
  "ts": "2024-11-14T10:10:00Z",
  "domain": "platform",
  "type": "platform.created",
  "version": 1,
  "actor": {
    "id": "u_123",
    "kind": "user"
  },
  "payload": {
    "platform_code": "greenfood",
    "name": "GREENFOOD",
    "dao_id": "dao_789",
    "level": "A2"
  },
  "meta": {
    "platform_code": "greenfood",
    "trace_id": "trace_ghi"
  }
}
```

**Event: `agent.run.started`**
```json
{
  "event_id": "evt_126",
  "ts": "2024-11-14T10:15:00Z",
  "domain": "agent",
  "type": "agent.run.started",
  "version": 1,
  "actor": {
    "id": "agent_123",
    "kind": "agent"
  },
  "payload": {
    "run_id": "run_123",
    "agent_id": "agent_123",
    "input": "Створи задачу",
    "context": {
      "team_id": "t_456",
      "channel_id": "c_789"
    }
  },
  "meta": {
    "team_id": "t_456",
    "trace_id": "trace_jkl"
  }
}
```

**Event: `wallet.payout.generated`**
```json
{
  "event_id": "evt_127",
  "ts": "2024-11-14T10:20:00Z",
  "domain": "wallet",
  "type": "wallet.payout.generated",
  "version": 1,
  "actor": {
    "id": "system",
    "kind": "service"
  },
  "payload": {
    "payout_id": "p_123",
    "team_id": "t_456",
    "symbol": "KWT",
    "amount": "250.00",
    "rwa_ref": "rwa_789"
  },
  "meta": {
    "team_id": "t_456",
    "trace_id": "trace_mno"
  }
}
```

---

### 12.2 Get Event History

```http
GET /events/history?stream={stream}&limit=50&before={event_id}
Authorization: Bearer {token}
```

**Query Parameters:**
- `stream`: Event stream name (e.g., `dao`, `wallet`, `agent`)
- `limit`: Number of events to return (default: 50)
- `before`: Event ID to start from (cursor pagination)

**Response 200:**
```json
{
  "events": [
    {
      "event_id": "evt_123",
      "ts": "2024-11-14T10:00:00Z",
      "type": "dao.created",
      "payload": { ... }
    }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "evt_124"
  }
}
```

---

## 13. Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "insufficient_balance",
    "message": "Insufficient DAAR balance. Required: 1.00, Current: 0.50",
    "details": {
      "required": {
        "DAAR": 1.0
      },
      "current": {
        "DAAR": 0.5
      }
    }
  }
}
```

### Common Error Codes

- `insufficient_balance` — недостатній баланс токенів
- `access_denied` — доступ заборонено (PDP)
- `invalid_token` — невалідний токен
- `quota_exceeded` — перевищено квоту
- `resource_not_found` — ресурс не знайдено
- `rate_limit_exceeded` — перевищено rate limit

---

## 14. Rate Limiting

### Global Limits

- **Guest (read-only):** 100 requests/minute
- **Authenticated (write):** 30 requests/minute
- **Join requests:** 5 requests/hour per IP

### Per-Endpoint Limits

- **Wallet operations:** 10 requests/minute
- **DAOFactory:** 5 requests/hour
- **Registry:** 20 requests/minute

---

## 15. Integration with Other Docs

Цей документ інтегрується з:

- `pdp_access.md` — PDP та система доступів
- `tokenomics/city-tokenomics.md` — токеноміка та правила
- `agents.md` — агенти та їх права
- `microdao-architecture.md` — архітектура A1-A4
- `microdao-admin-console.md` — адмін-панель для всіх MicroDAO
- `superdao-federation.md` — SuperDAO та федерації
- `integration-daarion.md` — інтеграція з сайтом

---

## 16. Changelog

### v1.1.0 — 2024-11-14
- Додано PDP Check API
- Додано Agent Runtime / Router API (stub)
- Додано System Events API (WebSocket subscribe, event history)
- Додано події: dao.created, vendor.registered, platform.created, agent.run.started, wallet.payout.generated

### v1.0.0 — 2024-11-14
- Початкова версія API специфікації
- Додано Wallet API (баланси, staking, payouts)
- Додано DAOFactory API (створення DAO, емісія GOV/UTIL/REP)
- Додано Registry API (реєстрація DAO, агентів, платформ)
- Додано Vendor/Platform Registration API
- Додано Token-Gated Access API
- Додано Public Channel API
- Додано TokenBridge API
- Додано DAARsales/DAARIONsales API

---

**Версія:** 1.1.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*

