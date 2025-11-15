# 19 — Notifications & Attention Agent (MicroDAO)

Агент уваги, тиші та інформаційного ритму

Notifications & Attention Agent (далі — Attention Agent) відповідає за *ритм сповіщень* та *інформаційну гігієну* в microDAO.  
Його мета — захистити учасників від шуму та втоми, залишивши лише важливе.

Це не "push-нотифікації".  
Це **агент управління увагою** — частина "нервової системи" microDAO.

---

# 1. Призначення

Attention Agent:

- фільтрує події,
- визначає важливість,
- блокує шум,
- формує дайджести,
- підсилює справді важливе,
- узгоджує ритм взаємодії між людьми та агентами.

Він — аналог "ретикулярної формації" спільноти.

---

# 2. Проблеми, які він вирішує

- надлишок сповіщень,
- інформаційне перевантаження,
- пропущені важливі оновлення,
- хаос у каналах,
- дублювання повідомлень,
- невчасні сигнали,
- втому від постійного ping.

---

# 3. Види уваги

Attention Agent працює з трьома видами уваги:

1. **Миттєва увага**  
   Події, які вимагають негайної реакції.  
   (блокер задачі, критична дія в governance, тривожний сигнал у роботах)

2. **Периферійна увага**  
   Події, важливі, але не термінові.  
   (новий документ, оновлення задачі, рішення ритуалу узгодження)

3. **Глибинна увага**  
   Знання, що варто прочитати, але не зараз.  
   (аналітика, звіти, огляди, Co-Memory оновлення)

---

# 4. Модель даних (log of events)

Attention Agent працює поверх подій (`events`):

```
event: {
id,
team_id,
type,         // message, task_update, followup, governance, knowledge_update...
source,       // messenger, tasks, governance, agents...
payload,      // JSON
ts
}
```

Він визначає важливість і формує *streams of attention*.

---

# 5. Потоки уваги (Attention Streams)

### 5.1. High-Attention Stream

- критичні події,
- прямі звернення до користувача,
- блокери.

### 5.2. Normal Stream

- звичайні робочі оновлення.

### 5.3. Low-Attention Stream

- знання, аналітика, нові документи,
- загальні події.

---

# 6. Attention Agent — спроможності

## 6.1. Фільтрація шуму

Він аналізує:

- дублікати,
- непотрібні @mention,
- спам дій від агентів,
- повторювані нагадування.

Шум приглушується або згруповується.

## 6.2. Ранжування важливості

Залежно від:

- ролі користувача,
- поточного контексту,
- активного проєкту,
- ритуалів узгодження,
- стану задач.

## 6.3. Дайджести

Формує:

- огляд дня,
- огляд тижня,
- огляд проєкту,
- огляд каналу.

## 6.4. Інтелектуальні сигнали

Наприклад:

- "Схоже, це важливо саме для тебе".
- "Цей документ стосується твого проєкту."
- "Тут задача, яку ти раніше коментував."

## 6.5. Таймінг

Обирає правильний момент:

- не вночі,
- не в момент великого потоку,
- між подіями.

## 6.6. Підсилення важливого

Якщо подія має високу важливість:

- підсвічується,
- виноситься у top stream,
- дублюється одноразово.

---

# 7. Інтеграція з агентами інших модулів

### Messenger Agent

- аналізує повідомлення,
- визначає важливі ключові слова.

### Projects Agent

- сигналить про дедлайни, блокери.

### Followups Agent

- генерує ритм.

### Governance Agent

- підсвічує ритуали узгодження.

### Memory Agent

- працює з подіями знань.

---

# 8. Tools (для Runtime Core)

### 8.1. classify_event

Визначає важливість події.

### 8.2. filter_noise

Зменшує шум, об'єднує дублікати.

### 8.3. build_digest

Створює дайджест з групи подій.

### 8.4. get_user_attention_stream

Повертає важливі події для конкретної людини.

### 8.5. suggest_timing

Підбирає оптимальний час для сповіщення.

### 8.6. highlight_critical

Позначає критичні події.

---

# 9. Інтеграція з Runtime Core (12)

```ts
const attentionAgentConfig: AgentConfig = {
  id: "ag_attention_core",
  teamId: "...",
  name: "Attention Agent",
  role: "attention_core",
  systemPrompt: systemAttentionPrompt,
  memoryScope: "team",
  tools: [
    "classify_event",
    "filter_noise",
    "build_digest",
    "get_user_attention_stream",
    "suggest_timing",
    "highlight_critical"
  ]
};
```

---

# 10. UI — візуалізація уваги

## 10.1. Панель уваги (Attention Panel)

Правий сайдбар у будь-якому контексті:

* топ важливих подій,
* пропущені сигнали,
* критичні оновлення.

## 10.2. Центр уваги (Attention Hub)

Окремий екран:

* `/t/:teamId/attention`

Тут користувач бачить:

* "Важливе за сьогодні",
* "Критичне зараз",
* "Рекомендоване до перегляду".

## 10.3. Дайджести

* кнопка "Огляд дня",
* кнопка "Огляд тижня".

## 10.4. Налаштування уваги

Користувач може обрати:

* рівень чутливості,
* типи подій,
* тихі години.

---

# 11. API

### Події

`GET /events?team_id`
`POST /events`

### Attention Streams

`GET /attention/stream?user_id`
`POST /attention/digest_daily`
`POST /attention/digest_weekly`

---

# 12. Інструкції для Cursor

```
Implement the Notifications & Attention Agent using:

- 19_notifications_attention_agent.md
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 16_followups_reminders_agent.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Create backend models for events and attention streams.

2) Implement API for events (recording) and attention streams (filtering, ranking).

3) Register Attention Agent and its tools.

4) Create UI:

   - Right sidebar "Attention Panel" showing prioritized events.

   - `/t/:teamId/attention` page (Attention Hub).

   - Configuration modal for attention levels.

5) Integrate with Messenger, Projects, Followups, and Governance Agents.

6) Implement basic digest generation (daily/weekly).

Output:

- file list
- diff
- summary
```

---

# 13. Результат

Після впровадження цього модуля:

* спільнота перестає тонути в шумі,
* виникає природна структура уваги,
* критичні події не губляться,
* люди й агенти діють у правильному ритмі,
* інформаційне навантаження стає здоровим і екологічним.


