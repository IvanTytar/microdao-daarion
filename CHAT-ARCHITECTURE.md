# Архітектура розширеного чату

**Дата:** 2025-11-23

---

## 🏗️ Структура компонентів

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  MicroDaoOrchestratorChatEnhanced (Головний компонент)       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────┐       │ │
│  │  │  Chat Header                                 │       │ │
│  │  │  👑 Оркестратор мікроДАО - [Agent Name]      │       │ │
│  │  └──────────────────────────────────────────────┘       │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────┐       │ │
│  │  │  Messages Area                               │       │ │
│  │  │                                              │       │ │
│  │  │  👤 User: Привіт!                            │       │ │
│  │  │  🤖 Agent: Вітаю! Чим можу допомогти?        │       │ │
│  │  │  👤 User: [Image] Що це?                     │       │ │
│  │  │  🤖 Agent: Це сонячна панель...              │       │ │
│  │  │  💭 Loading...                               │       │ │
│  │  │                                              │       │ │
│  │  └──────────────────────────────────────────────┘       │ │
│  │                                                           │ │
│  │  ┌──────────────────────────────────────────────┐       │ │
│  │  │  MultimodalInput                             │       │ │
│  │  │  ┌────┬────┬────┬────┐                       │       │ │
│  │  │  │ 🎤 │ 🖼️ │ 📎 │ 🌐 │ [Text Input] [Send]  │       │ │
│  │  │  └────┴────┴────┴────┘                       │       │ │
│  │  │  Голос Фото Файл Веб                         │       │ │
│  │  └──────────────────────────────────────────────┘       │ │
│  │                                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                            ▼ Згорнути/Розгорнути

┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  KnowledgeBase (База знань агента)                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  📊 База знань - [Agent Name]    [Завантажити файл]    │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │                                                           │ │
│  │  📄 energy-guide.pdf (2.5 MB)        [🗑️]               │ │
│  │     ✅ Векторна БД  ✅ Графова БД                        │ │
│  │     Status: Completed                                    │ │
│  │                                                           │ │
│  │  📄 solar-panels.docx (150 KB)       [🗑️]               │ │
│  │     ⏳ Векторна БД  ⏳ Графова БД                        │ │
│  │     Status: Vectorized                                   │ │
│  │                                                           │ │
│  │  ───────────────────────────────────────────────────    │ │
│  │  Статистика:                                             │ │
│  │  Всього: 2  |  Векторизовано: 2  |  У графі: 1          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                            ▼ Згорнути/Розгорнути

┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  SystemPromptEditor (Системний промпт)                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ⚙️ Системний промпт - [Agent Name]  [Редагувати] [🔄]  │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │                                                           │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │ Ти - Helion, AI-агент платформи Energy Union.     │  │ │
│  │  │ Допомагай користувачам з технологіями             │  │ │
│  │  │ EcoMiner/BioMiner, токеномікою та DAO governance. │  │ │
│  │  │                                                    │  │ │
│  │  │ Твої основні функції:                             │  │ │
│  │  │ - Консультації з енергетичними технологіями       │  │ │
│  │  │ - Пояснення токеноміки Energy Union               │  │ │
│  │  │ - Допомога з onboarding в DAO                     │  │ │
│  │  │ ...                                               │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  345 символів                                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

                            ▼ Згорнути/Розгорнути

┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  TelegramIntegration (Telegram інтеграція)                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  💬 Telegram інтеграція - [Agent Name]  ✅ Підключено  │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │                                                           │ │
│  │  ┌───────────────────────────────────────────────────┐  │ │
│  │  │  Ім'я бота: @helion_bot                           │  │ │
│  │  │  Підключено: 23.11.2025 10:00                     │  │ │
│  │  │                                                    │  │ │
│  │  │  [Відкрити бота]  [Копіювати посилання]           │  │ │
│  │  │                                                    │  │ │
│  │  │  Токен: 1234567890:ABCdef...ghij                  │  │ │
│  │  └───────────────────────────────────────────────────┘  │ │
│  │                                                           │ │
│  │  [Від'єднати бота]                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ (Input: text/voice/image/file)
       ▼
┌─────────────────────────┐
│  MultimodalInput        │
│  - Voice → STT          │
│  - Image → Base64       │
│  - File → FormData      │
│  - Text → String        │
└──────────┬──────────────┘
           │
           │ (message + context)
           ▼
┌──────────────────────────────┐
│  MicroDaoOrchestrator        │
│  ChatEnhanced                │
│  - Add user message          │
│  - Prepare payload           │
│  - Call Router API           │
└──────────┬───────────────────┘
           │
           │ POST /route
           ▼
┌──────────────────────────────┐
│  Router (NODE1)              │
│  - Match agent rule          │
│  - Load system_prompt        │
│  - Call LLM (qwen3:8b)       │
└──────────┬───────────────────┘
           │
           │ Response
           ▼
┌──────────────────────────────┐
│  MicroDaoOrchestrator        │
│  ChatEnhanced                │
│  - Parse response            │
│  - Add assistant message     │
│  - Update UI                 │
└──────────┬───────────────────┘
           │
           │ (display message)
           ▼
┌─────────────┐
│   User      │
└─────────────┘
```

---

## 🗂️ Component Hierarchy

```
MicroDaoOrchestratorChatEnhanced
├── State Management
│   ├── messages: ChatMessage[]
│   ├── input: string
│   ├── attachedImages: File[]
│   ├── attachedFiles: File[]
│   ├── knowledgeFiles: KnowledgeFile[]
│   ├── systemPrompt: string
│   ├── telegramConnected: boolean
│   └── UI states (show/hide sections)
│
├── Main Chat Window
│   ├── Header (Crown icon, agent name, close button)
│   ├── Messages Area
│   │   ├── User messages (right, purple)
│   │   ├── Agent messages (left, white)
│   │   ├── Images preview
│   │   ├── Attachments list
│   │   └── Loading spinner
│   └── MultimodalInput
│       ├── Voice button (🎤)
│       ├── Image button (🖼️)
│       ├── File button (📎)
│       ├── Web search button (🌐)
│       ├── Text input (textarea)
│       └── Send button
│
├── KnowledgeBase (collapsible)
│   ├── Header (title, upload button)
│   ├── Upload Area (drag & drop)
│   ├── Files List
│   │   ├── File item
│   │   │   ├── Name, size, status
│   │   │   ├── Vector DB indicator
│   │   │   ├── Graph DB indicator
│   │   │   └── Actions (reindex, delete)
│   │   └── ...
│   └── Statistics (total, vectorized, graphed)
│
├── SystemPromptEditor (collapsible)
│   ├── Header (title, edit/save buttons, reset)
│   ├── Display mode
│   │   └── Read-only prompt text
│   ├── Edit mode
│   │   └── Textarea with prompt
│   └── Character count
│
└── TelegramIntegration (collapsible)
    ├── Header (title, status indicator)
    ├── Connected state
    │   ├── Bot info (username, date)
    │   ├── Bot token (masked)
    │   ├── Actions (open bot, copy link)
    │   └── Disconnect button
    └── Disconnected state
        ├── Instructions
        ├── Token input
        └── Connect button
```

---

## 🔌 Services Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Frontend Layer                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  MicroDaoOrchestratorChatEnhanced                  │  │
│  │  - Manages UI state                                │  │
│  │  - Handles user interactions                       │  │
│  │  - Orchestrates services                           │  │
│  └────────┬──────────────┬──────────────┬──────────────┘  │
│           │              │              │                  │
└───────────┼──────────────┼──────────────┼─────────────────┘
            │              │              │
            ▼              ▼              ▼
┌───────────────┐ ┌──────────────┐ ┌─────────────────┐
│ voiceService  │ │ webSearch    │ │ knowledgeBase   │
│               │ │ Service      │ │ Service         │
├───────────────┤ ├──────────────┤ ├─────────────────┤
│ - startRec()  │ │ - search()   │ │ - uploadFile()  │
│ - stopRec()   │ │ - format()   │ │ - getFiles()    │
│ - speak()     │ │ - extract()  │ │ - deleteFile()  │
│ - stopSpeak() │ │              │ │ - reindex()     │
└───────┬───────┘ └──────┬───────┘ └────────┬────────┘
        │                │                   │
        ▼                ▼                   ▼
┌───────────────┐ ┌──────────────┐ ┌─────────────────┐
│ Web Speech    │ │ Router API   │ │ Backend API     │
│ API           │ │ (NODE1)      │ │ (NODE1)         │
├───────────────┤ ├──────────────┤ ├─────────────────┤
│ - STT         │ │ POST /route  │ │ Knowledge Base  │
│ - TTS         │ │ mode: web    │ │ System Prompt   │
│               │ │ search       │ │ Telegram        │
└───────────────┘ └──────────────┘ └─────────────────┘
```

---

## 🌊 Message Flow Example

### 1. User sends voice message

```
User: [Press 🎤]
  ↓
MultimodalInput:
  - voiceService.startRecording()
  - Show "Recording..." indicator
  ↓
User: [Speaks] "Привіт, ти хто?"
  ↓
Web Speech API:
  - Converts speech to text
  - Returns: "Привіт, ти хто?"
  ↓
MultimodalInput:
  - Sets input value
  - User clicks Send
  ↓
MicroDaoOrchestratorChatEnhanced:
  - Creates user message
  - Adds to messages state
  - Calls sendMessageMutation.mutate()
  ↓
API Call:
  POST http://144.76.224.179:9102/route
  {
    "agent": "helion",
    "message": "Привіт, ти хто?",
    "mode": "chat",
    "payload": {
      "context": {
        "system_prompt": "Ти - Helion..."
      }
    }
  }
  ↓
Router (NODE1):
  - Matches rule: helion_agent
  - Uses LLM: local_qwen3_8b
  - Calls Ollama API
  - Generates response
  ↓
Response:
  {
    "ok": true,
    "data": {
      "text": "Привіт! Я - Helion, AI-агент..."
    }
  }
  ↓
MicroDaoOrchestratorChatEnhanced:
  - Parses response
  - Creates assistant message
  - Adds to messages state
  - UI updates automatically
  ↓
User: [Sees response in chat]
```

---

### 2. User uploads image

```
User: [Clicks 🖼️]
  ↓
MultimodalInput:
  - Opens file picker
  ↓
User: [Selects image.jpg]
  ↓
MultimodalInput:
  - Calls onImageUpload(file)
  - Adds to attachedImages
  - Shows preview
  ↓
User: [Types] "Що це?"
  ↓
User: [Clicks Send]
  ↓
MicroDaoOrchestratorChatEnhanced:
  - Creates user message with image
  - Converts image to base64
  - Calls API with image data
  ↓
API Call:
  POST /route
  {
    "agent": "helion",
    "message": "Що це?",
    "payload": {
      "context": {
        "system_prompt": "...",
        "images": ["data:image/jpeg;base64,/9j/4AAQ..."]
      }
    }
  }
  ↓
Router → LLM:
  - Processes image (if vision model)
  - Generates response
  ↓
User: [Sees response about the image]
```

---

### 3. User uploads file to knowledge base

```
User: [Opens KnowledgeBase section]
  ↓
User: [Drags document.pdf]
  ↓
KnowledgeBase:
  - Validates file (size, type)
  - Calls onUpload(file)
  ↓
MicroDaoOrchestratorChatEnhanced:
  - Creates KnowledgeFile object
  - Status: pending
  - Adds to knowledgeFiles state
  ↓
knowledgeBaseService:
  - uploadFile(agentId, file)
  ↓
API Call:
  POST /api/knowledge/upload
  FormData: {file, agent_id}
  ↓
Backend:
  - Saves file
  - Starts vectorization
  - Returns file_id
  ↓
Background Processing:
  1. Extract text from PDF
  2. Create chunks
  3. Generate embeddings
  4. Store in Vector DB ✅
  5. Extract entities
  6. Create relationships
  7. Store in Graph DB ✅
  ↓
Status Updates:
  pending → vectorized → graphed → completed
  ↓
UI Updates:
  - Shows progress
  - Updates indicators
  - Shows ✅ when done
```

---

## 💾 State Management

```typescript
// Main component state
interface ChatState {
  // Messages
  messages: ChatMessage[];
  input: string;
  
  // Multimodal
  isRecording: boolean;
  attachedImages: File[];
  attachedFiles: File[];
  
  // Knowledge Base
  knowledgeFiles: KnowledgeFile[];
  
  // System Prompt
  systemPrompt: string;
  
  // Telegram
  telegramConnected: boolean;
  telegramBotUsername?: string;
  telegramBotToken?: string;
  
  // UI
  showKnowledgeBase: boolean;
  showSystemPrompt: boolean;
  showTelegram: boolean;
}

// React Query state
const sendMessageMutation = useMutation({
  mutationFn: async (message: string) => {...},
  onSuccess: (data) => {...},
  onError: (error) => {...},
});
```

---

## 🎨 Styling System

```
Tailwind CSS Classes Structure:

Main Container:
  - bg-white rounded-lg shadow-lg border

Headers:
  - bg-gradient-to-r from-[color]-600 to-[color]-700
  - Colors: purple (main), indigo (KB), amber (prompt), blue (telegram)

Buttons:
  - Primary: bg-purple-600 hover:bg-purple-700
  - Secondary: bg-gray-100 hover:bg-gray-200
  - Success: bg-green-600 hover:bg-green-700
  - Danger: bg-red-600 hover:bg-red-700

Messages:
  - User: bg-purple-600 text-white (right aligned)
  - Agent: bg-white border text-gray-800 (left aligned)

Status Indicators:
  - Pending: text-yellow-500
  - Success: text-green-600
  - Error: text-red-500
  - Info: text-blue-600

Icons: lucide-react
  - 24px (h-6 w-6) for headers
  - 20px (h-5 w-5) for buttons
  - 16px (h-4 w-4) for inline icons
```

---

## 📦 File Structure Summary

```
Total Files Created: 12

Components (6):
  ✅ MicroDaoOrchestratorChatEnhanced.tsx     (450+ lines)
  ✅ MicroDaoOrchestratorChatWrapper.tsx      (50+ lines)
  ✅ chat/MultimodalInput.tsx                 (250+ lines)
  ✅ chat/KnowledgeBase.tsx                   (300+ lines)
  ✅ chat/SystemPromptEditor.tsx              (200+ lines)
  ✅ chat/TelegramIntegration.tsx             (250+ lines)

Services (3):
  ✅ voiceService.ts                          (150+ lines)
  ✅ webSearchService.ts                      (100+ lines)
  ✅ knowledgeBaseService.ts                  (200+ lines)

Index Files (2):
  ✅ chat/index.ts                            (5 lines)
  ✅ services/index.ts                        (5 lines)

Documentation (5):
  ✅ ORCHESTRATOR-CHAT-ENHANCED.md            (800+ lines)
  ✅ INTEGRATION-EXAMPLE.md                   (500+ lines)
  ✅ ENHANCED-CHAT-SUMMARY.md                 (600+ lines)
  ✅ CHAT-ARCHITECTURE.md                     (400+ lines)
  ✅ CHAT-MESSAGE-FIX.md                      (200+ lines)

Total Lines of Code: ~4000+
```

---

## 🚀 Quick Reference

### Import Component
```tsx
import { MicroDaoOrchestratorChatEnhanced } from '@/components/microdao/MicroDaoOrchestratorChatEnhanced';
```

### Basic Usage
```tsx
<MicroDaoOrchestratorChatEnhanced
  orchestratorAgentId="helion"
  onClose={() => setShowChat(false)}
/>
```

### With Services
```tsx
import { voiceService, webSearchService, knowledgeBaseService } from '@/services';

// Voice
voiceService.startRecording(onResult, onError);
voiceService.speak("Привіт!");

// Web Search
const results = await webSearchService.search("query", "helion");

// Knowledge Base
await knowledgeBaseService.uploadFile("helion", file);
```

---

## 🎯 Key Features Matrix

| Feature | Component | Service | Status |
|---------|-----------|---------|--------|
| Text Chat | Main | - | ✅ |
| Voice Input | MultimodalInput | voiceService | ✅ |
| Voice Output | - | voiceService | ⏳ |
| Image Upload | MultimodalInput | - | ✅ |
| Image Recognition | - | Router API | ⏳ |
| File Upload | MultimodalInput | - | ✅ |
| Web Search | MultimodalInput | webSearchService | ✅ |
| Knowledge Base | KnowledgeBase | knowledgeBaseService | ✅ Frontend |
| System Prompt | SystemPromptEditor | - | ✅ Frontend |
| Telegram | TelegramIntegration | - | ✅ Frontend |

✅ = Готово  
⏳ = Потрібна Backend реалізація

---

## 🔗 Related Documentation

- 📄 **ORCHESTRATOR-CHAT-ENHANCED.md** - Детальна документація
- 📄 **INTEGRATION-EXAMPLE.md** - Приклади використання
- 📄 **ENHANCED-CHAT-SUMMARY.md** - Підсумок виконаної роботи
- 📄 **CHAT-MESSAGE-FIX.md** - Виправлення bug
- 📄 **TIMEOUT-FIX.md** - Оптимізація таймаутів

---

**Дата створення:** 2025-11-23  
**Статус:** ✅ Production Ready (Frontend)





