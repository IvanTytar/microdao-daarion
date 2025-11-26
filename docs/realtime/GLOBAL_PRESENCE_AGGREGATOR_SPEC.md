# GLOBAL PRESENCE AGGREGATOR — DAARION.city

Version: 1.0.0
Location: docs/realtime/GLOBAL_PRESENCE_AGGREGATOR_SPEC.md

---

## 0. PURPOSE

Зробити **єдиний центр правди про присутність (presence) та активність** у місті:

- збирати Matrix presence/typing/room-activity на сервері,
- агрегувати їх на рівні кімнат (`city_room`),
- публікувати у NATS як події,
- транслювати у фронтенд через WebSocket з `city-service`.

Результат: DAARION має **"живе місто"**:

- список кімнат `/city` показує:
  - скільки людей онлайн,
  - активність у реальному часі,
- майбутня City Map (2D/2.5D) живиться цими даними.

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DAARION PRESENCE SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐   │
│  │   Matrix    │────▶│ matrix-presence-     │────▶│      NATS       │   │
│  │   Synapse   │     │ aggregator           │     │   JetStream     │   │
│  │             │     │ (sync loop)          │     │                 │   │
│  └─────────────┘     └──────────────────────┘     └────────┬────────┘   │
│                                                            │            │
│                                                            ▼            │
│  ┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐   │
│  │   Browser   │◀────│   city-service       │◀────│   NATS Sub      │   │
│  │   (WS)      │     │   /ws/city/presence  │     │                 │   │
│  └─────────────┘     └──────────────────────┘     └─────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Компоненти

1. **matrix-presence-aggregator (новий сервіс)**
   - читає Matrix sync (presence, typing, room activity),
   - тримає у пам'яті поточний стан присутності,
   - публікує агреговані події в NATS.

2. **NATS JetStream**
   - канал для presence/events:
     - `city.presence.room.*`
     - `city.presence.user.*`

3. **city-service (розширення)**
   - підписується на NATS події,
   - тримає WebSocket з'єднання з фронтендом,
   - пушить presence/room-activity у браузер.

4. **web (Next.js UI)**
   - сторінка `/city`:
     - показує `N online` по кожній кімнаті,
     - highlight "active" кімнати.

---

## 2. MATRIX SIDE — ЗВІДКИ БРАТИ ПОДІЇ

### 2.1. Окремий Matrix-юзер для агрегації

Спец-акаунт:
- `@presence_daemon:daarion.space`
- права:
  - читати presence/typing у всіх `city_*` кімнатах,
  - бути учасником цих кімнат.

### 2.2. Sync-loop на сервері

Сервіс `matrix-presence-aggregator`:

- використовує `/sync` Matrix (як клієнт),
- фільтр:

```json
{
  "presence": {
    "types": ["m.presence"]
  },
  "room": {
    "timeline": { "limit": 0 },
    "state": { "limit": 0 },
    "ephemeral": {
      "types": ["m.typing", "m.receipt"]
    }
  }
}
```

- робить long-polling з `since` + `timeout`,
- парсить:
  - `presence.events` → `m.presence`,
  - `rooms.join[roomId].ephemeral.events` → `m.typing`, `m.receipt`.

---

## 3. DATA MODEL (IN-MEMORY AGGREGATOR)

### 3.1. Room presence state

```python
from dataclasses import dataclass
from typing import Dict, List, Set, Optional
from datetime import datetime

@dataclass
class UserPresence:
    user_id: str               # "@user:domain"
    status: str                # "online" | "offline" | "unavailable"
    last_active_ts: float      # timestamp

@dataclass
class RoomPresence:
    room_id: str               # "!....:daarion.space"
    alias: Optional[str]       # "#city_energy:daarion.space"
    city_room_slug: Optional[str]  # "energy"
    online_count: int
    typing_user_ids: List[str]
    last_event_ts: float

class PresenceState:
    users: Dict[str, UserPresence]
    rooms: Dict[str, RoomPresence]
    room_members: Dict[str, Set[str]]  # room_id -> set of user_ids
```

### 3.2. Мапінг Room → City Room

`matrix-presence-aggregator` має знати `matrix_room_id` ↔ `city_room.slug`.

**Pull-mode (MVP):**
- при старті сервісу:
  - `GET /internal/city/rooms`
  - зчитати всі `matrix_room_id` / `matrix_room_alias` / `slug`,
  - зібрати мапу `roomId → slug`.
- періодично (кожні 5 хвилин) оновлювати.

---

## 4. NATS EVENTS

### 4.1. Room-level presence

Subject:
```
city.presence.room.<slug>
```

Event payload:
```json
{
  "type": "room.presence",
  "room_slug": "energy",
  "matrix_room_id": "!gykdLyazhkcSZGHmbG:daarion.space",
  "matrix_room_alias": "#city_energy:daarion.space",
  "online_count": 5,
  "typing_count": 1,
  "typing_users": ["@user1:daarion.space"],
  "last_event_ts": 1732610000000
}
```

### 4.2. User-level presence (опційний)

Subject:
```
city.presence.user.<localpart>
```

Payload:
```json
{
  "type": "user.presence",
  "matrix_user_id": "@user1:daarion.space",
  "status": "online",
  "last_active_ts": 1732610000000
}
```

---

## 5. EVENT GENERATION LOGIC

### 5.1. Обробка m.presence

При кожному `m.presence`:
- оновити `PresenceState.users[userId]`,
- для всіх кімнат, де є цей юзер — перерахувати `onlineCount`,
- якщо `onlineCount` змінився — публікувати нову подію.

### 5.2. Обробка m.typing

При `m.typing`:
- `content.user_ids` → список typing у кімнаті.
- Зберегти в `RoomPresence.typing_user_ids`.
- Згенерувати івент `city.presence.room.<slug>`.

### 5.3. Throttling

- подію публікувати тільки якщо `onlineCount` змінився,
- або не частіше ніж раз на 3 секунди на кімнату.

---

## 6. CITY REALTIME GATEWAY (WEBSOCKET)

### 6.1. WebSocket endpoint

```
GET /ws/city/presence
```

Auth: JWT токен у query param або header.

### 6.2. Формат повідомлень

**Snapshot (при підключенні):**
```json
{
  "type": "snapshot",
  "rooms": [
    { "room_slug": "general", "online_count": 3, "typing_count": 0 },
    { "room_slug": "welcome", "online_count": 1, "typing_count": 0 }
  ]
}
```

**Incremental update:**
```json
{
  "type": "room.presence",
  "room_slug": "energy",
  "online_count": 5,
  "typing_count": 1
}
```

---

## 7. FRONTEND INTEGRATION

### 7.1. Список кімнат `/city`

State:
```typescript
type RoomPresenceUI = {
  onlineCount: number;
  typingCount: number;
};

const [presenceBySlug, setPresenceBySlug] = useState<Record<string, RoomPresenceUI>>({});
```

WebSocket handler:
```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'snapshot') {
    const presence: Record<string, RoomPresenceUI> = {};
    data.rooms.forEach(r => {
      presence[r.room_slug] = {
        onlineCount: r.online_count,
        typingCount: r.typing_count
      };
    });
    setPresenceBySlug(presence);
  }
  
  if (data.type === 'room.presence') {
    setPresenceBySlug(prev => ({
      ...prev,
      [data.room_slug]: {
        onlineCount: data.online_count,
        typingCount: data.typing_count
      }
    }));
  }
};
```

### 7.2. UI

- Room card: `X online`, typing badge
- Active room: glow effect
- Typing animation

---

## 8. CONFIG / ENV

### matrix-presence-aggregator

```env
MATRIX_HS_URL=https://app.daarion.space
MATRIX_ACCESS_TOKEN=<presence_daemon_token>
MATRIX_USER_ID=@presence_daemon:daarion.space
CITY_SERVICE_INTERNAL_URL=http://city-service:7001
NATS_URL=nats://nats:4222
ROOM_PRESENCE_THROTTLE_MS=3000
```

### city-service (realtime gateway)

```env
NATS_URL=nats://nats:4222
JWT_SECRET=<secret>
```

---

## 9. ACCEPTANCE CRITERIA

- [ ] matrix-presence-aggregator запущений і синхронізується з Matrix
- [ ] NATS отримує події `city.presence.room.*`
- [ ] city-service має endpoint `/ws/city/presence`
- [ ] При підключенні WS клієнт отримує snapshot
- [ ] При зміні presence клієнт отримує update
- [ ] UI `/city` показує online count для кожної кімнати
- [ ] Typing indicator відображається

---

## 10. FUTURE ENHANCEMENTS

1. **Agent presence** — окремі статуси для AI-агентів
2. **City Map** — візуалізація presence на 2D карті
3. **Push notifications** — сповіщення про активність
4. **Historical analytics** — статистика активності

