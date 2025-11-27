# Розширений чат з оркестраторами мікроДАО

**Дата:** 2025-11-23  
**Статус:** ✅ Реалізовано

---

## 🎯 Огляд

Створено повнофункціональну систему чату з оркестраторами мікроДАО з підтримкою:

1. **Мультимодальності** (голос, зображення, файли, веб-пошук)
2. **Бази знань** агента (векторна + графова БД)
3. **Системних промптів** з редагуванням
4. **Telegram інтеграції**

---

## 📁 Структура компонентів

```
src/
├── components/
│   └── microdao/
│       ├── MicroDaoOrchestratorChat.tsx          # Оригінальний компонент (базовий)
│       ├── MicroDaoOrchestratorChatEnhanced.tsx  # Розширений компонент ⭐
│       └── chat/                                  # Модульні компоненти
│           ├── MultimodalInput.tsx               # Мультимодальний ввід
│           ├── KnowledgeBase.tsx                 # База знань агента
│           ├── SystemPromptEditor.tsx            # Редактор системного промпту
│           └── TelegramIntegration.tsx           # Telegram інтеграція
│
└── services/
    ├── voiceService.ts                           # Голосовий ввід/вивід
    ├── webSearchService.ts                       # Веб-пошук через Router
    └── knowledgeBaseService.ts                   # Робота з базою знань
```

---

## 🎤 Мультимодальний ввід

### Можливості

1. **Голосовий ввід** (Speech-to-Text)
   - Web Speech API
   - Підтримка української мови
   - Проміжні та фінальні результати
   - Індикатор запису

2. **Завантаження зображень**
   - Drag & drop підтримка
   - Preview перед відправкою
   - Base64 конвертація для API
   - Видалення прикріплених файлів

3. **Завантаження файлів**
   - PDF, DOC, DOCX, TXT, MD, JSON
   - Максимальний розмір: 50 МБ
   - Відображення прикріплених файлів

4. **Веб-пошук**
   - Інтеграція з Router
   - Пошук у реальному часі
   - Форматування результатів

### Компонент: `MultimodalInput`

```tsx
<MultimodalInput
  value={input}
  onChange={setInput}
  onSend={handleSend}
  onImageUpload={handleImageUpload}
  onFileUpload={handleFileUpload}
  onWebSearch={handleWebSearch}
  onVoiceStart={handleVoiceStart}
  onVoiceStop={handleVoiceStop}
  isRecording={isRecording}
  isPending={isPending}
  attachedImages={attachedImages}
  attachedFiles={attachedFiles}
  onRemoveImage={onRemoveImage}
  onRemoveFile={onRemoveFile}
/>
```

### Приклад використання

```typescript
// Голосовий ввід
const handleVoiceStart = () => {
  voiceService.startRecording(
    (transcript, isFinal) => {
      if (isFinal) {
        setInput(transcript);
      }
    },
    (error) => console.error('Voice error:', error)
  );
};

// Веб-пошук
const handleWebSearch = async (query: string) => {
  const results = await webSearchService.search(query, agentId);
  const formattedResults = webSearchService.formatResults(results);
  sendMessageMutation.mutate(formattedResults);
};
```

---

## 📚 База знань агента

### Можливості

1. **Завантаження файлів**
   - Drag & drop інтерфейс
   - Валідація типу та розміру
   - Відображення прогресу завантаження

2. **Індексація**
   - Векторна база даних (embeddings)
   - Графова база даних (entities, relationships)
   - Статуси: pending → vectorized → graphed → completed

3. **Управління**
   - Видалення файлів
   - Повторна індексація при помилках
   - Статистика (кількість файлів, розмір, статуси)

4. **Візуалізація статусів**
   - Vector DB: ✅ / ⏳
   - Graph DB: ✅ / ⏳
   - Помилки з детальним повідомленням

### Компонент: `KnowledgeBase`

```tsx
<KnowledgeBase
  agentId="helion"
  agentName="Helion Energy Union"
  files={knowledgeFiles}
  onUpload={handleKnowledgeUpload}
  onDelete={handleKnowledgeDelete}
  onReindex={handleKnowledgeReindex}
/>
```

### Структура файлу

```typescript
interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'pending' | 'vectorized' | 'graphed' | 'completed' | 'error';
  vectorDbStatus?: boolean;    // Індексовано у векторній БД
  graphDbStatus?: boolean;     // Додано у графову БД
  errorMessage?: string;
}
```

### Backend API endpoints

```
POST   /api/knowledge/upload          # Завантажити файл
GET    /api/knowledge/{agent_id}/files # Список файлів
DELETE /api/knowledge/{agent_id}/files/{file_id} # Видалити файл
POST   /api/knowledge/{agent_id}/files/{file_id}/reindex # Повторна індексація
GET    /api/knowledge/{agent_id}/stats # Статистика
POST   /api/knowledge/{agent_id}/search # Пошук у базі знань
```

---

## ⚙️ Системний промпт

### Можливості

1. **Відображення поточного промпту**
   - Форматування з syntax highlighting
   - Read-only режим за замовчуванням

2. **Редагування**
   - Textarea з syntax highlighting
   - Збереження змін
   - Скасування редагування

3. **Скидання**
   - Повернення до значення за замовчуванням
   - Підтвердження дії

4. **Індикатор статусу**
   - "Збережено" після успішного збереження
   - Кількість символів

### Компонент: `SystemPromptEditor`

```tsx
<SystemPromptEditor
  agentId="helion"
  agentName="Helion Energy Union"
  systemPrompt={systemPrompt}
  onSave={handleSystemPromptSave}
  onReset={handleSystemPromptReset}
/>
```

### Системні промпти за замовчуванням

```typescript
const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  helion: `Ти - Helion, AI-агент платформи Energy Union...`,
  greenfood: `Ти — GREENFOOD Assistant, ERP для крафтових виробників...`,
  yaromir: `Ти - Yaromir, оркестратор CrewAI команди...`,
  daarwizz: `Ти - Daarwizz, головний AI-агент DAARION.city...`,
};
```

---

## 💬 Telegram інтеграція

### Можливості

1. **Підключення бота**
   - Введення токену від @BotFather
   - Автоматична валідація
   - Отримання інформації про бота

2. **Статус підключення**
   - Індикатор: Підключено / Не підключено
   - Дата підключення
   - Ім'я бота (@username)

3. **Управління**
   - Відкриття бота у Telegram
   - Копіювання посилання на бота
   - Оновлення токену
   - Від'єднання бота

4. **Інструкції**
   - Покрокове керівництво
   - Посилання на @BotFather
   - Формат токену

### Компонент: `TelegramIntegration`

```tsx
<TelegramIntegration
  agentId="helion"
  agentName="Helion Energy Union"
  isConnected={telegramConnected}
  botUsername="helion_bot"
  botToken="1234567890:ABCdef..."
  connectionDate="2025-11-23T10:00:00Z"
  onConnect={handleTelegramConnect}
  onDisconnect={handleTelegramDisconnect}
  onUpdateToken={handleTelegramUpdateToken}
/>
```

### Приклад токену

```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

## 🔧 Інтеграція з головним компонентом

### `MicroDaoOrchestratorChatEnhanced`

Головний компонент, що об'єднує всі функції:

```tsx
import { MicroDaoOrchestratorChatEnhanced } from './MicroDaoOrchestratorChatEnhanced';

// Використання
<MicroDaoOrchestratorChatEnhanced
  orchestrator={orchestrator}
  orchestratorAgentId="helion"
  onClose={() => setShowChat(false)}
/>
```

### State Management

```typescript
// Multimodal state
const [isRecording, setIsRecording] = useState(false);
const [attachedImages, setAttachedImages] = useState<File[]>([]);
const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

// Knowledge Base state
const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([]);

// System Prompt state
const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPTS[agentId]);

// Telegram state
const [telegramConnected, setTelegramConnected] = useState(false);
const [telegramBotUsername, setTelegramBotUsername] = useState<string>();
const [telegramBotToken, setTelegramBotToken] = useState<string>();

// UI state
const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
const [showSystemPrompt, setShowSystemPrompt] = useState(false);
const [showTelegram, setShowTelegram] = useState(false);
```

---

## 🎨 UI/UX

### Структура інтерфейсу

```
┌─────────────────────────────────────────┐
│  [Chat Header]                      [X] │
│  Оркестратор мікроДАО - Helion          │
├─────────────────────────────────────────┤
│                                         │
│  [Messages Area]                        │
│  - User messages (right, purple)        │
│  - Agent messages (left, white)         │
│  - Loading spinner                      │
│                                         │
├─────────────────────────────────────────┤
│  [Multimodal Input]                     │
│  🎤 🖼️ 📎 🌐 [Text Input]        [Send] │
│  - Voice, Images, Files, Web Search     │
└─────────────────────────────────────────┘

▼ База знань агента
┌─────────────────────────────────────────┐
│  📊 База знань - Helion                 │
│  [Завантажити файл]                     │
├─────────────────────────────────────────┤
│  📄 document.pdf (2.5 MB)               │
│     ✅ Векторна БД  ✅ Графова БД       │
│  📄 guide.md (150 KB)                   │
│     ⏳ Обробка...                       │
└─────────────────────────────────────────┘

▼ Системний промпт агента
┌─────────────────────────────────────────┐
│  ⚙️ Системний промпт - Helion           │
│  [Редагувати]  [Скинути]                │
├─────────────────────────────────────────┤
│  Ти - Helion, AI-агент...               │
│  [Системний промпт відображається тут]  │
└─────────────────────────────────────────┘

▼ Інтеграція з Telegram
┌─────────────────────────────────────────┐
│  💬 Telegram інтеграція - Helion        │
│  ✅ Підключено                          │
├─────────────────────────────────────────┤
│  Ім'я бота: @helion_bot                 │
│  Підключено: 23.11.2025 10:00           │
│  [Відкрити бота]  [Копіювати посилання] │
│  [Від'єднати бота]                      │
└─────────────────────────────────────────┘
```

### Collapsible секції

Кожна секція може бути згорнута/розгорнута:

```tsx
<button
  onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
  className="w-full flex items-center justify-between..."
>
  <span>База знань агента</span>
  {showKnowledgeBase ? <ChevronUp /> : <ChevronDown />}
</button>

{showKnowledgeBase && <KnowledgeBase {...props} />}
```

---

## 🔌 API інтеграція

### Router endpoints

```typescript
// Чат з агентом
POST /route
{
  "agent": "helion",
  "message": "Привіт!",
  "mode": "chat",
  "payload": {
    "context": {
      "system_prompt": "...",
      "images": ["base64..."],
      "files": ["filename.pdf"]
    }
  }
}

// Веб-пошук
POST /route
{
  "agent": "helion",
  "message": "Пошук...",
  "mode": "web_search",
  "payload": {
    "search_query": "renewable energy",
    "max_results": 5
  }
}
```

### Backend API (майбутнє)

```typescript
// База знань
POST   /api/knowledge/upload
GET    /api/knowledge/{agent_id}/files
DELETE /api/knowledge/{agent_id}/files/{file_id}
POST   /api/knowledge/{agent_id}/files/{file_id}/reindex
GET    /api/knowledge/{agent_id}/stats
POST   /api/knowledge/{agent_id}/search

// Системний промпт
GET    /api/agents/{agent_id}/system_prompt
PUT    /api/agents/{agent_id}/system_prompt
POST   /api/agents/{agent_id}/system_prompt/reset

// Telegram
POST   /api/telegram/{agent_id}/connect
DELETE /api/telegram/{agent_id}/disconnect
GET    /api/telegram/{agent_id}/status
PUT    /api/telegram/{agent_id}/token
```

---

## 📦 Залежності

### Існуючі
- React 18
- TypeScript
- Tailwind CSS
- lucide-react (іконки)
- @tanstack/react-query

### Браузерні API
- Web Speech API (голосовий ввід)
- SpeechSynthesis API (Text-to-Speech)
- FileReader API (читання файлів)
- Drag & Drop API

---

## 🚀 Використання

### 1. Базовий чат з мультимодальністю

```tsx
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

function MyPage() {
  return (
    <MicroDaoOrchestratorChatEnhanced
      orchestratorAgentId="helion"
      onClose={() => console.log('Chat closed')}
    />
  );
}
```

### 2. З оркестратором

```tsx
const orchestrator = {
  id: 'helion',
  name: 'Helion Energy Union',
  description: 'AI-агент для Energy Union',
  avatar: '/avatars/helion.png',
};

<MicroDaoOrchestratorChatEnhanced
  orchestrator={orchestrator}
/>
```

### 3. Інтеграція у сторінку кабінету

```tsx
// src/pages/MicroDaoCabinetPage.tsx
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';

export function MicroDaoCabinetPage() {
  const [showChat, setShowChat] = useState(true);
  
  return (
    <div className="container mx-auto p-6">
      {/* Інший контент сторінки */}
      
      {showChat && (
        <div className="fixed bottom-4 right-4 w-[500px] z-50">
          <MicroDaoOrchestratorChatEnhanced
            orchestratorAgentId={microDao.orchestrator_agent_id}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 🔮 Майбутні покращення

### 1. Voice Output (TTS)
```typescript
// Автоматичне промовляння відповідей агента
const handleAssistantMessage = (message: string) => {
  voiceService.speak(message, 'uk-UA');
};
```

### 2. Image Recognition
```typescript
// Розпізнавання об'єктів на зображеннях
const analyzeImage = async (image: File) => {
  const response = await fetch(`${routerUrl}/route`, {
    method: 'POST',
    body: JSON.stringify({
      agent: agentId,
      mode: 'vision',
      payload: { image: await fileToBase64(image) },
    }),
  });
  return await response.json();
};
```

### 3. Real-time Collaboration
```typescript
// WebSocket для синхронізації між користувачами
const ws = new WebSocket('ws://api/agents/helion/chat');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  setMessages((prev) => [...prev, message]);
};
```

### 4. Context Memory
```typescript
// Збереження історії чату
const saveConversation = async () => {
  await fetch(`${apiUrl}/api/conversations`, {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agentId,
      messages: messages,
      metadata: { knowledgeFiles, systemPrompt },
    }),
  });
};
```

---

## ✅ Чекліст функцій

### Мультимодальність
- ✅ Голосовий ввід (Speech-to-Text)
- ✅ Завантаження зображень
- ✅ Завантаження файлів
- ✅ Веб-пошук
- ⏳ Голосовий вивід (Text-to-Speech) - планується
- ⏳ Розпізнавання зображень - планується

### База знань
- ✅ Завантаження файлів
- ✅ Drag & drop
- ✅ Статуси індексації
- ✅ Векторна БД індикатор
- ✅ Графова БД індикатор
- ✅ Видалення файлів
- ✅ Повторна індексація
- ✅ Статистика
- ⏳ Backend API - потрібна реалізація

### Системний промпт
- ✅ Відображення промпту
- ✅ Редагування
- ✅ Збереження
- ✅ Скидання до значення за замовчуванням
- ⏳ Backend збереження - потрібна реалізація

### Telegram
- ✅ Підключення бота
- ✅ Статус підключення
- ✅ Відображення інформації про бота
- ✅ Від'єднання
- ✅ Інструкції
- ⏳ Backend інтеграція - потрібна реалізація

---

## 📝 Висновок

Створено повнофункціональну систему розширеного чату з оркестраторами мікроДАО, яка включає:

1. **4 нових компоненти** (MultimodalInput, KnowledgeBase, SystemPromptEditor, TelegramIntegration)
2. **3 нових сервіси** (voiceService, webSearchService, knowledgeBaseService)
3. **1 головний компонент** (MicroDaoOrchestratorChatEnhanced)

Всі компоненти повністю типізовані, мають модульну структуру та можуть бути легко інтегровані у існуючі сторінки.

**Статус:** ✅ Frontend реалізовано, очікує Backend API інтеграції





