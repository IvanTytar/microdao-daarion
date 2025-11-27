# Приклад інтеграції розширеного чату

**Дата:** 2025-11-23

---

## 🎯 Швидкий старт

### 1. Імпорт компонента

```tsx
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';
```

### 2. Базове використання

```tsx
function MyPage() {
  return (
    <div className="container mx-auto p-6">
      <h1>Моя сторінка мікроДАО</h1>
      
      <MicroDaoOrchestratorChatEnhanced
        orchestratorAgentId="helion"
      />
    </div>
  );
}
```

---

## 📋 Приклади інтеграції

### Приклад 1: Фіксований чат (завжди видимий)

```tsx
// src/pages/MicroDaoCabinetPage.tsx

import React from 'react';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

export function MicroDaoCabinetPage() {
  const microDao = {
    id: 'helion',
    name: 'Helion Energy Union',
    orchestrator_agent_id: 'helion',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{microDao.name}</h1>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ваш основний контент */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Огляд</h2>
              {/* ... */}
            </div>
          </div>

          {/* Sidebar - Chat (1 column) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId={microDao.orchestrator_agent_id}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Приклад 2: Модальне вікно

```tsx
// src/pages/MicroDaoCabinetPage.tsx

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

export function MicroDaoCabinetPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Кнопка відкриття чату */}
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center z-40"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        {/* Модальне вікно з чатом */}
        {showChat && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId="helion"
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}

        {/* Основний контент сторінки */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Кабінет мікроДАО</h1>
          {/* ... */}
        </div>
      </div>
    </div>
  );
}
```

---

### Приклад 3: Floating чат (знизу справа)

```tsx
// src/pages/MicroDaoCabinetPage.tsx

import React, { useState } from 'react';
import { MessageCircle, Minimize2 } from 'lucide-react';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

export function MicroDaoCabinetPage() {
  const [showChat, setShowChat] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Основний контент */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Кабінет мікроДАО</h1>
          {/* ... */}
        </div>

        {/* Floating Chat Widget */}
        {!showChat ? (
          // Кнопка відкриття
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all z-50 hover:scale-110"
          >
            <MessageCircle className="h-6 w-6 mx-auto" />
          </button>
        ) : (
          // Чат вікно
          <div className={`fixed bottom-6 right-6 z-50 transition-all ${
            isMinimized ? 'w-80' : 'w-[600px]'
          }`}>
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
              {/* Заголовок з кнопками */}
              <div className="bg-purple-600 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <MessageCircle className="h-5 w-5" />
                  <span className="font-semibold">Чат з агентом</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 rounded transition-colors"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowChat(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 rounded transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Чат контент */}
              {!isMinimized && (
                <MicroDaoOrchestratorChatEnhanced
                  orchestratorAgentId="helion"
                  onClose={() => setShowChat(false)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### Приклад 4: Tabs з кількома агентами

```tsx
// src/pages/MultiAgentChat.tsx

import React, { useState } from 'react';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

const AGENTS = [
  { id: 'helion', name: 'Helion', icon: '⚡' },
  { id: 'greenfood', name: 'GREENFOOD', icon: '🌱' },
  { id: 'yaromir', name: 'Yaromir', icon: '🧙' },
  { id: 'daarwizz', name: 'DAARWIZZ', icon: '✨' },
];

export function MultiAgentChat() {
  const [activeAgent, setActiveAgent] = useState('helion');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeAgent === agent.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{agent.icon}</span>
              {agent.name}
            </button>
          ))}
        </div>

        {/* Chat Content */}
        <div>
          {AGENTS.map((agent) => (
            <div
              key={agent.id}
              className={activeAgent === agent.id ? 'block' : 'hidden'}
            >
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId={agent.id}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Приклад 5: З пропсами оркестратора

```tsx
// src/pages/MicroDaoCabinetPage.tsx

import React from 'react';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

export function MicroDaoCabinetPage() {
  const orchestrator = {
    id: 'helion',
    name: 'Helion Energy Union',
    description: 'AI-агент для управління енергетичною екосистемою',
    avatar: '/avatars/helion.png',
  };

  return (
    <div className="container mx-auto p-6">
      <MicroDaoOrchestratorChatEnhanced
        orchestrator={orchestrator}
        orchestratorAgentId={orchestrator.id}
      />
    </div>
  );
}
```

---

## 🔧 Використання Wrapper компонента

### Перемикання між базовим та розширеним чатом

```tsx
// src/pages/MicroDaoCabinetPage.tsx

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { MicroDaoOrchestratorChatWrapper } from '@/components/microdao/MicroDaoOrchestratorChatWrapper';

export function MicroDaoCabinetPage() {
  const [useEnhanced, setUseEnhanced] = useState(false);

  return (
    <div className="container mx-auto p-6">
      {/* Toggle для вибору версії */}
      <div className="mb-4 flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-600" />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useEnhanced}
            onChange={(e) => setUseEnhanced(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-gray-700">
            Розширений режим (мультимодальність, база знань, Telegram)
          </span>
        </label>
      </div>

      {/* Чат */}
      <MicroDaoOrchestratorChatWrapper
        orchestratorAgentId="helion"
        enhanced={useEnhanced}
      />
    </div>
  );
}
```

---

## 🎨 Кастомізація стилів

### Зміна розмірів чату

```tsx
<div className="w-full max-w-3xl mx-auto">
  <MicroDaoOrchestratorChatEnhanced
    orchestratorAgentId="helion"
  />
</div>
```

### Зміна висоти вікна повідомлень

```css
/* У вашому CSS файлі */
.messages-container {
  height: 600px; /* Замість стандартних 400px */
}
```

Або безпосередньо у компоненті:

```tsx
// src/components/microdao/MicroDaoOrchestratorChatEnhanced.tsx
// Знайти рядок:
<div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50">

// Змінити на:
<div className="h-[600px] overflow-y-auto p-4 space-y-4 bg-gray-50">
```

---

## 🔌 Backend інтеграція

### Підключення до реального API

```tsx
// src/config/api.ts
export const API_CONFIG = {
  routerUrl: import.meta.env.VITE_NODE1_URL || 'http://144.76.224.179:9102',
  apiUrl: import.meta.env.VITE_API_URL || 'http://144.76.224.179:8899',
};

// Використання
import { API_CONFIG } from '@/config/api';
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

// Компонент автоматично використовує API_CONFIG
```

---

## 📱 Responsive версія

### Адаптивний layout для мобільних

```tsx
export function MobileResponsiveChatPage() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop - Sidebar */}
      <div className="hidden lg:block fixed right-0 top-0 bottom-0 w-[500px] p-4 overflow-auto">
        <MicroDaoOrchestratorChatEnhanced
          orchestratorAgentId="helion"
        />
      </div>

      {/* Mobile - Full Screen Modal */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowChat(true)}
          className="fixed bottom-4 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg z-50"
        >
          💬
        </button>

        {showChat && (
          <div className="fixed inset-0 bg-white z-50 flex flex-col">
            <div className="flex-1 overflow-auto">
              <MicroDaoOrchestratorChatEnhanced
                orchestratorAgentId="helion"
                onClose={() => setShowChat(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:mr-[500px] p-4">
        {/* Ваш контент */}
      </div>
    </div>
  );
}
```

---

## ✅ Чекліст інтеграції

Перед запуском перевірте:

- [ ] Імпортовано компонент `MicroDaoOrchestratorChatEnhanced`
- [ ] Передано `orchestratorAgentId` або `orchestrator` prop
- [ ] Налаштовано `VITE_NODE1_URL` у `.env`
- [ ] Перевірено responsive версію
- [ ] Протестовано базовий чат
- [ ] Протестовано мультимодальні функції
- [ ] Перевірено базу знань
- [ ] Налаштовано системний промпт
- [ ] (Опційно) Підключено Telegram бота

---

## 🐛 Troubleshooting

### Проблема: Чат не відображається

**Рішення:**
```tsx
// Перевірте, чи передано orchestratorAgentId
<MicroDaoOrchestratorChatEnhanced
  orchestratorAgentId="helion" // ✅ Обов'язково!
/>
```

### Проблема: Голосовий ввід не працює

**Рішення:**
- Переконайтеся, що браузер підтримує Web Speech API (Chrome, Edge)
- Дайте дозвіл на використання мікрофону
- Використовуйте HTTPS (локально можна HTTP)

### Проблема: Файли не завантажуються

**Рішення:**
- Перевірте розмір файлу (макс. 50 МБ)
- Перевірте тип файлу (PDF, DOC, DOCX, TXT, MD, JSON)
- Перевірте підключення до Backend API

---

## 📞 Підтримка

Якщо виникли питання або проблеми:
1. Перевірте документацію у `ORCHESTRATOR-CHAT-ENHANCED.md`
2. Перегляньте приклади вище
3. Перевірте логи браузера (F12 → Console)
4. Перевірте логи Router (`docker logs dagi-router`)




