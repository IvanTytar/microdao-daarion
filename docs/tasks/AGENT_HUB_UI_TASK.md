# TASK: Agent Hub UI — Agent Monitoring & Management Dashboard

**Priority:** High (Parallel to Phase 3)  
**Estimated Time:** 3-4 weeks  
**Dependencies:** Phase 2 complete

---

## Goal

Створити централізований UI для моніторингу та управління агентами в DAARION:
- **Agent Gallery** — список всіх агентів з їх статусами
- **Agent Cabinet** — детальна інформація про агента
- **Real-time monitoring** — активність, метрики, логи
- **Agent Configuration** — налаштування, інструкції, tools
- **Conversational Interface** — прямий чат з агентом

---

## Architecture Overview

```
Agent Hub UI (React)
    ↓
├─ Agent Gallery (список агентів)
├─ Agent Cabinet (детальний dashboard)
├─ Agent Chat (direct conversation)
├─ Agent Metrics (real-time stats)
└─ Agent Configuration (edit settings)
    ↓
Backend:
├─ agents-service (агенти + blueprints)
├─ agent-runtime (execution stats)
├─ messaging-service (direct chat)
└─ NATS (real-time events)
```

---

## Deliverables

### 1. Frontend Components (src/features/agent-hub/)

**Structure:**
```
src/features/agent-hub/
  components/
    AgentGallery.tsx          # Grid of agent cards
    AgentCard.tsx             # Single agent preview
    AgentCabinet.tsx          # Full agent dashboard
    AgentMetrics.tsx          # Real-time metrics panel
    AgentLogs.tsx             # Activity log stream
    AgentConfiguration.tsx    # Edit agent settings
    AgentChat.tsx             # Direct chat interface
    AgentToolsPanel.tsx       # List of agent tools
  hooks/
    useAgents.ts              # Fetch agents list
    useAgentDetails.ts        # Fetch single agent
    useAgentMetrics.ts        # Real-time metrics
    useAgentLogs.ts           # Activity stream
    useDirectChat.ts          # Direct chat with agent
  types/
    agent.ts                  # TypeScript types
  AgentHubPage.tsx            # Main hub page
```

---

### 2. Backend: agents-service (NEW)

**Port:** 7010  
**Purpose:** Agent blueprints, configuration, metadata

**Structure:**
```
services/agents-service/
  main.py
  models.py
  blueprints.py
  config.yaml
  requirements.txt
  Dockerfile
  README.md
```

**API:**

#### GET /api/agents
List all agents:
```json
{
  "agents": [
    {
      "id": "agent:sofia",
      "name": "Sofia-Prime",
      "kind": "assistant",
      "status": "active",
      "avatar": "https://...",
      "description": "Project manager & task organizer",
      "capabilities": ["task_mgmt", "summarization"],
      "microdao_id": "microdao:daarion",
      "created_at": "2025-01-01T00:00:00Z",
      "last_active": "2025-11-24T12:00:00Z"
    }
  ]
}
```

#### GET /api/agents/{agent_id}
Get agent details:
```json
{
  "id": "agent:sofia",
  "name": "Sofia-Prime",
  "kind": "assistant",
  "status": "active",
  "avatar": "https://...",
  "description": "...",
  "instructions": "You are Sofia, a helpful assistant...",
  "model": "gpt-4.1-mini",
  "tools": ["projects.list", "task.create", "followup.create"],
  "capabilities": {...},
  "metrics": {
    "total_messages": 1234,
    "total_invocations": 567,
    "avg_response_time_ms": 2345,
    "success_rate": 0.98
  },
  "config": {
    "temperature": 0.7,
    "max_tokens": 1000,
    "quiet_hours": "22:00-08:00"
  }
}
```

#### PUT /api/agents/{agent_id}
Update agent configuration:
```json
{
  "instructions": "Updated instructions...",
  "model": "gpt-4",
  "tools": ["projects.list", "task.create"],
  "config": {
    "temperature": 0.8,
    "max_tokens": 2000
  }
}
```

#### GET /api/agents/{agent_id}/metrics/realtime
Real-time metrics (WebSocket or SSE):
```json
{
  "agent_id": "agent:sofia",
  "timestamp": "2025-11-24T12:34:56Z",
  "active_conversations": 3,
  "messages_last_hour": 15,
  "avg_response_time_ms": 2100,
  "current_load": "normal"
}
```

#### GET /api/agents/{agent_id}/logs?limit=50
Activity logs:
```json
{
  "logs": [
    {
      "id": "log-123",
      "timestamp": "2025-11-24T12:34:56Z",
      "event_type": "message.sent",
      "channel_id": "channel-uuid",
      "content_preview": "Створила задачу 'Phase 3 testing'",
      "metadata": {
        "latency_ms": 2345,
        "tokens_used": 567
      }
    }
  ]
}
```

---

### 3. UI Components Detail

#### AgentGallery.tsx
- Grid layout (3-4 columns)
- Agent cards with:
  - Avatar
  - Name + status badge
  - Short description
  - Last active time
  - Quick stats (messages, response time)
- Filter by:
  - Status (active, paused, error)
  - Kind (assistant, coordinator, specialist)
  - MicroDAO
- Search by name

**Wireframe:**
```
┌─────────────────────────────────────────┐
│  Agent Hub                    [+ New]   │
├─────────────────────────────────────────┤
│  [Filter: All] [Search: ...]            │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  │ 👤 Sofia │  │ 👤 Alex  │  │ 👤 Eva   │
│  │ ● Active │  │ ● Active │  │ ⏸ Paused │
│  │ PM & Org │  │ Tech     │  │ Research │
│  │ 234 msgs │  │ 156 msgs │  │ 89 msgs  │
│  └──────────┘  └──────────┘  └──────────┘
```

#### AgentCabinet.tsx
- Header:
  - Avatar, name, status
  - Quick actions (pause, edit, chat)
- Tabs:
  - **Overview**: Key stats + recent activity
  - **Metrics**: Real-time charts
  - **Logs**: Activity stream
  - **Configuration**: Edit settings
  - **Chat**: Direct conversation

**Wireframe:**
```
┌─────────────────────────────────────────┐
│  👤 Sofia-Prime            [Edit] [Chat]│
│  ● Active | Last seen: 2m ago          │
├─────────────────────────────────────────┤
│  [Overview] [Metrics] [Logs] [Config]  │
├─────────────────────────────────────────┤
│  📊 Statistics (24h)                    │
│  Messages: 45  |  Invocations: 23     │
│  Avg Response: 2.3s  |  Success: 98%  │
│                                         │
│  📝 Recent Activity                     │
│  • 12:34 - Replied in #general         │
│  • 12:30 - Created task "Phase 3 test" │
│  • 12:25 - Summarized meeting notes    │
└─────────────────────────────────────────┘
```

#### AgentChat.tsx
- Direct 1-on-1 chat with agent
- Similar to Messenger UI
- Shows agent thinking/tools usage
- Context: "Direct conversation (not in channel)"

---

### 4. Real-time Updates

**WebSocket endpoint:** `ws://localhost:7010/ws/agents/{agent_id}`

**Events:**
```json
{
  "type": "agent.message.sent",
  "agent_id": "agent:sofia",
  "channel_id": "channel-uuid",
  "timestamp": "2025-11-24T12:34:56Z",
  "content_preview": "Created task..."
}

{
  "type": "agent.metrics.update",
  "agent_id": "agent:sofia",
  "metrics": {
    "active_conversations": 3,
    "messages_last_hour": 15
  }
}

{
  "type": "agent.status.changed",
  "agent_id": "agent:sofia",
  "old_status": "active",
  "new_status": "paused"
}
```

---

### 5. Integration Points

**With Phase 2:**
- Uses existing `messaging-service` for direct chat
- Displays logs from `agent-runtime` invocations
- Shows agent status from `agent-filter`

**With Phase 3:**
- Shows LLM usage (tokens, cost) from `llm-proxy`
- Displays memory stats from `memory-orchestrator`
- Lists available tools from `toolcore`

**With NATS:**
- Subscribes to `agent.*` events for real-time updates
- Publishes `agent.config.updated` on changes

---

### 6. Mock Data (Development)

**agents.mock.ts:**
```typescript
export const mockAgents: Agent[] = [
  {
    id: "agent:sofia",
    name: "Sofia-Prime",
    kind: "assistant",
    status: "active",
    avatar: "/avatars/sofia.png",
    description: "Project manager & task organizer",
    capabilities: ["task_mgmt", "summarization", "planning"],
    microdao_id: "microdao:daarion",
    created_at: "2025-01-01T00:00:00Z",
    last_active: "2025-11-24T12:00:00Z",
    metrics: {
      total_messages: 1234,
      total_invocations: 567,
      avg_response_time_ms: 2345,
      success_rate: 0.98
    }
  },
  {
    id: "agent:alex",
    name: "Alex-Tech",
    kind: "specialist",
    status: "active",
    avatar: "/avatars/alex.png",
    description: "Technical specialist for development tasks",
    capabilities: ["code_review", "debugging", "documentation"],
    microdao_id: "microdao:daarion",
    created_at: "2025-01-15T00:00:00Z",
    last_active: "2025-11-24T11:45:00Z",
    metrics: {
      total_messages: 856,
      total_invocations: 423,
      avg_response_time_ms: 3100,
      success_rate: 0.96
    }
  }
];
```

---

### 7. Tech Stack

**Frontend:**
- React 18 + TypeScript
- Tailwind CSS
- React Query (TanStack Query)
- React Router
- WebSocket (for real-time)

**Backend:**
- Python 3.11 + FastAPI
- PostgreSQL (agents DB)
- NATS (events)
- Docker

---

### 8. Database Schema

**agents table:**
```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,  -- assistant, coordinator, specialist
    status TEXT NOT NULL DEFAULT 'active',  -- active, paused, error
    avatar TEXT,
    description TEXT,
    instructions TEXT NOT NULL,
    model TEXT NOT NULL,
    tools JSONB DEFAULT '[]',
    capabilities JSONB DEFAULT '{}',
    config JSONB DEFAULT '{}',
    microdao_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ
);

CREATE INDEX idx_agents_microdao ON agents(microdao_id);
CREATE INDEX idx_agents_status ON agents(status);
```

**agent_metrics table:**
```sql
CREATE TABLE agent_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES agents(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type TEXT NOT NULL,  -- message.sent, invocation, error
    channel_id TEXT,
    latency_ms FLOAT,
    tokens_used INT,
    success BOOLEAN,
    metadata JSONB
);

CREATE INDEX idx_metrics_agent_time ON agent_metrics(agent_id, timestamp DESC);
```

---

### 9. Routes

**Frontend routes:**
```
/agents                    → AgentGallery (list)
/agents/:agentId           → AgentCabinet (dashboard)
/agents/:agentId/chat      → AgentChat (direct conversation)
/agents/:agentId/config    → AgentConfiguration (edit)
```

---

### 10. Acceptance Criteria

✅ **Agent Gallery:**
- Shows all agents with status badges
- Filter by status, kind, microDAO
- Search by name
- Responsive grid layout

✅ **Agent Cabinet:**
- Displays all agent details
- Shows real-time metrics
- Activity log stream
- Configuration editor

✅ **Agent Chat:**
- Direct 1-on-1 conversation
- Shows agent thinking/tools
- Message history

✅ **Real-time Updates:**
- Metrics auto-refresh (WebSocket)
- Activity log auto-updates
- Status changes reflected immediately

✅ **Integration:**
- Works with Phase 2 (messaging, runtime)
- Works with Phase 3 (LLM, memory, tools)
- Uses NATS for events

---

### 11. Implementation Steps

#### Week 1: Backend Foundation
1. Create `agents-service` (FastAPI)
2. Database schema + migrations
3. Basic CRUD endpoints
4. Mock agent blueprints

#### Week 2: Frontend Components
1. AgentGallery + AgentCard
2. AgentCabinet (layout + tabs)
3. AgentMetrics panel
4. AgentLogs stream

#### Week 3: Real-time & Integration
1. WebSocket for real-time updates
2. Direct chat integration
3. Configuration editor
4. NATS events

#### Week 4: Polish & Testing
1. UI polish (animations, UX)
2. Error handling
3. E2E testing
4. Documentation

---

### 12. Future Enhancements (Phase 3.5+)

🔜 **Agent creation wizard**
- GUI for creating new agents
- Template selection
- Tool assignment

🔜 **Agent analytics**
- Charts (messages over time)
- Cost tracking
- Performance insights

🔜 **Agent marketplace**
- Browse community agents
- Install/deploy agents
- Agent templates

🔜 **Multi-agent orchestration**
- Agent chains
- Workflow builder
- Agent collaboration

---

## Quick Start (After Implementation)

```bash
# Start agents-service
docker-compose -f docker-compose.agents.yml up -d

# Frontend dev
cd node-network-app
npm run dev

# Open
open http://localhost:8899/agents
```

---

## Documentation

**After implementation, create:**
- `/docs/AGENT_HUB_SPEC.md` — Full specification
- `/docs/AGENT_SERVICE_API.md` — API documentation
- `/services/agents-service/README.md` — Service setup

---

**Status:** 📋 Spec Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24

**READY TO BUILD!** 🚀




