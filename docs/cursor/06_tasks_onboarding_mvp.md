# 06 — Tasks: Onboarding & MVP Core (for Cursor)

Цей документ містить чіткі технічні задачі для Cursor.
Кожна задача сформульована у форматі, який Cursor розуміє найкраще:
- контекст
- специфікації
- API
- acceptance criteria
- очікуваний вивід (list of files + diff)

Всі задачі беруть дані з:
- 01_product_brief_mvp.md
- 02_architecture_basics.md
- 03_api_core_snapshot.md
- 04_ui_ux_onboarding_chat.md
- 05_coding_standards.md

## BLOCK A — ONBOARDING (5 кроків)

### Task A1 — Create route `/onboarding` + base layout

**Context:**
Onboarding складається з 5 кроків. Потрібен базовий контейнер зі state machine.

**Specs:**
- Створити сторінку `/onboarding`.
- Додати компонент `OnboardingLayout`.
- Зберігати поточний крок у локальному стані.
- Кроки: `welcome`, `team`, `privacy`, `channel`, `agent`, `invite`.
- У верхній частині: step indicator.

**Acceptance Criteria:**
- `/onboarding` відкривається без помилок.
- Є stepper з актуальною позначкою (1–5).
- Немає реальних API-викликів (тільки каркас).

**Cursor Output:**
- Список файлів для змін.
- Код.

### Task A2 — Onboarding Step 1: Welcome Screen

**Specs:**
- Заголовок: "Створимо твою MicroDAO".
- Підзаголовок: "5 кроків — і твоя спільнота буде готова до роботи."
- Кнопка: "Почати".
- При натисканні — перехід на Step 2.

**Acceptance Criteria:**
- Стиль згідно з 04_ui_ux_onboarding_chat.md.
- Робоча кнопка.

### Task A3 — Step 2: Create Team (API: POST /teams)

**Specs:**
- Форма:
  - `Назва спільноти` (required)
  - `Опис` (optional)
- Виклик: `POST /teams`
- Результат: зберегти `teamId` у state onboarding.

**Acceptance Criteria:**
- Форма валідна: без назви кнопка disabled.
- Після успішного виклику → Step 3.
- Обробка помилок через toast.

### Task A4 — Step 3: Privacy mode (PATCH /teams/{id})

**Specs:**
UI: дві великі карточки:

- PUBLIC:
  - Текст: "Є публічний канал. Гості можуть читати та приєднатися."

- CONFIDENTIAL:
  - Текст: "Тільки запрошені учасники. Чати зашифровані."

При натисканні — PATCH `/teams/{teamId}`.

**Acceptance Criteria:**
- Виділяється вибраний режим.
- Успішний PATCH → Step 4.

### Task A5 — Step 4: Create first channel (POST /channels)

**Specs:**
- Поля:
  - Назва каналу
  - Тип: public | group
- Виклик:
  ```json
  {
    "team_id": "...",
    "type": "...",
    "title": "...",
    "mode": "public" | "confidential"
  }
  ```

**Acceptance Criteria:**
* Після успіху → Step 5.
* Канал створений і додається до списку каналів у state.

### Task A6 — Step 5: Agent & memory settings (POST /agents)

**Specs:**
UI:

* toggle: "Увімкнути приватного агента"
* select: мова агента
* select: профіль агента
* select: memory depth

API:

1. Якщо toggle ON →
   `POST /agents` body:

```json
{
  "owner_kind": "team",
  "owner_id": "t_123",
  "name": "Team Assistant",
  "role": "general",
  "scopes": ["chat"]
}
```

2. Якщо OFF → skip

**Acceptance Criteria:**

* Вибір зберігається в onboarding state.
* API викликається тільки якщо агент включений.
* Після успіху → Step 6.

### Task A7 — Step 6: Invite (UI only)

**Specs:**
UI:

* Заголовок: "Спільнота створена!"
* Показати посилання-запрошення (stub: `/invite?t=ID`).
* Кнопка: "Перейти в чат".

**Acceptance Criteria:**

* Немає API.
* При натисканні — redirect до `/t/:teamId/c/:channelId`.

## BLOCK B — CHAT CORE

### Task B1 — Channel List in Sidebar

**Specs:**

* Зробити компонент `SidebarChannels`.
* Отримати список каналів командою:

  * Використати локальний state (оновлює онбординг).
  * У реальному додатку — GET `/teams/{id}/channels` (можна додати).
* Показати активний канал.

**Acceptance Criteria:**

* Sidebar показує всі канали.
* Active канал підсвічений.

### Task B2 — Messages Stream (GET /channels/{id}/messages)

**Specs:**

* Компонент: `MessagesStream`.
* Пагінація: cursor-based scroll.
* Рендер: avatar + name + time + text.
* Confidential → body_enc (можна stub дешифрування).

**Acceptance Criteria:**

* Стрічка відображає повідомлення.
* При скролі догори → підвантаження старих.

### Task B3 — Composer (POST /messages)

**Specs:**

* Компонент: `MessageComposer`.
* Input + кнопка "Надіслати".
* Enter → відправка.
* Shift+Enter → новий рядок.

**Acceptance Criteria:**

* Повідомлення додається в стрічку без перезавантаження.
* Порожній інпут → заборонити надсилання.

### Task B4 — Follow-up creation (POST /followups)

**Specs:**

* Контекстне меню у повідомленні: "Створити follow-up".
* Модалка: назва (автоматично), assignee (список членів), due.
* API: POST `/followups`.

**Acceptance Criteria:**

* Follow-up створюється успішно.
* Помилки показуються через toast.

## BLOCK C — PROJECTS & TASKS

### Task C1 — Project List (GET /projects)

**Specs:**

* Вкладка "Проєкти".
* Список проєктів (назва).
* Кнопка "Створити проєкт".

**Acceptance Criteria:**

* Працює рендер списку.
* Порожній стан: "Проєкти ще не створені".

### Task C2 — Create Project (POST /projects)

**Specs:**

* Модалка → створення нового проєкту.
* Поля: назва, visibility (public/confidential).
* API: POST `/projects`.

**Acceptance Criteria:**

* Новий проєкт зʼявляється в списку.

### Task C3 — Tasks Board (GET/POST /projects/{id}/tasks)

**Specs:**

* 3 колонки: backlog, in_progress, done.
* Карточка задачі: title + status.
* При кліку → змінити статус.

**Acceptance Criteria:**

* Задачі змінюють статус (PATCH можна stub: просто оновлювати client state).
* Мінімальний Kanban працює.

## BLOCK D — AGENTS

### Task D1 — Agents List (GET /agents)

**Specs:**

* Вкладка "Агенти".
* Показати всіх агентів команди.

**Acceptance Criteria:**

* Один агент "Team Assistant" відображається.

### Task D2 — Agent Chat (stub)

**Specs:**

* Створити окремий чат з агентом:

  * `MessageComposer`
  * потік повідомлень (локальний state)
* В API-запиті викликати зовнішній LLM (можна mock)
* Зберігати історію до reload.

**Acceptance Criteria:**

* Агент відповідає у вигляді тексту.
* Історія видно в UI.

## BLOCK E — FINALIZATION

### Task E1 — Route redirect after onboarding

**Specs:**

* Після Step 6 redirect:
  `/t/:teamId/c/:channelId`

**Acceptance Criteria:**

* Після онбордингу користувач потрапляє у свій перший канал.

### Task E2 — Mobile adaptation

**Specs:**

* Sidebar → Drawer
* Composer sticky bottom
* Onboarding → одна колонка

**Acceptance Criteria:**

* Мобільна версія не ламається.

### Task E3 — Error Handling Audit

**Specs:**
Перевірити всі виклики API:

* login
* teams
* channels
* messages
* followups
* projects
* tasks
* agents

**Acceptance Criteria:**

* Усі помилки показуються через toast.
* Немає uncaught exceptions у консолі.

## Кінець документа

Цей файл є головним TODO для Cursor.

Кожна задача може бути надіслана як окремий prompt,
Cursor повинен завжди відповідати:

* списком файлів,
* diff,
* коротким summary.
