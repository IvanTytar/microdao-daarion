# MATRIX CHAT CLIENT — DAARION.city

Version: 1.0.0

## 0. PURPOSE

Зробити так, щоб сторінка `/city/[slug]` у DAARION UI була **повноцінним Matrix-чатом**:

- використовує реальні Matrix rooms (`matrix_room_id`, `matrix_room_alias`),
- працює від імені поточного користувача DAARION,
- показує історію, нові повідомлення, статус підключення,
- використовує існуючий Chat Layout (UI), але замість тимчасового WebSocket — Matrix.

Це базовий крок для подальшого:
- Presence / Typing / Read receipts,
- агентів як ботів,
- 2D/2.5D City Map з live-активністю.

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                      DAARION Frontend                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               /city/[slug] Page                           │  │
│  │  ┌─────────────────┐  ┌────────────────────────────────┐  │  │
│  │  │   Room Info     │  │      Matrix Chat Client        │  │  │
│  │  │   (from API)    │  │  - Connect to Synapse          │  │  │
│  │  └─────────────────┘  │  - Send/receive messages       │  │  │
│  │                       │  - Show history                 │  │  │
│  │                       └────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐   │
│  │ auth-service│  │   city-service   │  │  matrix-gateway   │   │
│  │   (7020)    │  │     (7001)       │  │     (7025)        │   │
│  │             │  │                  │  │                   │   │
│  │ JWT tokens  │  │ /chat/bootstrap  │  │ /user/token       │   │
│  │ User→Matrix │  │ matrix_room_id   │  │ Create rooms      │   │
│  └─────────────┘  └──────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Matrix Synapse (8018)                        │
│  - Rooms: !xxx:daarion.space                                    │
│  - Users: @daarion_xxx:daarion.space                            │
│  - Messages, history, sync                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Компоненти:

- **auth-service** (7020)
  - знає `user_id`, email, Matrix user mapping.
  
- **matrix-gateway** (7025)
  - вміє створювати кімнати (вже реалізовано),
  - буде видавати Matrix access tokens для користувачів.
  
- **city-service** (7001)
  - надає `matrix_room_id` / `matrix_room_alias`,
  - новий endpoint `/chat/bootstrap`.
  
- **web (Next.js UI)**
  - сторінка `/city/[slug]`,
  - компонент `ChatRoom`,
  - Matrix chat client.

---

## 2. AUTH MODEL

### Допущення (MVP):

- Користувач уже залогінений у DAARION (JWT).
- Для кожного `user_id` вже існує Matrix-акаунт (авто-provisioning реалізовано раніше).
- Потрібен **bootstrap endpoint**, який:
  - по JWT → знаходить Matrix user,
  - видає Matrix access token,
  - повертає `matrix_room_id` для кімнати.

### Matrix User Mapping

| DAARION user_id | Matrix user_id |
|-----------------|----------------|
| `87838688-d7c4-436c-...` | `@daarion_87838688:daarion.space` |

---

## 3. BACKEND: CHAT BOOTSTRAP API

### 3.1. Endpoint: `GET /api/city/chat/bootstrap`

**Розташування:** `city-service` (логічно відповідає за City+Matrix інтеграцію)

**Вхід:**
- HTTP заголовок `Authorization: Bearer <access_token>` (DAARION JWT)
- query param: `room_slug`, наприклад `energy`

**Логіка:**

1. Валідувати JWT → отримати `user_id`.
2. Знайти `city_room` по `slug`:
   - витягнути `matrix_room_id` / `matrix_room_alias`.
3. Через internal виклик до `matrix-gateway`:
   - отримати Matrix access token для цього `user_id`.
4. Повернути фронтенду:

```json
{
  "matrix_hs_url": "https://app.daarion.space",
  "matrix_user_id": "@daarion_87838688:daarion.space",
  "matrix_access_token": "syt_...",
  "matrix_room_id": "!gykdLyazhkcSZGHmbG:daarion.space",
  "matrix_room_alias": "#city_energy:daarion.space",
  "room": {
    "id": "room_city_energy",
    "slug": "energy",
    "name": "Energy"
  }
}
```

### 3.2. Matrix Gateway: User Token Endpoint

**Endpoint:** `POST /internal/matrix/users/token`

**Request:**
```json
{
  "user_id": "87838688-d7c4-436c-9466-4ab0947d7730"
}
```

**Response:**
```json
{
  "matrix_user_id": "@daarion_87838688:daarion.space",
  "access_token": "syt_...",
  "device_id": "DEVICE_ID"
}
```

**Логіка:**
1. Побудувати Matrix username: `daarion_{user_id[:8]}`
2. Спробувати логін з відомим паролем
3. Якщо користувач не існує — створити через admin API
4. Повернути access token

### 3.3. Security

* Endpoint вимагає валідний DAARION JWT.
* `matrix_access_token` — короткоживучий (30 хв) або session-based.
* Internal endpoints (`/internal/*`) доступні тільки з Docker network.

---

## 4. FRONTEND: MATRIX CHAT CLIENT

### 4.1. Поточний Chat Layout

Вже існує:
* сторінка `/city/[slug]`,
* компонент `ChatRoom`:
  * `messages[]`,
  * `onSend(message)`,
  * індикатор підключення.

Зараз він працює через свій WebSocket/stub.

### 4.2. Нова схема

1. **При завантаженні сторінки:**
   ```tsx
   // /city/[slug]/page.tsx
   const [bootstrap, setBootstrap] = useState(null);
   const [status, setStatus] = useState<'loading' | 'connecting' | 'online' | 'error'>('loading');
   
   useEffect(() => {
     async function init() {
       // 1. Отримати bootstrap дані
       const res = await fetch(`/api/city/chat/bootstrap?room_slug=${slug}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       const data = await res.json();
       setBootstrap(data);
       
       // 2. Ініціалізувати Matrix client
       setStatus('connecting');
     }
     init();
   }, [slug]);
   ```

2. **Створення Matrix клієнта:**
   ```tsx
   // Використовуємо REST API напряму (без matrix-js-sdk для простоти MVP)
   const matrixClient = new MatrixRestClient({
     baseUrl: bootstrap.matrix_hs_url,
     accessToken: bootstrap.matrix_access_token,
     userId: bootstrap.matrix_user_id,
     roomId: bootstrap.matrix_room_id
   });
   ```

3. **Отримання історії:**
   ```tsx
   const messages = await matrixClient.getMessages(roomId, { limit: 50 });
   ```

4. **Відправка повідомлень:**
   ```tsx
   await matrixClient.sendMessage(roomId, {
     msgtype: 'm.text',
     body: text
   });
   ```

5. **Підписка на нові повідомлення:**
   ```tsx
   // Long-polling або sync
   matrixClient.onMessage((event) => {
     setMessages(prev => [...prev, mapMatrixEvent(event)]);
   });
   ```

### 4.3. Matrix Event → Chat Message Mapping

```tsx
function mapMatrixEvent(event: MatrixEvent): ChatMessage {
  return {
    id: event.event_id,
    senderId: event.sender,
    senderName: event.sender.split(':')[0].replace('@daarion_', 'User '),
    text: event.content.body,
    timestamp: new Date(event.origin_server_ts),
    isUser: event.sender === bootstrap.matrix_user_id,
  };
}
```

---

## 5. MATRIX REST CLIENT (Lightweight)

Замість важкого `matrix-js-sdk`, створимо легкий REST клієнт:

```typescript
// lib/matrix-client.ts

export class MatrixRestClient {
  private baseUrl: string;
  private accessToken: string;
  private userId: string;
  
  constructor(config: MatrixClientConfig) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
    this.userId = config.userId;
  }
  
  // Get room messages
  async getMessages(roomId: string, options?: { limit?: number; from?: string }) {
    const params = new URLSearchParams({
      dir: 'b',
      limit: String(options?.limit || 50)
    });
    if (options?.from) params.set('from', options.from);
    
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
      { headers: this.authHeaders() }
    );
    return res.json();
  }
  
  // Send text message
  async sendMessage(roomId: string, body: string) {
    const txnId = `m${Date.now()}`;
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${txnId}`,
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({
          msgtype: 'm.text',
          body: body
        })
      }
    );
    return res.json();
  }
  
  // Join room
  async joinRoom(roomId: string) {
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/join/${encodeURIComponent(roomId)}`,
      {
        method: 'POST',
        headers: this.authHeaders()
      }
    );
    return res.json();
  }
  
  // Sync (for real-time updates)
  async sync(since?: string) {
    const params = new URLSearchParams({ timeout: '30000' });
    if (since) params.set('since', since);
    
    const res = await fetch(
      `${this.baseUrl}/_matrix/client/v3/sync?${params}`,
      { headers: this.authHeaders() }
    );
    return res.json();
  }
  
  private authHeaders() {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }
}
```

---

## 6. UI / UX REQUIREMENTS

### 6.1. Стан підключення

| Status | UI |
|--------|-----|
| `loading` | Skeleton loader |
| `connecting` | "Підключення до Matrix…" + spinner |
| `online` | Зелений індикатор "Онлайн" |
| `error` | Червоний індикатор + "Помилка підключення" + кнопка "Повторити" |

### 6.2. Відображення історії

* При завантаженні показувати останні 50 повідомлень
* Infinite scroll для старіших повідомлень
* Показувати дату-роздільник між днями

### 6.3. Надсилання повідомлень

* Enter — відправити
* Shift+Enter — новий рядок
* Показувати "sending..." стан
* При помилці — показати "Не вдалося відправити" + retry

---

## 7. LIMITATIONS / MVP

Поки що:
* ✅ Тільки текстові повідомлення (`m.text`)
* ❌ Без файлів/зображень
* ❌ Без threads/reactions
* ❌ Без read receipts
* ❌ Без typing indicators

Це все буде додано у наступних фазах.

---

## 8. API SUMMARY

### City Service (7001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/city/chat/bootstrap?room_slug=X` | Bootstrap Matrix chat |

### Matrix Gateway (7025)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/internal/matrix/users/token` | Get/create user token |

---

## 9. ROADMAP AFTER THIS

Після Matrix Chat Client:

1. **Presence & Typing:**
   * слухати `m.presence`, `m.typing` → показувати "online/typing".

2. **Reactions & read receipts.**

3. **Attachments (фото/файли).**

4. **City Map інтеграція** (активність кімнат → візуалізація).

---

## 10. ACCEPTANCE CRITERIA

- [ ] `/api/city/chat/bootstrap` повертає Matrix credentials для авторизованого користувача
- [ ] Frontend підключається до Matrix і показує історію повідомлень
- [ ] Користувач може надсилати повідомлення через DAARION UI
- [ ] Повідомлення з'являються в Element Web і навпаки
- [ ] Обробляються стани: loading, connecting, online, error

