---
title: Agents Map — DAARION.city
version: 1.0.0
status: canonical
last_updated: 2024-11-14
---

> **Цей документ є актуальною картою всіх агентів у DAARION.city.**  
> Інтегрується з `microdao-architecture.md` та ієрархією A1-A4.

# Agents Map — DAARION.city

*Консолідована карта всіх агентів екосистеми DAARION.city з ієрархією A1-A4*

---

## 1. Overview

DAARION.city працює на **багаторівневій системі агентів**, організованих за ієрархією MicroDAO:

- **A1** — DAARION.city (системні агенти, DAARWIZZ)
- **A2** — Міські платформи (платформні агенти)
- **A3** — Публічні MicroDAO (DAO-агенти)
- **A4** — Приватні MicroDAO (приватні агенти)

Кожен рівень має своїх агентів з відповідними правами, пам'яттю та інтеграціями.

---

## 2. A1 — DAARION.city (Root Level Agents)

### 2.1 DAARWIZZ — System Orchestrator Agent

**Роль:** Головний системний агент міста, маршрутизатор та планувальник Swarm-OS

**Призначення:**
- Оркестрація DAGI (Distributed AI Grid)
- Роутинг запитів між моделями та агентами
- Multi-agent сценарії та планування
- Телеметрія та моніторинг якості

**Агентські модулі:**
- **Router Agent** — розподіляє запити між моделями та агентами
- **Planner Agent** — декомпозує задачі, запускає ланцюжки інструментів
- **Observer/Telemetry Agent** — відстежує якість, латентність, бюджет

**Capabilities:**
- `router.invoke`
- `router.plan.run`
- `router.tool.call`
- `telemetry.events.write`
- `telemetry.events.read:aggregate`

**Доступ:**
- Користувацькі microDAO отримують DAARWIZZ-keys через:
  - Wallet Agent (оплата DAAR / 1T)
  - План Platformium

---

### 2.2 City-Level Agents

**City Governance Agent**
- Міські правила, дух міста
- Governance proposals, voting, policies
- Інтеграція з AI Governance Agent (`41_ai_governance_agent_design.md`)

**City Registry Agent**
- Реєстр мешканців, громадянство
- Управління citizenship, рівнями доступу
- DAARION-статус та права

**City Bridges Agent**
- Зв'язки між city ↔ платформи ↔ microDAO
- Синхронізація подій між рівнями
- City events broadcast

**City Co-Memory Agent**
- Загальноміський простір знань
- City Knowledge Spaces (City.Ecology, City.Energy, City.Food, City.Governance)
- Публікація фактів від платформ у City Co-Memory

**Second Me Agent**
- Персональний цифровий двійник резидента
- Особистий контекст та пам'ять

**Citizenship Agent**
- Керує резидентством, рівнями доступу, DAARION-статусом
- Capabilities: `citizenship.status.view`, `citizenship.level.upgrade`

**Gift Fabric Agent**
- Відстежує акти взаємодії й відгук міста (MJD)
- Capabilities: `gift.act.register`

---

## 3. A2 — Platform Agents (Міські платформи)

Кожна платформа має власних агентів, які працюють на рівні платформи.

### 3.1 GREENFOOD Platform Agents

**Warehouse Agent**
- Облік партій/залишків
- Capabilities: `platform.greenfood.inventory.view/update`

**Logistics Agent**
- Маршрути та хаби
- Capabilities: `platform.greenfood.shipment.create`

**Accounting Agent**
- Автоматичні нарахування/розподіл по кооперативу
- Capabilities: `platform.greenfood.coop.balance.view`

**Sales Agent**
- Інтеграція з маркетплейсами
- Capabilities: `platform.greenfood.member.register`

**Community Coordinator Agent**
- Координація між учасниками спільноти

**Embassy Integration:**
- `rwa.claim` (сертифікати продуктів)
- `rwa.stock.update` (запаси на складах)

---

### 3.2 Energy Union Platform Agents

**Metering Agent**
- Читає лічильники генерації/споживання
- Capabilities: `energy.meter.read`

**Oracle Agent**
- Агрегує дані, формує виплати KWT/1T
- Capabilities: `energy.payout.compute`

**Facility Agent**
- Агент об'єкта (сонячна станція, дата-центр)
- Capabilities: `energy.asset.read`

**Energy Market Agent**
- Узгоджує акти енергетичного дарообміну
- Capabilities: `wallet.payout.view/claim`

**Embassy Integration:**
- `embassy.energy.update`
- `embassy.rwa.claim` (сертифікати енергетичних часток)

---

### 3.3 Water Union Platform Agents

**Sensor Agent**
- Збір даних з сенсорів (якість/об'єм води)
- Capabilities: `water.sensor.read`, `water.sensor.update`

**Infrastructure Agent**
- Стан насосів, резервуарів
- Capabilities: `water.infrastructure.view`

**Community Water Agent**
- Координація доступу громад, планування ремонтів

**Water RWA Agent**
- Сертифікати дару на водні ініціативи
- Capabilities: `rwa.water.claim`

---

### 3.4 Essence Stream Platform Agents

**Curator Agent**
- Формує програми, добирає контент
- Capabilities: `essence.event.publish`

**Event Agent**
- Події, квитки (як сертифікати дару)
- Capabilities: `essence.event.register`

**Mentor Agent**
- Персоналізовані навчальні траєкторії
- Capabilities: `essence.course.view`

**Quest Agent**
- Квести/ігрові сценарії в DAARION.city
- Capabilities: `essence.quest.progress.update`

---

### 3.5 Helion Platform Agents

**Energy Production Agent**
- Управління енергетичними об'єктами
- Моніторинг генерації

**Energy Distribution Agent**
- Розподіл енергії між споживачами
- Балансування навантаження

---

### 3.6 Soul Platform Agents

**Social Graph Agent**
- Управління соціальними зв'язками
- Рекомендації та мережі

**Community Builder Agent**
- Створення та координація спільнот
- Інтеграція з microDAO

---

### 3.7 Dario Platform Agents

**City Services Agent**
- Управління міськими сервісами
- Координація з міською інфраструктурою

---

### 3.8 Nutra Platform Agents

**Health & Nutrition Agent**
- Управління здоров'ям та нутрицією
- Персоналізовані рекомендації

---

## 4. A3 — Public MicroDAO Agents

Публічні MicroDAO мають стандартний набір агентів, доступних для всіх резидентів.

### 4.1 Team Assistant (Core Agent)

**Призначення:**
- Основний помічник команди
- Відповіді у спільних чатах
- Автоматичні підсумки
- Створення follow-ups
- Пропозиції задач

**Capabilities:**
- `agent.run.invoke`
- `chat.message.send`
- `project.task.create`
- `followup.create`

---

### 4.2 Messenger Agent

**Призначення:**
- Управління чатами та каналами
- Фільтрація та пошук повідомлень
- Розумні папки та огляди

**Capabilities:**
- `chat.message.read`
- `chat.message.send`
- `channel.manage`

---

### 4.3 Projects Agent

**Призначення:**
- Управління проєктами та задачами
- Канбан-дошки
- Авто-генерація тасок з діалогів

**Capabilities:**
- `project.create`
- `project.manage`
- `task.create`
- `task.manage`

---

### 4.4 Follow-ups & Reminders Agent

**Призначення:**
- Перетворення повідомлень на задачі
- Планування часу
- Нагадування

**Capabilities:**
- `followup.create`
- `followup.remind`

---

### 4.5 Co-Memory & Knowledge Space Agent

**Призначення:**
- Документи, wiki, нотатки
- RAG по документах та пам'яті
- Інтерфейс "покажи, що ми вже знаємо про X"

**Capabilities:**
- `comemory.item.read`
- `comemory.item.write`

---

### 4.6 Governance & Access Agent

**Призначення:**
- Голосування, пропозиції, кворум
- Зв'язок з 1T / RINGK / іншими токенами
- Train-to-Earn з точки зору агента

**Capabilities:**
- `governance.proposal.create`
- `governance.vote.cast`
- `governance.policy.manage`

---

### 4.7 Notifications & Attention Agent

**Призначення:**
- Які події важливі, які — ні
- Digest-и, дайджести, персональні огляди дня/тижня

**Capabilities:**
- `notification.send`
- `attention.prioritize`

---

### 4.8 Integrations & Bridges Agent

**Призначення:**
- Telegram / WhatsApp / email / календар
- Як мости працюють через агентську логіку
- Маршрутизація повідомлень і контексту

**Capabilities:**
- `integration.bridge.create`
- `integration.message.route`

---

## 5. A4 — Private MicroDAO Agents

Приватні MicroDAO мають повну автономію та можуть мати власних агентів.

### 5.1 Personal Agents

**Призначення:**
- Особистий супутник користувача
- Особистий контекст та пам'ять
- Приватні нотатки, документи, нагадування
- Приватний інтерфейс до DAGI

**Права:**
- Тільки `personal_space`
- Немає доступу до командних просторів без спеціального дозволу

**Operator Mode:**
- Може працювати як оператор лише в особистому просторі
- Обмежені інструменти: `create_personal_note`, `create_personal_task`, `personal_digest`

---

### 5.2 Private Team Agents

**Призначення:**
- Аналогічні до A3 агентів, але з обмеженим доступом
- Працюють тільки в межах приватного MicroDAO
- Не мають доступу до публічних даних

**Особливості:**
- Confidential mode за замовчуванням
- Обмежений доступ до LLM Proxy (тільки summary/embeddings)
- Немає публічного індексування

---

## 6. Agent Hierarchy & Integration

### 6.1 Hierarchy Flow

```text
A1: DAARION.city
  ├── DAARWIZZ (System Orchestrator)
  ├── City Governance Agent
  ├── City Registry Agent
  ├── City Bridges Agent
  └── City Co-Memory Agent
      │
      ├── A2: Platforms
      │   ├── GREENFOOD Agents
      │   ├── Energy Union Agents
      │   ├── Water Union Agents
      │   └── Essence Stream Agents
      │
      ├── A3: Public MicroDAO
      │   ├── Team Assistant
      │   ├── Messenger Agent
      │   ├── Projects Agent
      │   └── ... (standard agents)
      │
      └── A4: Private MicroDAO
          ├── Personal Agents
          └── Private Team Agents
```

### 6.2 Integration Points

**DAARWIZZ Integration:**
- Всі агенти можуть використовувати DAARWIZZ для роутингу та планування
- Доступ через DAAR/1T оплату або Platformium план

**PDP Integration:**
- Всі агенти перевіряються через PDP для доступу до ресурсів
- Capability-based access control

**Wallet Integration:**
- Агенти можуть працювати з UTIL токенами
- Не можуть змінювати баланси DAAR/DAARION

**Embassy Integration:**
- Платформні агенти (A2) мають доступ до Embassy для RWA
- City-level агенти мають обмежений доступ до Embassy

---

## 7. Agent Memory & Context

### 7.1 Memory Scopes

**A1 Agents:**
- City-level memory (загальноміський контекст)
- Доступ до всіх платформ та публічних MicroDAO

**A2 Agents:**
- Platform-level memory (контекст платформи)
- Доступ до City Co-Memory для публікації фактів

**A3 Agents:**
- Team-level memory (контекст команди)
- Обмежений доступ до City Co-Memory

**A4 Agents:**
- Personal/Private memory (особистий/приватний контекст)
- Немає доступу до City Co-Memory

### 7.2 Confidential Mode

**A4 Agents (Private MicroDAO):**
- Confidential mode за замовчуванням
- LLM Proxy отримує тільки summary/embeddings
- Немає публічного індексування

**A3 Agents (Public MicroDAO):**
- Можуть мати confidential канали
- Обмежений доступ до plaintext у confidential каналах

---

## 8. Agent Capabilities Matrix

| Agent Type | Router Access | Wallet Access | Embassy Access | City Co-Memory |
|------------|---------------|---------------|----------------|----------------|
| DAARWIZZ | ✅ Full | ❌ No | ❌ No | ✅ Read/Write |
| City Agents | ✅ Via DAARWIZZ | ❌ No | ⚠️ Limited | ✅ Read/Write |
| Platform Agents | ✅ Via DAARWIZZ | ⚠️ UTIL only | ✅ Full | ✅ Publish |
| A3 Agents | ✅ Via DAARWIZZ | ⚠️ UTIL only | ❌ No | ⚠️ Read only |
| A4 Agents | ✅ Via DAARWIZZ | ⚠️ UTIL only | ❌ No | ❌ No |

---

## 9. Agent Lifecycle

### 9.1 Creation

**A1 Agents:**
- Створюються при ініціалізації DAARION.city
- Системні агенти, не можуть бути видалені

**A2 Agents:**
- Створюються при реєстрації платформи
- Управляються платформою

**A3/A4 Agents:**
- Створюються через DAOFactory (1 DAAR або 0.01 DAARION)
- Управляються власниками MicroDAO

### 9.2 Configuration

Всі агенти налаштовуються через:
- Agent Config (роль, системний промпт, пам'ять)
- Capabilities (доступ до інструментів)
- Memory Scope (channel, team, global)

### 9.3 Updates

- Агенти можуть оновлюватися через Governance
- Еволюційні агенти можуть самонавчатися (з дозволу користувача)

---

## 10. Integration with Other Docs

Цей документ інтегрується з:

- `microdao-architecture.md` — архітектура MicroDAO (A1-A4)
- `tokenomics/city-tokenomics.md` — токеноміка та доступ
- `cursor/12_agent_runtime_core.md` — Agent Runtime Core
- `cursor/13_agent_memory_system.md` — Agent Memory System
- `cursor/22_operator_modes_and_system_agents.md` — System Agents
- `cursor/38_private_agents_lifecycle_and_management.md` — Private Agents
- `cursor/41_ai_governance_agent_design.md` — AI Governance Agent
- `cursor/46_router_orchestrator_design.md` — Router/Orchestrator
- `DAARION_city_platforms_catalog.md` — Платформи та їх агенти

---

## 11. Changelog

### v1.0.0 — 2024-11-14
- Початкова версія карти агентів
- Додано DAARWIZZ як системний агент A1
- Додано City-level агенти
- Додано Platform Agents (A2)
- Додано Public MicroDAO Agents (A3)
- Додано Private MicroDAO Agents (A4)
- Додано Agent Hierarchy & Integration
- Додано Agent Capabilities Matrix

---

**Версія:** 1.0.0  
**Останнє оновлення:** 2024-11-14  
*Документ готовий до інтеграції у Cursor, GitHub або будь-який інший проект.*


