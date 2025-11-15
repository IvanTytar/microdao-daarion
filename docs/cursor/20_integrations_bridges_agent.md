# 20 — Integrations & Bridges Agent (MicroDAO)

Агент мостів, міжпросторових зв'язків та зовнішньої взаємодії

Integrations & Bridges Agent — це модуль, який забезпечує обмін інформацією між microDAO та зовнішнім світом:
іншими платформами, месенджерами, інструментами, сервісами, даними та іншими агентськими екосистемами.

Це "протокольний шар" агентської ОС DAARION.city.

---

# 1. Призначення

Bridges Agent виконує функції:

- інтеграції із зовнішніми платформами,
- маршрутизації даних,
- синхронізації контекстів,
- взаємодії між різними агентськими системами,
- побудови міжпросторових каналів (cross-microDAO),
- підключення до сторонніх інструментів (пошта, календар, API),
- реалізації безпечних каналів входу/виходу з екосистеми.

Основна ідея — **microDAO не живе в ізоляції, а існує у зв'язку зі світом**.

---

# 2. Види інтеграцій

### 2.1. Месенджери та комунікаційні сервіси

- Telegram (вхідні повідомлення, вихідні, канали, боти)
- WhatsApp / Signal (через API-адаптери)
- Email
- SMS (опційно)

### 2.2. Робочі інструменти

- Google Calendar / iCal
- Google Drive / Dropbox (для файлів)
- GitHub (issues, PRs, CI)
- Notion / Confluence (документи)

### 2.3. API зовнішніх сервісів

- Webhooks
- REST / GraphQL
- OAuth2 інтеграції

### 2.4. Cross-microDAO зв'язки

- "міст" між microDAO для:

  - спільних агентів,
  - спільних проєктів,
  - спільної пам'яті,

- міжміські зв'язки DAARION.city.

### 2.5. Web3-протоколи

- підписані повідомлення,
- capability-токени доступу,
- безпечна автентифікація.

---

# 3. Агенти інтеграцій

Модуль складається із під-агентів:

## 3.1. Bridges Agent (основний)

Роль: `"bridges_core"`

Він:

- керує списком інтеграцій,
- маршрутизує дані між контекстами,
- керує підключенням зовнішніх API.

## 3.2. Connector Agents (адаптери)

Ролі: `"telegram_connector"`, `"email_connector"`, `"calendar_connector"`, `"github_connector"` тощо.

Кожен Connector:

- має свої ключі/аутентифікацію,
- вміє читати/писати події,
- перетворює зовнішній формат → внутрішній формат events у microDAO.

## 3.3. CrossDAO Agent

Роль: `"crossdao_bridge"`

Відповідає за:

- між-microDAO синхронізацію,
- передачу фактів/документів,
- спільних агентів,
- правила та ритуали між DAO.

---

# 4. Модель інтеграції

### 4.1. Таблиця інтеграцій

`integrations`:

- id  
- team_id  
- type (`telegram`, `email`, `calendar`, `github`, …)  
- config_json  
- status (`active`, `disabled`)  
- created_at  

### 4.2. Модель подій

Всі зовнішні події конвертуються у універсальний формат:

```
event: {
id,
team_id,
source,        // telegram | email | github | ...
type,          // message | file | issue | event | calendar_update ...
payload,       // JSON
ts
}
```

Цей формат потім обробляється:

- Messenger Agent,
- Projects Agent,
- Followups Agent,
- Attention Agent,
- Memory Agent.

---

# 5. Основні сценарії

### 5.1. Telegram → microDAO

- повідомлення з каналу/групи → вхідний event,
- Bridges Agent передає їх Messenger Agent'у,
- агент може відповідати назад у Telegram (якщо дозволено).

### 5.2. microDAO → Email

- агент може відправити email через Email Connector:

  "Сформуй лист-запит у партнерську організацію."

### 5.3. GitHub → Projects Agent

- issue → створення задачі,
- PR → оновлення статусів,
- label changes → пріоритизація.

### 5.4. Calendar → Followups Agent

- події календаря → нагадування,
- синхронізація дедлайнів.

### 5.5. Cross-microDAO

- передача фактів між двома DAO:

  "Поділись цим визначенням з іншим microDAO".

- спільна робота агента у двох DAO.

---

# 6. Інтеграція з Runtime Core (12)

Основний агент:

```ts
const bridgesAgentConfig: AgentConfig = {
  id: "ag_bridges_core",
  teamId: "...",
  name: "Bridges Agent",
  role: "bridges_core",
  systemPrompt: systemBridgesPrompt,
  memoryScope: "team",
  tools: [
    "sync_event",
    "push_notification",
    "pull_updates",
    "register_integration",
    "update_integration",
    "disable_integration"
  ]
};
```

Адаптери — це окремі агенти з вузькими tools.

---

# 7. Tools (для Runtime Core)

### 7.1. register_integration

Реєструє інтеграцію (тип, ключі доступу, конфіг).

### 7.2. update_integration

Оновлює конфіг інтеграції.

### 7.3. disable_integration

Вимикає інтеграцію.

### 7.4. sync_event

Приймає подію від зовнішнього джерела і конвертує у внутрішню подію.

### 7.5. push_notification

Відправляє повідомлення у зовнішній світ (Telegram, Email тощо).

### 7.6. pull_updates

Регулярно опитує зовнішній сервіс (GitHub, Calendar).

---

# 8. UI

## 8.1. Sidebar → Інтеграції

* список інтеграцій,
* кнопка "Підключити інтеграцію".

## 8.2. Модалка підключення інтеграції

* вибір сервісу: Telegram / Email / Calendar / GitHub / Custom API,
* ввод даних підключення,
* тестування підключення,
* збереження.

## 8.3. Профіль інтеграції

* історія подій,
* статус,
* налаштування,
* кнопка "Вимкнути".

## 8.4. Cross-microDAO панель

* список підключених DAO,
* права та контексти,
* статуси синхронізації.

---

# 9. API

### Інтеграції

`GET /integrations?team_id`
`POST /integrations`
`PATCH /integrations/:id`
`DELETE /integrations/:id`

### Події

`POST /integrations/events`
`GET /events?team_id&type=external`

### Cross-DAO

`POST /crossdao/share_fact`
`POST /crossdao/share_document`

---

# 10. Інструкції для Cursor

```
Implement the Integrations & Bridges Agent using:

- 20_integrations_bridges_agent.md
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 16_followups_reminders_agent.md
- 17_comemory_knowledge_space.md
- 18_governance_access_agent.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Create backend models for integrations and external events.

2) Implement API for listing, creating, updating, disabling integrations.

3) Register Bridges Agent and connector agents.

4) Implement adapters:

   - Telegram (stub)

   - Email (stub)

   - Calendar (stub)

   - GitHub (stub)

5) Create UI:

   - Integrations list in sidebar

   - Integration setup modal

   - Integration profile page

6) Implement event syncing logic (sync_event tool → Messenger/Projects/Followups/Attention Agents)

Output:

- list of modified files
- diff
- summary
```

---

# 11. Результат

Після впровадження:

* microDAO стає мережевим вузлом,
* агенти можуть діяти в кількох просторах,
* знання й події можуть перетікати між DAO,
* зовнішні інструменти інтегруються легко та безпечно,
* DAARION.city отримує основу для єдиного агентського всесвіту.


