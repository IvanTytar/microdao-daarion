# MVP_VERTICAL_SLICE — MicroDAO (Agent-First MVP)

Вертикальний зріз для перших живих користувачів

Цей документ визначає, ЩО саме потрібно реалізувати у першому MVP, щоб:

- microDAO виглядало як окремий "живий простір",
- користувач одразу взаємодіє з агентами,
- є базові чати, проєкти, нагадування,
- агенти мають "обличчя" (картки + консолі),
- операторські режими вже закладені в архітектуру, але не перевантажують реалізацію.

Документ збирає ключові фрагменти з:

- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 16_followups_reminders_agent.md
- 21_agent_only_interface.md
- 22_operator_modes_and_system_agents.md
- 23_domains_wallet_dao_deepdive.md
- 23_agent_cards_and_console_tasks.md

---

# 0. Мета MVP

Зробити **один живий вертикальний шмат**:

- людина заходить у свій microDAO (через slug.daarion.city),
- бачить Agent Hub (головний екран),
- спілкується з Team Assistant,
- бачить "Учасників" (Люди / Агенти),
- має базові канали (Messenger Agent),
- має хоча б один Проєкт і Задачі (Projects Agent),
- може сказати "нагадай" (Followups Agent),
- може зайти на `/agents` і побачити картки агентів,
- може відкрити Agent Console і подивитись, де агент присутній.

Web3, DAO-протокол, Wallet Agent, глибокий Governance, Attention, Co-Memory — описані, але **не обовʼязково реалізуються в цьому MVP**, тільки каркас там, де це дешево.

---

# 1. Multi-tenant & Team Context (без кастомних доменів)

## 1.1. Обсяг MVP

Реалізувати:

- `teams.slug` + базовий domain routing по `slug.daarion.city`,
- `currentTeamId` у бекенд-контексті,
- два режими UI:

  - режим `/t/:teamId/...` (центральний домен),
  - режим `slug.daarion.city/...` (автоматичне визначення `teamId` з домену).

Не реалізувати:

- кастомні домени користувачів (`mydao.org`),
- DNS-перевірки, SSL-автоматизацію.

## 1.2. Tasks

1) Додати в БД:

   - поле `slug` у `teams`.

2) Реалізувати lookup:

   - `Host` → `slug` → `teamId`.

3) У бекенд-контексті:

   - зберігати `currentTeamId`.

4) На фронті:

   - якщо контекст дає `currentTeamId` з домену:

     - приховати `t/:teamId` у URL,
     - використовувати просто `/home`, `/agents`, `/projects` тощо.

---

# 2. Agent Hub (Home) + Agent-Only Interface Shell

Спиратись на:  

`21_agent_only_interface.md` (Agent-Only Interface)  

+ базові UI стандарти (`10_agent_ui_system.md`).

## 2.1. Обсяг MVP

1) Новий маршрут:

   - `/t/:teamId/home` (у режимі slug-домену — просто `/home`).

2) Лівий сайдбар:

   - блок "Простори / Проєкти" (stub-список, але справжні посилання),
   - блок "Учасники": `Люди / Агенти / Роботи (плейсхолдер)`.

3) Центральна область:

   - **Agent Hub Chat** з Team Assistant:

     - мінімальний AgentChatWindow,
     - LLM-виклик з `agent_id = Team Assistant`.

4) Правий сайдбар:

   - stub "Контекст команди":

     - кількість учасників,
     - кількість проєктів,
     - список останніх подій (можна поки мок).

## 2.2. Tasks

1) Додати компонент `AgentHubPage`.

2) Додати маршрут `/t/:teamId/home`.

3) У сайдбарі додати пункт "Головна / Agent Hub".

4) Реалізувати базовий `AgentChatWindow`:

   - історія повідомлень,
   - input для користувача,
   - відправка на `/agents/{id}/chat` або відповідний endpoint.

5) Підʼєднати Team Assistant як базового агента для цього екрану.

---

# 3. Messenger Agent (14): канали, DM, "додати агента"

Опиратись на:  

`14_messenger_agent_module.md`  

+ `Task Invite-Agent-Flow` з задачника.

## 3.1. Обсяг MVP

Реалізувати мінімум:

1) Список каналів/чатів у лівому сайдбарі:

   - кілька каналів типу:

     - `#general`,
     - `#mvp`.

2) Центральний чат для вибраного каналу:

   - вивід історії,
   - відправка повідомлень,
   - позначення агента/людини автором.

3) Кнопка "Додати учасника" у header каналу:

   - модалка зі вкладками:

     - `Люди`,
     - `Агенти` (ми фокусуємось саме на цьому).

   - у вкладці `Агенти`:

     - список агентів (із `/agents`),
     - вибір 1 агента,
     - чекбокси прав:

       - `Читати`,
       - `Писати`,
       - `Створювати задачі`.

   - POST entitlements (stub-модель RBAC/Entitlements).

Не обовʼязково:

- складні фічі (search_messages, pinned messages, reactions і т.п.).

## 3.2. Tasks

1) Реалізувати модель:

   - `channels` + `messages`.

2) Реалізувати simple REST:

   - `GET /channels`, `GET /channels/:id/messages`, `POST /messages`.

3) Реалізувати "Add Participant → Agent" модалку:

   - frontend модалка,
   - backend entitlements stub: `POST /entitlements` з `agent_id` + `channel_id` + scopes.

4) Показувати аватари агентів у header каналу.

---

# 4. Projects Agent (15): один проєкт, прості задачі

Опиратись на:  

`15_projects_agent_module.md`.

## 4.1. Обсяг MVP

Реалізувати:

1) Мінімальну модель:

   - `projects` (id, name, description, team_id),
   - `tasks` (id, project_id, title, status, assignees, created_at).

2) Правий сайдбар для проєктного каналу:

   - якщо канал привʼязаний до проєкту (наприклад `#mvp` → `MicroDAO MVP`):

     - показувати коротку панель:

       - назва проєкту,
       - список задач (група за статусом: new / in_progress / done),
       - кнопка "Нова задача".

3) Модалка "Нова задача":

   - поля:

     - Назва,
     - Опис (опційно),
     - Статус (по замовчуванню `new`),
     - Виконавці (поки можна просто селект із людей/агентів).

4) Мінімальна інтеграція з Messenger:

   - при створенні задачі з правого сайдбару:

     - повідомлення у канал:

       > "Створено задачу: {title}".

Можна НЕ робити поки:

- спринти,
- складні фільтри,
- Planning Agent.

## 4.2. Tasks

1) Бекенд-моделі `projects` і `tasks` + API.

2) Привʼязка каналу до проєкту (наприклад, поле `channel.project_id`).

3) Компонент `ProjectSidebarPanel`:

   - читає з API `GET /projects/:id/tasks`,
   - рендерить список,
   - кнопка "Нова задача".

4) Модалка створення задач:

   - `POST /tasks`,
   - після успіху: оновити список + відправити повідомлення у канал через Messenger API.

---

# 5. Followups & Reminders Agent (16): "нагадай мені"

Опиратись на:  

`16_followups_reminders_agent.md`.

## 5.1. Обсяг MVP

Реалізувати:

1) Модель `reminders`:

   - id, user_id, message, fire_at, created_at, status.

2) Простий tool:

   - `create_reminder({ user_id, message, schedule })`:

     - для MVP:

       - підтримати шаблони:

         - "через N хвилин/годин/днів",
         - "завтра о HH:MM".

3) Інтеграція з чатом:

   - якщо користувач пише:

     - "нагадай мені завтра о 10 про X"

   - Followup Agent:

     - парсить час,
     - створює reminder,
     - відповідає:

       > "Нагадування створено: завтра о 10:00 — «X»."

4) Worker / cron:

   - кожну хвилину:

     - `SELECT * FROM reminders WHERE fire_at <= now AND status = 'pending'`,
     - відправити повідомлення користувачу (DM або системне повідомлення),
     - помітити як `fired`.

UI:

- мінімальна панель "Мої нагадування" (наприклад, у профілі).

## 5.2. Tasks

1) Бекенд-таблиця `reminders` + API.

2) Базовий Followup Agent з tool `create_reminder`.

3) Простий parser NLU для фраз типу "нагадай мені завтра о 10":

   - можна почати з регулярок + rule-based.

4) Cron/worker для тригеру ремайндерів.

5) Простий UI список нагадувань (може бути не першочергово).

---

# 6. Agent Cards Grid + Agent Console (23)

Опиратись на:  

`23_agent_cards_and_console_tasks.md`.

## 6.1. Обсяг MVP

1) Маршрут `/t/:teamId/agents`:

   - грід карток агентів:

     - Team Assistant,
     - Messenger Agent,
     - Projects Agent,
     - Followups Agent,
     - Knowledge (stub),
     - Governance (stub),
     - Bridges (stub).

   - картка:

     - аватар,
     - імʼя,
     - коротке призначення,
     - вік (можна згенерувати pseudo-дані),
     - базовий текст `Досвід 1T: ...` + `Репутація: ...` (можна поки stub).

   - hover overlay:

     - "Почати взаємодію",
     - "Деталі агента".

2) Agent Console `/t/:teamId/agent/:agentId`:

   - хедер:

     - аватар,
     - імʼя,
     - опис,
     - базові метрики (stub).

   - вкладки:

     - `Чат`:

       - той же `AgentChatWindow`.

     - `Присутність / Права`:

       - поки список каналів/проєктів, де агент підключений.

       - без складних toggle-операцій (можна просто read-only у MVP).

   - це має працювати як "профіль агента".

## 6.2. Tasks

1) Реалізувати `/agents` грід (Agent-Cards-Grid).

2) Реалізувати `/agent/:agentId` консоль.

3) Зв'язати "Почати взаємодію" → `AgentConsolePage` на вкладці "Чат".

4) Створити простий endpoint `GET /agents` з базовими метаданими (name, role, created_at, stub-metrics).

5) Створити endpoint `GET /agents/:id/presence`:

   - повертає:

     - канали, де агент присутній,
     - повʼязані проєкти.

---

# 7. OperatorMode — тільки каркас

Опиратись на:  

`22_operator_modes_and_system_agents.md`.

## 7.1. Обсяг MVP

Реалізувати лише:

1) Поле `operatorMode` у `AgentConfig`.

2) Guard у `runAgentTurn` / scheduler:

   - якщо `trigger = "operator_tick"`:

     - перевірити:

       - `operatorMode.enabled`,
       - ліміт дій на годину,
       - allowedTools.

3) Увімкнути operatorMode:

   - для Followups Agent:

     - для worker-а нагадувань можна поки використовувати прямий cron без LLM, але структуру вже передбачити.

   - опційно для Attention Agent (якщо буде час) — для базового daily digest.

Не реалізовувати:

- UI для operatorMode,
- розширені operator режими для всіх агентів.

---

# 8. Що явно НЕ входить до цього MVP (але вже є в документації)

- Wallet Agent (підпис дій).
- DAO Agent (on-chain DAO інтеграція).
- Повна Governance & Access реалізація (ключі, ритуали узгодження).
- Повний Co-Memory (17) як RAG-система.
- Повний Notifications & Attention Agent (розумні стріми уваги).
- Кастомні домени (`mydao.org`) з DNS-перевірками і auto-SSL.

---

# 9. Порядок реалізації для Cursor (рекомендація)

Рекомендований порядок задач:

1) **Multi-tenant context + Agent Hub**

   - teams.slug,
   - визначення `currentTeamId`,
   - `/home` + базовий Agent Hub.

2) **Messenger Agent (канали + чати + "додати агента")**

3) **Projects Agent (проєкт + задачі + правий сайдбар)**

4) **Followups Agent (reminders + інтеграція з чатом)**

5) **Agent Cards Grid + Agent Console**

6) **OperatorMode (каркас guard-ів)**

Кожен блок можна оформлювати окремим промтом:  

"Implement part X of MVP_VERTICAL_SLICE.md using docs 14/15/16/21/22/23 + 05_coding_standards.md".

---

# 10. Інструкція для Cursor (узагальнений промт)

Приклад загального промта:

```text
You are working on the MicroDAO MVP vertical slice.

Use:

- MVP_VERTICAL_SLICE.md
- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 16_followups_reminders_agent.md
- 21_agent_only_interface.md
- 22_operator_modes_and_system_agents.md
- 23_domains_wallet_dao_deepdive.md
- 23_agent_cards_and_console_tasks.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Goal:

Implement the MVP vertical slice described in MVP_VERTICAL_SLICE.md, step by step.

Start with:

1) Multi-tenant team context + Agent Hub Home.

Then:

2) Messenger Agent basics (channels, messages, Add Agent to channel).

3) Projects Agent basics (one project, tasks, right sidebar).

4) Followups Agent basics (reminders + chat trigger "нагадай").

5) Agent Cards grid and Agent Console.

6) OperatorMode guard skeleton.

For each step:

- list changed files,
- show diff,
- provide a short summary.
```

---

**Цей документ — твій "мастер-план" для першого живого MVP microDAO.**

Далі можна або відразу йти в задачі для кроку 1 (multi-tenant + Agent Hub), або доповнити MVP ще якимись деталями, якщо бачиш прогалини.
