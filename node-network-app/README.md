# 🌐 DAGI Node Network App

Окремий застосунок для управління мережею нод DAGI на порту **3000**.

## 🎯 Що це?

Це мобільний/веб застосунок для:
- 📊 Моніторингу нод у мережі DAGI
- ➕ Підключення нових нод
- 📈 Перегляду метрик та статистики
- 🎛️ Управління кабінетами нод

## 🚀 Швидкий старт

```bash
# 1. Встановити залежності
npm install

# 2. Запустити dev server
npm run dev

# 3. Відкрити в браузері
http://localhost:3000
```

## 📦 Структура

```
node-network-app/
├── src/
│   ├── components/
│   │   └── Layout.tsx           # Основний layout з навігацією
│   ├── pages/
│   │   ├── Dashboard.tsx        # Головна сторінка з оглядом
│   │   ├── NodesPage.tsx        # Список всіх нод
│   │   ├── NodeDetailPage.tsx   # Детальна інформація про ноду
│   │   ├── ConnectNodePage.tsx  # Підключення нових нод
│   │   └── MetricsPage.tsx      # Метрики та статистика
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 🎨 Features

### ✅ Dashboard
- Network statistics (всього нод, online, offline, uptime)
- Список останніх нод
- Quick actions (підключити ноду, метрики)

### ✅ Ноди
- Список всіх зареєстрованих нод
- Пошук та фільтрація
- Детальна інформація про кожну ноду
- Real-time оновлення статусів

### ✅ Підключення
- Інструкції для macOS/Linux/Windows
- Copy-to-clipboard команди
- Підказки для користувачів

### ✅ Метрики (Coming Soon)
- Графіки продуктивності
- Історія heartbeat
- Аналіз використання ресурсів

## 🔌 API Integration

Застосунок підключається до Node Registry Service:

```typescript
// Proxy налаштовано в vite.config.ts
'/api' -> 'http://localhost:9205'

// Endpoints:
GET  /api/v1/nodes          - Список нод
GET  /api/v1/nodes/:id      - Інформація про ноду
GET  /api/metrics           - Network statistics
POST /api/v1/nodes/register - Реєстрація ноди
POST /api/v1/nodes/heartbeat - Heartbeat
```

## 📱 Responsive Design

- ✅ Desktop (1920x1080+)
- ✅ Tablet (768px+)
- ✅ Mobile (375px+)
- ✅ Touch-friendly navigation

## 🎯 Порти

- **3000** - DAGI Node Network App (цей проект)
- **8899** - MicroDAO Main App
- **9205** - Node Registry Service

## 🛠️ Технології

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide Icons

## 📝 Development

```bash
# Запустити dev server
npm run dev

# Build для production
npm run build

# Preview production build
npm run preview
```

## 🎨 Дизайн

- Dark theme
- Gradient backgrounds
- Glassmorphism effects
- Mobile-first approach
- Beautiful animations

## 🔥 Що далі?

### Phase 2:
- [ ] Real-time WebSocket оновлення
- [ ] Metrics charts (Chart.js)
- [ ] Node actions (reboot, logs)
- [ ] User authentication
- [ ] Node groups/tags

### Phase 3:
- [ ] Mobile app (React Native)
- [ ] Push notifications
- [ ] Advanced analytics
- [ ] Multi-language support

## 📄 License

Private - DAGI Project

---

**Created by**: Daarion Team  
**Date**: 2025-11-23  
**Version**: 1.0.0

