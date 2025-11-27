# Swapper Service - Інтеграція в кабінети Node #1 та Node #2

**Дата:** 2025-11-22  
**Статус:** ✅ Готово до інтеграції

---

## 📋 Крок 1: Запуск Swapper Service

### Node #2 (MacBook - Development)

#### Варіант A: Docker (якщо Docker запущений)

```bash
cd /Users/apple/github-projects/microdao-daarion

# Запустити Swapper Service
docker-compose up -d swapper-service

# Перевірити статус
docker-compose ps swapper-service

# Перевірити логи
docker-compose logs -f swapper-service

# Перевірити health
curl http://localhost:8890/health
```

#### Варіант B: Локально (без Docker)

```bash
cd /Users/apple/github-projects/microdao-daarion/services/swapper-service

# Запустити скрипт (створює venv та встановлює залежності)
./start.sh
```

#### Варіант C: Вручну

```bash
cd /Users/apple/github-projects/microdao-daarion/services/swapper-service

# Створити virtual environment
python3 -m venv venv
source venv/bin/activate

# Встановити залежності
pip install -r requirements.txt

# Налаштувати змінні оточення
export OLLAMA_BASE_URL=http://localhost:11434
export SWAPPER_CONFIG_PATH=./config/swapper_config.yaml
export SWAPPER_MODE=single-active

# Запустити
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8890
```

### Node #1 (Production Server)

```bash
# SSH до сервера
ssh root@144.76.224.179

# Перейти в директорію проекту
cd /opt/microdao-daarion

# Оновити код
git pull origin main

# Запустити Swapper Service
docker-compose up -d swapper-service

# Перевірити статус
docker-compose ps swapper-service
curl http://localhost:8890/health
```

---

## 📋 Крок 2: Перевірка роботи

### Тест 1: Health Check

```bash
curl http://localhost:8890/health
```

**Очікуваний результат:**
```json
{
  "status": "healthy",
  "service": "swapper-service",
  "active_model": null,
  "mode": "single-active"
}
```

### Тест 2: Status для кабінету

```bash
curl http://localhost:8890/api/cabinet/swapper/status | python3 -m json.tool
```

**Очікуваний результат:**
```json
{
  "service": "swapper-service",
  "status": "healthy",
  "mode": "single-active",
  "active_model": null,
  "total_models": 8,
  "available_models": [
    "deepseek-r1-70b",
    "qwen2.5-coder-32b",
    "gemma2-27b",
    ...
  ],
  "loaded_models": [],
  "models": [...]
}
```

### Тест 3: Метрики

```bash
curl http://localhost:8890/api/cabinet/swapper/metrics/summary | python3 -m json.tool
```

---

## 📋 Крок 3: Інтеграція в кабінети

### 3.1 Додати Swapper секцію в Sidebar

**Файл:** `src/components/AdminConsole/Sidebar.tsx` (або аналогічний)

```typescript
const menuItems = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'members', label: 'Members & Roles', icon: 'users' },
  { id: 'agents', label: 'Agents', icon: 'robot' },
  { id: 'swapper', label: 'Swapper Service', icon: 'swap' }, // ← Додати це
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
```

### 3.2 Створити Swapper сторінку

**Файл:** `src/pages/Admin/SwapperPage.tsx`

```typescript
import React from 'react';
import { SwapperPage } from '@/services/swapper-service/cabinet-integration';
import '@/services/swapper-service/cabinet-integration.css';

export default function SwapperAdminPage() {
  return <SwapperPage />;
}
```

### 3.3 Додати маршрут

**Файл:** `src/routes/admin.tsx` (або аналогічний)

```typescript
import SwapperAdminPage from '@/pages/Admin/SwapperPage';

const adminRoutes = [
  { path: '/admin/overview', component: OverviewPage },
  { path: '/admin/members', component: MembersPage },
  { path: '/admin/agents', component: AgentsPage },
  { path: '/admin/swapper', component: SwapperAdminPage }, // ← Додати це
  { path: '/admin/settings', component: SettingsPage },
];
```

### 3.4 Налаштувати API URL

**Файл:** `.env.local` (або `.env`)

```bash
# Node #2 (MacBook - Development)
NEXT_PUBLIC_SWAPPER_URL=http://localhost:8890

# Node #1 (Production Server)
NEXT_PUBLIC_SWAPPER_URL=http://swapper-service:8890
# або через Nginx proxy:
NEXT_PUBLIC_SWAPPER_URL=https://gateway.daarion.city/api/swapper
```

### 3.5 Копіювати компоненти

```bash
# Копіювати компоненти в проект
cp services/swapper-service/cabinet-integration.tsx src/components/Swapper/
cp services/swapper-service/cabinet-integration.css src/styles/swapper.css
```

---

## 📋 Крок 4: Альтернативна інтеграція (якщо немає React)

### 4.1 Vanilla JavaScript

**Файл:** `public/swapper-dashboard.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Swapper Service Dashboard</title>
  <link rel="stylesheet" href="/styles/swapper.css">
</head>
<body>
  <div id="swapper-app"></div>
  <script>
    const SWAPPER_API = 'http://localhost:8890';
    
    async function loadSwapperStatus() {
      try {
        const response = await fetch(`${SWAPPER_API}/api/cabinet/swapper/status`);
        const data = await response.json();
        renderSwapperStatus(data);
      } catch (error) {
        console.error('Error loading Swapper status:', error);
      }
    }
    
    function renderSwapperStatus(status) {
      const app = document.getElementById('swapper-app');
      app.innerHTML = `
        <div class="swapper-status-card">
          <h3>Swapper Service</h3>
          <p>Status: ${status.status}</p>
          <p>Mode: ${status.mode}</p>
          ${status.active_model ? `
            <div class="active-model">
              <h4>Active Model: ${status.active_model.name}</h4>
              <p>Uptime: ${status.active_model.uptime_hours.toFixed(2)} hours</p>
            </div>
          ` : '<p>No active model</p>'}
        </div>
      `;
    }
    
    // Load status on page load
    loadSwapperStatus();
    
    // Refresh every 30 seconds
    setInterval(loadSwapperStatus, 30000);
  </script>
</body>
</html>
```

### 4.2 Vue.js компонент

**Файл:** `src/components/Swapper/SwapperStatus.vue`

```vue
<template>
  <div class="swapper-status-card">
    <h3>Swapper Service</h3>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <p>Status: {{ status.status }}</p>
      <p>Mode: {{ status.mode }}</p>
      <div v-if="status.active_model" class="active-model">
        <h4>Active Model: {{ status.active_model.name }}</h4>
        <p>Uptime: {{ status.active_model.uptime_hours.toFixed(2) }} hours</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const status = ref(null);
const loading = ref(true);
const error = ref(null);

const SWAPPER_API = import.meta.env.VITE_SWAPPER_URL || 'http://localhost:8890';

async function fetchStatus() {
  try {
    const response = await fetch(`${SWAPPER_API}/api/cabinet/swapper/status`);
    status.value = await response.json();
    error.value = null;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStatus();
  const interval = setInterval(fetchStatus, 30000);
  onUnmounted(() => clearInterval(interval));
});
</script>
```

---

## 📋 Крок 5: Інтеграція через Node Registry (опціонально)

Якщо використовується Node Registry Service, можна додати Swapper статус туди:

**Файл:** `services/node-registry/app/main.py`

```python
@app.get("/api/nodes/{node_id}/swapper")
async def get_node_swapper_status(node_id: str):
    """Get Swapper Service status for a node"""
    # Determine Swapper URL based on node
    if node_id == "node-2-macbook-m4max":
        swapper_url = "http://localhost:8890"
    elif node_id == "node-1-hetzner-gex44":
        swapper_url = "http://swapper-service:8890"
    else:
        raise HTTPException(404, "Node not found")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{swapper_url}/api/cabinet/swapper/status")
        return response.json()
```

---

## 📋 Крок 6: Додати в Overview сторінку

Додати Swapper статус на головну сторінку Overview:

**Файл:** `src/pages/Admin/Overview.tsx`

```typescript
import { SwapperStatusCard } from '@/services/swapper-service/cabinet-integration';

export default function OverviewPage() {
  return (
    <div className="overview-page">
      <h1>DAO Overview</h1>
      
      {/* Existing overview content */}
      
      {/* Add Swapper status widget */}
      <div className="swapper-widget">
        <SwapperStatusCard />
      </div>
    </div>
  );
}
```

---

## 🧪 Тестування інтеграції

### 1. Перевірити API доступність

```bash
# З браузера або curl
curl http://localhost:8890/api/cabinet/swapper/status
```

### 2. Перевірити CORS (якщо frontend на іншому порту)

Якщо frontend на іншому порту (наприклад, 3000), переконайтеся що CORS налаштовано:

**Файл:** `services/swapper-service/app/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://daarion.city"],  # ← Додати ваші домени
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. Перевірити в браузері

1. Відкрити кабінет
2. Перейти на `/admin/swapper`
3. Перевірити що дані завантажуються
4. Перевірити що кнопки Load/Unload працюють

---

## 🐛 Troubleshooting

### Проблема: API не доступний

**Рішення:**
```bash
# Перевірити чи Swapper запущений
curl http://localhost:8890/health

# Перевірити логи
docker logs swapper-service
# або
tail -f /tmp/swapper.log
```

### Проблема: CORS помилка

**Рішення:**
Додати ваш домен в `allow_origins` в `app/main.py`

### Проблема: Компоненти не відображаються

**Рішення:**
1. Перевірити що файли скопійовані
2. Перевірити імпорти
3. Перевірити консоль браузера на помилки

---

## ✅ Чеклист інтеграції

- [ ] Swapper Service запущений
- [ ] API доступний (`/health` працює)
- [ ] Компоненти скопійовані в проект
- [ ] Маршрут додано в роутер
- [ ] Sidebar оновлено
- [ ] API URL налаштовано
- [ ] CORS налаштовано (якщо потрібно)
- [ ] Тестування в браузері пройдено

---

**Last Updated:** 2025-11-22  
**Status:** ✅ Готово до інтеграції  
**Next:** Виконати кроки вище для Node #1 та Node #2

