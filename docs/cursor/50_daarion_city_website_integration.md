# 50 — DAARION.city Website Integration (MicroDAO)

*Специфікація інтеграції MicroDAO у офіційний сайт DAARION.city як перший публічний MicroDAO*

---

## 1. Purpose & Scope

Документ визначає:

- як вбудовувати MicroDAO у офіційний сайт DAARION.city,
- API для публічного каналу міста,
- UI/UX для публічного каналу на сайті,
- Authentication flow для користувачів сайту,
- SEO та метадані для публічного каналу,
- Embedding/iframe інтеграцію (опційно),
- Analytics та tracking.

Це перша інтеграція MicroDAO у зовнішній сайт.

---

## 2. Architecture Overview

### 2.1 High-Level Integration

```text
DAARION.city Website (Next.js/React)
     ↓
  Public Channel Embed
     ↓
  MicroDAO API Gateway
     ↓
  MicroDAO Backend Services
```

### 2.2 Integration Modes

**Mode 1: Embedded Widget (Recommended)**
- MicroDAO публічний канал вбудовується як React компонент на сайті
- Використовує MicroDAO API напряму
- Повний контроль над UI/UX

**Mode 2: iframe Embed**
- MicroDAO публічний канал відкривається в iframe
- Простіша інтеграція, менше контролю
- Використовується для швидкого прототипування

**Mode 3: Full Redirect**
- Посилання з сайту веде на окрему сторінку MicroDAO
- Найпростіша реалізація
- Втрачається контекст сайту

---

## 3. DAARION.city as First MicroDAO

### 3.1 Team Setup

DAARION.city має бути створений як перший MicroDAO:

```sql
INSERT INTO teams (
  id,
  name,
  slug,
  type,
  mode,
  description,
  created_at
) VALUES (
  'daarion-city',
  'DAARION.city',
  'daarion',
  'city',
  'public',
  'Офіційна спільнота міста DAARION',
  NOW()
);
```

### 3.2 Public Channel Setup

Створюється публічний канал для міста:

```sql
INSERT INTO channels (
  id,
  team_id,
  title,
  slug,
  type,
  is_public,
  created_at
) VALUES (
  'daarion-city-general',
  'daarion-city',
  'Загальний канал міста',
  'general',
  'public',
  true,
  NOW()
);
```

### 3.3 City Agent Setup

Створюється міський агент:

```sql
INSERT INTO agents (
  id,
  team_id,
  name,
  role,
  system_prompt,
  memory_scope,
  created_at
) VALUES (
  'daarion-city-agent',
  'daarion-city',
  'Міський Асистент',
  'team_assistant',
  'Ти — міський асистент DAARION.city. Допомагаєш мешканцям та гостям міста.',
  'team',
  NOW()
);
```

---

## 4. Public Channel API

### 4.1 Get Public Channel Info

```http
GET /api/v1/channels/{slug}/public
```

**Response:**
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

### 4.2 Get Public Messages

```http
GET /api/v1/channels/{slug}/public/messages?limit=50&before={message_id}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-123",
      "sender": {
        "id": "user-456",
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
    "next_cursor": "msg-124"
  }
}
```

### 4.3 Post Message (Authenticated)

```http
POST /api/v1/channels/{slug}/public/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "body": "Повідомлення від користувача"
}
```

### 4.4 Register as Viewer/Member

```http
POST /api/v1/channels/{slug}/public/join
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Ім'я Користувача",
  "viewer_type": "member" | "visitor"
}
```

**Response:**
```json
{
  "user_id": "user-789",
  "access_token": "jwt-token",
  "membership": {
    "role": "member",
    "viewer_type": "member"
  }
}
```

---

## 5. UI/UX for Website Integration

### 5.1 Embedded Widget Component

**React Component:**
```tsx
<MicroDAOChannelEmbed
  channelSlug="general"
  teamSlug="daarion"
  apiUrl="https://api.microdao.xyz/v1"
  theme="light"
  showHeader={true}
  allowJoin={true}
/>
```

**Props:**
- `channelSlug`: slug каналу
- `teamSlug`: slug команди
- `apiUrl`: URL API Gateway
- `theme`: "light" | "dark"
- `showHeader`: показувати заголовок каналу
- `allowJoin`: дозволити реєстрацію з віджета

### 5.2 Widget Layout

```
┌─────────────────────────────────────┐
│  # Загальний канал міста             │
│  DAARION.city                        │
├─────────────────────────────────────┤
│                                     │
│  [Messages List]                    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ [Input Field]        [Send]   │ │
│  └───────────────────────────────┘ │
│                                     │
│  [Join Button] (if not authenticated)│
└─────────────────────────────────────┘
```

### 5.3 Authentication Flow

**Step 1: Guest View**
- Користувач бачить повідомлення (read-only)
- Кнопка "Приєднатися до обговорення"

**Step 2: Join Modal**
- Форма: Email, Ім'я, Тип участі (Member/Visitor)
- Відправка запиту на `/api/v1/channels/{slug}/public/join`
- Отримання JWT токену

**Step 3: Authenticated View**
- Користувач може писати повідомлення
- Відображається його профіль
- Доступ до повної функціональності каналу

---

## 6. SEO & Metadata

### 6.1 Open Graph Tags

```html
<meta property="og:title" content="Загальний канал міста DAARION.city" />
<meta property="og:description" content="Публічний канал для обговорення міських питань" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://daarion.city/channel/general" />
<meta property="og:image" content="https://daarion.city/og-image.png" />
```

### 6.2 Twitter Cards

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Загальний канал міста DAARION.city" />
<meta name="twitter:description" content="Публічний канал для обговорення міських питань" />
<meta name="twitter:image" content="https://daarion.city/twitter-image.png" />
```

### 6.3 Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org",
  "@type": "DiscussionForumPosting",
  "headline": "Загальний канал міста DAARION.city",
  "description": "Публічний канал для обговорення міських питань",
  "author": {
    "@type": "Organization",
    "name": "DAARION.city"
  },
  "datePublished": "2024-11-14T10:00:00Z"
}
```

---

## 7. Security & Privacy

### 7.1 CORS Configuration

API Gateway має дозволяти запити з `https://daarion.city`:

```typescript
const corsOptions = {
  origin: [
    'https://daarion.city',
    'https://www.daarion.city',
    'http://localhost:3000' // для розробки
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 7.2 Rate Limiting

Публічний канал має обмеження:

- **Guest (read-only):** 100 requests/minute
- **Authenticated (write):** 30 messages/minute
- **Join requests:** 5 requests/hour per IP

### 7.3 Content Moderation

- Автоматична модерація через Agent
- Фільтрація спаму
- Блокування токсичного контенту
- Можливість скарг від користувачів

---

## 8. Analytics & Tracking

### 8.1 Events to Track

```typescript
type AnalyticsEvent = 
  | { type: 'channel_view', channel_slug: string }
  | { type: 'message_sent', channel_slug: string, user_id: string }
  | { type: 'join_clicked', channel_slug: string }
  | { type: 'join_completed', channel_slug: string, viewer_type: string }
  | { type: 'widget_loaded', channel_slug: string, load_time: number };
```

### 8.2 Integration with Analytics

- Google Analytics 4
- Plausible Analytics (privacy-friendly)
- Custom analytics endpoint

---

## 9. Implementation Steps

### Step 1: Backend Setup

1. Створити DAARION.city team у БД
2. Створити публічний канал
3. Створити міського агента
4. Налаштувати CORS для `daarion.city`
5. Додати rate limiting для публічного каналу

### Step 2: API Endpoints

1. `GET /api/v1/channels/{slug}/public` — інформація про канал
2. `GET /api/v1/channels/{slug}/public/messages` — повідомлення
3. `POST /api/v1/channels/{slug}/public/messages` — надіслати повідомлення
4. `POST /api/v1/channels/{slug}/public/join` — приєднатися

### Step 3: Frontend Widget

1. Створити React компонент `MicroDAOChannelEmbed`
2. Інтегрувати з API
3. Додати authentication flow
4. Додати real-time оновлення (WebSocket/SSE)

### Step 4: Website Integration

1. Додати компонент на сторінку `daarion.city/channel/general`
2. Налаштувати SEO метадані
3. Додати analytics tracking
4. Тестування на production

---

## 10. Example Integration Code

### 10.1 Next.js Page

```tsx
// pages/channel/[slug].tsx
import { MicroDAOChannelEmbed } from '@/components/MicroDAOChannelEmbed';
import Head from 'next/head';

export default function ChannelPage({ channelSlug }) {
  return (
    <>
      <Head>
        <title>Загальний канал міста DAARION.city</title>
        <meta name="description" content="Публічний канал для обговорення міських питань" />
        {/* Open Graph tags */}
        {/* Twitter Cards */}
      </Head>
      
      <div className="container mx-auto py-8">
        <MicroDAOChannelEmbed
          channelSlug={channelSlug}
          teamSlug="daarion"
          apiUrl={process.env.NEXT_PUBLIC_MICRODAO_API_URL}
          theme="light"
          showHeader={true}
          allowJoin={true}
        />
      </div>
    </>
  );
}
```

### 10.2 React Widget Component

```tsx
// components/MicroDAOChannelEmbed.tsx
import { useState, useEffect } from 'react';
import { useChannelMessages, useJoinChannel } from '@/hooks/useMicroDAO';

export function MicroDAOChannelEmbed({
  channelSlug,
  teamSlug,
  apiUrl,
  theme,
  showHeader,
  allowJoin
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { messages, loadMore } = useChannelMessages(channelSlug, apiUrl);
  const { join } = useJoinChannel(channelSlug, apiUrl);

  const handleJoin = async (email: string, name: string, viewerType: string) => {
    const result = await join(email, name, viewerType);
    if (result.access_token) {
      localStorage.setItem('microdao_token', result.access_token);
      setIsAuthenticated(true);
    }
  };

  return (
    <div className={`microdao-widget theme-${theme}`}>
      {showHeader && (
        <div className="widget-header">
          <h2># Загальний канал міста</h2>
          <p>DAARION.city</p>
        </div>
      )}
      
      <div className="messages-list">
        {messages.map(msg => (
          <Message key={msg.id} message={msg} />
        ))}
      </div>

      {isAuthenticated ? (
        <MessageInput channelSlug={channelSlug} apiUrl={apiUrl} />
      ) : (
        allowJoin && <JoinButton onJoin={handleJoin} />
      )}
    </div>
  );
}
```

---

## 11. Testing Checklist

### 11.1 Backend Tests

- [ ] Публічний канал створено для DAARION.city
- [ ] API endpoints повертають коректні дані
- [ ] CORS налаштовано правильно
- [ ] Rate limiting працює
- [ ] Authentication flow працює

### 11.2 Frontend Tests

- [ ] Widget завантажується на сайті
- [ ] Повідомлення відображаються коректно
- [ ] Join flow працює
- [ ] Real-time оновлення працюють
- [ ] Responsive design на мобільних

### 11.3 Integration Tests

- [ ] SEO метадані відображаються
- [ ] Analytics tracking працює
- [ ] Content moderation працює
- [ ] Error handling коректний

---

## 12. Integration with Other Docs

Цей документ доповнює:

- `DAARION_city_integration.md` — загальна архітектура DAARION.city
- `47_messaging_channels_and_privacy_layers.md` — архітектура каналів
- `04_ui_ux_onboarding_chat.md` — UI/UX специфікація
- `03_api_core_snapshot.md` — API контракти

---

## 13. Завдання для Cursor

```text
You are a senior full-stack engineer. Implement DAARION.city website integration using:
- 50_daarion_city_website_integration.md
- DAARION_city_integration.md
- 47_messaging_channels_and_privacy_layers.md
- 03_api_core_snapshot.md

Tasks:
1) Create DAARION.city team in database (type='city', slug='daarion', mode='public').
2) Create public channel for DAARION.city (slug='general', type='public', is_public=true).
3) Create city agent for DAARION.city (role='team_assistant', memory_scope='team').
4) Implement Public Channel API endpoints:
   - GET /api/v1/channels/{slug}/public (channel info)
   - GET /api/v1/channels/{slug}/public/messages (messages with pagination)
   - POST /api/v1/channels/{slug}/public/messages (send message, authenticated)
   - POST /api/v1/channels/{slug}/public/join (register as viewer/member)
5) Configure CORS for daarion.city domain.
6) Add rate limiting for public channel (guest: 100 req/min, authenticated: 30 msg/min, join: 5 req/hour).
7) Create React component MicroDAOChannelEmbed (props: channelSlug, teamSlug, apiUrl, theme, showHeader, allowJoin).
8) Implement authentication flow (guest view → join modal → authenticated view).
9) Add real-time updates (WebSocket/SSE for new messages).
10) Add SEO metadata (Open Graph, Twitter Cards, JSON-LD).
11) Add analytics tracking (channel_view, message_sent, join_clicked, join_completed, widget_loaded).
12) Add content moderation (spam filter, toxic content detection, user reports).

Output:
- list of modified files
- diff
- summary
```

---

## 14. Summary

Інтеграція MicroDAO у офіційний сайт DAARION.city:

- DAARION.city стає першим MicroDAO типу "city"
- Публічний канал вбудовується на сайт як React компонент
- API endpoints для публічного каналу
- Authentication flow для користувачів сайту
- SEO та метадані для публічного каналу
- Analytics та tracking
- Security (CORS, rate limiting, content moderation)

Це перша інтеграція MicroDAO у зовнішній сайт, яка стане основою для подальших інтеграцій з іншими платформами.

---

**Версія:** 1.0  
**Останнє оновлення:** 2024-11-14


