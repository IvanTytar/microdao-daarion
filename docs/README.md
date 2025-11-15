# Документація MicroDAO & DAARION.city

Ця папка містить всю документацію проєкту, організовану за категоріями.

## 📁 Структура документації

### `/microdao/` — Документація MicroDAO
Архітектура, RBAC, токеноміка, технічні специфікації MicroDAO.

**Ключові документи:**
- `architecture.md` — загальна архітектура системи
- `rbac.md` — система ролей та доступів (RBAC, Confidential Mode)
- `access-keys-capabilities.md` — система ключів доступу та capabilities

**Детальна технічна документація:** `/cursor/` (61 документ для розробників)

### `/daarion/` — Документація DAARION.city
Roadmap, governance, токеноміка міста, інтеграція з MicroDAO.

**Ключові документи:**
- `integration-microdao.md` — інтеграція DAARION.city з MicroDAO
- `platforms-catalog.md` — каталог платформ (GREENFOOD, EnergyUnion, WaterUnion)
- `tokenomics-city.md` — токеноміка міста (DAAR, DAARION)

### `/agents/` — Документація агентської системи
DAGI Router, DevTools Agent, CrewAI Orchestrator.

**Структура:**
- `dagi-router.md` — архітектура DAGI Router
- `devtools-agent.md` — DevTools Agent
- `crewai-orchestrator.md` — CrewAI інтеграція

### `/cursor/` — Технічна документація для розробки
61 документ з детальними специфікаціями для Cursor AI та розробників.

**Категорії:**
- **00-07:** Фундамент (overview, product brief, architecture, API, UI/UX, coding standards, tasks, testing)
- **08-13:** Агентська система (onboarding, evolutionary agent, UI, LLM, runtime core, memory)
- **14-24:** Модулі та інтерфейс (messenger, projects, follow-ups, co-memory, governance, notifications, integrations, agent-only interface, operator modes, domains/wallet/DAO, agent cards)
- **24-50:** Інфраструктура та сервіси (access keys, deployment, security, database, flows, scaling, cost optimization, governance policies, PDP, API Gateway, service mesh, agent isolation, tools, lifecycle, templates, RWA, AI governance, NATS, outbox, usage, LLM proxy, router, messaging, teams, wallet, website integration)

**Детальний опис:** `/cursor/README.md`

## 🚀 Швидкий старт

### Для розробників
1. Почни з `/cursor/00_overview_microdao.md` — загальний огляд
2. Вивчи `/cursor/01_product_brief_mvp.md` — product requirements
3. Переглянь `/cursor/03_api_core_snapshot.md` — API контракти
4. Дотримуйся `/cursor/05_coding_standards.md` — стандарти кодування

### Для архітекторів
1. `/microdao/architecture.md` — архітектура MicroDAO
2. `/microdao/rbac.md` — система доступів
3. `/daarion/integration-microdao.md` — інтеграція з DAARION.city
4. `/cursor/34_internal_services_architecture.md` — архітектура сервісів

### Для product/growth
1. `/daarion/tokenomics-city.md` — токеноміка міста
2. `/daarion/platforms-catalog.md` — каталог платформ
3. `/cursor/MVP_VERTICAL_SLICE.md` — план MVP

## 📚 Посилання на повну документацію

- [MicroDAO документація](./microdao/README.md)
- [DAARION.city документація](./daarion/README.md)
- [Агентська система](./agents/README.md)
- [Технічна документація для розробки](./cursor/README.md)

## 🔄 Версіонування

Вся документація зберігається в Git репозиторії. Для оновлення:

```bash
git pull origin main
```

## 📝 Внесок у документацію

Див. [CONTRIBUTING_DOCS.md](./CONTRIBUTING_DOCS.md) для інструкцій з оновлення документації.

---

**Останнє оновлення:** 2024-11-14  
**Версія:** 1.0.0
