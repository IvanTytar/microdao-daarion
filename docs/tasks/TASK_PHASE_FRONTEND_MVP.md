# TASK_PHASE_FRONTEND_MVP.md

DAARION / microDAO — FRONTEND MVP (Next.js 15 + App Router + Tailwind)

## 0. Ціль

Створити повністю робочий Frontend MVP, який працює через наш єдиний gateway:

- `https://app.<domain>/api/...`  
- `wss://app.<domain>/ws/...`  

Фронтенд повинен реалізувати **всі базові флоу microDAO**:

Auth → Teams → Channels → Chat → Follow-ups → Projects → Agents Console → Settings.

Архітектура:  

✔ Next.js 15 (App Router)  
✔ React Server Components  
✔ TailwindCSS  
✔ Zustand або Jotai для локального стану  
✔ WebSocket transport  
✔ API інтерфейс через fetch/axios  
✔ SSR для public pages  
✔ Protected routes через middleware  

---

## 1. Структура проекту

```
frontend/
  app/
    layout.tsx
    page.tsx
    auth/
      login/
      callback/
    dashboard/
      layout.tsx
      teams/
      channels/
      chat/
      projects/
      followups/
      agents/
      settings/
  components/
  lib/
  hooks/
  config/
  services/
  types/
  public/
  styles/
  middleware.ts
  next.config.js
  package.json
  tsconfig.json
```

---

## 2. Екрани, які треба створити

### 2.1 Auth

- `/auth/login` — ввід email → POST `/auth/login-email`
- `/auth/callback?code=` → POST `/auth/exchange`

Зберігання JWT у **httpOnly cookie**.

### 2.2 Teams

- Листинг спільнот
- Створення нової Team

### 2.3 Channels

- Листинг каналів команди  
- Створення каналу  
- Перемикання public/confidential  

### 2.4 Chat

- Чат у реальному часі  
- WS підключення: `wss://app.domain/ws/channels/{channelId}`  
- Звичайні повідомлення (text)  
- Вкладення (stub)  
- Thread view (MVP, простий)  

### 2.5 Follow-ups

- Листинг
- Create
- Assign / Complete

### 2.6 Projects & Tasks

- Kanban board  
- Перетягування задач (drag & drop)  
- Фільтри по labels/status  
- Docs (editable textarea MVP)  
- Meetings (простий scheduler)  

### 2.7 Agents Console

- Список агентів  
- Agent Chat  
- Відображення tokens/latency  
- Minimal: call `/agents/{id}/invoke`  

### 2.8 Settings

- User settings  
- Notifications toggle  
- Language toggle  

---

## 3. API клієнт

Створити:

```typescript
lib/api.ts
```

Реалізувати:

- `api.get()`
- `api.post()`
- `api.patch()`
- `api.delete()`

Через `fetch` з:

```typescript
credentials: 'include'
```

Обробка:

- 401 → redirect to login
- 429 throttling
- 5xx error toast

---

## 4. WebSocket клієнт

Файл:

```typescript
lib/ws.ts
```

Підтримка:

- auto-reconnect
- heartbeat
- rooms/channels stream
- agent updates stream

---

## 5. UI Kit

Створити мінімальний UI Kit:

```
components/ui/
  Button.tsx
  Input.tsx
  Card.tsx
  Avatar.tsx
  Badge.tsx
  Modal.tsx
```

---

## 6. Acceptance Criteria

1. Авторизація працює від початку до кінця  
2. Канали відображаються  
3. Чат відправляє/отримує в реальному часі  
4. Follow-ups створюються  
5. Kanban працює  
6. Agent Console відповідає  
7. UI без критичних помилок  
8. SSR без помилок  
9. Mobile-friendly (min 360px)  

---

## 7. Команда до Cursor:

**"Створи фронтенд згідно TASK_PHASE_FRONTEND_MVP.md.  
Next.js 15 + App Router. Tailwind. JWT у cookie. WS.  
Підключення через gateway."**

