# DAARION Web Frontend

Графічний інтерфейс для DAARION MVP на базі Next.js 15 з glassmorphism дизайном.

## 🚀 Швидкий старт

### Локальна розробка

```bash
cd apps/web

# Встановити залежності
npm install

# Запустити dev сервер
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000)

### Змінні середовища

Створіть `.env.local`:

```env
# URL бекенду (для розробки)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Для продакшену залиште порожнім (same-origin)
# NEXT_PUBLIC_API_BASE_URL=
```

## 📁 Структура проекту

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing / Home
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── city/
│   │   │   ├── page.tsx       # City rooms list
│   │   │   └── [slug]/
│   │   │       └── page.tsx   # Individual room
│   │   └── secondme/
│   │       └── page.tsx       # Second Me profile
│   ├── components/
│   │   ├── Navigation.tsx     # Header navigation
│   │   ├── StatusIndicator.tsx # API health indicator
│   │   └── Skeleton.tsx       # Loading skeletons
│   └── lib/
│       ├── api.ts             # API client
│       └── utils.ts           # Utility functions
├── public/                     # Static assets
├── Dockerfile                  # Production container
├── next.config.ts             # Next.js config
├── tailwind.config.ts         # Tailwind config
└── package.json
```

## 🎨 Дизайн

### Glassmorphism стиль

- Темна тема за замовчуванням (`bg-slate-950`)
- Напівпрозорі панелі з `backdrop-blur`
- Градієнтні акценти (cyan → blue)
- Анімовані hover-ефекти

### CSS класи

```css
.glass-panel       /* Базова скляна панель */
.glass-panel-hover /* Панель з hover ефектом */
.glass-card        /* Картка з тінню */
.text-gradient     /* Градієнтний текст */
.glow-accent       /* Світіння акценту */
```

## 🛣️ Роути

| Шлях | Опис |
|------|------|
| `/` | Landing page з features |
| `/city` | Список кімнат міста |
| `/city/[slug]` | Окрема кімната |
| `/secondme` | Профіль Second Me |

## 🔌 API інтеграція

Всі виклики до API проходять через `/api/*`:

```typescript
import { api } from '@/lib/api'

// Отримати кімнати
const rooms = await api.getCityRooms()

// Отримати профіль Second Me
const profile = await api.getSecondMeProfile()

// Перевірка здоров'я API
const isHealthy = await api.checkHealth()
```

## 🐳 Docker

### Збірка образу

```bash
cd apps/web
docker build -t daarion-web .
```

### Запуск контейнера

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL= \
  daarion-web
```

### Docker Compose

```yaml
services:
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=
```

## 📱 Мобільна адаптація

- Responsive breakpoints: `sm:640px`, `md:768px`, `lg:1024px`
- Mobile-first підхід
- Бургер-меню для навігації на мобільних
- Оптимізовані розміри тексту та відступів

## 🔧 Команди

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔜 Roadmap

- [ ] Matrix/WebSocket інтеграція для чату
- [ ] Авторизація (Passkey/OAuth)
- [ ] Agent Console
- [ ] Wallet/Governance екрани
- [ ] PWA support
- [ ] Dark/Light theme toggle

