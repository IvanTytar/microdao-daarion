# DAARION Cursor Tasks

**Готові таски для Cursor AI / інженерів**

Ця директорія містить структуровані задачі для імплементації функцій DAARION.

---

## 📋 Available Tasks

### 🔥 MASTER TASK: PHASE2_MASTER_TASK.md
**Status:** 🚀 READY TO COPY TO CURSOR  
**Priority:** Critical  
**Estimated Time:** 4 weeks

**The complete, copy-paste-ready task for Cursor AI!**

Full implementation with code examples:
- agent_filter (complete Python code)
- Router extension (complete code)
- agent-runtime (complete code)
- Docker integration

**How to use:**
```bash
# Copy entire file and paste into Cursor
cat docs/tasks/PHASE2_MASTER_TASK.md | pbcopy
```

---

### 1. TASK_PHASE2_AGENT_INTEGRATION.md
**Status:** 📋 Ready to implement  
**Priority:** High  
**Estimated Time:** 4 weeks

**Goal:**
Повна інтеграція агентів у Messenger:
- `agent_filter` service — Security & routing layer
- DAGI Router extension — Message routing
- `agent-runtime-service` — LLM + Memory + Posting

**Deliverables:**
- 3 нові сервіси (agent-filter, router extension, agent-runtime)
- NATS event integration (actual publishing)
- Full flow: Human → agent_filter → Router → Agent Runtime → Reply

**Dependencies:**
- Messenger Module (✅ Complete)
- NATS JetStream (✅ Running)
- Matrix Synapse (✅ Running)

**How to use:**
```bash
# Copy entire task into Cursor
cat docs/tasks/TASK_PHASE2_AGENT_INTEGRATION.md

# Or work step-by-step:
# 1) Implement agent_filter
# 2) Extend DAGI Router
# 3) Implement agent-runtime
# 4) Docker-compose integration
```

---

### 2. TASK_AGENT_HUB_MVP.md
**Status:** 📋 Ready to implement  
**Priority:** High  
**Estimated Time:** 2 weeks

**Goal:**
Створити Agent Hub — головний інтерфейс для роботи з агентами:
- 3-колонковий layout (Agents | Chat | Context)
- Direct channels з агентами
- Reuse Messenger components
- Context panel (projects, capabilities)

**Deliverables:**
- Frontend: `/hub` route з 6 компонентами
- Backend: Agent Hub API (4 endpoints)
- Navigation links (Onboarding → Hub, City → Hub)

**Dependencies:**
- Messenger Module (✅ Complete)
- TASK_PHASE2_AGENT_INTEGRATION (⚠️ Recommended but not blocking for UI)

**How to use:**
```bash
# Copy entire task into Cursor
cat docs/tasks/TASK_AGENT_HUB_MVP.md

# Or implement incrementally:
# 1) Backend API (agents-service)
# 2) Frontend structure
# 3) Messenger integration
# 4) Context panel
```

---

## 🔄 Task Workflow

### Step 1: Choose Task
Select based on priority and dependencies.

### Step 2: Review
- Read task completely
- Check dependencies
- Review acceptance criteria

### Step 3: Implement
- Copy task to Cursor
- Follow structure step-by-step
- Test each component

### Step 4: Validate
- Run acceptance criteria tests
- Update documentation
- Mark task as complete

---

## 📚 Related Documentation

### Core Docs
- [MESSAGING_ARCHITECTURE.md](../MESSAGING_ARCHITECTURE.md) — Complete technical spec
- [MESSENGER_COMPLETE_SPECIFICATION.md](../MESSENGER_COMPLETE_SPECIFICATION.md) — Master navigation
- [messaging-erd.dbml](../messaging-erd.dbml) — Database ERD

### Implementation Guides
- [MESSENGER_MODULE_COMPLETE.md](../MESSENGER_MODULE_COMPLETE.md) — Phase 1 summary
- [MESSENGER_TESTING_GUIDE.md](../MESSENGER_TESTING_GUIDE.md) — Testing scenarios

---

## 🎯 Roadmap

```
✅ Phase 1: Messenger Core (Complete)
   - Database schema
   - messaging-service
   - matrix-gateway spec
   - Frontend UI
   - WebSocket real-time

📋 Phase 2: Agent Integration (Next - TASK_PHASE2)
   - agent_filter service
   - DAGI Router extension
   - agent-runtime-service
   - NATS events

📋 Phase 2.5: Agent Hub (Parallel - TASK_AGENT_HUB)
   - Agent Hub UI
   - Direct channels
   - Context panel
   - Navigation

🔜 Phase 3: Advanced Features
   - Multi-agent coordination
   - Scheduled messages
   - Voice messages
   - Analytics
```

---

## 💡 Tips for Using Tasks

### For Cursor AI:
1. Copy entire task file
2. Paste as single prompt
3. Let Cursor work through incrementally
4. Review generated code
5. Test acceptance criteria

### For Human Developers:
1. Read task thoroughly
2. Break into sub-tasks if needed
3. Implement step-by-step
4. Cross-reference with architecture docs
5. Write tests

### For Team Leads:
1. Assign tasks based on expertise
2. Track progress via acceptance criteria
3. Review deliverables
4. Update roadmap

---

## 🚀 Quick Start

### To start Phase 2:
```bash
# 1. Read task
cat docs/tasks/TASK_PHASE2_AGENT_INTEGRATION.md

# 2. Start with agent_filter
cd services
mkdir agent-filter
cd agent-filter
# Follow task instructions...

# 3. Test
docker-compose -f docker-compose.agents.yml up -d
```

### To start Agent Hub:
```bash
# 1. Read task
cat docs/tasks/TASK_AGENT_HUB_MVP.md

# 2. Create feature structure
mkdir -p src/features/agent-hub/{components,hooks,api}
# Follow task instructions...

# 3. Test
npm run dev
# Navigate to http://localhost:8899/hub
```

---

## 📊 Task Status

| Task | Status | Progress | ETA |
|------|--------|----------|-----|
| Messenger Core (Phase 1) | ✅ Complete | 100% | Done |
| **Phase 2: Agent Integration** | 🚀 **READY** | 0% | 4 weeks |
| Agent Hub MVP | 📋 Ready | 0% | 2 weeks |
| Phase 3: Core Services | 📋 Roadmap | 0% | 6-8 weeks |
| Projects Module | 🔜 Planned | 0% | TBD |
| Follow-ups Module | 🔜 Planned | 0% | TBD |

---

## 🤝 Contributing

When adding new tasks:
1. Use existing task format
2. Include all sections (Goal, Dependencies, Deliverables, Acceptance Criteria)
3. Add to this README
4. Link to related docs
5. Update roadmap

---

**Last Updated:** 2025-11-24  
**Maintainer:** DAARION Platform Team

