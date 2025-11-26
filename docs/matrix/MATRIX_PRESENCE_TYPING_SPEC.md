# MATRIX PRESENCE & TYPING — DAARION.city

Version: 1.0.0

## 0. PURPOSE

Додати у Matrix-чат DAARION (сторінка `/city/[slug]`) базові реальні індикатори:

- хто **онлайн** у кімнаті,
- хто **друкує** зараз (typing).

Це робиться поверх уже працюючого Matrix Chat Client.

---

## 1. MATRIX EVENTS

Матриця дає 2 типи відповідних подій (через `/sync`):

### 1.1. Presence events (`m.presence`)

```json
{
  "type": "m.presence",
  "sender": "@user:daarion.space",
  "content": {
    "presence": "online",        // "online" | "offline" | "unavailable"
    "last_active_ago": 0,
    "currently_active": true,
    "status_msg": "Working..."
  }
}
```

### 1.2. Typing events (`m.typing`)

В `rooms.join[roomId].ephemeral.events`:

```json
{
  "type": "m.typing",
  "content": {
    "user_ids": ["@user1:daarion.space", "@user2:daarion.space"]
  }
}
```

---

## 2. FRONTEND ARCHITECTURE

### Existing Components:

- `lib/matrix-client.ts` — `MatrixRestClient`
- `MatrixChatRoom` — працює з повідомленнями та статусом підключення

### New Additions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MatrixChatRoom Component                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Header: "General · 5 online"                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Messages Area                         │    │
│  │  [message 1]                                            │    │
│  │  [message 2]                                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Typing: "User abc друкує..."                           │    │
│  │  [Input field]                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. MATRIX CLIENT: SYNC LOOP

### 3.1. Sync Filter

При виклику `/sync` використовуємо filter:

```json
{
  "presence": {
    "types": ["m.presence"]
  },
  "room": {
    "timeline": {
      "limit": 50
    },
    "state": {
      "lazy_load_members": true
    },
    "ephemeral": {
      "types": ["m.typing", "m.receipt"]
    }
  }
}
```

### 3.2. MatrixRestClient Extensions

```typescript
interface PresenceEvent {
  type: 'm.presence';
  sender: string;
  content: {
    presence: 'online' | 'offline' | 'unavailable';
    last_active_ago?: number;
    currently_active?: boolean;
    status_msg?: string;
  };
}

interface TypingEvent {
  type: 'm.typing';
  content: {
    user_ids: string[];
  };
}

class MatrixRestClient {
  // Callbacks
  onPresence?: (event: PresenceEvent) => void;
  onTyping?: (roomId: string, userIds: string[]) => void;
  
  // Enhanced sync loop
  private async syncLoop(): Promise<void> {
    while (this.isSyncing) {
      const res = await this.sync(this.syncToken);
      this.syncToken = res.next_batch;
      
      // Process presence events
      if (res.presence?.events) {
        for (const event of res.presence.events) {
          if (event.type === 'm.presence') {
            this.onPresence?.(event);
          }
        }
      }
      
      // Process typing events
      if (res.rooms?.join && this.roomId) {
        const roomData = res.rooms.join[this.roomId];
        if (roomData?.ephemeral?.events) {
          for (const event of roomData.ephemeral.events) {
            if (event.type === 'm.typing') {
              this.onTyping?.(this.roomId, event.content.user_ids);
            }
          }
        }
      }
    }
  }
  
  // Send typing notification
  async sendTyping(roomId: string, typing: boolean, timeout?: number): Promise<void> {
    await fetch(
      `${this.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/typing/${encodeURIComponent(this.userId)}`,
      {
        method: 'PUT',
        headers: this.authHeaders(),
        body: JSON.stringify({
          typing,
          timeout: timeout || 30000
        })
      }
    );
  }
}
```

---

## 4. MATRIXCHATROOM INTEGRATION

### 4.1. State

```typescript
// Online users in room
const [onlineUsers, setOnlineUsers] = useState<Map<string, 'online' | 'offline' | 'unavailable'>>(new Map());

// Users currently typing
const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
```

### 4.2. Callbacks

```typescript
useEffect(() => {
  if (!matrixClient.current) return;
  
  // Presence handler
  matrixClient.current.onPresence = (event) => {
    if (!event.sender || !event.content?.presence) return;
    
    setOnlineUsers(prev => {
      const next = new Map(prev);
      next.set(event.sender, event.content.presence);
      return next;
    });
  };
  
  // Typing handler
  matrixClient.current.onTyping = (roomId, userIds) => {
    if (roomId !== bootstrap?.matrix_room_id) return;
    
    // Filter out current user
    const others = userIds.filter(id => id !== bootstrap?.matrix_user_id);
    setTypingUsers(new Set(others));
  };
  
  return () => {
    if (matrixClient.current) {
      matrixClient.current.onPresence = undefined;
      matrixClient.current.onTyping = undefined;
    }
  };
}, [bootstrap]);
```

### 4.3. Send Typing Notification

```typescript
// When user starts typing
const handleInputChange = useCallback(() => {
  if (matrixClient.current && bootstrap) {
    matrixClient.current.sendTyping(bootstrap.matrix_room_id, true);
  }
}, [bootstrap]);

// When user stops typing (debounced)
const handleInputBlur = useCallback(() => {
  if (matrixClient.current && bootstrap) {
    matrixClient.current.sendTyping(bootstrap.matrix_room_id, false);
  }
}, [bootstrap]);
```

---

## 5. UI DISPLAY

### 5.1. Header (Room Info)

```tsx
<div className="flex items-center gap-2">
  <span className="text-white font-medium">{room.name}</span>
  <span className="text-slate-400">·</span>
  <span className="text-emerald-400 text-sm">
    {onlineCount} online
  </span>
</div>
```

Where `onlineCount`:
```typescript
const onlineCount = useMemo(() => {
  let count = 0;
  onlineUsers.forEach((status, userId) => {
    if (status === 'online' || status === 'unavailable') {
      // Optionally exclude current user
      if (userId !== bootstrap?.matrix_user_id) {
        count++;
      }
    }
  });
  return count;
}, [onlineUsers, bootstrap]);
```

### 5.2. Typing Indicator

```tsx
{typingUsers.size > 0 && (
  <div className="px-4 py-1 text-sm text-slate-400 animate-pulse">
    {typingUsers.size === 1 
      ? `${formatUserName(Array.from(typingUsers)[0])} друкує...`
      : 'Декілька учасників друкують...'}
  </div>
)}
```

Helper function:
```typescript
function formatUserName(userId: string): string {
  // @daarion_abc123:daarion.space -> User abc123
  return userId
    .split(':')[0]
    .replace('@daarion_', 'User ')
    .replace('@', '');
}
```

---

## 6. LIMITATIONS / MVP

- ✅ Presence/typing працює тільки в **активній кімнаті** (`/city/[slug]`)
- ❌ Не кешуємо статуси між сесіями
- ❌ Не показуємо, хто саме онлайн у списку кімнат
- ❌ Не показуємо read receipts / last seen

---

## 7. API SUMMARY

### Matrix Client-Server API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/_matrix/client/v3/sync` | Get presence + typing events |
| PUT | `/_matrix/client/v3/rooms/{roomId}/typing/{userId}` | Send typing notification |

---

## 8. ROADMAP (далі)

Після цієї фази:

1. **Room-level activity:**
   - агрегація онлайн/активності на рівні `/city` списку.

2. **Read receipts / last read marker.**

3. **PWA/Mobile presence:**
   - збереження останнього статусу офлайн,
   - push при нових повідомленнях у кімнатах.

---

## 9. ACCEPTANCE CRITERIA

- [ ] Sync loop обробляє `m.presence` та `m.typing` події
- [ ] Header показує кількість online користувачів
- [ ] Typing indicator показує хто друкує
- [ ] Користувач може надсилати typing notification
- [ ] При виході з кімнати callbacks очищуються

