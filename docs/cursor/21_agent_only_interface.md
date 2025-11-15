# 21 — Agent-Only Interface (MicroDAO)

Агентська операційна система замість класичного застосунку

Цей документ описує цільовий інтерфейс MicroDAO, де:

- немає класичного "меню функцій";

- все представлено як **учасники**: Люди, Агенти, Роботи;

- чати, проєкти, бази знань і доступи — це **ресурси**, якими керують агенти;

- інвайти, шеринги, права і токени виконуються через агентські дії (з web3-фіксацією, де потрібно).

Це візійний, але достатньо конкретний документ для Cursor:

- UX-специфікація;

- структура layout;

- сценарії;

- задачі для реалізації перших версій.

---

# 1. Мета

Перетворити MicroDAO на **агентську ОС спільнот**, де:

- користувач взаємодіє насамперед з агентами, а не з "екранами";

- кожен контекст (канал, проєкт, база даних, DAO-голосування) — це простір, де присутні:

  - Люди,

  - Агенти,

  - (у майбутньому) Роботи;

- запрошення, шеринги, доступи — це:

  - діалог з агентом,

  - + технічні дії (RBAC, entitlements, web3-транзакції).

---

# 2. Загальний layout агентської ОС

## 2.1. Лівий сайдбар — Простори та Учасники

Структура:

1. **Мої простори (microDAO)**  

   - `[DAARION Core]`  

   - `[GreenFood DAO]`  

   - `[Personal Lab]`

2. **Учасники**  

   - **Люди**

   - **Агенти**

   - **Роботи** (поки пусто, плейсхолдер)

3. **Активний контекст**  

   Підсвічений простір + "поточний стіл":

   - Канал: `#dev-mvp`

   - Проєкт: `MicroDAO MVP`

   - Простір знань: `Tokenomics`

Сайдбар показує **структуру світу**, але основні дії йдуть через агентів.

## 2.2. Центр — Діалоговий простір

Центральна колонка завжди є **чатом**:

- Це може бути:

  - канал (`#dev-mvp`),

  - група (мультичат),

  - DM з людиною,

  - або "Agent Hub" (чат з головним агентом).

У заголовку:

- Назва контексту (наприклад, `#dev-mvp`).

- Список учасників (аватари):

  - Люди: 2–5

  - Агенти: Team Assistant, Messenger Agent, Projects Agent, Governance Agent

  - (Роботи, якщо є)

Звідси:

- пишуть люди,

- відповідають агенти,

- запускаються операції над ресурсами (проєктами, БД, токенами).

## 2.3. Правий сайдбар — Контекст і Ресурси

Праворуч:

1. **Контекст**:

   - Активний простір (microDAO)

   - Поточний канал/проєкт

   - Які агенти мають доступ

2. **Ресурси**:

   - Проєкти

   - Бази даних / таблиці

   - Простори знань (Co-Memory)

   - Повʼязані гаманці / токени

3. **Права та ключі**:

   - Список людей та агентів з доступами (read/write/admin/use-in-prompts)

   - Кнопка "Керувати доступами"

   - Інформація про web3-стан (якщо є on-chain записи)

---

# 3. Панель "Люди / Агенти / Роботи"

## 3.1. Люди

Елементи списку:

- Аватар

- Імʼя

- Статус (online/offline/busy)

- Ролі в microDAO (Member, Guardian, Investor…)

Клік по людині:

- відкриває:

  - DM-чат з цією людиною,

  - або розширений профіль (у майбутньому):

    - в яких проєктах,

    - з якими агентами працює.

## 3.2. Агенти

Групи:

- **Системні агенти**:

  - Team Assistant

  - Messenger Agent

  - Projects Agent

  - Memory/Knowledge Agent

  - Governance/Tokenomics Agent

  - Bridge/Integrations Agent

- **Користувацькі агенти**:

  - спеціалізовані боти, створені командою.

- **Зовнішні агенти (маркетплейс)**:

  - агенти з інших microDAO або від сторонніх розробників.

Клік по агенту:

- відкриває **сторінку агента**:

  - вкладка "Чат",

  - вкладка "Памʼять",

  - вкладка "Самонавчання/Еволюція",

  - вкладка "Доступи та ресурси" (які проєкти/БД він бачить).

## 3.3. Роботи

Поки може бути просто секція "Роботи (скоро)".  

Модель на майбутнє:

- Привʼязані до фізичних пристроїв (робот, сенсор, енергоблок).

- Участь у чатах як окремі "учасники".

- Окремі права на дії у фізичному світі.

---

# 4. Запрошення агентів до каналів/чатів

## 4.1. UX-флоу

У будь-якому чаті/каналі:

- кнопка **"Додати учасника"**.

При натисканні:

1. Модалка:

   - таби: `Люди | Агенти | Роботи`

   - поле пошуку

2. Вибір Агента:

   - список агентів,

   - короткий опис (роль, профіль, що вміє).

3. Налаштування прав:

   - чекбокси / селект:

     - `Читати цей канал`

     - `Писати в цей канал`

     - `Створювати задачі / follow-ups`

     - `Доступ до проєктів цього контексту`

     - `Доступ до баз знань цього контексту`

4. Підтвердження:

   - кнопка **"Запросити агента"**

Після цього:

- у header чату зʼявляється новий агент;

- агент отримує повідомлення (system DM):

  > "Тебе додали до каналу #dev-mvp з правами: читати, писати, створювати задачі."

## 4.2. Backend/протоколно

Під капотом:

- створюється entitlement для `agent_id` з:

  - `resource_kind`: `channel` / `project` / `knowledge_space`,

  - `resource_id`,

  - `scopes`: `[read, write, tasks, knowledge]`.

- (optionally) запускається web3-транзакція:

  - видача capability-токена / NFT-доступу,

  - запис в on-chain реєстр (аудит, DAO-гарантія).

---

# 5. Обмін проєктами / базами даних між людьми та агентами

## 5.1. Поняття "Ресурсу"

Ресурс — це будь-що, до чого можна дати/забрати доступ:

- Проєкт (`project_id`)

- Таблиця / БД (`dataset_id`, `table_id`)

- Простір знань (`knowledge_space_id`)

- Набір подій (`events_stream_id`)

- Гаманець / смарт-контракт (`wallet_id`, `contract_id`)

У правому сайдбарі поточного контексту:

- "Ресурси цього контексту"

- Кожен ресурс має меню:

  - "Поділитися…"

  - "Показати, хто має доступ"

## 5.2. UX шерингу

У правій панелі користувач:

1. Обирає ресурс → "Поділитися".

2. Відкривається модалка:

   - таби: `Люди | Агенти | MicroDAO`

3. Вибирає:

   - одного або кількох адресатів.

4. Вказує права:

   - `read` / `write` / `admin` / `use_in_prompts_only`.

5. Підтверджує.

Після цього:

- Governance/Tokenomics Agent:

  - оформлює web3-операцію (за потреби),

  - оновлює entitlements,

  - лог у audit/journal.

- Memory/Knowledge Agent:

  - оновлює карту знань (хто/що бачить),

  - може пропонувати нові рекомендації (наприклад, Projects Agent тепер бачить дані продажів).

---

# 6. "Agent Hub" — стартовий екран без меню

Замість класичного "Home":

- при вході в MicroDAO користувач потрапляє в чат з головним агентом (**Team Assistant / OS Agent**).

Верхня частина:

- "Привіт, це твоя microDAO: [Назва]"

- Короткі блоки:

  - "Учасники" (скільки людей, скільки агентів)

  - "Проєкти" (активні)

  - "Сигнали" (важливі нотифікації)

Основний елемент — чат, де користувач може написати будь-що:

Приклади:

- "Покажи, хто зараз працює над MVP."

- "Створи новий проєкт для інтеграції DAGI."

- "Запроси Projects Agent і Governance Agent в цей проєкт."

- "Поділись базою `sales_events` з Projects Agent тільки для читання."

Агент:

- ставить уточнюючі питання (якщо потрібно),

- викликає внутрішні агенти:

  - Messenger Agent → створити/налаштувати канал

  - Projects Agent → створити проєкт/таски

  - Governance Agent → оформити доступи й web3-запис

  - Knowledge Agent → підключити Co-Memory

Усе це відображається як:

- ланцюжок дій у чаті,

- результати в структурі UI (нові канали / проєкти / ресурси).

---

# 7. Мінімальний MVP цієї парадигми

Для першої реалізації (без надроздуття):

1. **Лівий сайдбар:**

   - блок "Учасники": `Люди`, `Агенти` (Роботи — плейсхолдер).

   - кліки відкривають DM / сторінку агента.

2. **Agent Hub як Home:**

   - `/t/:teamId/home` → чат з Team Assistant.

   - кнопка "Домашня" у сайдбарі → туди.

3. **Модалка "Додати учасника" для каналів:**

   - можливість додати агента,

   - налаштувати права (на поки що хоча б `read/write`).

4. **Модалка "Поділитися ресурсом":**

   - для проєктів (Projects Agent вже буде з 15-го документа),

   - базові права `read/write`.

5. **Без web3 на першому етапі:**

   - тільки модель прав у БД (RBAC + entitlements),

   - web3-интеграція — stub/плейсхолдер (логіка в Governance Agent).

---

# 8. Компоненти та структура

## 8.1. Layout Components

```
src/layouts/
  AgentOSLayout.tsx          # Головний layout з 3 колонками
  LeftSidebar.tsx            # Простори + Учасники
  ParticipantsPanel.tsx      # Панель Люди/Агенти/Роботи
  RightSidebar.tsx           # Контекст + Ресурси
  ContextPanel.tsx           # Панель контексту
  ResourcesPanel.tsx         # Панель ресурсів
```

## 8.2. Pages

```
src/pages/
  AgentHubPage.tsx           # /t/:teamId/home - стартовий екран
  ParticipantPage.tsx        # Сторінка учасника (людина/агент)
```

## 8.3. Modals

```
src/components/modals/
  AddParticipantModal.tsx    # Додати учасника до каналу/чату
  ShareResourceModal.tsx     # Поділитися ресурсом
  ManageAccessModal.tsx      # Керування доступами
```

## 8.4. Types

```ts
interface Participant {
  id: string;
  type: "human" | "agent" | "robot";
  name: string;
  avatar?: string;
  status?: "online" | "offline" | "busy";
  roles?: string[];
}

interface Resource {
  id: string;
  type: "project" | "dataset" | "knowledge_space" | "wallet" | "contract";
  name: string;
  description?: string;
  accessLevel?: "read" | "write" | "admin" | "use_in_prompts_only";
}

interface Entitlement {
  participantId: string;
  resourceKind: string;
  resourceId: string;
  scopes: string[];
}
```

---

# 9. API Endpoints

## 9.1. Participants

```ts
GET /teams/{teamId}/participants
// Повертає список учасників (люди + агенти)

GET /teams/{teamId}/participants/{id}
// Деталі учасника

POST /channels/{channelId}/participants
// Додати учасника до каналу
{
  participantId: string;
  participantType: "human" | "agent";
  scopes: string[];
}
```

## 9.2. Resources

```ts
GET /teams/{teamId}/resources
// Список ресурсів у контексті

POST /resources/{resourceId}/share
// Поділитися ресурсом
{
  participantIds: string[];
  scopes: string[];
}
```

## 9.3. Entitlements

```ts
GET /entitlements
// Список прав поточного користувача/агента

POST /entitlements
// Створити entitlement
{
  participantId: string;
  resourceKind: string;
  resourceId: string;
  scopes: string[];
}
```

---

# 10. Інтеграція з існуючими модулями

## 10.1. Messenger Agent (14)

Messenger Agent може:

- показувати список каналів з учасниками
- фільтрувати канали за наявністю агентів
- пропонувати додати агента до каналу

## 10.2. Projects Agent (15)

Projects Agent може:

- показувати проєкти як ресурси
- керувати доступами до проєктів
- пропонувати поділитися проєктом з іншими агентами

## 10.3. Governance Agent (18)

Governance Agent:

- оформлює web3-транзакції для доступу
- веде audit log всіх змін прав
- керує токеномікою доступів

---

# 11. Завдання для Cursor

Приклад промта:

```
You are a senior React/TS engineer.

Implement the Agent-Only Interface shell using:

- 21_agent_only_interface.md
- 10_agent_ui_system.md
- 14_messenger_agent_module.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Tasks:

1) Update the main layout:
   - Left sidebar: Spaces + Participants (People, Agents, Robots placeholder).
   - Center: Dialog area (chat for current context).
   - Right sidebar: Context & Resources panel (stub data).

2) Create "Agent Hub" route `/t/:teamId/home`:
   - Chat with Team Assistant as the main entry point.

3) Add "Add participant" flow for channels:
   - Modal with tabs: People / Agents.
   - For Agents: basic permissions (read / write) stored in entitlements (stub).

4) Add "Share resource" flow in the right sidebar:
   - For now: projects only (resource type stub).
   - Modal to grant read/write access to People or Agents (no web3 yet).

5) Ensure navigation:
   - Clicking on a Person/Agent in the sidebar opens the appropriate chat/page.

Output:

- list of modified files
- diff
- summary
```

---

# 12. Результат

Після впровадження цього модуля:

* MicroDAO отримує "агентський" каркас інтерфейсу:

  * вхід через Agent Hub,

  * центральна роль агентів,

  * простий механізм запрошення агентів,

  * базові flows шерингу ресурсів;

* класичний месенджер (документ 14) стає лише однією з "здібностей" всередині агентської ОС, а не центром продукту.

---

**Готово.**  
Це **повна специфікація Agent-Only Interface**, готова до використання в Cursor.


