# 16 — Follow-ups & Reminders Agent (MicroDAO)

Агент-нагадувань, ритму та повторних дій у MicroDAO

Агент Follow-ups & Reminders (далі — Followup Agent) відповідає за ритм роботи, дисципліну задач, таймінг і "догляд" за станом спільноти та проєктів. Він є природним продовженням Projects Agent і Messenger Agent, але має власну функціональність і власну памʼять.

---

# 1. Ідея

Followup Agent — це:

- памʼять про обіцянки, завдання та домовленості,
- внутрішній таймер microDAO,
- особистий асистент кожного учасника,
- координатор "ритму" в команді,
- агент, який не дозволяє задачам загубитися.

Його головна функція — **перетворювати хаотичний чат → впорядкований потік дій**.

---

# 2. Ролі агентів у модулі

### 2.1. Followup Agent (основний)

Роль: `"followups_core"`

Він:

- відстежує дедлайни,
- нагадує виконавцям,
- створює follow-ups із діалогів,
- пропонує зміни статусів задач,
- робить щоденні/тижневі огляди.

### 2.2. Personal Reminder Agent (опційний)

Роль: `"personal_reminder"`

- створює персональні нагадування для людей,
- вміє працювати в PRIV/DM режимі,
- зберігає приватні повідомлення у локальному особистому просторі користувача.

---

# 3. Документи, які породжує Followup Agent

Цей агент може автоматично створювати:

1. **Follow-up** — коротка дія:

   - "З'ясувати статус задачі X"
   - "Перевірити, чи готовий документ"
   - "Написати у канал #design про оновлення макету"

2. **Нагадування**:

   - одноразові,
   - повторні (щодня/щотижня).

3. **Запити до виконавців**:

   - "Чи потрібна допомога зі задачею?"
   - "Статус задачі лишається незмінним уже 3 дні."

4. **Огляди стану**:

   - щоденний digest,
   - тижневий огляд,
   - огляд ризиків.

---

# 4. Logics — коли агент активується

### 4.1. Фрази-тригери в чатах

Якщо хтось пише:

- "Нагадай мені завтра…"
- "Скажи через два дні…"
- "Через годину пінгани мене…"
- "Слухай, перевір статус задачі…"
- "Хай мені хтось нагадає про це в понеділок."

Followup Agent:

- перехоплює,
- уточнює (якщо потрібно),
- створює нагадування або follow-up.

### 4.2. Активність задач

Followup Agent постійно моніторить:

- задачі без оновлень (X днів),
- задачі з дедлайнами,
- блокери,
- задачі без призначених виконавців.

### 4.3. Розмови у каналах

Якщо в чаті виникає невирішеність:

- "Хтось має уточнити це у дизайну."
- "Хто відповідає за цей файл?"
- "Було б добре перепровірити після дзвінка."

Agent пропонує:

> "Створити follow-up для цього?"

---

# 5. Інтеграція з Projects Agent

Followup Agent працює разом з Projects Agent:

- Якщо створюється задача → Followup Agent аналізує дедлайн і встановлює ритм нагадувань.
- Projects Agent створює структуру задач → Followup Agent тримає їхній статус живим.
- Projects Agent відповідає за створення задач → Followup Agent відповідає за виконання, контроль і ритм.

---

# 6. Tools (для інтеграції з Runtime Core)

Список інструментів, які Followup Agent використовує у форматі 12_agent_runtime_core.md:

### 6.1. create_followup

```
create_followup({
project_id?,
task_id?,
user_id?,
message,
schedule   // "in 1 hour", "tomorrow 09:00", CRON-like
})
```

### 6.2. create_reminder

```
create_reminder({
user_id,
message,
schedule
})
```

### 6.3. check_task_status

```
check_task_status(task_id)
```

### 6.4. ask_for_update

```
ask_for_update(task_id, assignee)
```

### 6.5. daily_digest

```
daily_digest(project_id | team_id)
```

### 6.6. weekly_review

```
weekly_review(project_id | team_id)
```

---

# 7. Memory інтеграція (13)

Followup Agent активно використовує памʼять:

### Short-Term Memory

- контекст діалогу, де користувач дає інструкцію.

### Mid-Term Memory

- записи про:

  - виконання/невиконання нагадувань,
  - найбільш часті follow-up патерни,
  - типові проблеми.

### Long-Term Memory

- факти, як от:

  - "Команда працює в ритмі щоденних коротких оглядів."
  - "Треба нагадувати за 24 години до дедлайну."

---

# 8. UI інтеграція

## 8.1. Sidebar / Панель фоллоуапів

- Список активних нагадувань.
- Список активних follow-ups.
- Кнопка "Створити нагадування".

## 8.2. Створення нагадування

- Модалка:

  - "Кому нагадати?" → Людина або собі.
  - "Про що?"
  - "Коли?"

    - natural language ("завтра о 10")
    - або формальні параметри.

## 8.3. Стрічка подій у правій панелі

Followup Agent постійно додає записи:

- "Нагадування заплановано…"
- "Буде перевірено статус задачі…"
- "Follow-up створено…"

## 8.4. Взаємодія через чат агентів

Користувач може написати:

- "Зроби мені кілька нагадувань."
- "Хочу огляд дня."
- "Оціні чи є блокери в цьому проєкті."

---

# 9. API

### 9.1. Follow-ups

`GET /followups?team_id`  
`POST /followups`  
`PATCH /followups/:id`

### 9.2. Reminders

`GET /reminders?user_id`  
`POST /reminders`  
`DELETE /reminders/:id`

### 9.3. Digest & Reviews

`POST /digests/daily`  
`POST /digests/weekly`

---

# 10. Agent конфіг у Runtime Core

```ts
const followupAgentConfig: AgentConfig = {
  id: "ag_followups_core",
  teamId: "...",
  name: "Follow-up Agent",
  role: "followups_core",
  systemPrompt: systemFollowupPrompt,
  memoryScope: "team",
  tools: [
    "create_followup",
    "create_reminder",
    "ask_for_update",
    "check_task_status",
    "daily_digest",
    "weekly_review"
  ]
};
```

---

# 11. Інструкції для Cursor

Приклад промта:

```
Implement the Follow-ups & Reminders Agent using:

- 16_followups_reminders_agent.md
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 15_projects_agent_module.md
- 14_messenger_agent_module.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Create data models for followups and reminders.

2) Implement basic API: GET/POST/PATCH for followups and reminders.

3) Register Followup Agent with tools (create_followup, create_reminder, ask_for_update…).

4) Create UI:

   - sidebar list of active reminders,

   - modal for creating reminders,

   - follow-up events in right sidebar.

5) Integrate chat triggers:

   - detect "нагадати", "через", "завтра", "перевір статус" phrases.

   - forward to Followup Agent.

Output:

- files list
- diff
- summary
```

---

# 12. Результат

Після впровадження Followup Agent:

* microDAO має власного "агента-організатора ритму",
* задачі й домовленості ніколи не губляться,
* наявна здатність до самодисципліни та самонагляду,
* spільнота працює природно, без формальних таблиць чи менеджерів.


