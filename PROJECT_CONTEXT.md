# 🚀 microDAO2 — Швидкий контекст проєкту

**Для швидкого посилання в чатах та Cursor**

> ⚠️ **ВАЖЛИВО:** Для нового діалогу з Cursor обов'язково використовуй:
> - **INFRASTRUCTURE.md** - центральний файл інфраструктури
> - **docs/infrastructure_quick_ref.ipynb** - швидкий довідник
> 
> Ці файли містять актуальну інформацію про сервери, сервіси, порти, ноди та endpoints.

---

## 📍 Де знаходиться проєкт

**Повний шлях:**
```
/Users/apple/github-projects/microdao-daarion
```

**Швидкий доступ:**
- GitHub: `git@github.com:IvanTytar/microdao-daarion.git`
- Локально: `/Users/apple/github-projects/microdao-daarion`

---

## 📚 Документація для Cursor

**Основна папка:**
```
docs/cursor/
```

**Ключові документи:**

### Фундамент (01-13)
- `00_overview_microdao.md` — Загальний огляд
- `01_product_brief_mvp.md` — Product requirements
- `02_architecture_basics.md` — Технічна архітектура
- `03_api_core_snapshot.md` — API контракти
- `04_ui_ux_onboarding_chat.md` — UI/UX специфікація
- `05_coding_standards.md` — Стандарти кодування
- `06_tasks_onboarding_mvp.md` — Технічні задачі
- `07_testing_checklist_mvp.md` — Тестовий чеклист

### Агентська система (08-13)
- `08_agent_first_onboarding.md` — Агентський онбординг
- `09_evolutionary_agent.md` — Еволюційний агент
- `10_agent_ui_system.md` — Агентський UI
- `11_llm_integration.md` — Інтеграція LLM
- `12_agent_runtime_core.md` — Agent Runtime Core
- `13_agent_memory_system.md` — Система пам'яті агентів

### Модулі та інтерфейс (14-24)
- `14_messenger_agent_module.md` — Агент-месенджер
- `15_projects_agent_module.md` — Агент-проєктний менеджер
- `16_followups_reminders_agent.md` — Агент нагадувань та фоллоуапів
- `17_comemory_knowledge_space.md` — Co-Memory та Knowledge Space
- `18_governance_access_agent.md` — Governance & Access Agent
- `19_notifications_attention_agent.md` — Notifications & Attention Agent
- `20_integrations_bridges_agent.md` — Integrations & Bridges Agent
- `21_agent_only_interface.md` — Agent-Only Interface
- `22_operator_modes_and_system_agents.md` — Operator Modes & System Agents
- `22_agent_only_interface_tasks.md` — Задачі для Agent-Only Interface
- `23_domains_wallet_dao_deepdive.md` — Domains, Wallet & DAO Deep Dive
- `23_agent_cards_and_console.md` — Живі картки агентів та Console
- `24_agent_cards_tasks.md` — Задачі для Agent Cards
- `24_access_keys_capabilities_system.md` — Access Keys & Capabilities System

### DAARION.city та платформи
- `DAARION_city_integration.md` — Інтеграція DAARION.city
- `DAARION_city_platforms_catalog.md` — Каталог платформ DAARION.city

### Deployment, Infrastructure та Database
- `25_deployment_infrastructure.md` — Deployment процес, середовища, CI/CD, моніторинг
- `26_security_audit.md` — Безпековий чеклист для аудитування
- `27_database_schema_migrations.md` — Повна схема БД та міграції
- `28_flows_wallet_embassy_energy_union.md` — Sequence-діаграми критичних потоків
- `29_scaling_and_high_availability.md` — Масштабування та висока доступність
- `30_cost_optimization_and_token_economics_infrastructure.md` — Оптимізація витрат та токеноміка
- `31_governance_policies_for_capabilities_and_quotas.md` — Політики DAO для управління доступами та квотами
- `32_policy_service_PDP_design.md` — Архітектура Policy Decision Point
- `33_api_gateway_security_and_pep.md` — API Gateway Architecture та Policy Enforcement Point
- `34_internal_services_architecture.md` — Архітектура внутрішніх сервісів (17 сервісів)
- `35_microdao_service_mesh_design.md` — MicroDAO Service Mesh (zero-trust, mTLS, observability)
- `36_agent_runtime_isolation_and_sandboxing.md` — Безпечна ізоляція агентів та sandbox-модель
- `37_agent_tools_and_plugins_specification.md` — Специфікація інструментів та плагінів агентів
- `38_private_agents_lifecycle_and_management.md` — Життєвий цикл приватних агентів
- `39_private_agent_templates_and_behavior_profiles.md` — Шаблони агентів та поведінкові профілі
- `40_rwa_energy_food_water_flow_specs.md` — Потоки RWA (енергія, їжа, вода)
- `41_ai_governance_agent_design.md` — AI Governance Agent (політики, голосування, застосування правил)
- `42_nats_event_streams_and_event_catalog.md` — NATS Event Streams та Event Catalog
- `43_database_events_outbox_design.md` — Outbox Pattern (транзакційна доставка подій)
- `44_usage_accounting_and_quota_engine.md` — Usage Accounting & Quota Engine
- `45_llm_proxy_and_multimodel_routing.md` — LLM Proxy & Multi-Model Routing
- `46_router_orchestrator_design.md` — Router Orchestrator Design
- `47_messaging_channels_and_privacy_layers.md` — Messaging Channels & Privacy Layers
- `48_teams_access_control_and_confidential_mode.md` — Teams Access Control & Confidential Mode
- `49_wallet_rwa_payouts_claims.md` — Wallet, RWA, Payouts & Claims
- `50_daarion_city_website_integration.md` — DAARION.city Website Integration
- `docs/tokenomics/README.md` — Unified Tokenomics for DAARION.city & MicroDAO
- `docs/tokenomics/city-tokenomics.md` — City Tokenomics — DAARION.city
- `docs/integration-daarion.md` — Integration Guide: MicroDAO → DAARION.city
- `docs/agents.md` — Agents Map — DAARION.city (A1-A4 hierarchy)
- `docs/api.md` — API Reference — DAARION.city & MicroDAO (MVP endpoints)

**Повний список:** `docs/cursor/README.md`

---

## 🗂️ Структура проєкту

```
MicroDAO 3/
├── docs/
│   ├── cursor/              # Документація для Cursor (17+ документів)
│   └── microdao_project_notes.ipynb  # Jupyter ноутбук
├── src/
│   ├── api/                 # API клієнти
│   ├── components/          # React компоненти
│   │   └── onboarding/      # Компоненти онбордингу
│   ├── hooks/               # React hooks
│   ├── pages/               # Сторінки
│   └── types/                # TypeScript типи
├── package.json
├── vite.config.ts
└── PROJECT_CONTEXT.md       # Цей файл
```

---

## 🎯 Поточний статус

### ✅ Завершено
- Документація для Cursor (17 документів)
- Онбординг компоненти (6 кроків)
- API клієнти (teams, channels, agents, auth)
- Git репозиторій ініціалізовано
- Dev server налаштовано

### ⏳ В процесі
- Реалізація Agent-Only Interface (4 задачі)
- Інтеграція LLM
- Система пам'яті агентів

### 📋 Заплановано
- Projects Agent Module (15)
- Follow-ups Agent (16)
- Co-Memory Agent (17)
- Governance Agent (18)
- Notifications Agent (19)
- Integrations Agent (20)

---

## 🔗 Швидкі посилання

### Для Cursor
```
Додай в контекст: /Users/apple/Desktop/MicroDAO/MicroDAO 3/docs/cursor/
```

### Для розробки
```bash
cd "/Users/apple/Desktop/MicroDAO/MicroDAO 3"
npm install
npm run dev
```

### Відкрити в браузері
- Головна: http://localhost:8899
- Console: http://localhost:8899/console
- НОДИ: http://localhost:8899/nodes
- Кабінет НОДА1: http://localhost:8899/nodes/node-1
- Кабінет НОДА2: http://localhost:8899/nodes/node-2
- Кабінет DAARION: http://localhost:8899/microdao/daarion
- Кабінет GREENFOOD: http://localhost:8899/microdao/greenfood
- Кабінет ENERGY UNION: http://localhost:8899/microdao/energy-union

---

## 📝 Як посилатись на проєкт

### В чатах з Cursor / AI
Просто скопіюй:
```
Проєкт: microDAO2
Шлях: /Users/apple/Desktop/MicroDAO/MicroDAO 3
Документація: docs/cursor/ (31 документ)
```

Або коротко:
```
microDAO2: /Users/apple/Desktop/MicroDAO/MicroDAO 3
```

### Для швидкого старту
```
Використовуй: PROJECT_CONTEXT.md в корені проєкту
```

---

## 🛠️ Технології

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** API Gateway `https://api.microdao.xyz/v1`
- **State:** React Query, Zustand/Context
- **LLM:** OpenAI (інтеграція через backend)
- **Swapper Service:** Динамічне завантаження моделей (тільки в кабінетах НОД)
- **Node Cabinets:** Повна інформація про ноди, агенти, сервіси, метрики
- **MicroDAO Cabinets:** Управління мікроДАО, чат з оркестраторами

---

## 📖 Корисні файли

- `QUICK_START.md` — Швидкий старт
- `PROJECT_INFO.md` — Інформація про проєкт
- `GIT_SETUP.md` — Налаштування Git
- `STATUS.md` — Статус проєкту
- `docs/cursor/README.md` — Навігація по документації

---

**Останнє оновлення:** 2025-11-23

