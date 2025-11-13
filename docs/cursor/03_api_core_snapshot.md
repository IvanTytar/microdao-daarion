# 03 — MicroDAO API Core Snapshot (MVP)

Цей документ — стисла витяжка з OpenAPI 3.1 специфікації MicroDAO.
Він містить тільки ті ендпоїнти, які необхідні для реалізації MVP онбордингу, чатів, задач та приватного агента.

Повна OpenAPI: див. `microdao — API Specification (OpenAPI 3.1)`.

## 1. Auth

### POST /auth/login-email

Надсилає магічний лінк користувачу на email.

**Body**
```json
{ "email": "user@example.com" }
```

**Response**
`204 No Content`

---

### POST /auth/exchange

Обмін коду з email-лінка на JWT.

**Body**
```json
{ "code": "XXXXXX" }
```

**Response 200**
```json
{
  "token": "jwt-string",
  "user": {
    "id": "u_123",
    "locale": "uk-UA",
    "tz": "Europe/Kyiv"
  }
}
```

---

## 2. Teams (micro-DAO)

### POST /teams

Створює нову спільноту (micro-DAO).

**Body**
```json
{ "name": "My Team" }
```

**Response 201**
```json
{
  "id": "t_123",
  "name": "My Team",
  "slug": "my-team",
  "mode": "public"
}
```

---

### PATCH /teams/{teamId}

Оновлює налаштування спільноти.

**Body**
```json
{ "mode": "public" | "confidential" }
```

**Response 200**
```json
{
  "id": "t_123",
  "name": "My Team",
  "mode": "confidential"
}
```

---

### GET /teams

Список моїх спільнот.

**Response**
```json
{
  "items": [
    { "id": "t_1", "name": "Team 1", "mode": "public" },
    { "id": "t_2", "name": "Project Alpha", "mode": "confidential" }
  ]
}
```

---

## 3. Channels

### POST /channels

Створює канал.

**Body**
```json
{
  "team_id": "t_123",
  "type": "public" | "group",
  "title": "general",
  "mode": "public" | "confidential"
}
```

**Response 201**
```json
{
  "id": "c_123",
  "team_id": "t_123",
  "title": "general",
  "type": "public",
  "mode": "public"
}
```

---

### GET /channels/{channelId}/messages

Отримує повідомлення каналу (cursor pagination).

**Query params**
* `cursor` (optional)
* `limit` (1–200)

**Response**
```json
{
  "items": [
    {
      "id": "m_1",
      "author_user_id": "u_123",
      "kind": "text",
      "body_plain": "Hello world",
      "created_at": "2025-01-01T12:00:00Z"
    }
  ],
  "next_cursor": "abc123"
}
```

(У confidential-каналах буде `body_enc` + `key_id` замість `body_plain`.)

---

### POST /channels/{channelId}/messages

Надсилає повідомлення.

**Body**
```json
{
  "kind": "text",
  "body": "Привіт командо!"
}
```

**Response 201**
```json
{
  "id": "m_123",
  "kind": "text",
  "author_user_id": "u_123",
  "created_at": "2025-01-01T12:00:00Z"
}
```

---

## 4. Follow-ups

### POST /followups

Створює follow-up із повідомлення.

**Body**
```json
{
  "team_id": "t_123",
  "assignee_id": "u_123",
  "src_message_id": "m_456",
  "due": "2025-02-01T09:00:00Z"
}
```

**Response 201**
```json
{
  "id": "fu_1",
  "status": "open"
}
```

---

### GET /followups

Список follow-up.

**Query**
* `assignee` (optional)
* `status` (optional)
* `cursor` (optional)

**Response**
```json
{
  "items": [
    {
      "id": "fu_1",
      "status": "open",
      "assignee_id": "u_123",
      "due": "2025-02-01T09:00:00Z"
    }
  ]
}
```

---

## 5. Projects & Tasks

### POST /projects

Створює проєкт.

**Body**
```json
{
  "team_id": "t_123",
  "name": "Website Launch",
  "visibility": "public"
}
```

**Response**
```json
{
  "id": "p_1",
  "team_id": "t_123",
  "name": "Website Launch"
}
```

---

### GET /projects

Список проєктів.

**Response**
```json
{ "items": [ { "id": "p_1", "name": "Website Launch" } ] }
```

---

### POST /projects/{projectId}/tasks

Створює задачу.

**Body**
```json
{
  "title": "Design homepage",
  "status": "backlog"
}
```

**Response 201**
```json
{
  "id": "task_1",
  "project_id": "p_1",
  "status": "backlog"
}
```

---

### GET /projects/{projectId}/tasks

Отримує задачі.

**Query**
* `status` (optional)

**Response**
```json
{
  "items": [
    {
      "id": "task_1",
      "title": "Design homepage",
      "status": "backlog"
    }
  ]
}
```

---

## 6. Agents

### GET /agents

Список приватних агентів.

**Response**
```json
{
  "items": [
    {
      "id": "ag_1",
      "name": "Team Assistant",
      "owner_kind": "team",
      "owner_id": "t_123"
    }
  ]
}
```

---

### POST /agents

Створює агента.

**Body**
```json
{
  "owner_kind": "team",
  "owner_id": "t_123",
  "name": "Team Assistant",
  "role": "general",
  "scopes": ["chat"]
}
```

**Response**
```json
{
  "id": "ag_1",
  "status": "created"
}
```

---

## 7. Search

### GET /search

Глобальний пошук по команді.

**Query**
* `q` — текст
* `scope`: `messages | files | docs | tasks | people`

**Response**
```json
{
  "results": [
    {
      "type": "message",
      "id": "m_1",
      "snippet": "Hello world"
    }
  ]
}
```

---

## 8. Errors (узагальнення)

* **400** — неправильні дані
* **401** — без авторизації
* **403** — заборонено (немає прав)
* **404** — не знайдено
* **409** — конфлікт
* **429** — rate limit
* **500** — помилка сервера

Cursor повинен обробляти помилки через toast + лог у консоль.

---

## 9. Примітка

Цей документ — спрощена карта API.

Він узятий з офіційної специфікації MicroDAO і адаптований для:

* автоматичної генерації типів,
* швидкої розробки фронтенду,
* мінімізації зайвих деталей.
