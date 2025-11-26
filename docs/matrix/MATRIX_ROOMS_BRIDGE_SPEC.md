# MATRIX ROOMS BRIDGE — DAARION.city

Version: 1.0.0

## 0. PURPOSE

Звʼязати City Rooms у DAARION з Matrix-кімнатами так, щоб:

- кожна `city_room` мала свій `matrix_room_id` / `matrix_room_alias`,
- UI для `/city/[slug]` працював поверх справжньої Matrix-кімнати,
- подальший presence/typing/реальний чат використовували Matrix як єдине джерело істини.

Це база для:

- живих чатів у City,
- спільної присутності,
- інтеграції агентів як Matrix-botʼів.

---

## 1. ARCHITECTURE OVERVIEW

### Сервіси

- **city-service** (7001)
  - зберігає список кімнат (rooms)
  - розширюється полями для Matrix

- **matrix-gateway** (новий сервіс, 7025)
  - проксі до Synapse REST API
  - хендлить auth до Matrix від імені DAARION

- **auth-service** (7020)
  - вже створює Matrix акаунти для юзерів (auto-provisioning)

- **synapse** (8018)
  - Matrix homeserver

### Мапінг

Кожна City Room має:

| Поле | Опис | Приклад |
|------|------|---------|
| `room_id` | внутрішній DAARION id | `room_city_general` |
| `slug` | URL/імена кімнати | `general` |
| `matrix_room_id` | Matrix ID | `!abc123xyz:daarion.space` |
| `matrix_room_alias` | Matrix alias | `#city_general:daarion.space` |

---

## 2. DATA MODEL CHANGES (PostgreSQL)

### 2.1. Таблиця city_rooms

Додати поля:

```sql
ALTER TABLE city_rooms
  ADD COLUMN IF NOT EXISTS matrix_room_id TEXT,
  ADD COLUMN IF NOT EXISTS matrix_room_alias TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS city_rooms_matrix_room_id_uq
  ON city_rooms (matrix_room_id)
  WHERE matrix_room_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS city_rooms_matrix_room_alias_uq
  ON city_rooms (matrix_room_alias)
  WHERE matrix_room_alias IS NOT NULL;
```

### 2.2. Invariants

* `matrix_room_id` → або `NULL`, або валідний Matrix room id (`!....:domain`)
* `matrix_room_alias` → або `NULL`, або вигляду `#city_<slug>:daarion.space`
* Один Matrix room = одна City room

---

## 3. NAMING CONVENTION

Для Matrix-кімнат:

* **room alias**:
  * формат: `#city_<slug>:daarion.space`
  * приклад: `#city_general:daarion.space`

* **room name**:
  * `"DAARION City — <Room Name>"`
  * приклад: `"DAARION City — General"`

Ці назви видно в Matrix-клієнтах (Element Web).

---

## 4. FLOWS

### 4.1. Створення нової City Room

Коли в `city-service` створюється новий room:

1. Генерується `slug` (як є зараз).

2. Викликається Matrix Gateway:
   `POST /internal/matrix/rooms/create`:
   ```json
   {
     "slug": "energy",
     "name": "Energy",
     "visibility": "public"
   }
   ```

3. Matrix Gateway:
   * викликає Synapse API `POST /_matrix/client/v3/createRoom`
   * задає:
     * `name: "DAARION City — Energy"`
     * `room_alias_name: "city_energy"`
     * `preset: "public_chat"`
   * повертає:
   ```json
   {
     "matrix_room_id": "!abc123:daarion.space",
     "matrix_room_alias": "#city_energy:daarion.space"
   }
   ```

4. `city-service` зберігає ці значення в `city_rooms`.

**Якщо Matrix недоступний:**
* MVP: fail створення кімнати цілком, щоб не було "неповних" кімнат.
* TODO: retry-механізм для production.

---

### 4.2. Синхронізація існуючих кімнат (backfill)

Для вже створених `city_rooms`:

1. Endpoint: `POST /internal/city/matrix/backfill`:
   * бере всі кімнати, де `matrix_room_id IS NULL`.
   * для кожної:
     * пробує знайти Matrix room по alias `#city_<slug>:daarion.space` через Matrix Gateway:
       * якщо знайдено → зберігає `matrix_room_id` / `matrix_room_alias`;
       * якщо не знайдено → створює нову Matrix room, як у п. 4.1.

---

### 4.3. Архівація / деактивація Room

Коли Room в DAARION позначається як "archived" / "inactive":

MVP: 
* не видаляти Matrix room,
* показувати статус в DAARION UI як `archived`.

Future:
* змінити power levels,
* закрити можливість писати,
* додати `m.room.tombstone`.

---

## 5. MATRIX GATEWAY SERVICE

### 5.1. Конфігурація

```env
MATRIX_GATEWAY_PORT=7025
SYNAPSE_URL=http://daarion-synapse:8008
SYNAPSE_ADMIN_TOKEN=<admin_access_token>
MATRIX_SERVER_NAME=daarion.space
```

### 5.2. API Endpoints

#### `POST /internal/matrix/rooms/create`

Викликається тільки з `city-service`.

**Request:**
```json
{
  "slug": "energy",
  "name": "Energy",
  "visibility": "public"
}
```

**Response (200):**
```json
{
  "matrix_room_id": "!abc123:daarion.space",
  "matrix_room_alias": "#city_energy:daarion.space"
}
```

**Response (500):**
```json
{
  "error": "matrix_unavailable",
  "detail": "Failed to create Matrix room"
}
```

#### `GET /internal/matrix/rooms/find-by-alias`

**Request:**
`GET /internal/matrix/rooms/find-by-alias?alias=%23city_energy%3Adaarion.space`

**Response (200, exists):**
```json
{
  "matrix_room_id": "!abc123:daarion.space",
  "matrix_room_alias": "#city_energy:daarion.space"
}
```

**Response (404, not found):**
```json
{
  "error": "not_found"
}
```

#### `GET /healthz`

```json
{
  "status": "ok",
  "synapse": "connected"
}
```

---

## 6. CITY-SERVICE API CHANGES

### 6.1. `GET /api/city/rooms`

Додати у відповідь:

```json
[
  {
    "id": "room_city_general",
    "slug": "general",
    "name": "General",
    "description": "Головна кімната міста",
    "is_default": true,
    "members_online": 42,
    "last_event": "2025-11-26T20:00:00Z",
    "matrix_room_id": "!abc123:daarion.space",
    "matrix_room_alias": "#city_general:daarion.space"
  }
]
```

### 6.2. `GET /api/city/rooms/{slug}`

Також включити `matrix_room_id` / `matrix_room_alias`.

### 6.3. `POST /api/city/rooms`

При створенні кімнати автоматично створювати Matrix room.

---

## 7. FRONTEND INTEGRATION

На сторінці `/city/[slug]`:

* при завантаженні room:
  * отримати `matrix_room_id` / `matrix_room_alias`,
  * передати їх у чат-Layout.

Чат-шар (`ChatRoom`) повинен:
* використовувати Matrix-клієнт для:
  * приєднання до кімнати,
  * отримання історії,
  * відправки повідомлень.

---

## 8. SECURITY

* `matrix-gateway` endpoint'и `/internal/matrix/*`:
  * тільки internal auth (service-to-service)
  * перевірка internal token або Docker network

* Кінцеві користувачі не повинні напряму бачити Matrix admin-credentials.

---

## 9. DEPLOYMENT

### Docker Compose addition

```yaml
matrix-gateway:
  build: ./services/matrix-gateway
  container_name: daarion-matrix-gateway
  restart: unless-stopped
  environment:
    - MATRIX_GATEWAY_PORT=7025
    - SYNAPSE_URL=http://daarion-synapse:8008
    - SYNAPSE_ADMIN_TOKEN=${SYNAPSE_ADMIN_TOKEN}
    - MATRIX_SERVER_NAME=daarion.space
  ports:
    - "7025:7025"
  networks:
    - dagi-network
  depends_on:
    - synapse
```

### Nginx routing

```nginx
location /internal/matrix/ {
    # Internal only - block external access
    allow 127.0.0.1;
    deny all;
    
    proxy_pass http://127.0.0.1:7025/internal/matrix/;
}
```

---

## 10. ROADMAP AFTER BRIDGE

Після реалізації цього SPEC:

1. **Presence & Typing:**
   * читати `m.presence`, `m.typing`, `m.receipt` з Matrix,
   * транслювати в фронт (через WebSocket).

2. **Agents як Matrix Bot:**
   * окремі Matrix accounts для агентів,
   * відповіді агентів у тій же кімнаті, що й користувачі.

3. **City Map:**
   * візуалізація активності кімнат на 2D/2.5D мапі.

4. **PWA/Mobile:**
   * manifest.json,
   * service worker,
   * offline кеш.

---

## 11. ACCEPTANCE CRITERIA

- [ ] `city_rooms` має поля `matrix_room_id` / `matrix_room_alias`
- [ ] При створенні City Room автоматично створюється Matrix room
- [ ] Backfill endpoint синхронізує існуючі кімнати
- [ ] API `/api/city/rooms` повертає matrix поля
- [ ] Matrix Gateway працює і відповідає на healthcheck
- [ ] Element Web показує створені кімнати

