# DAARION Documentation Index

**Quick navigation for all documentation**

---

## 🚀 Quick Start

### For New Developers
1. [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) — Project overview
2. [INFRASTRUCTURE.md](../INFRASTRUCTURE.md) — Servers, ports, services
3. [docs/cursor/README.md](./cursor/README.md) — Cursor AI documentation (72 docs)

### For Implementation
1. [docs/tasks/README.md](./tasks/README.md) — **Cursor-ready tasks** ⭐
2. [MESSAGING_ARCHITECTURE.md](./MESSAGING_ARCHITECTURE.md) — Complete tech spec
3. [MESSENGER_TESTING_GUIDE.md](./MESSENGER_TESTING_GUIDE.md) — Testing guide

---

## 📋 Cursor Tasks (New!)

**Ready-to-use tasks for Cursor AI:**

### Priority 1: Agent Integration
- [TASK_PHASE2_AGENT_INTEGRATION.md](./tasks/TASK_PHASE2_AGENT_INTEGRATION.md)
  - 4 weeks, High priority
  - agent_filter + DAGI Router + agent-runtime
  - Makes Messenger agent-aware

### Priority 2: Agent Hub
- [TASK_AGENT_HUB_MVP.md](./tasks/TASK_AGENT_HUB_MVP.md)
  - 2 weeks, High priority
  - Main interface for working with agents
  - Reuses Messenger components

---

## 🏗️ Architecture

### Core Specs
- [MESSAGING_ARCHITECTURE.md](./MESSAGING_ARCHITECTURE.md) — Messenger + Matrix + Agents (110+ KB)
- [MESSENGER_COMPLETE_SPECIFICATION.md](./MESSENGER_COMPLETE_SPECIFICATION.md) — Master doc
- [messaging-erd.dbml](./messaging-erd.dbml) — Database ERD (dbdiagram.io format)

### Technical Docs
- [INFRASTRUCTURE.md](../INFRASTRUCTURE.md) — Servers, nodes, ports, services
- [infrastructure_quick_ref.ipynb](./infrastructure_quick_ref.ipynb) — Quick reference notebook

---

## 📚 Cursor AI Documentation (72 docs)

**See:** [docs/cursor/README.md](./cursor/README.md)

### Key Documents
1. **MVP & Architecture (00-07)**
   - `00_overview_microdao.md` — System overview
   - `01_product_brief_mvp.md` — Product requirements
   - `02_architecture_basics.md` — Technical architecture
   - `03_api_core_snapshot.md` — API contracts
   - `MVP_VERTICAL_SLICE.md` — Implementation plan

2. **Agent System (08-24)**
   - `12_agent_runtime_core.md` — Agent Runtime Core
   - `13_agent_memory_system.md` — Memory system
   - `21_agent_only_interface.md` — Agent-Only Interface
   - `22_operator_modes_and_system_agents.md` — System agents

3. **Infrastructure (25-50)**
   - `25_deployment_infrastructure.md` — Deployment
   - `27_database_schema_migrations.md` — Database schema
   - `34_internal_services_architecture.md` — 17 services
   - `42_nats_event_streams_and_event_catalog.md` — NATS events

---

## 🔧 Implementation Guides

### Completed Modules
- [MESSENGER_MODULE_COMPLETE.md](./MESSENGER_MODULE_COMPLETE.md) — Phase 1 summary
  - Database schema
  - messaging-service
  - Frontend UI
  - WebSocket real-time

### In Progress
- [tasks/TASK_PHASE2_AGENT_INTEGRATION.md](./tasks/TASK_PHASE2_AGENT_INTEGRATION.md) — Agent integration
- [tasks/TASK_AGENT_HUB_MVP.md](./tasks/TASK_AGENT_HUB_MVP.md) — Agent Hub UI

---

## 🧪 Testing

### Messenger Testing
- [MESSENGER_TESTING_GUIDE.md](./MESSENGER_TESTING_GUIDE.md) — 13 test scenarios
  - Basic messaging
  - Element compatibility
  - Agent posting
  - WebSocket
  - E2EE channels

### General Testing
- [cursor/07_testing_checklist_mvp.md](./cursor/07_testing_checklist_mvp.md) — MVP checklist

---

## 📊 Data Models

### Database
- [messaging-erd.dbml](./messaging-erd.dbml) — **Messenger ERD** (paste to dbdiagram.io)
- [cursor/27_database_schema_migrations.md](./cursor/27_database_schema_migrations.md) — Full schema

### API
- [cursor/03_api_core_snapshot.md](./cursor/03_api_core_snapshot.md) — Core API
- [services/matrix-gateway/API_SPEC.md](../services/matrix-gateway/API_SPEC.md) — Matrix Gateway

---

## 🎯 Roadmap & Plans

### Current Phase
- ✅ Phase 1: Messenger Core (Complete)
- 📋 Phase 2: Agent Integration (Next)
- 📋 Phase 2.5: Agent Hub (Parallel)

### Planning Docs
- [MVP_VERTICAL_SLICE.md](./cursor/MVP_VERTICAL_SLICE.md) — MVP plan
- [PLAN_MODULES.md](./cursor/PLAN_MODULES.md) — Module plans
- [ACTION_PLAN.md](./ACTION_PLAN.md) — Action plan

---

## 🔐 Security & Infrastructure

### Security
- [cursor/26_security_audit.md](./cursor/26_security_audit.md) — Security checklist
- [cursor/33_api_gateway_security_and_pep.md](./cursor/33_api_gateway_security_and_pep.md) — API security

### Infrastructure
- [cursor/25_deployment_infrastructure.md](./cursor/25_deployment_infrastructure.md) — Deployment
- [cursor/29_scaling_and_high_availability.md](./cursor/29_scaling_and_high_availability.md) — Scaling

---

## 🌐 Integration Guides

### DAARION.city
- [DAARION_city_integration.md](./cursor/DAARION_city_integration.md) — City integration
- [DAARION_city_platforms_catalog.md](./cursor/DAARION_city_platforms_catalog.md) — Platforms

### External Systems
- [cursor/20_integrations_bridges_agent.md](./cursor/20_integrations_bridges_agent.md) — Bridges
- [cursor/40_rwa_energy_food_water_flow_specs.md](./cursor/40_rwa_energy_food_water_flow_specs.md) — RWA

---

## 💰 Tokenomics

### Core Docs
- [tokenomics/city-tokenomics.md](./tokenomics/city-tokenomics.md) — ⭐ CANONICAL
- [cursor/30_cost_optimization_and_token_economics_infrastructure.md](./cursor/30_cost_optimization_and_token_economics_infrastructure.md)

---

## 📝 Quick Reference

### Files by Type

#### Configuration
- `../package.json` — Frontend dependencies
- `../vite.config.ts` — Vite config
- `../docker-compose.messenger.yml` — Messenger stack
- `../docker-compose.agents.yml` — Agent services (to be created)

#### Migrations
- `../migrations/001_create_messenger_schema.sql` — Messenger DB

#### Services
- `../services/messaging-service/` — Messaging API
- `../services/matrix-gateway/` — Matrix adapter
- `../services/city-service/` — City API
- `../services/space-service/` — Space API

#### Frontend
- `../src/features/messenger/` — Messenger UI
- `../src/features/city/` — City Dashboard
- `../src/features/space-dashboard/` — Space Dashboard
- `../src/features/onboarding/` — Onboarding

---

## 🔍 Search Tips

### Find by Topic
- **Messenger:** Search for "messaging", "Matrix", "channels"
- **Agents:** Search for "agent", "runtime", "LLM"
- **Infrastructure:** Search for "deployment", "docker", "NATS"
- **Security:** Search for "security", "PDP", "capabilities"

### Find by File Type
- `.md` — Documentation
- `.dbml` — Database models
- `.sql` — Migrations
- `.ipynb` — Jupyter notebooks
- `.yml` — Docker configs

---

## 📞 Support

### Documentation Issues
- Check [cursor/README.md](./cursor/README.md) for navigation
- Use [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) for quick context

### Implementation Help
- Start with [tasks/README.md](./tasks/README.md)
- Review [MESSAGING_ARCHITECTURE.md](./MESSAGING_ARCHITECTURE.md) for technical details

---

**Last Updated:** 2025-11-24  
**Version:** 1.1.0  
**Maintainer:** DAARION Platform Team
