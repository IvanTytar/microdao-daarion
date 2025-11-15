# 18 — Governance & Access Agent (MicroDAO)

Агент правил, доступів, ритуалів та духу спільноти

Цей модуль визначає, як спільнота microDAO керує собою:  
правила, права доступу, колективні рішення, символічні ключі, ритуали довіри та механізми узгодження.  

Це НЕ фінансова система.  
Це **етико-організаційна інфраструктура**, яка тримає єдність духу спільноти.

---

# 1. Призначення

Governance & Access Agent відповідає за:

- **правила спільноти** (policies),
- **роли й дозволи** (RBAC + entitlements),
- **символічні ключі доступу** (soulbound / capability keys),
- **ритуали узгодження** (голосування, сигнали підтримки, консенсус),
- **індекс довіри та реноме** (не фінансовий),
- **координацію взаємодії між агентами та людьми**.

Все це забезпечує гармонію всередині microDAO.

---

# 2. Ключові концепти

## 2.1. "Ключі спільноти" (Community Keys)

Це не монети чи валюта.  
Це **символічні доступи**, які визначають:

- членство,
- рівень участі,
- довіру,
- право вводити/виводити агентів у простір.

Кожен ключ може бути:

- **особистим** (soulbound),
- **командним** (для проєкту),
- **контекстним** (для певного простору знань чи каналу).

## 2.2. "Ритуали узгодження"

Замість слова "голосування" можна використовувати:

- "колективний сигнал підтримки",
- "колективна згода",
- "ритуал затвердження".

Це спрощений процес, який може включати:

- варіанти "підтримую / не підтримую",
- коментарі,
- пропозиції поправок,
- участь агентів.

## 2.3. "Індекс довіри"

Нефінансова, духовна метрика участі:

- внесок у спільноту,
- кількість створених фактів,
- допомога іншим,
- активність в agent-based просторах,
- прийняті пропозиції.

---

# 3. Роль Governance Agent

Роль агента: `"governance_core"`

Він:

- стежить за правилами,
- пропонує, коли потрібно затвердити зміни,
- забезпечує правильне застосування доступів,
- координує "ритуали узгодження",
- захищає конфіденційні простори,
- видає/анулює символічні ключі.

---

# 4. Ролі Access Agent

Роль: `"access_keeper"`

Він:

- керує entitlements (доступами),
- створює capability-доступи для:

  - людей,
  - агентів,
  - просторів,

- гарантує, що агенти не виходять за межі своїх прав.

---

# 5. Структура правил

## 5.1. Рівні правил

Правила діляться на 3 рівні:

1. **Простору (microDAO)**

   - загальні принципи,
   - стилістика взаємодії,
   - етичні правила.

2. **Проєкту**

   - специфічні для конкретної роботи,
   - права агентів у межах проєкту,
   - ритуали перевірки прогресу.

3. **Контексту / каналу**

   - прості локальні правила.

## 5.2. Формат зберігання правил

Таблиця `governance_policies`:

- id  
- team_id  
- title  
- body_text  
- created_by  
- scope (`team`, `project`, `channel`)  
- created_at  

---

# 6. Інтеграція з RBAC та Entitlements

Використовується модуль `microdao — RBAC and Entitlements (MVP)`.

Governance Agent:

- створює entitlements,
- оновлює/анулює доступи,
- пропонує оновлення прав агентів,
- захищає конфіденційні зони.

Доступ може бути:

- `read`,
- `write`,
- `tasks`,
- `knowledge`,
- `presence`.

Ключі можуть бути soulbound, або привʼязані до ролей.

---

# 7. Ритуали узгодження

## 7.1. Створення ритуалу

Через чат агентів:

> "Запропонуй зміни в правилах."  
> "Проведи ритуал узгодження щодо нового документа."  
> "Чи підтримує спільнота цей простір знань?"

## 7.2. Модель ритуалу

`governance_rituals`:

- id  
- team_id  
- title  
- description  
- options (наприклад: підтримую / не підтримую)  
- created_by  
- closes_at  
- status  

## 7.3. Перебіг

Governance Agent:

1. Створює ритуал.
2. Повідомляє всіх учасників.
3. Збирає сигнали підтримки у чатах і через агентів.
4. Формує summary.
5. Оновлює правила/доступи або пропонує зміни.

---

# 8. Символічні ключі (Soulbound Keys)

Це:

- особисті ключі для членів microDAO,
- ключі проєктів,
- ключі агентів,
- ключі доступу до конфіденційних просторів.

Дані зберігаються в `governance_keys`:

- id  
- team_id  
- owner_kind (`user` | `agent`)  
- owner_id  
- scope (`team`, `project`, `channel`)  
- permissions (json array)  
- created_at  

---

# 9. Інтеграція з агентами інших модулів

### Messenger Agent

- отримує сповіщення про зміни доступів,
- не допускає агентів у заборонені канали.

### Projects Agent

- отримує дозволи на створення/оновлення задач у контекстах.

### Memory Agent

- додає факти: "Правило X затверджено", "Ритуал Y завершено".

### Agent Hub

- показує короткі огляди активних ритуалів і важливих рішень.

---

# 10. UI

## 10.1. Sidebar → Правила

- Кнопка "Правила спільноти"
- Кнопка "Символічні ключі"

## 10.2. Сторінка правил

- Список правил
- Фільтри: team / project / channel
- Кнопка "Запропонувати зміну"

## 10.3. Сторінка символічних ключів

- Список ключів:

  - належать користувачу,
  - належать агентам користувача,

- Контекст доступів.

## 10.4. Ритуали узгодження

- Список активних ритуалів.
- Оголошення:

  - "Потрібна увага спільноти."

- Кнопка "Підтримати" чи "Не підтримую".

---

# 11. Tools (сумісно з Runtime Core)

### 11.1. create_policy

Створює нове правило.

### 11.2. update_policy

Оновлює існуюче правило.

### 11.3. create_key

Створює символічний ключ доступу.

### 11.4. revoke_key

Анулює ключ.

### 11.5. create_ritual

Створює ритуал узгодження.

### 11.6. collect_support

Збирає сигнали підтримки.

### 11.7. finalize_ritual

Підсумок ритуалу:

- оновити правила,
- або передати у Memory Agent для аналізу.

---

# 12. Конфіг агента (Runtime Core)

```ts
const governanceAgentConfig: AgentConfig = {
  id: "ag_governance_core",
  teamId: "...",
  name: "Governance Agent",
  role: "governance_core",
  systemPrompt: systemGovernancePrompt,
  memoryScope: "team",
  tools: [
    "create_policy",
    "update_policy",
    "create_key",
    "revoke_key",
    "create_ritual",
    "collect_support",
    "finalize_ritual"
  ]
};
```

---

# 13. API

### Policies

`GET /governance/policies?team_id`
`POST /governance/policies`
`PATCH /governance/policies/:id`

### Keys

`GET /governance/keys?team_id`
`POST /governance/keys`
`DELETE /governance/keys/:id`

### Rituals

`GET /governance/rituals?team_id`
`POST /governance/rituals`
`PATCH /governance/rituals/:id`

---

# 14. Інструкції для Cursor

```
Implement the Governance & Access Agent using:

- 18_governance_access_agent.md
- microdao — RBAC and Entitlements (MVP)
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Create models for governance_policies, governance_keys, governance_rituals.

2) Implement API for policies, keys, and rituals.

3) Register Governance Agent with tools.

4) Create UI:

   - Policies page
   - Symbolic Keys page
   - Rituals page

5) Integrate with Agent Hub: show active rituals and key policy changes.

6) Ensure no financial vocabulary is used anywhere.

Output:

- list of changed files
- diff
- summary
```

---

# 15. Результат

Після впровадження цього модуля:

* кожне microDAO отримує свою "конституцію",
* доступи стають функцією духу спільноти, а не технічних ролей,
* символічні ключі формують систему довіри,
* ритуали узгодження стають живою формою колективного рішення,
* Governance Agent забезпечує гармонію роботи людей і агентів.


