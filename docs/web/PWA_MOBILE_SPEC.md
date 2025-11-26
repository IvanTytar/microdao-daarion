# PWA / Mobile Specification — DAARION.city

Version: 1.0.0

## 0. PURPOSE

Зробити `app.daarion.space` Progressive Web App (PWA):
- **Installable** — можна додати на домашній екран як додаток
- **Offline shell** — базові сторінки працюють без мережі
- **Mobile-first** — оптимізовано для мобільних пристроїв
- **Foundation for push** — підготовка до push-нотифікацій

---

## 1. GOALS

### 1.1. Installable
- Користувач може "Add to Home Screen" на iOS/Android/Desktop
- Відкривається в standalone режимі (без browser UI)
- Власна іконка та splash screen

### 1.2. Offline Shell
- Головна сторінка `/` працює з кешу
- Список кімнат `/city` працює з кешу
- Сторінки кімнат `/city/[slug]` — кешований shell + повідомлення "ви офлайн"
- Matrix чат — показує offline-стан, не намагається емулювати

### 1.3. Performance
- Швидке завантаження через кешування статичних ресурсів
- App shell architecture

---

## 2. MANIFEST.JSON

Файл: `public/manifest.json`

```json
{
  "name": "DAARION.city",
  "short_name": "DAARION",
  "description": "Децентралізована платформа для мікро-спільнот з AI-агентами",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#0c4a6e",
  "background_color": "#0f172a",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["social", "productivity"],
  "lang": "uk"
}
```

---

## 3. ICONS

Директорія: `public/icons/`

| File | Size | Purpose |
|------|------|---------|
| `icon-192x192.png` | 192×192 | Android, Chrome |
| `icon-512x512.png` | 512×512 | Splash screen |
| `apple-touch-icon.png` | 180×180 | iOS |
| `favicon.ico` | 32×32 | Browser tab |

Дизайн: DAARION логотип (sparkles/зірка) на темному фоні (#0f172a)

---

## 4. SERVICE WORKER

Файл: `public/sw.js`

### 4.1. Cache Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Static Assets (/_next/static/*, fonts, images)             │
│  └── Cache First → Return cached → Update in background     │
│                                                             │
│  HTML Pages (/, /city, /city/*)                             │
│  └── Network First → Fallback to cache → Offline page       │
│                                                             │
│  API Requests (/api/*)                                      │
│  └── Network Only → No caching                              │
│                                                             │
│  Matrix/WebSocket                                           │
│  └── Network Only → Show offline state in UI                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2. Cache Names

```javascript
const CACHE_NAME = 'daarion-v1';
const STATIC_CACHE = 'daarion-static-v1';
const PAGES_CACHE = 'daarion-pages-v1';
```

### 4.3. Precache List

```javascript
const PRECACHE_URLS = [
  '/',
  '/city',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];
```

---

## 5. OFFLINE PAGE

Файл: `src/app/offline/page.tsx`

Простий екран:
- DAARION логотип
- "Ви офлайн"
- "Перевірте підключення до інтернету"
- Кнопка "Спробувати знову"

---

## 6. HEAD METADATA

В `layout.tsx`:

```tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#0c4a6e" />
  <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="DAARION" />
</head>
```

---

## 7. SW REGISTRATION

В `src/lib/pwa.ts`:

```typescript
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  
  // Only in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('SW: Skipping registration in development');
    return;
  }
  
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW: Registered', registration.scope);
    } catch (error) {
      console.error('SW: Registration failed', error);
    }
  });
}
```

---

## 8. TESTING CHECKLIST

### 8.1. DevTools → Application
- [ ] Manifest loads correctly
- [ ] Icons display properly
- [ ] Service Worker is active
- [ ] Cache Storage has expected caches

### 8.2. Install Prompt
- [ ] Chrome shows "Install app" option
- [ ] Safari iOS shows "Add to Home Screen"
- [ ] App opens in standalone mode

### 8.3. Offline Mode
- [ ] `/` loads from cache
- [ ] `/city` loads from cache
- [ ] `/city/general` shows chat offline state
- [ ] API calls show appropriate error

### 8.4. Lighthouse
- [ ] PWA score > 90
- [ ] Performance > 80
- [ ] Accessibility > 90

---

## 9. LIMITATIONS (MVP)

- ❌ No push notifications (future phase)
- ❌ No background sync
- ❌ No offline message queue
- ❌ No IndexedDB for offline data

---

## 10. FUTURE ENHANCEMENTS

1. **Push Notifications**
   - Web Push API
   - VAPID keys
   - Notification preferences

2. **Background Sync**
   - Queue messages when offline
   - Sync when back online

3. **IndexedDB**
   - Cache chat history
   - Offline-first architecture

4. **App Badges**
   - Unread message count on icon

