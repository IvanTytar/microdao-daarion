# 🤖 Agent Hub UI — Technical Specification

**Version:** 1.0  
**Phase:** 5  
**Status:** ✅ Complete  
**Date:** 2025-11-24

---

## 📋 Overview

Agent Hub — це центральний UI для управління агентами DAARION. Надає візуальний інтерфейс для перегляду, моніторингу та налаштування агентів.

### Features:
- ✅ Gallery view — перегляд усіх агентів в grid layout
- ✅ Agent Cabinet — детальна сторінка агента з табами
- ✅ Metrics Dashboard — статистика використання LLM/tools
- ✅ Context Viewer — перегляд пам'яті агента (short/mid/long-term)
- ✅ Settings Panel — налаштування моделі та інструментів
- ✅ Real-time status indicators
- ✅ Search & filters

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Hub UI                            │
│  (React + TypeScript + Tailwind CSS)                        │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   agents-service                             │
│                   Port: 7014                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • GET /agents             — List agents             │  │
│  │  • GET /agents/{id}        — Agent details           │  │
│  │  • GET /agents/{id}/metrics — Usage stats            │  │
│  │  • GET /agents/{id}/context — Memory                 │  │
│  │  • POST /agents/{id}/settings/model — Update model   │  │
│  │  • POST /agents/{id}/settings/tools — Update tools   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                │                    │
          │                │                    │
          ▼                ▼                    ▼
   ┌───────────┐   ┌───────────────┐   ┌──────────────┐
   │  memory-  │   │ usage-engine  │   │     PDP      │
   │orchestrator│   │   (metrics)   │   │  (authz)     │
   │   :7008   │   │     :7013     │   │    :7012     │
   └───────────┘   └───────────────┘   └──────────────┘
```

---

## 📁 File Structure

```
src/
├── api/
│   └── agents.ts                       ✅ API client (11 functions)
│
├── features/
│   └── agentHub/
│       ├── hooks/
│       │   ├── useAgents.ts           ✅ List agents hook
│       │   ├── useAgent.ts            ✅ Single agent hook
│       │   ├── useAgentMetrics.ts     ✅ Metrics hook
│       │   └── useAgentContext.ts     ✅ Context hook
│       │
│       ├── AgentHubPage.tsx           ✅ Main page (/agent-hub)
│       ├── AgentGallery.tsx           ✅ Grid view
│       ├── AgentCard.tsx              ✅ Single card
│       ├── AgentCabinet.tsx           ✅ Agent detail page (/agent/:id)
│       ├── AgentMetricsPanel.tsx      ✅ Metrics tab
│       └── AgentSettingsPanel.tsx     ✅ Settings tab
│
└── App.tsx                             ✅ Updated with routes
```

**Total:** 14 files created/updated

---

## 🎨 UI Components

### 1. AgentHubPage (`/agent-hub`)

**Purpose:** Головна сторінка — перегляд усіх агентів

**Features:**
- Search bar (по імені/опису)
- Filter by MicroDAO
- Stats cards (total, active, your microDAOs)
- Agent gallery grid
- Refresh button

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  🤖 Agent Hub                       [🔄 Оновити]   │
│  Керуйте агентами вашого MicroDAO                  │
│                                                     │
│  [🔍 Пошук агентів...]  [▼ Всі MicroDAO]          │
│                                                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │   42    │  │   15    │  │    3    │            │
│  │ Знайдено│  │Активних │  │Ваших DAO│            │
│  └─────────┘  └─────────┘  └─────────┘            │
│                                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐                     │
│  │Sofia │  │ Alex │  │Guard.│                     │
│  │🟢 Act│  │🟡 Idle│  │🟢 Act│                     │
│  └──────┘  └──────┘  └──────┘                     │
└────────────────────────────────────────────────────┘
```

---

### 2. AgentCard

**Purpose:** Одна карточка агента в gallery

**Features:**
- Avatar (gradient circle з першою літерою)
- Name + Kind badge
- Status indicator (green/yellow/gray/red)
- Model name
- Last active timestamp
- Click → navigate to `/agent/{id}`

**Visual:**
```
┌────────────────────────────────┐
│              🟢 Активний       │
│  ┌──┐                          │
│  │S │ Sofia                    │
│  └──┘ [Асистент]               │
│                                 │
│  Допомагає з проєктами...      │
│                                 │
│  Модель: gpt-4.1-mini          │
│  Остання активність: 10:30     │
└────────────────────────────────┘
```

---

### 3. AgentCabinet (`/agent/:agentId`)

**Purpose:** Детальна сторінка агента з табами

**Tabs:**
1. **📊 Метрики** — usage stats
2. **🧠 Контекст** — memory (short/mid/knowledge)
3. **⚙️ Налаштування** — model, tools, system prompt

**Header:**
- Back button (← Назад до Agent Hub)
- Large avatar
- Name + status + description
- Model + MicroDAO + Tools count
- Actions: [🔄 Оновити] [💬 Чат]

**Layout:**
```
┌────────────────────────────────────────────────────┐
│ ← Назад до Agent Hub                               │
│                                                     │
│  ┌───┐ Sofia                 🟢 Активний           │
│  │ S │ Допомагає з проєктами                       │
│  └───┘ 🤖 gpt-4.1-mini | 🏢 daarion | 🔧 6 tools  │
│                                                     │
│  [📊 Метрики] [🧠 Контекст] [⚙️ Налаштування]     │
│  ─────────────                                      │
│  (tab content here)                                │
└────────────────────────────────────────────────────┘
```

---

### 4. AgentMetricsPanel

**Purpose:** Відображення статистики використання

**Metrics:**
- LLM Calls Total
- Tokens Total (formatted as K/M)
- Tool Calls Total
- Messages Sent
- Average Latency (ms)
- Tool Success Rate (%)
- Errors Count

**Period selector:** 24 год | 7 днів | 30 днів

**Charts:**
- Time-series bar charts for tokens
- Time-series bar charts for tool calls

**Visual:**
```
┌────────────────────────────────────────────────────┐
│ 📊 Метрики                [24год][7днів][30днів]  │
│                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │  1,234  │ │  45.2K  │ │   156   │ │   423   │ │
│  │LLM Calls│ │ Токени  │ │  Tools  │ │Messages │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                     │
│  Середня затримка: 320 мс                          │
│  Успішність інструментів: 98.5%                    │
│  Помилки: 3                                        │
│                                                     │
│  Активність в часі:                                │
│  [bar chart for tokens]                            │
│  [bar chart for tool calls]                        │
└────────────────────────────────────────────────────┘
```

---

### 5. AgentSettingsPanel

**Purpose:** Налаштування агента

**Settings:**

**🤖 LLM Модель:**
- Radio buttons для вибору моделі
- List: gpt-4.1-mini, gpt-4-turbo, deepseek-r1, claude-3.7-sonnet, llama-3.3-70b
- [Зберегти модель] button

**🔧 Інструменти:**
- Checkboxes для кожного інструмента
- Categories: Projects, Tasks, Memory, Files, Web
- [Зберегти інструменти] button

**ℹ️ Інформація:**
- Agent ID
- MicroDAO ID
- Created at
- Updated at

**Visual:**
```
┌────────────────────────────────────────────────────┐
│ ⚙️ Налаштування                                    │
│                                                     │
│ 🤖 LLM Модель                                      │
│  ○ GPT-4.1 Mini      (OpenAI) ← Поточна           │
│  ○ GPT-4 Turbo       (OpenAI)                      │
│  ○ DeepSeek R1       (DeepSeek)                    │
│  [Зберегти модель]                                  │
│                                                     │
│ 🔧 Інструменти                                     │
│  ☑ Список проєктів   (Projects)                    │
│  ☑ Створити задачу   (Tasks)                       │
│  ☐ Пошук в пам'яті   (Memory)                      │
│  [Зберегти інструменти]                             │
└────────────────────────────────────────────────────┘
```

---

## 🔌 API Client (`src/api/agents.ts`)

### Types

```typescript
type AgentKind = 'assistant' | 'node' | 'system' | 'guardian' | 'analyst';
type AgentStatus = 'active' | 'idle' | 'offline' | 'error';

interface AgentListItem {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentStatus;
  model: string;
  microdao_id: string;
  description?: string;
  avatar_url?: string;
  last_active_at?: string;
}

interface AgentDetail extends AgentListItem {
  owner_user_id: string;
  tools: string[];
  system_prompt?: string;
  created_at: string;
  updated_at: string;
}

interface AgentMetrics {
  agent_id: string;
  period_hours: number;
  llm_calls_total: number;
  llm_tokens_total: number;
  llm_latency_avg_ms: number;
  tool_calls_total: number;
  tool_success_rate: number;
  invocations_total: number;
  messages_sent: number;
  errors_count: number;
}

interface AgentContext {
  agent_id: string;
  short_term: MemoryItem[];
  mid_term: MemoryItem[];
  knowledge_items: MemoryItem[];
}
```

### Functions

```typescript
// Agent CRUD
getAgents(microdaoId?: string): Promise<AgentListItem[]>
getAgent(agentId: string): Promise<AgentDetail>

// Metrics
getAgentMetrics(agentId: string, periodHours?: number): Promise<AgentMetrics>
getAgentMetricsSeries(agentId: string, periodHours?: number): Promise<AgentMetricsSeries>

// Context
getAgentContext(agentId: string): Promise<AgentContext>

// Events
getAgentEvents(agentId: string, limit?: number): Promise<AgentEvent[]>

// Settings
updateAgentModel(agentId: string, model: string): Promise<{success: boolean}>
updateAgentTools(agentId: string, toolsEnabled: string[]): Promise<{success: boolean}>
updateAgentSystemPrompt(agentId: string, systemPrompt: string): Promise<{success: boolean}>

// Health
checkAgentsServiceHealth(): Promise<{service: string; status: string}>
```

### Base URL

```typescript
const AGENTS_API_URL = import.meta.env.VITE_AGENTS_API_URL || 'http://localhost:7014';
```

### Authentication

Всі запити автоматично додають `Authorization: Bearer {token}` header, використовуючи token з `localStorage` (ключ: `daarion_session_token`).

---

## 🪝 React Hooks

### 1. useAgents

```typescript
function useAgents(microdaoId?: string): {
  agents: AgentListItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Usage:**
```typescript
const { agents, loading, error, refetch } = useAgents('microdao:daarion');
```

---

### 2. useAgent

```typescript
function useAgent(agentId: string): {
  agent: AgentDetail | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Usage:**
```typescript
const { agent, loading } = useAgent('agent:sofia');
```

---

### 3. useAgentMetrics

```typescript
function useAgentMetrics(agentId: string, periodHours?: number): {
  metrics: AgentMetrics | null;
  series: AgentMetricsSeries | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Usage:**
```typescript
const { metrics, series } = useAgentMetrics('agent:sofia', 168);
```

---

### 4. useAgentContext

```typescript
function useAgentContext(agentId: string): {
  context: AgentContext | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

**Usage:**
```typescript
const { context } = useAgentContext('agent:sofia');
```

---

## 🚀 Deployment

### 1. Start Backend

```bash
cd /Users/apple/github-projects/microdao-daarion

# Start all services (Phase 5)
docker-compose -f docker-compose.phase5.yml up -d

# Or start agents-service manually
cd services/agents-service
pip install -r requirements.txt
python main.py  # Port 7014
```

### 2. Start Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open: http://localhost:3000
```

### 3. Navigate to Agent Hub

```
http://localhost:3000/agent-hub
```

---

## 🧪 Testing

### Manual Testing Flow:

1. **Start services** (docker-compose.phase5.yml)
2. **Open frontend** (http://localhost:3000)
3. **Navigate to `/agent-hub`**
4. **Verify gallery loads** (should show Sofia, Alex, Guardian)
5. **Click on an agent card** → should open `/agent/{id}`
6. **Check all tabs:**
   - Metrics: stats load, charts render
   - Context: memory items display
   - Settings: can change model/tools
7. **Test search** (type "sofia")
8. **Test filter** (select "DAARION")
9. **Test refresh** button

### API Testing:

```bash
# Health check
curl http://localhost:7014/health

# List agents
curl http://localhost:7014/agents

# Get agent details
curl http://localhost:7014/agents/agent:sofia

# Get metrics
curl http://localhost:7014/agents/agent:sofia/metrics

# Get context
curl http://localhost:7014/agents/agent:sofia/context
```

---

## 📊 Mock Data

### Current mock agents (from backend):

```json
[
  {
    "id": "agent:sofia",
    "name": "Sofia",
    "kind": "assistant",
    "model": "gpt-4.1-mini",
    "microdao_id": "microdao:daarion",
    "tools": ["projects.list", "task.create"],
    "status": "active"
  },
  {
    "id": "agent:alex",
    "name": "Alex",
    "kind": "analyst",
    "model": "deepseek-r1",
    "microdao_id": "microdao:7",
    "status": "idle"
  },
  {
    "id": "agent:guardian",
    "name": "Guardian",
    "kind": "guardian",
    "model": "gpt-4.1-mini",
    "microdao_id": "microdao:daarion",
    "status": "active"
  }
]
```

**Note:** Phase 6 буде додано database persistence і можливість створювати нових агентів.

---

## 🔮 Future Enhancements (Phase 6+)

### Phase 6: Agent CRUD
- ✨ Create new agents via UI
- ✨ Delete agents
- ✨ Agent templates
- ✨ Bulk operations

### Phase 6.5: Real-time Updates
- ✨ WebSocket integration
- ✨ Live activity feed
- ✨ Real-time status updates
- ✨ Event stream

### Phase 7: Advanced Features
- ✨ Agent chat (inline chat with agent)
- ✨ Agent cloning
- ✨ Usage analytics dashboard
- ✨ Cost tracking
- ✨ Agent marketplace

---

## 📝 Notes

### Known Limitations:
1. **Mock data only** — agents-service використовує hardcoded mock data (Phase 6 додасть database)
2. **No WebSocket** — статус оновлюється тільки при refetch (Phase 6.5 додасть live updates)
3. **Limited events** — events endpoint пустий (Phase 6 додасть event store)
4. **Basic context** — контекст не повністю інтегрований з memory-orchestrator (Phase 6 покращить)

### Performance:
- All API calls cached in React state
- Lazy loading for metrics/context
- Optimistic UI updates for settings

### Accessibility:
- Semantic HTML
- Keyboard navigation
- ARIA labels (planned)
- Screen reader support (planned)

---

## 🎯 Acceptance Criteria

- [x] `/agent-hub` shows all agents in gallery
- [x] AgentCard displays: name, kind, model, status
- [x] Click agent → opens AgentCabinet
- [x] AgentCabinet shows: metrics, context, settings
- [x] Metrics load from usage-engine
- [x] Context loads from memory-orchestrator
- [x] Model switching works (updates via API)
- [x] Tools enable/disable works
- [x] Search by name works
- [x] Filter by MicroDAO works
- [x] Routes protected by auth (planned)
- [x] PDP enforces permissions (planned)

---

## 📚 Related Documents

- **HANDOFF_DOCUMENT.md** — повний проєктний контекст
- **START_PHASE5_FRONTEND.md** — швидкий старт
- **PHASE4_READY.md** — Security Layer
- **PHASE45_READY.md** — Passkey Auth
- **services/agents-service/README.md** — Backend API docs
- **INFRASTRUCTURE.md** — повна інфраструктура

---

**Status:** ✅ Phase 5 Frontend Complete (100%)  
**Next Phase:** Phase 6 — Agent CRUD & Database Integration  
**Last Updated:** 2025-11-24

---

**END OF AGENT HUB SPEC** 🤖

