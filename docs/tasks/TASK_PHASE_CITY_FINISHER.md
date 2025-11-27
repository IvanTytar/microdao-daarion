# TASK_PHASE_CITY_FINISHER.md

DAARION CITY — FINISHER (Phase 3 Completion)

Цей таск завершує Phase 3 (City MVP).  

Ти маєш додати 3 ключові компоненти:

1. Public Rooms (API + WS + UI)  
2. Full Presence System (WS heartbeats + user statuses)  
3. Second Me (MVP stub: простий агент із короткою пам'яттю)

---

# 0. Цілі

Після виконання цього таску DAARION City має:

✔ Глобальні публічні кімнати міста  
✔ Живий статус онлайн-користувачів  
✔ Прості персональні агенти Second Me  
✔ Готовність до подальшої інтеграції Matrix (без самого Matrix)

---

# 1. PUBLIC ROOMS (Міські кімнати)

## 1.1 Backend API

Створити endpoints в `services/city-service`:

### GET `/city/rooms`

Повертає список всіх кімнат:

```json
[
  {
    "id": "city_general",
    "name": "General",
    "members_online": 42,
    "last_event": "...",
    "description": "Головна кімната міста"
  }
]
```

### POST `/city/rooms`

Створення нової публічної кімнати:

```json
{
  "name": "Science",
  "description": "Наукова спільнота"
}
```

### GET `/city/rooms/{id}`

Повертає:
- метадані кімнати
- останні 50 повідомлень
- онлайн-учасників

### POST `/city/rooms/{id}/messages`

Додати повідомлення в кімнату.

---

## 1.2 WebSocket

WS канал:

```
/ws/city/rooms/{roomId}
```

Події:

```
city.room.message
city.room.join
city.room.leave
city.room.presence
```

---

## 1.3 Frontend UI

Додати папку:

```
src/features/city/rooms/
```

Компоненти:
- `CityRoomsPage.tsx`
- `CityRoomView.tsx`
- `CityRoomMessageList.tsx`
- `CityRoomInput.tsx`

Функції:
- Лістинг кімнат
- Стан онлайн-учасників
- Чат у реальному часі
- Тайпінг індикатор (optional)
- Автоскрол останніх повідомлень

---

# 2. PRESENCE SYSTEM (Повноцінна система присутності)

## 2.1 Backend

WS канал:

```
/ws/city/presence
```

Кожні 20 секунд фронтенд надсилає heartbeat:

```json
{
  "event": "presence.heartbeat",
  "user_id": "u_123"
}
```

Backend:
- оновлює Redis key: `presence:u_123 = online`
- TTL = 40 секунд
- публікує у WS:

```json
{
  "event": "presence.update",
  "user_id": "...",
  "status": "online|offline"
}
```

---

## 2.2 Frontend  

Додати:

```
src/lib/presence.ts
```

Функції:
- підключення до WS `/ws/city/presence`
- кожні 20 секунд надсилати heartbeat
- локальна мапа `userId → status`
- глобальний presence store (Zustand)

---

## 2.3 Presence UI

Використати:

```
src/features/city/presence/PresenceBar.tsx
```

- список активних юзерів
- аватари
- статуси (online/offline)
- індикатор "active now"

---

# 3. SECOND ME (MVP)

Мінімальний персональний агент:
- коротка пам'ять (останні 5 interaction logs)
- LLM-виклик через agents core (`/agents/{id}/invoke`)
- UI з 1 полем вводу
- контекст: userId + останні 5 фраз

---

## 3.1 Backend API

Створити сервіс:

```
services/secondme-service/
```

Endpoints:

### POST `/secondme/invoke`

```json
{
  "prompt": "Порадь ідею для міського району",
  "user_id": "u_123"
}
```

Backend:
1. знаходить SecondMe agent user'а  
2. дає короткий контекст  
3. викликає `/agents/{id}/invoke`  
4. зберігає відповідь  
5. повертає JSON з відповіддю

### GET `/secondme/history?user_id=...`

Повертає 5 останніх interaction entries.

---

## 3.2 Frontend UI

Додати:

```
src/features/secondme/SecondMePage.tsx
src/features/secondme/SecondMeChat.tsx
```

Функції:
- поле вводу prompt  
- вивід LLM-відповіді  
- горизонтальна стрічка історії  
- кнопка "clear history"

---

# 4. РОЗШИРЕННЯ CITY HOME

На головній сторінці міста показати:
- кількість online мешканців (із presence)
- останні 3 події Feed
- 3 популярні кімнати
- швидкий доступ до Second Me (CTA)

---

# 5. Acceptance Criteria

## Public Rooms

✔ Створення, лістинг, перегляд  
✔ Чат працює через WS  
✔ Online members оновлюються в реальному часі  

## Presence System

✔ Heartbeats працюють  
✔ Redis TTL працює  
✔ PresenceBar показує онлайн-юзерів  
✔ Оновлення статусів через WS  

## Second Me MVP

✔ prompt → відповідь  
✔ історія зберігається  
✔ UI працює на окремій сторінці  

## City Home

✔ всі нові елементи працюють  
✔ загальний досвід живого "міста"

---

# 6. Команда для Cursor

**"Завершити Phase 3 згідно TASK_PHASE_CITY_FINISHER.md.  
Додати Public Rooms, Presence System, Second Me.  
Працювати в існуючих сервісах і фронтенді."**

