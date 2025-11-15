# 22 — Agent-Only Interface Tasks (MicroDAO)

Структурований список задач для реалізації Agent-Only Interface

Цей документ містить детальні технічні задачі для поетапної реалізації агентського інтерфейсу MicroDAO. Кожну задачу можна давати Cursor окремо для поступової розробки.

**Базовий документ:** `21_agent_only_interface.md`

---

# Task 1 — UI-Agents-List (People / Agents / Robots панель)

## Мета

Зробити лівий блок "Учасники", де видно Людей, Агентів і (поки що) плейсхолдер Роботів. Клік по елементу відкриває відповідний чат/сторінку.

## Специфікація

### 1. Розташування

* Лівий сайдбар, нижче/поруч з блоком "Простори (microDAO)".
* Заголовок: `Учасники`.
* Вкладки або груповані секції:

  * `Люди`
  * `Агенти`
  * `Роботи` (поки список порожній, з текстом "Скоро").

### 2. Дані

* People:

  * `id`, `display_name`, `avatar_url`, `online_status`.

* Agents:

  * `id`, `name`, `role`, `avatar`, maybe `type` (system/custom).

* Robots:

  * поки просто статичний текст: "Роботи поки не під'єднані".

На бекенді: можна зробити:

* `GET /participants?team_id=...` → `{ people: [...], agents: [...] }`
  або окремі запити `GET /members`, `GET /agents`.

### 3. UI-поведінка

* Клік по Людині:

  * відкриває DM-чат `/t/:teamId/dm/:userId`.

* Клік по Агенту:

  * відкриває сторінку агента `/t/:teamId/agent/:agentId`
    або агент-чат.

* Список скролиться, якщо елементів багато.

### 4. Інтеграція з існуючим кодом

* Використати загальні компоненти `Sidebar`, `Avatar`, `ListItem`.
* Типи/інтерфейси привести до стандартів з `05_coding_standards.md`.

## Acceptance Criteria

* У лівому сайдбарі є блок "Учасники" з секціями `Люди`, `Агенти`, `Роботи`.
* Для `Людей` і `Агентів` рендеряться реальні дані з API (або mock, якщо API ще нема).
* Клік по Людині відкриває приватний чат (навіть якщо поки stub).
* Клік по Агенту відкриває сторінку/чат агента.
* "Роботи" відображаються як порожній список з плейсхолдером.

## Приклад промта для Cursor

```
Implement the Participants panel (People / Agents / Robots) in the left sidebar using:

- 21_agent_only_interface.md
- 10_agent_ui_system.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Deliverables:

- Sidebar section "Учасники" with groups: Люди, Агенти, Роботи.
- Click on a Person opens DM route `/t/:teamId/dm/:userId` (stub if needed).
- Click on an Agent opens `/t/:teamId/agent/:agentId`.

Output: list of files + diff + summary.
```

---

# Task 2 — Invite-Agent-Flow (модалка прав + web3-тригери)

## Мета

Дати можливість додавати агентів до каналів/чатів з налаштуванням прав. Web3 — на першому етапі Stub (просто підготувати місце для виклику Governance/Web3-агента).

## Специфікація

### 1. Де викликається

* У header каналу/чату — кнопка `+ Додати учасника`.
* Доступна тільки для користувача з правами `admin`/`owner` (поки можна не перевіряти, просто буде кнопка).

### 2. Модалка

* Заголовок: "Додати учасника".
* Tabs:

  * `Люди`
  * `Агенти`
* Із них нас цікавить вкладка `Агенти`.

### 3. Вкладка "Агенти"

* Список доступних агентів з пошуком.
* По кліку на агента або чекбоксом обираємо 1–N агентів.

### 4. Налаштування прав

* Секція "Права в цьому каналі":

  * `[ ] Читати`
  * `[ ] Писати`
  * `[ ] Створювати задачі / follow-ups`
* За замовчуванням: `Читати` увімкнено, інші вимкнено.

### 5. API / Entitlements

* On Submit:

  * `POST /entitlements` (або аналог) із даними:

    * `agent_id`
    * `resource_kind: "channel"`
    * `resource_id: channelId`
    * `scopes: ["read", "write", "tasks"]` (залежить від чекбоксів)

* Web3 Stub:

  * В коді робимо виклик функції `governance.issueAccessToken(...)` або логування TODO;
  * Реальної транзакції поки не робимо.

### 6. UX

* Після успіху модалка закривається.
* У хедері каналу в списку учасників зʼявляється новий агент.

## Acceptance Criteria

* У кожному каналі/чаті є кнопка "Додати учасника".
* В модалці є вкладка "Агенти" зі списком наявних агентів.
* Можна обрати агента, налаштувати права, натиснути "Запросити".
* На бекенді зберігаються entitlements (навіть якщо прості JSON у БД).
* Після додавання агент показується як учасник каналу.
* В коді є очевидний Stub для майбутньої web3 інтеграції.

## Приклад промта для Cursor

```
Implement the "Invite Agent" flow for channels using:

- 21_agent_only_interface.md
- microdao — RBAC and Entitlements (MVP)
- 10_agent_ui_system.md
- 05_coding_standards.md

Deliverables:

1) "Add participant" button in channel header.
2) Modal with tabs People / Agents, focusing on Agents tab.
3) Permissions UI for agent (read / write / tasks).
4) POST entitlements call to store agent-channel permissions (web3 as stub hook).

Output: list of files + diff + summary.
```

---

# Task 3 — Share-Resource-Flow (проєкт / БД / knowledge space)

## Мета

Реалізувати базову можливість "поділитися ресурсом" (спочатку — Проєктом), з видачею прав людям/агентам. БД / knowledge space можна підключати далі за тим самим патерном.

## Специфікація

### 1. Ресурси для MVP

* Почати з `Проєктів` (Projects Agent з документу 15).
* Інтерфейс у правому сайдбарі для активного контексту:

  * розділ "Проєкти цього контексту",
  * кожен проєкт має кнопку `⋯` → `Поділитися`.

### 2. Модалка "Поділитися проєктом"

* Заголовок: "Поділитися проєктом".
* Tabs:

  * `Люди`
  * `Агенти`
* Список одержувачів з пошуком.

### 3. Права доступу

* Радіо-кнопки або чекбокси:

  * `Тільки читати`
  * `Читати і оновлювати задачі`
  * `Адмініструвати проєкт`
* Для MVP:

  * мапимо на `["read"]`, `["read","write"]`, `["admin"]`.

### 4. API / Entitlements

* `POST /entitlements`:

  * `resource_kind: "project"`
  * `resource_id: projectId`
  * `subject_kind: "user" | "agent"`
  * `subject_id: ...`
  * `scopes: [...]`

* Web3 Stub:

  * так само, як у Task 2 — залишити хук/функцію для майбутньої транзакції.

### 5. Відображення

* У правому сайдбарі для вибраного проєкту:

  * короткий список: хто має доступ (іконки + тип: людина/агент).
  * посилання "Керувати доступами" (можна виводити ту ж саму модалку).

## Acceptance Criteria

* У правому сайдбарі є список проєктів для контексту (навіть якщо один).
* Для кожного проєкту доступна дія "Поділитися".
* Модалка дозволяє вибрати людей/агентів і рівень доступу.
* Після підтвердження зʼявляються записи entitlements.
* У правій панелі видно, що проєкт поділено з конкретними субʼєктами.

## Приклад промта для Cursor

```
Implement the "Share Project" flow as the first Resource Sharing feature using:

- 21_agent_only_interface.md
- 15_projects_agent_module.md (if present)
- microdao — RBAC and Entitlements (MVP)
- 05_coding_standards.md

Deliverables:

1) In the right sidebar, show list of projects for the current context.
2) Add "Share" action for a project → opens modal.
3) Modal lets the user pick People or Agents and assign access level (read / read+write / admin).
4) POST entitlements to persist access.
5) Show who has access in the sidebar (avatars + type).

Output: list of files + diff + summary.
```

---

# Task 4 — Agent-Hub-Home (стартовий екран "все через агента")

## Мета

Зробити "Agent Hub" як домашню точку входу в microDAO: користувач відкриває `/t/:teamId/home` і бачить чат з головним агентом + базові віджети стану.

## Специфікація

### 1. Новий маршрут

* `GET /t/:teamId/home` (frontend route).
* Відображає `AgentHubPage`.

### 2. AgentHubPage структура

* Верх:

  * заголовок: `microDAO: {team.name}`
  * короткі віджети (можуть бути stub):

    * "Учасники: X людей, Y агентів"
    * "Активні проєкти: N"

* Центр:

  * чат з головним агентом (Team Assistant або спеціальний OS Agent):

    * використовує вже існуючий `AgentChatWindow`.
    * агент_id береться з конфіг (наприклад, "team_assistant" для цієї команди).

* Праворуч:

  * контекст (список проєктів / каналів / ресурсів — поки можна stub).

### 3. Поведінка чату

* Перший запуск:

  * агент вітається, якщо немає історії:

    > "Привіт, це твій Agent Hub. Я допоможу керувати твоєю microDAO."

* Далі:

  * користувач може написати запит, наприклад:

    * "Покажи активні проєкти"
    * "Відкрий канал #dev-mvp"
    * "Хочу створити новий проєкт"
  * Поки що можна зробити stub-відповіді, якщо Projects/Messenger Agents ще не реалізовані.

### 4. Навігація

* Кнопка/посилання "Головна" у лівому сайдбарі веде на `/t/:teamId/home`.
* Після успішного онбордингу (з `08_agent_first_onboarding.md`) редірект також може йти на Agent Hub.

## Acceptance Criteria

* Існує маршрут `/t/:teamId/home`, який рендерить Agent Hub.
* У центрі — робочий чат з Team Assistant (через `/agents/{id}/chat` endpoint).
* У сайдбарі є посилання "Головна" / "Agent Hub", що веде на цей екран.
* Якщо історії немає — агент показує вітальний меседж.
* Екран виглядає як "головна консоль" microDAO, а не просто черговий канал.

## Приклад промта для Cursor

```
Implement the Agent Hub Home screen using:

- 21_agent_only_interface.md
- 10_agent_ui_system.md
- 11_llm_integration.md
- 12_agent_runtime_core.md
- 05_coding_standards.md

Deliverables:

1) New route `/t/:teamId/home` rendering AgentHubPage.
2) AgentHubPage:
   - header with team name and basic stats (stub).
   - central chat with Team Assistant agent (AgentChatWindow).
   - optional right sidebar context (stub).
3) "Home / Agent Hub" entry in left sidebar that routes to `/t/:teamId/home`.

Output: list of files + diff + summary.
```

---

# Порядок виконання задач

Рекомендований порядок реалізації:

1. **Task 1** — UI-Agents-List (базова структура учасників)
2. **Task 4** — Agent-Hub-Home (стартовий екран)
3. **Task 2** — Invite-Agent-Flow (додавання агентів до каналів)
4. **Task 3** — Share-Resource-Flow (поділ ресурсів)

Альтернативний порядок (якщо потрібно спочатку базовий функціонал):

1. **Task 4** — Agent-Hub-Home
2. **Task 1** — UI-Agents-List
3. **Task 2** — Invite-Agent-Flow
4. **Task 3** — Share-Resource-Flow

---

# Залежності між задачами

- **Task 1** не залежить від інших
- **Task 4** може використовувати компоненти з Task 1
- **Task 2** потребує Task 1 (список агентів)
- **Task 3** потребує Task 2 (механізм entitlements)

---

# Загальні вимоги для всіх задач

## Технічні вимоги

- Дотримуватися `05_coding_standards.md`
- Використовувати типи з `03_api_core_snapshot.md`
- Інтегрувати з існуючими компонентами з `10_agent_ui_system.md`
- Дотримуватися UI/UX з `04_ui_ux_onboarding_chat.md`

## Тестування

- Кожна задача має мінімальні unit tests
- Перевірити наявність помилок TypeScript
- Перевірити відповідність acceptance criteria

## Документація

- Оновити `src/README.md` з описом нових компонентів
- Додати коментарі до складних частин коду

---

**Готово.**  
Це **структурований список задач для Agent-Only Interface**, готовий до використання в Cursor.


