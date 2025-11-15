# DAARION DAGI Stack — Unified TODO

**Version:** 1.0.0  
**Updated:** 15.11.2025  
**Status:** 🚀 Active Development

---

## 📋 Overview

Цей TODO обʼєднує два шари розробки:
1. **Project Governance** - монорепо, версіонування, документація, Open Core
2. **Runtime Stack** - Router, DevTools, CrewAI, microDAO, боти

---

## A. Governance & Repo (система керування проєктом)

### A.1 Монорепозиторій

- [ ] Створити монорепо `daarion/dagi` або `daarion/city-stack`
- [ ] Завести базову структуру:
  - [ ] `/router` - DAGI Router core
  - [ ] `/agents/devtools` - DevTools Agent
  - [ ] `/agents/crew-orchestrator` - CrewAI integration
  - [ ] `/microdao` - microDAO SDK + API
  - [ ] `/docs` - Documentation site
  - [ ] `/config` - Shared configs
  - [ ] `/integration-tests` - E2E tests
  - [ ] `/changelog` - Release notes

### A.2 Git Strategy

- [ ] Налаштувати гілки:
  - [ ] `main` - стабільна версія (production-ready)
  - [ ] `develop` - інтеграційна гілка
  - [ ] `feature/*` - нові features
  - [ ] `release/*` - підготовка релізів
  - [ ] `hotfix/*` - критичні фікси

### A.3 Versioning & Changelog

- [ ] Увести SemVer (v1.0.0, v1.1.0, v1.1.1…)
- [ ] Запровадити Conventional Commits
  - [ ] feat: нова функціональність
  - [ ] fix: виправлення багів
  - [ ] docs: зміни в документації
  - [ ] chore: технічні зміни
  - [ ] breaking: breaking changes
- [ ] Додати автоматичний changelog (semantic-release або GitHub Release Notes)
- [ ] Створити template для CHANGELOG.md

### A.4 Project Management

- [ ] Створити GitHub Project "DAARION Engineering"
  - [ ] Колонки: Backlog → In Progress → Review → Testing → Done
- [ ] Домовитись: кожне завдання = Issue, кожен PR лінкується до Issue
- [ ] Налаштувати labels:
  - [ ] `governance` - структура проєкту
  - [ ] `router` - DAGI Router
  - [ ] `agent/devtools` - DevTools Agent
  - [ ] `agent/crew` - CrewAI
  - [ ] `microdao` - microDAO
  - [ ] `docs` - Documentation
  - [ ] `security` - Security issues
  - [ ] `bug` - Bug reports
  - [ ] `enhancement` - New features

### A.5 Audit & Compliance

- [ ] Додати `audit mode` в DAGI Router:
  - [ ] Лог змін конфігів у `/router/audit/YYYY-MM/config-*.json`
  - [ ] Лог викликів агентів у `/router/audit/YYYY-MM/calls-*.json`
  - [ ] Лог routing decisions у `/router/audit/YYYY-MM/routing-*.json`
- [ ] У microDAO додати audit trail:
  - [ ] Лог змін ролей `/microdao/audit/YYYY-MM/roles-*.json`
  - [ ] Лог ентайтлментів `/microdao/audit/YYYY-MM/entitlements-*.json`
  - [ ] Лог токен-операцій `/microdao/audit/YYYY-MM/tokens-*.json`

---

## B. Документація та публічність

### B.1 Структура документації

- [ ] У монорепо створити структуру docs:
  - [ ] `/docs/architecture` - Architecture Decision Records (ADR)
  - [ ] `/docs/api` - API Reference
  - [ ] `/docs/agents` - Agents documentation
  - [ ] `/docs/security` - Security guidelines
  - [ ] `/docs/roadmap` - Public roadmap
  - [ ] `/docs/updates/YYYY-MM/` - Monthly updates

### B.2 Documentation Site

- [ ] Підняти Docusaurus (або MkDocs) як `docs.daarion.city`
- [ ] Налаштувати GitHub Pages деплой при пуші в `main`
- [ ] Додати автоматичну генерацію API docs (Swagger/OpenAPI)
- [ ] Налаштувати versioned docs (v1.0, v1.1, etc.)

### B.3 Roadmap

- [ ] Витягти Roadmap з GitHub Projects у `/docs/roadmap/index.md`
- [ ] Описати high-level roadmap:
  - [ ] **Q4 2025** — DAGI Router v1 + локальна LLM (qwen3:8b)
  - [ ] **Q1 2026** — DevTools Agent + CrewAI backend
  - [ ] **Q2 2026** — microDAO v2 federation + tokenomics
  - [ ] **Q3 2026** — DAGI Cloud beta
- [ ] Створити детальний roadmap для кожного компонента

---

## C. Ліцензування / Open Core

### C.1 Open Core Model

- [ ] Обрати модель: Open Core
- [ ] Визначити публічні компоненти:
  - [ ] DAGI Router (core)
  - [ ] DevTools Agent (базова функціональність)
  - [ ] microDAO SDK
  - [ ] API specifications
  - [ ] Documentation, Roadmap
- [ ] Визначити закриті компоненти:
  - [ ] Orchestrator (Crew/DAGI внутрішній)
  - [ ] Приватні моделі / адаптації
  - [ ] Бізнес-логіка DAARION.city
  - [ ] DAO governance скрипти
  - [ ] Advanced analytics & monitoring

### C.2 Licensing

- [ ] Створити кастомну ліцензію `DAARION License v1.0`
- [ ] Додати Apache 2.0 для відкритих модулів
- [ ] Створити LICENSE.md для кожного компонента
- [ ] Додати CLA (Contributor License Agreement) для external contributors

---

## D. DAGI Router + DevTools + LLM

### D.1 LLM Setup ✅

- [x] Підняти qwen3:8b в Ollama
- [x] Налаштувати systemd-сервіс `ollama.service`
- [x] Переконатися, що `ollama list` показує `qwen3:8b`
- [x] Створити `router-config.yml` з профілем `local_qwen3_8b`

### D.2 Router Configuration

- [ ] Додати у config секцію `providers`:
  ```yaml
  providers:
    llm_local:
      type: ollama
      model: qwen3:8b
      base_url: http://localhost:11434
    devtools:
      type: http
      base_url: http://localhost:8001
    cloud_deepseek:
      type: openai_compatible
      base_url: https://api.deepseek.com
      api_key_env: DEEPSEEK_API_KEY
  ```

### D.3 Router Implementation

- [ ] Реалізувати в коді DAGI Router:
  - [ ] Loader для `router-config.yml` (PyYAML)
  - [ ] Provider registry (pluggable providers)
  - [ ] Routing dispatcher (mode → provider)
  - [ ] Request/Response validation (Pydantic)
  - [ ] Error handling & fallbacks

### D.4 DevTools Agent

- [ ] Створити окремий FastAPI сервіс `/opt/devtools-agent`
- [ ] Реалізувати DevTools HTTP API:
  - [ ] `POST /tools/fs/read` - читання файлів
  - [ ] `POST /tools/fs/write` - запис файлів
  - [ ] `POST /tools/ci/run-tests` - запуск тестів
  - [ ] `POST /tools/git/diff` - git diff
  - [ ] `POST /tools/git/commit` - git commit
  - [ ] `POST /tools/notebook/execute` - notebook execution
- [ ] Додати security:
  - [ ] Path validation (sandboxing)
  - [ ] File size limits
  - [ ] Allowed operations whitelist

### D.5 Routing Rules

- [ ] Доробити routing rules:
  - [ ] `mode=devtools → provider=devtools`
  - [ ] `mode=chat + simple → provider=llm_local`
  - [ ] `mode=chat + complex → provider=cloud_deepseek`
  - [ ] `default → provider=llm_local`
- [ ] Додати context-aware routing (аналіз складності запиту)

### D.6 Testing

- [ ] Створити та прогнати `test-devtools.sh`
- [ ] Золоті сценарії:
  - [ ] Bugfix scenario
  - [ ] Simple refactor scenario
  - [ ] Architecture review scenario
- [ ] Додати integration tests для routing

---

## E. CrewAI Orchestrator

### E.1 Configuration

- [ ] Додати provider `crewai` у `router-config.yml`:
  ```yaml
  providers:
    crewai:
      type: http
      base_url: http://localhost:8002
      timeout_ms: 60000
  ```

### E.2 API Design

- [ ] Визначити payload для CrewAI:
  ```json
  {
    "mode": "crew",
    "workflow": "microdao_onboarding",
    "input": {
      "user_id": "...",
      "dao_id": "...",
      "channel": "telegram"
    }
  }
  ```

### E.3 Implementation

- [ ] Реалізувати HTTP API до CrewAI backend:
  - [ ] `POST /workflows/execute`
  - [ ] `GET /workflows/{id}/status`
  - [ ] `POST /workflows/{id}/cancel`
- [ ] Додати routing rule: `mode=crew → provider=crewai`
- [ ] Написати простий workflow:
  - [ ] microDAO onboarding
  - [ ] Multi-step approval flow
  - [ ] Task delegation workflow

### E.4 Testing

- [ ] Зробити інтеграційний тест: `POST /router {mode:"crew"}`
- [ ] End-to-end workflow test

---

## F. Інтеграція microDAO + Telegram/Discord

### F.1 Gateway Bot Service

- [ ] Підняти `gateway-bot` сервіс:
  - [ ] `/telegram/webhook` - Telegram Bot API
  - [ ] `/discord/events` - Discord Events API
  - [ ] Unified bot framework

### F.2 Bot → Router Integration

- [ ] Прокинути: Bot → Gateway → `POST /router/chat`
  ```json
  {
    "mode": "chat",
    "source": "telegram",
    "dao_id": "greenfood-dao",
    "user_id": "tg:123456",
    "message": "...",
    "session_id": "tg:123456:greenfood-dao",
    "context": {
      "agent_id": "microdao_assistant",
      "locale": "uk-UA"
    }
  }
  ```

### F.3 RBAC Integration

- [ ] У Router додати rule `microdao_chat`:
  - [ ] `mode=chat` + `has dao_id` → `use_provider: llm_local` або `crewai`
- [ ] Додати витяг ролей/ентайтлментів із microDAO:
  - [ ] Fetch user roles by `user_id` + `dao_id`
  - [ ] Check entitlements for requested operations
- [ ] Обмежити доступні агенти залежно від ролі:
  - [ ] `admin` → full access
  - [ ] `member` → limited access
  - [ ] `guest` → read-only

### F.4 E2E Testing

- [ ] Протестувати end-to-end:
  - [ ] Telegram → Gateway → Router → LLM → Response
  - [ ] Telegram → Gateway → Router → DevTools → Response
  - [ ] Telegram → Gateway → Router → CrewAI → Response
- [ ] Перевірити RBAC constraints
- [ ] Stress test (багато користувачів, багато DAO)

---

## 📊 Progress Tracking

**Last Updated:** 15.11.2025

### Completed ✅
- D.1: LLM Setup (qwen3:8b + Ollama)
- Initial router-config.yml created
- Basic DAGI Router running on :9101

### In Progress 🔄
- D.3: Router implementation (config loader)
- D.4: DevTools Agent design

### Not Started ⏳
- A: Governance & Repo setup
- B: Documentation site
- C: Licensing
- E: CrewAI Orchestrator
- F: microDAO + Bot integration

---

## 🎯 Priority Order

### Phase 1: Foundation (Current)
1. **D.3** - Router config loader & provider registry
2. **D.4** - DevTools Agent implementation
3. **D.6** - Basic testing

### Phase 2: Orchestration
4. **E** - CrewAI integration
5. **F.1-F.2** - Gateway Bot service

### Phase 3: Governance
6. **A.1-A.3** - Monorepo setup
7. **B** - Documentation
8. **C** - Licensing

### Phase 4: Production
9. **F.3-F.4** - RBAC + E2E tests
10. **A.4-A.5** - Project management + Audit

---

## 📚 References

- Current Setup: `/opt/dagi-router/`
- Config: `/opt/dagi-router/router-config.yml`
- Env: `/opt/dagi-router/.env`
- Docs: `/opt/dagi-router/NEXT-STEPS.md`
- Tests: `/opt/dagi-router/test-devtools.sh`

