# 02 — MicroDAO Architecture Basics (MVP)

Цей документ дає Cursor і розробникам стисле уявлення про архітектуру MicroDAO, необхідне для реалізації перших функцій MVP.

## 1. Загальний огляд архітектури

MicroDAO складається з:

- **Front-end SPA** (React + TypeScript)
- **API Gateway** (`https://api.microdao.xyz/v1`)
- **Core Services** (Teams, Channels, Messages, Followups, Projects, Agents)
- **PostgreSQL** — основна база даних
- **NATS JetStream** — message bus (події, outbox-патерн)
- **Meilisearch** — індексація і пошук
- **S3-compatible storage** — файли
- **WebSockets** — оновлення повідомлень у реальному часі

Джерела:
- Data Model & Event Catalog
- Tech Spec / Технічний опис MicroDAO
- API Specification (OpenAPI 3.1)

## 2. Стек MVP

- **Frontend:** React 18, TypeScript, Vite або Next SPA-режим
- **State:** React Query / TanStack Query
- **Design System:** базовий UI-компонентний набір (кнопки, поля, layout)
- **Backend:** Go або Node (вже залежить від вашої реалізації — Cursor адаптується)
- **Auth:** Magic-link email (JWT)
- **Transport:** REST + WebSockets

## 3. Основні модулі

### 3.1. Auth Service

- Відповідає за:
  - `POST /auth/login-email`
  - `POST /auth/exchange`
- Видає JWT (користувач, локаль, tz).
- Email з кодом / magic-link відправляє окремий SMTP-модуль.
- Після входу SPA зберігає токен та ініціалізує сесію.

### 3.2. Teams / MicroDAO Service

- Створення спільноти — автоматично створює micro-DAO:
  - `POST /teams`
  - `PATCH /teams/{id}` — public/confidential
- Зберігає:
  - id спільноти
  - slug
  - режим (`public`, `confidential`)
  - Members / Guardians
- Взаємодіє з Channels, Messages, Projects, Agents.

### 3.3. Channels Service

- Створення каналів:
  - `POST /channels`
- Типи:
  - `public` — доступні гостям (read-only)
  - `group` — приватні групові канали
- Channel data:
  - team_id
  - type
  - mode (public/confidential)

### 3.4. Messaging Service

- Головне ядро MVP.
- API:
  - `GET /channels/{id}/messages`
  - `POST /channels/{id}/messages`
  - `PATCH /messages/{id}`
  - `DELETE /messages/{id}`
- Зберігає:
  - текстові повідомлення
  - автора (user_id або agent_id)
  - E2EE шифротекст у confidential режимі
- WebSocket транслює нові повідомлення в реальному часі.

### 3.5. Followups Service

- Легкий таскер, прив'язаний до повідомлень.
- API:
  - `POST /followups`
  - `GET /followups?assignee=...`
- Статуси:
  - `open`, `in_progress`, `done`
- Використовується для персональних нагадувань і мікро-задач.

### 3.6. Projects & Tasks Service (Kanban-lite)

- API:
  - `POST /projects`
  - `GET /projects`
  - `POST /projects/{id}/tasks`
  - `GET /projects/{id}/tasks`
- Статуси задач:
  - `backlog`, `in_progress`, `review`, `done`
- Проста Kanban-дошка для MVP.

### 3.7. Agents Service

- Зберігає приватних агентів користувача або команди.
- API:
  - `GET /agents`
  - `POST /agents`
- Для MVP:
  - один агент «Team Assistant»
  - мінімальний чат з LLM
- Під капотом можна використовувати будь-який зовнішній LLM API.

### 3.8. Search Service

- На базі Meilisearch.
- API:
  - `GET /search?q=...&scope=messages|docs|tasks`
- MVP:
  - індексація публічних повідомлень + задач.

## 4. Дані та моделі

### 4.1. База даних (PostgreSQL)

Згідно з Data Model & Event Catalog:

- `users`
- `teams`, `team_members`
- `channels`, `messages`, `reactions`
- `followups`
- `projects`, `tasks`
- `agents`, `agent_runs`
- `files`
- `audit_log`
- мінімальні індекси для пошуку повідомлень

**ID формати:** `ulid` або `ksuid` (обов'язково глобально унікальні).

### 4.2. Message Bus (NATS JetStream)

Використовується не на всіх етапах MVP, але:

- дозволяє публікувати події:
  - `message.created`
  - `followup.created`
  - `task.created`
- забезпечує надійний outbox pattern.

### 4.3. Пошукові індекси (Meilisearch)

Структури документів:

- **Messages**: id, team_id, channel_id, created_at, body_plain (якщо public)
- **Tasks**: id, project_id, title, status, priority, labels
- **Docs** (можна не включати в MVP)

## 5. WebSockets

- Створений окремий WS endpoint.
- Події які обробляє фронт:
  - нове повідомлення
  - оновлення повідомлення
  - реакція
- В MVP достатньо канального namespace:
  - `/ws/channels/{id}`

## 6. Приватність та режими (Public / Confidential)

### Public Mode

- Канал доступний гостям на `/c/:slug`.
- Повідомлення індексуються у Meilisearch.
- Дані зберігаються у `messages.body_plain`.

### Confidential Mode

- Повідомлення зберігаються як `body_enc` + `key_id`.
- Клієнт розшифровує.
- Не індексується, не надсилається в Meili.
- Всі вкладення — шифротекст із pre-signed URL.
- На фронті потрібно використовувати **E2EE-хелпери** (поза scope MVP — stub OK).

## 7. API взаємодія (загальні правила)

- Усі виклики захищені Bearer JWT.
- Потрібно використовувати typed API-клієнт (можна автогенерувати зі спрощеної OpenAPI).
- Обробка помилок:
  - 400 → помилка користувача
  - 403 → access denied
  - 404 → ресурс не знайдено
  - 429 → rate limit
  - 500 → системна помилка

## 8. Front-End архітектура

### 8.1. Каталоги

```
src/
  api/
  components/
    features/
      onboarding/
      auth/
      chat/
      channels/
      followups/
      projects/
      agents/
  hooks/
  layout/
  routes/
  store/
  styles/
```

### 8.2. Рекомендовані патерни

- React Query для запитів і кешу.
- Zustand або Context для глобального стану онбордингу.
- Мовна локалізація через простий i18n dictionary.
- ErrorBoundary на рівні layout.

## 9. MVP Нефункціональні очікування

- Латентність чатів ≤ 300 мс (без LLM).
- Одночасно 10–50 активних користувачів.
- Стабільна робота мобільної версії (мінімально).
- Стійкий логін, без циклів і моклих лінків.

## 10. Для Cursor

Цей документ дає базу для:

- генерації React-компонентів,
- створення нового маршруту `/onboarding`,
- реалізації каналів і чатів,
- інтеграції базового агента,
- роботи з API без необхідності читати всю специфікацію.
