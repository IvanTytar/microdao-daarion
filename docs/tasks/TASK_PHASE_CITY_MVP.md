# TASK_PHASE_CITY_MVP.md

DAARION CITY — MVP

## 0. Ціль

Створити перший живий MVP DAARION City:

- City Home
- Public Rooms (райони)
- City Feed
- Presence System
- Second Me (stub)
- Living Map (2D JSON)

---

## 1. Структура фронту

```
app/city/
  layout.tsx
  page.tsx
  feed/
  rooms/
  presence/
  second-me/
  map/
```

---

## 2. API endpoints (створити або доопрацювати)

### Public Rooms:

- GET `/city/rooms`
- POST `/city/rooms`
- GET `/city/rooms/{id}`

### City Feed:

- GET `/city/feed`
- POST `/city/feed`

### Presence:

- WS `/ws/city/presence`

### Second Me:

- POST `/secondme/invoke`
- GET `/secondme/profile`

### Living Map:

- GET `/city/map`
- POST `/city/map/update`

---

## 3. Функціонал

### 3.1 City Home

- списки районів
- live online count
- city metrics (stub)

### 3.2 Public Rooms

- як канали microDAO, але загальноміські
- WS-чат
- метрики присутності

### 3.3 City Feed

- пости + коментарі (спрощено)
- push notifications (stub)

### 3.4 Presence

- WS presence heartbeat
- avatars grid

### 3.5 Second Me (stub)

- одне поле prompt → простий LLM call
- Зберігати 5 останніх контекстів

### 3.6 Living Map

- JSON-шари:

```json
{
  "nodes": [],
  "blocks": [],
  "agents": [],
  "events": []
}
```

---

## 4. Acceptance Criteria

- City Home працює  
- Public Rooms доступні  
- Feed оновлюється  
- Presence працює  
- Second Me відповідає  
- Map видно  

---

## 5. Команда до Cursor

**"Створити DAARION City MVP згідно TASK_PHASE_CITY_MVP.md"**

