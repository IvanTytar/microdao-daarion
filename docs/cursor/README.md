# MicroDAO — Документація для Cursor

Ця папка містить структуровану документацію для розробки MVP MicroDAO з використанням Cursor AI.

## Структура документації

### 00_overview_microdao.md
Загальний огляд системи MicroDAO, ключові модулі та посилання на інші документи.

**Коли використовувати:** Для швидкого ознайомлення з проєктом.

### 01_product_brief_mvp.md
Product Requirements для MVP: мета, персони, ключові сценарії, обсяг та межі.

**Коли використовувати:** Для розуміння бізнес-логіки та цілей MVP.

### 02_architecture_basics.md
Технічна архітектура: стек, основні сервіси, дані та моделі, WebSockets, приватність.

**Коли використовувати:** Для розуміння технічної архітектури та інтеграцій.

### 03_api_core_snapshot.md
Стисла витяжка з OpenAPI 3.1: всі ендпоїнти, необхідні для MVP, з прикладами запитів та відповідей.

**Коли використовувати:** При створенні API клієнтів та інтеграції з бекендом.

### 04_ui_ux_onboarding_chat.md
UI/UX специфікація: онбординг, чат, публічний канал, стандарти дизайну, адаптивність.

**Коли використовувати:** При розробці UI компонентів та сторінок.

### 05_coding_standards.md
Стандарти кодування: TypeScript правила, React патерни, обробка помилок, i18n, UI стандарти.

**Коли використовувати:** При написанні коду для забезпечення якості та узгодженості.

### 06_tasks_onboarding_mvp.md
Технічні задачі для Cursor: детальні специфікації для кожної функції MVP з acceptance criteria.

**Коли використовувати:** Як "панель управління" розробкою — копіювати задачі в Cursor.

### 07_testing_checklist_mvp.md
Тестовий чеклист: критичні E2E тести, тести чату, follow-ups, проєктів, агентів, обробка помилок.

**Коли використовувати:** При тестуванні та перевірці готовності MVP.

### 08_agent_first_onboarding.md
Специфікація агентського онбордингу: діалоговий інтерфейс з агентом-провідником, state-machine, intent parser, повний сценарій діалогу.

**Коли використовувати:** При реалізації агентського онбордингу замість класичних форм/кроків.

### 09_evolutionary_agent.md
Специфікація самонавчального еволюційного агента: 3-рівнева архітектура, Meta-Agent, feedback collector, pattern analyzer, версіонування, Train-to-Earn з DAGI.

**Коли використовувати:** При реалізації функцій самонавчання агента та еволюційного покращення.

### 10_agent_ui_system.md
Повна специфікація агентського інтерфейсу: типи агентів, компоненти UI (Agent Bubble, Chat Window), інтеграція з каналами, сторінка агента з вкладками, взаємодія з подіями.

**Коли використовувати:** При реалізації агентського UI та інтеграції агента в інтерфейс MicroDAO.

### 11_llm_integration.md
Інтеграція LLM (ChatGPT/OpenAI): архітектура, клієнт OpenAI, model router, інтеграція з Agent Chat, Onboarding, Evolutionary Agent, безпека, кешування, альтернативні провайдери.

**Коли використовувати:** При інтеграції LLM у систему агентів MicroDAO та налаштуванні backend-викликів.

### 12_agent_runtime_core.md
Agent Runtime Core: інтерфейси агента (AgentConfig, AgentContext), життєвий цикл (runAgentTurn), інтеграція з пам'яттю та LLM, інструменти (Tools), адаптери, структура файлів.

**Коли використовувати:** При реалізації ядра runtime для агентів та створенні єдиної системи виконання для всіх типів агентів.

### 13_agent_memory_system.md
Система пам'яті агентів: short-term, mid-term, long-term пам'ять, scopes (Personal/Channel/Team/Global), RAG (Retrieval-Augmented Generation), distillation jobs, інтеграція з еволюційним агентом.

**Коли використовувати:** При реалізації системи пам'яті для агентів, RAG, та інтеграції з Agent Runtime Core.

### 14_messenger_agent_module.md
Агент-месенджер MicroDAO: агентське переосмислення месенджера, ролі агентів, функціональні спроможності, інтеграція з Runtime Core та пам'яттю, типові сценарії, реалізація tools.

**Коли використовувати:** При реалізації агентського модуля месенджера та інтеграції класичних функцій чату з агентською системою.

### 15_projects_agent_module.md
Projects Agent Module: агент-проєктний менеджер, ролі (Projects Agent, Task Agent, Planning Agent), структура проєкту, модель задачі, авто-створення задач з діалогів, інтеграція з Runtime Core, пам'яттю та Messenger Agent, UI інтеграція.

**Коли використовувати:** При реалізації агентського модуля управління проєктами та задачами.

### 16_followups_reminders_agent.md
Follow-ups & Reminders Agent: агент-нагадувань та ритму роботи, ролі (Followup Agent, Personal Reminder Agent), фрази-тригери, інтеграція з Projects Agent, tools (create_followup, create_reminder, daily_digest), UI інтеграція.

**Коли використовувати:** При реалізації агентського модуля нагадувань, фоллоуапів та організації ритму роботи спільноти.

### 17_comemory_knowledge_space.md
Co-Memory & Knowledge Space: колективна пам'ять спільноти, структура знань (документи, факти, визначення), агенти (Memory Agent, Knowledge Curator, Knowledge Guide), RAG-пошук, життєвий цикл знань, інтеграція з DAGI.

**Коли використовувати:** При реалізації модуля колективної пам'яті, простору знань та RAG-системи для агентів.

### 18_governance_access_agent.md
Governance & Access Agent: агент правил, доступів та ритуалів спільноти, символічні ключі (Community Keys), ритуали узгодження, індекс довіри, інтеграція з RBAC та entitlements, без фінансової термінології.

**Коли використовувати:** При реалізації модуля управління правилами, доступами та колективними рішеннями спільноти.

### 19_notifications_attention_agent.md
Notifications & Attention Agent: агент уваги та інформаційної гігієни, фільтрація шуму, ранжування важливості, дайджести, потоки уваги (High/Normal/Low), інтеграція з усіма агентами, Attention Hub.

**Коли використовувати:** При реалізації модуля управління сповіщеннями, фільтрації шуму та забезпечення інформаційної гігієни в спільноті.

### 20_integrations_bridges_agent.md
Integrations & Bridges Agent: агент мостів та зовнішніх інтеграцій, месенджери (Telegram, Email), робочі інструменти (Calendar, GitHub), Cross-microDAO зв'язки, Web3-протоколи, Connector Agents, маршрутизація подій.

**Коли використовувати:** При реалізації модуля інтеграцій з зовнішніми платформами, месенджерами та інструментами, а також міжпросторових зв'язків між microDAO.

### 21_agent_only_interface.md
Agent-Only Interface: агентська ОС замість класичного застосунку, layout (3 колонки), панель учасників (Люди/Агенти/Роботи), Agent Hub як стартовий екран, запрошення агентів, обмін ресурсами, MVP.

**Коли використовувати:** При реалізації агентського інтерфейсу та перетворенні MicroDAO на агентську операційну систему спільнот.

### 22_operator_modes_and_system_agents.md
Operator Modes & System Agents: приватні агенти, спільні агенти, операторські режими, DAO Agent, Wallet Agent, модель operatorMode, інтеграція з доступами та ключами, принципи безпеки.

**Коли використовувати:** При реалізації операторських режимів агентів, системних агентів (Personal, Team, Protocol) та інтеграції з Governance та Wallet Agent.

### 22_agent_only_interface_tasks.md
Структурований список задач для реалізації Agent-Only Interface: 4 детальні задачі з специфікаціями, acceptance criteria та прикладами промптів для Cursor.

**Коли використовувати:** При поетапній реалізації Agent-Only Interface — давати Cursor по одній задачі за раз.

### 23_domains_wallet_dao_deepdive.md
Domains, Wallet & DAO Deep Dive: технічний дизайн доменної моделі з мульти-тенант роутінгом, OperatorMode guards, Wallet Agent протокол безпечного підпису, мінімальна реалізація DAO Agent, інтеграція компонентів.

**Коли використовувати:** При реалізації системних компонентів: доменна модель, обмеження операторських режимів, безпечний підпис, інтеграція з on-chain DAO.

### 23_agent_cards_and_console.md
Agent Cards and Console: концепція "живих карток агентів", структура картки, Agent Console з 5 вкладками, метрики досвіду (1T, репутація), підключення до просторів, DAGI інтеграція, зберігання в microDAO.

**Коли використовувати:** При реалізації UI для агентів у форматі карток та повного інтерфейсу Agent Console.

### 24_agent_cards_tasks.md
Структурований список задач для реалізації Agent Cards та Console: 4 детальні задачі (Cards Grid, Console UI, Experience Metrics, Connections Toggles).

**Коли використовувати:** При поетапній реалізації системи карток агентів — давати Cursor по одній задачі за раз.

## MVP Vertical Slice

### MVP_VERTICAL_SLICE.md
Практичний план реалізації MVP для перших користувачів: послідовність етапів (Multi-Tenant + Agent Hub → Агенти → Agent Cards/Console → OperatorMode), приймальні критерії, що входить/не входить в MVP.

**Коли використовувати:** При початку реалізації — це основний документ для створення живого вертикального зрізу системи.

## DAARION.city Integration

### DAARION_city_integration.md
Архітектура інтеграції міського рівня DAARION.city з microDAO: єдина модель (платформи = тип microDAO), спільна ідентичність, city-level Bridges Agent, City Co-Memory, трирівнева Governance, blueprints.

**Коли використовувати:** При інтеграції платформ DAARION.city з microDAO архітектурою та створенні міського шару над microDAO.

### DAARION_city_platforms_catalog.md
Каталог платформ екосистеми DAARION.city: опис домену кожної платформи, агентські модулі, ключі доступу, Embassy-інтеграція. Включає DAARION Core, DAARWIZZ, GREENFOOD, Energy Union, Water Union, Essence Stream.

**Коли використовувати:** При інтеграції конкретних платформ DAARION.city з microDAO, налаштуванні access keys та capabilities для платформ.

## Access Keys & Capabilities System

### 24_access_keys_capabilities_system.md
Універсальна система ключів доступу та capability-механіка для microDAO/DAARION.city. Описує типи ключів (User Session, Agent Access, API Key, Embassy Key, Wallet Capability Key), Wallet Agent специфікацію, Embassy Module, runtime capability-check, інтеграцію з Governance Agent.

**Коли використовувати:** При реалізації системи авторизації, Wallet Agent, Embassy Module, та налаштуванні capabilities для різних типів доступу.

### 28_flows_wallet_embassy_energy_union.md
Sequence-діаграми (Mermaid) ключових флоу для Access Keys & Capabilities System: Login → Capability Token → Action, Agent Run, Stake RINGK → Payout Flow, Embassy Webhook → PDP → RWA Inventory, Energy Union → Embassy Oracle, Wallet Claim Flow, Outbox → NATS Delivery, Governance Flow. Містить опис кожного флоу, Threat Model Integration Points та ключові моменти.

**Коли використовувати:** При реалізації PDP/PEP, Embassy Gateway, Wallet Service та інтеграції з NATS JetStream для event-driven архітектури, тестуванні end-to-end сценаріїв, дебагу production issues.

## Database Schema & Migrations

### 27_database_schema_migrations.md
Повна виробнича специфікація схеми бази даних microDAO/DAARION.city: всі таблиці по модулях (Users, Teams, RBAC, Channels, Messages, Projects, Agents, Wallet, Staking, Payouts, RWA, Embassy, Capability System, Audit, Outbox), порядок міграцій, naming-конвенції, seed-дані, інтеграція з Event Catalog, DevOps pipeline, rollback policy.

**Коли використовувати:** При створенні міграцій БД, плануванні схеми, інтеграції з Supabase/PostgreSQL, та як «джерело істини» для архітектури БД.

## Deployment & Infrastructure

### 25_deployment_infrastructure.md
Deployment процес, середовища (local/dev/staging/prod), інфраструктура (Postgres, NATS, API Gateway, Frontend, Object Storage), CI/CD pipeline, конфігурація та environment variables, secrets management, моніторинг та логування, backups & restore, rollout strategies, feature flags.

**Коли використовувати:** При налаштуванні інфраструктури, створенні CI/CD pipeline, deployment процесів, моніторингу та управлінні середовищами.

## Security & Audit

### 26_security_audit.md
Безпековий чеклист для регулярного аудитування платформи: Identity & Authentication, Authorization Layer (RBAC + Entitlements + Capabilities), Access Keys, Confidential Mode (E2EE), API Security, Web Client Security, Database Security, Secrets Management, Embassy & Webhooks Security, Wallet & Chain Security, RWA Security, Logging & Audit Trail, Monitoring & Alerting, Incident Response, Compliance.

**Коли використовувати:** При проведенні безпекового аудиту, перевірці впровадження security best practices, підготовці до production deployment, та регулярних security reviews.

## Scaling & High Availability

### 29_scaling_and_high_availability.md
Масштабування, відмовостійкість, балансування навантаження, кластеризація сервісів: API Layer Scaling, Backend Domain Services Scaling, Agents Scaling, NATS JetStream Scaling & HA, Postgres High Availability, Outbox Pattern Scaling, Embassy Scaling, Wallet Scaling & RWA, Scaling Frontend, Failover Strategies, Disaster Recovery (DR), Benchmark Targets.

**Коли використовувати:** При проектуванні HA-архітектури, налаштуванні autoscaling, плануванні disaster recovery, та оптимізації продуктивності для production deployment.

## Cost Optimization & Token Economics

### 30_cost_optimization_and_token_economics_infrastructure.md
Оптимізація витрат інфраструктури та зв'язок з токеномікою: основні центри витрат (LLM/AI/Agents, Compute, Storage, Observability), принципи оптимізації, зв'язок токенів (RINGK, 1T, KWT, DAAR/DAARION) з технічною економікою, технічні ліміти та Entitlements, Autoscaling vs. Cost Guards, LLM/Agents Cost Controls, RWA/Embassy обмеження, Wallet/Chain/Gas Optimization, Analytics для економіки, Governance Controls, практичні граничні значення для MVP.

**Коли використовувати:** При проектуванні системи квот та обмежень, інтеграції токеноміки з технічною інфраструктурою, створенні usage tracking та cost controls, налаштуванні governance для економічних політик.

## Governance & Policies

### 31_governance_policies_for_capabilities_and_quotas.md
Політики DAO для управління доступами, квотами, використанням ресурсів: Actors (Governance Token Holders, Governance Agent, Capability Registry, Policy Service), типи політик (Capability, Plan & Entitlement, Stake/RINGK, 1T Compute, KWT Energy, RWA Access, Governance Process), Governance Policy Lifecycle, Policy Structure, Policy Application Rules, Policy Registry, PDP Integration, Example Policies, Governance-Safe Defaults, Security Considerations, Audit & Transparency, Governance Failover Procedures.

**Коли використовувати:** При реалізації Governance Agent, створенні Policy Registry, інтеграції з PDP для управління capabilities та quotas, налаштуванні голосування та застосування політик.

## Policy Service & PDP

### 32_policy_service_PDP_design.md
Архітектура Policy Decision Point (PDP): PDP Formula, PDP Inputs, Architecture Overview, Internal Modules (Role Resolver, Capability Resolver, Entitlements, Quota Manager, ACL Resolver, Confidential Mode Resolver, Key Status Checker), PDP Data Sources, PDP Cache Design (Static, Dynamic, Usage Cache), PDP Decision Algorithm, Integration with API Gateway (PEP), Agents, Embassy, Wallet, Governance, PDP Logging & Audit, Performance Targets, Failure Modes & Recovery, Security Considerations.

**Коли використовувати:** При реалізації Policy Decision Point, проектуванні системи авторизації, інтеграції PDP з API Gateway, Agents, Embassy, Wallet, налаштуванні кешування та оптимізації продуктивності.

## API Gateway & Security

### 33_api_gateway_security_and_pep.md
API Gateway Architecture та Policy Enforcement Point (PEP): High-level Architecture, Key Responsibilities (Authentication, Authorization, Key Lifecycle Management, Usage Accounting, Transport Security), Request Flow, Identity Sources (User, Agent, Embassy, Integration), Key Validation Pipeline, PDP Integration, Rate Limiting Layer (Global, Per-IP, Per-Key, Per-Action, Per-Team), Resource Context Extraction, Confidential Mode Enforcement, Embassy Webhook Security, Wallet API Security, Agent API Security, Quota Enforcement Integration, Logging Model, API Hardening, Error Model, Performance Targets, Failover & Resilience.

**Коли використовувати:** При реалізації API Gateway, створенні PEP middleware, налаштуванні rate limiting, інтеграції з PDP, захисті Embassy webhooks, Wallet API, Agent API, та впровадженні безпекових guardrails.

## Internal Services Architecture

### 34_internal_services_architecture.md
Архітектура внутрішніх сервісів: High-Level Service Landscape, Core Principles, Internal Services Overview (17 сервісів: User/Team, Messaging, Projects/Tasks, Agent Orchestrator, LLM Proxy, Router/Planner, Wallet, RWA Inventory, Embassy Gateway, Oracle Processor, Governance, Capability Registry, Usage, Outbox Worker, Telemetry, Auth/Session, File Storage), Dependency Graph, Internal API Standards, Horizontal Scaling Responsibilities, Event Streams (NATS Topics), Outbox Pattern, Cross-service Transaction Rules, Security Boundaries, Suggested Deployment Model, Failure Isolation, Minimal Monitoring Set.

**Коли використовувати:** При проектуванні backend-архітектури, визначенні відповідальності сервісів, плануванні мікросервісної архітектури, налаштуванні event-driven потоків, та організації взаємодії між сервісами.

## Service Mesh

### 35_microdao_service_mesh_design.md
MicroDAO Service Mesh: High-Level Mesh Architecture, Zero-Trust Model, Service Identity (mTLS), Service Registry, Internal Service-to-Service Traffic, Core Service Mesh Features (mTLS Encryption, Load Balancing, Retries, Circuit Breakers, Timeouts), Internal API Standard, PDP Integration, Mesh-Level Policies (Allow-lists, Deny-lists), Observability Model (Metrics, Tracing, Logs), Failover & Resilience, Mesh Traffic Rules for Critical Services, Service Mesh Security, Deployment Model (Sidecar Mode, Node-agent Mode, Observability stack), Service Mesh Integration with Scaling, Message Patterns, Example Mesh Policy Config.

**Коли використовувати:** При налаштуванні service mesh, впровадженні zero-trust моделі, конфігурації mTLS, налаштуванні observability, та організації безпечної взаємодії між сервісами.

## Agent Security & Isolation

### 36_agent_runtime_isolation_and_sandboxing.md
Безпечна ізоляція приватних агентів: Threat Model, Agent Runtime Architecture, Sandbox Security Model (Isolation Levels, Namespaces/cgroups, Banned syscalls), Network Policy (Default NO NETWORK, Allowed network flows), Agent Permissions & PDP Integration, Tools Architecture (Types of Tools, Tool Execution Model, Tool Security Rules, Dangerous Tools), Agent Memory Model (No persistent state, Co-Memory Integration, Confidential Mode), Prompt Injection Protection, Runtime Limits (CPU, Memory, Timeout, Parallel Agents), File System Policy, Logging Policy, Chain-of-Thought Protection, Deny-List Rules, Escalation Prevention, Governance Hooks for Agents, Observability, Agent Cost Control, Failure Modes.

**Коли використовувати:** При реалізації Agent Runtime, створенні sandbox-середовища, налаштуванні безпеки агентів, інтеграції з PDP для tool invocations, та впровадженні захисту від prompt injection та escalation.

### 37_agent_tools_and_plugins_specification.md
Докладна специфікація інструментів агентів: Architectural Overview, Tool Security Categories (Category A — Safe Tools, Category B — Controlled Tools, Category C — Sensitive Tools, Category D — Critical Tools), Tool Capability Model, Tool Execution Contract, Tool Proxy Rules, Timeouts & Limits per Category, Plugins API (Plugin Manifest, Plugin Execution Flow, Plugin Security Model), Built-in Tools (Core, Internal, Advanced, Platform), Platform Tool Contracts (GREENFOOD, EnergyUnion), Confidential Mode — Tool Restrictions, Error Model, Auditing & Logging, Governance Hooks.

**Коли використовувати:** При реалізації Tool Proxy, створенні інструментів для агентів, розробці Plugins API, інтеграції з платформами DAARION (GREENFOOD, EnergyUnion), та налаштуванні безпеки інструментів.

### 38_private_agents_lifecycle_and_management.md
Життєвий цикл приватних агентів: What Is a Private Agent, Agent Types (User Agent, Team Agent, System Agent), Agent Creation Flow, Agent Schema (DB), Agent Initialization (Bootstrap), Agent Access Keys, Agent Configuration Model, Agent Update Flow, Agent Run Lifecycle (Start, Sandbox Spin-Up, Execute, Complete), Agent Memory Policy, Agent Logs, Agent Suspension, Agent Deletion Flow, Agent Versioning, Security - Critical Guarantees, Events Generated by Agent Lifecycle, Integration with PDP/PEP/Mesh/Tools.

**Коли використовувати:** При реалізації Agent Orchestrator, створенні агентів, управлінні життєвим циклом агентів, налаштуванні конфігурації та безпеки агентів, та інтеграції з PDP/PEP для авторизації.

### 39_private_agent_templates_and_behavior_profiles.md
Шаблони приватних агентів та поведінкові профілі: What is a Behavior Profile, Base Agent Templates (TEMPLATE_A: Assistant, TEMPLATE_B: Analyst, TEMPLATE_C: Operator, TEMPLATE_D: Autonomous Agent), Behavior Profiles (Advisor, Researcher, Project Manager, Automation Builder, Platform Integrator, Autonomous Planner), Behavior Profile Schema, Behavior Parameters (Autonomy Levels, Tone Controls, Output Controls), Tool Access by Profile, Confidential Mode Compatibility, Profile Switching Logic, Safe System Instructions, Governance-Level Restrictions, Security Behavior Controls, Profile Templates Examples.

**Коли використовувати:** При створенні шаблонів агентів, налаштуванні поведінкових профілів, визначенні рівнів автономії, контролі стилю/тону, та стандартизації поведінки агентів.

## RWA & Embassy Integration

### 40_rwa_energy_food_water_flow_specs.md
Потоки RWA (Real-World Assets): Supported RWA Domains (Energy, Food, Water), Data Flow Overview, Embassy Integration (Authentication, HMAC validation), Oracle Payload Specification, RWA Inventory Table Schema, Processing Flow for Each Domain (ENERGY, FOOD, WATER), KWT / 1T Tokenization Rules, Wallet Integration, Governance-Controlled Parameters, Anomaly Detection & Anti-Fraud, Oracle Processor Rules, Data Retention, Critical Security Rules, Example End-to-End Flow (Energy).

**Коли використовувати:** При реалізації Embassy webhook endpoints, Oracle Processor, RWA Inventory updates, Wallet integration для RWA payouts, інтеграції з платформами DAARION (GREENFOOD, EnergyUnion, WaterUnion), та налаштуванні безпеки RWA потоків.

## Governance & AI Agent

### 41_ai_governance_agent_design.md
AI Governance Agent: Governance Model Overview, Governance Proposal Lifecycle, Governance Proposal Structure, Governance Agent Responsibilities (Validation, Voting Finalization, Applying Policy, Audit, Failure Recovery), Governance Agent Internal Architecture, Policy Validation Rules (Format, Capability, Plan/Entitlements, Stake-multiplier, Compute/1T, RWA policies), Voting Engine, Policy Applicator, Registry Integration (Capability, Quota, Stake, RWA), PDP Integration, Security Rules (Critical), Error Recovery, Transparency & Audit, Governance Agent Runtime, Example Policy Application.

**Коли використовувати:** При реалізації AI Governance Agent, створенні системи голосування та застосування політик, інтеграції з Policy Registry та PDP, налаштуванні безпеки Governance Agent, та впровадженні механізмів аудиту та прозорості.

## Event Streams & NATS

### 42_nats_event_streams_and_event_catalog.md
NATS Event Streams & Event Catalog: JetStream Cluster Model, Event Categories Overview (13 груп подій), Stream Naming Convention, Topic Naming Convention, Event Envelope, Outbox Integration (Guaranteed Delivery), Stream-by-Stream Specification (13 стрімів: AGENT_RUN, CHAT, PROJECT, TASK, WALLET, STAKING, PAYOUT, EMBASSY, ORACLE, RWA, GOVERNANCE, USAGE, TELEMETRY), Retention Policies, Consumer Groups, Message Ordering, Security / ACL, Replay & Recovery, NATS Integration with Mesh.

**Коли використовувати:** При налаштуванні NATS JetStream, створенні event streams, визначенні payload схем, конфігурації retention policies, налаштуванні consumer groups, впровадженні ACL та безпеки, та інтеграції з Outbox Worker.

### 43_database_events_outbox_design.md
Database Events Outbox Design: Why Outbox Pattern Is Required, Outbox Table Schema, Outbox Event Insertion (atomic transaction), Outbox Worker Architecture, Worker Processing Loop, Deduplication (NATS header Nats-Msg-Id), Retry Strategy (exponential backoff, dead-letter condition), Batch Processing & Throughput, Event Ordering Rules, Multi-Stream Routing, Failure Modes, Safety Guarantees (atomicity, consistency, at-least-once, no-loss, replayability), Event Consumer Rules, Operational Metrics, Backpressure Control, Batch Deletion / Archival, Example End-to-End Flow (Payout).

**Коли використовувати:** При реалізації Outbox Pattern, створенні таблиці outbox_events, розробці Outbox Worker, забезпеченні гарантій доставки подій, інтеграції з NATS JetStream, та налаштуванні retry/backoff механізмів.

## Usage & Quota Management

### 44_usage_accounting_and_quota_engine.md
Usage Accounting & Quota Engine: Usage Engine Architecture, Usage Metrics (Canonical List - LLM, Agents, Router, Embassy, RWA, Wallet, Storage), Quota Types (Hard quotas, Soft quotas, Compute cost ceilings), Quota Formula (base_quota(plan) × multiplier(stake)), Counters Storage Model (Redis fast counters, Postgres durable counters), Quota Engine Decision Logic, Warning Thresholds, Rate Limiting Integration, PDP Integration, Cost Accounting (1T Integration), Embassy/RWA Quotas, Agent Run Limits, Storage/Files Quotas, Wallet/Chain Quotas, Usage Correction / Reconciliation, Governance Controls, Abuse / Fraud Protection, Observability, Error Model, Example Scenarios.

**Коли використовувати:** При реалізації Usage Engine, створенні системи обліку використання ресурсів, налаштуванні квот, інтеграції з PDP, контролі вартості, захисті від зловживань, та налаштуванні rate limiting.

## LLM & Router

### 45_llm_proxy_and_multimodel_routing.md
LLM Proxy & Multi-Model Routing: High-Level Architecture, Why Not Call LLM Directly, Core Responsibilities, Supported Model Types (Text, Vision, Embeddings, Code, Audio), Normalized Request Schema, Routing Modes (DIRECT, TIERED ROUTING, Specialized), Fallback Logic, Prompt Sanitization Layer, Confidential Mode, PDP Integration, Token Counting, Cost Calculation (1T Integration), Multi-Model Orchestration, Error Model, Retry / Timeouts, Model Selection Logic, Local Model Constraints, Autoscaling, Logging & Monitoring, Safety / Guardrails, Example Complete Flow.

**Коли використовувати:** При реалізації LLM Proxy, налаштуванні маршрутизації моделей, інтеграції з різними LLM провайдерами, контролі вартості та токенів, впровадженні fallback логіки, та забезпеченні безпеки promptів.

### 46_router_orchestrator_design.md
Router Orchestrator Design: High-Level Architecture, Input Specification, Router Modes (AUTO PLAN, STRUCTURED, HYBRID), State Machine Architecture (INIT, PLAN, EXECUTE_STEP, WAIT_TOOL, WAIT_AGENT, ERROR_RECOVERY, DONE), Step Engine (LLM, Tool, Agent, Platform, Branch, Parallel, Loop), Safety Limits, Cost Control, Confidential Mode, Tool Execution Flow, LLM Execution Flow, Subagent Execution Flow, Error Handling, Logging, Monitoring, Platform Tool Integration, Parallel Steps, Branch Logic, Loop Logic, Full Example Flow.

**Коли використовувати:** При реалізації DAARWIZZ Router, створенні multi-step orchestration, налаштуванні state machine, інтеграції з tools, agents, LLM Proxy, та контролі вартості та безпеки флоу.

## Messaging & Privacy

### 47_messaging_channels_and_privacy_layers.md
Messaging Channels & Privacy Layers: Messaging Entities (Direct Messages, Team Channels, System Channels), Channel Types (DIRECT, TEAM PUBLIC, TEAM PRIVATE, CONFIDENTIAL CHANNEL), Channel Schema, Message Schema, E2EE Model (Optional Layer), Confidential Mode Rules, ACL Model, Agent Visibility Rules, Search Indexing, Message Lifecycle (Create, Edit, Delete), Retention Rules, Attachments (Files), Moderate / Filter System, Chat → Agent → LLM Proxy Flow, Chat → Router Flow, System Channels, Governance Controls, Observability & Telemetry.

**Коли використовувати:** При реалізації системи чатів та каналів, налаштуванні приватності та confidential mode, створенні ACL, інтеграції з агентами та LLM Proxy, та забезпеченні безпеки повідомлень.

### 48_teams_access_control_and_confidential_mode.md
Teams Access Control & Confidential Mode: Team (microDAO) Model, Team Roles (Owner, Guardian, Admin, Member, Guest, Agent), Role Capability Mapping, Team-Level ACL (Projects, Channels, Agents, Wallet, Embassy Data), Team States (active, locked, confidential, suspended, archived), Confidential Mode (LLM Proxy behavior, Agents restrictions, Messaging rules, Projects/Tasks rules, Wallet/RWA rules), Team Privacy Layers (open, restricted, private, confidential), Team Settings Schema, PDP Integration, Governance Controls, Membership Lifecycle (Create Team, Invite Member, Promote, Demote, Remove), Agent Integration Rules, Examples.

**Коли використовувати:** При реалізації системи доступів команд, налаштуванні ролей та ACL, впровадженні confidential mode, інтеграції з PDP, та управлінні членством у командах.

## Wallet & RWA

### 49_wallet_rwa_payouts_claims.md
Wallet, RWA, Payouts & Claims: Wallet Tokens (1T, KWT, RINGK, DAARION), Wallet Architecture, Wallet Schema (Balances, Transactions, Payouts), ACL Rules, RWA → Payout Formula (ENERGY → KWT, FOOD → 1T, WATER → 1T/KWT), Payout Lifecycle, Claim Lifecycle, Conversion Rules (KWT → 1T, DAARION → RINGK, RINGK → 1T impossible), Daily/Monthly Limits, Fraud Protection, Governance Controls, Integrations (NATS Events, Usage Engine, PDP), Transparency & Logs, Example Scenarios.

**Коли використовувати:** При реалізації Wallet Service, створенні системи балансів та транзакцій, налаштуванні RWA нарахувань та payouts, інтеграції з Embassy/RWA/Outbox/NATS, та забезпеченні безпеки та прозорості економічної моделі.

## Website Integration

### 50_daarion_city_website_integration.md
DAARION.city Website Integration: Architecture Overview (Embedded Widget, iframe Embed, Full Redirect), DAARION.city as First MicroDAO (Team Setup, Public Channel Setup, City Agent Setup), Public Channel API (Get Channel Info, Get Messages, Post Message, Register as Viewer/Member), UI/UX for Website Integration (Embedded Widget Component, Widget Layout, Authentication Flow), SEO & Metadata (Open Graph Tags, Twitter Cards, Structured Data), Security & Privacy (CORS Configuration, Rate Limiting, Content Moderation), Analytics & Tracking, Implementation Steps, Example Integration Code (Next.js Page, React Widget Component), Testing Checklist.

**Коли використовувати:** При інтеграції MicroDAO у офіційний сайт DAARION.city, створенні публічного каналу міста, вбудовуванні віджета на сайт, налаштуванні authentication flow для користувачів сайту, додаванні SEO метаданих та analytics tracking.

## Tokenomics

### tokenomics/city-tokenomics.md ⭐ CANONICAL
City Tokenomics — DAARION.city (v1.0.0, status: canonical): DAAR (Utility Token), DAARION (Civic/Identity Token), Рівні доступу (Звичайні користувачі, Постачальники, Створення платформ, Створення MicroDAO), Ієрархія MicroDAO (A1: DAARION.city, A2: Міські платформи, A3: Публічні MicroDAO, A4: Приватні MicroDAO), MicroDAO Tokens (GOV, UTIL, REP), Fees & Costs, Staking & Rewards (DAAR: 20% APR, DAARION: 4% + revenue share), Token Bridges & Onboarding, Integration Points (Wallet Service, PDP, Agents, DAGI Registry), Security Rules, MVP Scope.

**Коли використовувати:** При реалізації токеноміки DAARION.city, створенні DAOFactory, TokenBridge, інтеграції з Wallet Service, PDP token-gating, staking системи, валідації доступу користувачів, роботі агентів DAARWIZZ, контролі доступу до платформ, ліцензуванні сервісів, та реалізації багаторівневої архітектури міста.

> **Примітка:** Це єдиний актуальний документ з токеноміки. Попередній `tokenomics/README.md` перенесено в `docs/_archive/tokenomics_legacy_v0.md`.

## Як використовувати з Cursor

### 1. Початкове налаштування
Додай всю папку `docs/cursor/` в контекст Cursor або вкажи на конкретні файли при створенні промптів.

### 2. Початок роботи (MVP)
Почни з `MVP_VERTICAL_SLICE.md` — це практичний план для створення першого живого зрізу системи.

### 2. Створення промптів
Використовуй формат з `06_tasks_onboarding_mvp.md`:

```
You are a senior React/TypeScript engineer.

Task: [Назва задачі з 06_tasks_onboarding_mvp.md]

Context:
- Product brief: 01_product_brief_mvp.md
- API specs: 03_api_core_snapshot.md
- UI/UX: 04_ui_ux_onboarding_chat.md
- Coding standards: 05_coding_standards.md

Please output:
- List of files to modify/create
- Code diff
- Short summary
```

### 3. Перевірка коду
Після генерації коду перевіряй відповідність:
- `05_coding_standards.md` — стандарти кодування
- `07_testing_checklist_mvp.md` — тестові сценарії

## Швидкий старт

1. **Ознайомся з проєктом:** `00_overview_microdao.md`
2. **Зрозумій бізнес-логіку:** `01_product_brief_mvp.md`
3. **Вивчи архітектуру:** `02_architecture_basics.md`
4. **Почни з онбордингу:** 
   - Класичний: `06_tasks_onboarding_mvp.md` → Block A
   - Агентський: `08_agent_first_onboarding.md`
5. **Тестуй:** `07_testing_checklist_mvp.md`

## Важливі примітки

- Всі API контракти беріть тільки з `03_api_core_snapshot.md`
- Всі UI тексти беріть з `04_ui_ux_onboarding_chat.md`
- Дотримуйтесь стандартів з `05_coding_standards.md`
- Не вигадуйте нові API або UI елементи без узгодження

## Посилання на повну документацію

- Повна OpenAPI специфікація (за потреби)
- Data Model & Event Catalog
- Tech Spec / Технічний опис MicroDAO
- UI/UX Specification — microdao (web)

---

**Версія:** MVP v1.0  
**Останнє оновлення:** 2024-11-13

