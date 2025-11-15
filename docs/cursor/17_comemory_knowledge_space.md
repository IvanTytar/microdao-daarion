# 17 — Co-Memory & Knowledge Space (MicroDAO)

Простір знань і колективна памʼять спільноти

Co-Memory — це "мозок спільноти".  
Це місце, де зберігаються документи, факти, концепти, визначення, історія, рішення, правила й контексти.  

Knowledge Space — це структурована навігація по цій памʼяті, яку розуміють і люди, і агенти.

Разом вони формують фундамент DAGI — децентралізованого емерджентного інтелекту.

---

# 1. Призначення

Co-Memory вирішує три завдання:

1. **Колективні знання**

   - Документи, файли, бази знань.
   - Значущі фрагменти (факти, визначення, домовленості).

2. **Структура знань**

   - Простори (knowledge spaces),
   - Теги,
   - Категорії,
   - RAG-індекси,
   - Семантичні групи.

3. **Інструменти розуміння**

   - RAG-пошук,
   - оновлення знань агентами,
   - генерація summary,
   - інференс подій,
   - пропозиції покращення.

Knowledge Space — це не "Google Drive".  
Це **агентський, самооновлюваний простір**, де знання постійно оновлюються через взаємодію спільноти та агентів.

---

# 2. Що таке Knowledge Space

Knowledge Space — це:

- "папка", але з контекстом,
- простір, який може містити:

  - документи,
  - файли,
  - нотатки,
  - факти,
  - ключові поняття,

- власну багаторівневу памʼять,
- власних агентів-кураторів знань.

Кожен Knowledge Space існує як **контекст**, у якому можуть взаємодіяти:

- люди,
- агент знань,
- інші агенти,
- Projects Agent,
- Followup Agent.

---

# 3. Структура Co-Memory

Co-Memory складається з:

### 3.1. Documents (Документи)

- PDF, MD, DOCX
- структури текстів
- автоматично створювані summary

### 3.2. Notes (Нотатки)

- короткі фрагменти,
- конспекти,
- витяги агентів.

### 3.3. Facts (Факти)

- короткі текстові знання:

  - "Проєкт MicroDAO запускається в три етапи."
  - "Кожен агент має власну пам'ять і колективну памʼять."

### 3.4. Definitions (Визначення)

- ключові поняття:

  - "DAGI",
  - "Team Agent",
  - "1T як одиниця досвіду".

### 3.5. Threads Memory

- памʼять дискусій,
- важливі моменти взаємодій у каналах.

### 3.6. Semantic Embeddings

- ембедінги документів, нотаток, фактів.

### 3.7. Metadata & Relations

- посилання між документами,
- причинно-наслідкові звʼязки,
- залежності між поняттями.

---

# 4. Агенти, пов'язані з Co-Memory

## 4.1. Memory Agent (основний)

Роль: `"memory_core"`

Відповідає за:

- додавання фактів,
- витяг релевантних знань,
- формування рішень,
- оновлення довгострокової памʼяті агента,
- RAG-індексацію.

## 4.2. Knowledge Curator Agent

Роль: `"knowledge_curator"`

- створює структуру знань,
- перевіряє старі факти,
- пропонує очистку або об'єднання документів,
- формує "канон" спільноти.

## 4.3. Knowledge Guide Agent

Роль: `"knowledge_guide"`

- відповідає на питання:

  - "Що ми знаємо про MicroDAO?"
  - "Поясни концепцію DAGI."
  - "Покажи документи про governance."

- виконує RAG-пошук,
- створює підбірки знань.

---

# 5. Життєвий цикл знань

### Етап 1: Створення

- документ завантажують,
- агент додає summary,
- Knowledge Space оновлюється.

### Етап 2: Дистиляція

- Memory Agent аналізує обговорення,
- створює факти / визначення,
- додає їх у long-term.

### Етап 3: Об'єднання

- Curator Agent:

  - виявляє дублікати,
  - обʼєднує схожі документи,
  - оптимізує структуру.

### Етап 4: RAG-індексація

- ембедінги документів,
- векторні індекси,
- контекст для всіх агентів.

### Етап 5: Використання

- пошук,
- відповіді на запити,
- автоматичні звіти,
- аналіз проєктів.

---

# 6. Структура даних

## 6.1. Таблиця `knowledge_spaces`

- id  
- team_id  
- name  
- description  
- created_by  
- created_at  

## 6.2. Таблиця `knowledge_documents`

- id  
- space_id  
- title  
- content_text  
- file_url?  
- summary  
- embedding_vector  
- created_at  
- updated_at  

## 6.3. Таблиця `knowledge_facts`

- id  
- space_id  
- fact_text  
- embedding_vector  
- created_by  
- created_at  

## 6.4. Таблиця `knowledge_relations`

- id  
- from_id  
- to_id  
- relation_type ("defines", "depends_on", "explains", "references")  
- created_by  
- created_at  

---

# 7. Tools (сумісні з Runtime Core)

### 7.1. add_document

Додає документ у Knowledge Space.

### 7.2. add_fact

Додає факт у LTM та індексує його.

### 7.3. get_relevant_knowledge

RAG-пошук:

- слова → факти → документи → summary.

### 7.4. summarize_space

Створює огляд усього Knowledge Space.

### 7.5. explain_concept

Пояснює концепт на основі фактів, визначень, документів.

### 7.6. link_knowledge

Створює звʼязки між фактами/документами.

---

# 8. Інтеграція з Runtime Core (12)

Memory Agent підключається як:

```ts
const memoryAgentConfig: AgentConfig = {
  id: "ag_memory_core",
  teamId: "...",
  name: "Memory Agent",
  role: "memory_core",
  systemPrompt: systemMemoryPrompt,
  memoryScope: "team",
  tools: [
    "add_document",
    "add_fact",
    "get_relevant_knowledge",
    "summarize_space",
    "explain_concept",
    "link_knowledge"
  ]
};
```

---

# 9. Інтеграція з Projects, Messenger, Followups

### Projects Agent

* додає факти про проєкт у Knowledge Space проєкту.

### Messenger Agent

* зберігає важливі уривки обговорень.

### Followups Agent

* формує історію ритму та задач у вигляді нотаток.

---

# 10. UI

## 10.1. Sidebar → Knowledge

* Список Knowledge Spaces.
* Кнопка "Створити новий простір знань".

## 10.2. Основний екран Knowledge Space

* Заголовок.
* Опис.
* Documents.
* Facts.
* Relations.
* Кнопка "Додати документ".
* Кнопка "Додати факт".

## 10.3. Правий сайдбар Knowledge

* Рекомендації від агентів.
* Семантичні групи.
* Контекстні звʼязки.

## 10.4. Чат взаємодії з Knowledge Guide

* "Поясни мені цей документ…"
* "Що ми знаємо про governance?"
* "Покажи всі визначення, повʼязані з DAGI."

---

# 11. API

### 11.1. Knowledge Spaces

`GET /knowledge_spaces?team_id`
`POST /knowledge_spaces`

### 11.2. Documents

`GET /knowledge_spaces/:id/documents`
`POST /documents`
`PATCH /documents/:id`

### 11.3. Facts

`GET /knowledge_spaces/:id/facts`
`POST /facts`

### 11.4. Search & RAG

`POST /knowledge/search`

→ повертає релевантні факти, документи, summary.

---

# 12. Інструкції для Cursor

```
Implement the Co-Memory & Knowledge Space module using:

- 17_comemory_knowledge_space.md
- 12_agent_runtime_core.md
- 13_agent_memory_system.md
- 14_messenger_agent_module.md
- 15_projects_agent_module.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Tasks:

1) Create backend models:

   - knowledge_spaces
   - knowledge_documents
   - knowledge_facts
   - knowledge_relations

2) Implement API for documents, facts, spaces, relations.

3) Register Memory Agent and Knowledge Guide Agent with tools:

   - add_document
   - add_fact
   - get_relevant_knowledge
   - explain_concept
   - summarize_space

4) Create UI:

   - Knowledge Spaces list in sidebar
   - Knowledge Space page (documents, facts, relations)
   - modal for uploading documents
   - chat with Knowledge Guide Agent

5) Integrate RAG search:

   - based on documents + facts

Output:

- list of changed files
- diff
- summary
```

---

# 13. Результат

Після впровадження цього модуля:

* кожне microDAO отримує повноцінну еволюційну памʼять,
* агенти знають, що створює спільнота,
* знання не губляться в чатах — вони структуруються,
* DAGI отримує основу для глибинного reasoning,
* MicroDAO перетворюється на справжній "живий простір розуму".


