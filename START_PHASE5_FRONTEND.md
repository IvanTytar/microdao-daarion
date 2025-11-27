# 🚀 START PHASE 5 FRONTEND — QUICK BRIEF

**Copy this to new chat to continue:**

---

Привіт! Продовжую Phase 5 — Agent Hub UI Frontend.

## 📍 ДЕ МИ:

**Project:** DAARION microDAO Platform  
**Path:** `/Users/apple/github-projects/microdao-daarion`  
**Phase:** 5 — Agent Hub UI (30% done)

## ✅ ЩО ГОТОВО:

**Backend (Phase 5):**
- ✅ `services/agents-service/` — Port 7014
  - models.py (agent types, metrics, context)
  - main.py (6 API endpoints)
  - Dockerfile, requirements.txt, README.md

**Previous Phases:**
- ✅ Phase 1-3: Messenger, Agents, LLM Stack
- ✅ Phase 4: Security (auth, PDP, usage)
- ✅ Phase 4.5: Passkey Auth (WebAuthn)

## 🔜 ЩО ТРЕБА ЗРОБИТИ (Frontend):

1. **API Client** (1 file):
   - `src/api/agents.ts`

2. **React Hooks** (4 files):
   - `src/features/agentHub/hooks/useAgents.ts`
   - `src/features/agentHub/hooks/useAgent.ts`
   - `src/features/agentHub/hooks/useAgentMetrics.ts`
   - `src/features/agentHub/hooks/useAgentContext.ts`

3. **Components** (6 files):
   - `src/features/agentHub/AgentHubPage.tsx` (main page)
   - `src/features/agentHub/AgentGallery.tsx` (grid view)
   - `src/features/agentHub/AgentCard.tsx` (single card)
   - `src/features/agentHub/AgentCabinet.tsx` (full view)
   - `src/features/agentHub/AgentMetricsPanel.tsx` (stats)
   - `src/features/agentHub/AgentSettingsPanel.tsx` (edit model/tools)

4. **Routes** (1 update):
   - Add to `src/App.tsx`:
     ```typescript
     <Route path="/agent-hub" element={<RequireAuth><AgentHubPage /></RequireAuth>} />
     <Route path="/agent/:agentId" element={<RequireAuth><AgentCabinet /></RequireAuth>} />
     ```

5. **Docker** (1 update):
   - Add agents-service to docker-compose

6. **Docs** (1 file):
   - `docs/AGENT_HUB_SPEC.md`

**Total:** 14 files/updates

## 🎯 AGENTS SERVICE API:

```bash
Base URL: http://localhost:7014

GET  /agents                          # List all agents
GET  /agents/{agent_id}               # Get agent details
GET  /agents/{agent_id}/metrics       # Get usage stats
GET  /agents/{agent_id}/context       # Get memory
POST /agents/{agent_id}/settings/model  # Update model
POST /agents/{agent_id}/settings/tools  # Update tools
```

## 📦 MOCK AGENTS (in backend):

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

## 🎨 UI REQUIREMENTS:

**AgentHubPage:**
- Header: "Agent Hub"
- Grid of AgentCard components
- Filter by microDAO
- Search by name

**AgentCard:**
- Avatar/icon
- Name + kind badge
- Model name
- Status indicator (active/idle/offline)
- Click → navigate to `/agent/{id}`

**AgentCabinet:**
- Tabs: Metrics | Context | Settings | Chat
- Header: avatar, name, microDAO
- Metrics: LLM calls, tokens, latency (from usage-engine)
- Settings: Model dropdown, Tools checkboxes

## 🔐 AUTH:

**All routes protected with `<RequireAuth>`**

Use session token from authStore:
```typescript
import { useAuthStore } from '@/store/authStore';

const { sessionToken } = useAuthStore();

fetch(url, {
  headers: { 'Authorization': `Bearer ${sessionToken}` }
});
```

## 🚀 КОМАНДА ДЛЯ СТАРТУ:

```
Продовжуй Phase 5 — створи Agent Hub UI Frontend!

Створи всі 14 файлів/оновлень:
1. API client
2. 4 hooks
3. 6 components
4. Routes
5. Docker update
6. Docs

Використовуй Tailwind CSS, TypeScript strict mode, React 18 hooks.

Почни з API client та hooks, потім components!
```

---

**Детальна інформація:** `HANDOFF_DOCUMENT.md` (460 lines)

**Час на виконання:** 3-4 години

**Status:** Ready to code! 🔥

---

## 📝 QUICK REFERENCE:

**Auth Store:**
```typescript
const { sessionToken, actor, isAuthenticated } = useAuth();
```

**RequireAuth:**
```typescript
import { RequireAuth } from '@/components/auth/RequireAuth';
```

**API Base URL:**
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7014';
```

---

**END OF QUICK BRIEF — START CODING!** 🚀




