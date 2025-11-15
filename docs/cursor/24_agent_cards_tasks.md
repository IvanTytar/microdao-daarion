# 24 — Agent Cards and Console Tasks (MicroDAO)

Структурований список задач для реалізації Agent Cards та Console

Цей документ містить детальні технічні задачі для поетапної реалізації системи карток агентів та Agent Console.

**Базовий документ:** `23_agent_cards_and_console.md`

---

# Task 1 — Agent-Cards-Grid (плитки агентів)

## Мета

Створити компонент AgentCard та AgentGrid для відображення агентів у вигляді "живих карток" з метриками досвіду, репутації та присутності.

## Специфікація

### 1. Компонент AgentCard

* Розмір: 280x360px (рекомендовано)
* Структура:

  * Верхній блок: Аватар + відео-аватар (64x64px)
  * Імʼя та роль
  * Метрики: Вік, Досвід 1T, Репутація
  * Присутність: бейджі каналів/проєктів
  * Статус підключення

### 2. Компонент AgentGrid

* Сітка карток (responsive: 1-4 колонки)
* Фільтри: "Всі", "Підключені", "Доступні"
* Пошук по імені/ролі

### 3. Дані

* API: `GET /agents?team_id=...`
* Метрики: `GET /agents/{id}/metrics`
* Присутність: `GET /agents/{id}/presence`

### 4. Hover ефект

* Напівпрозорий оверлей з кнопками:
  * "Почати взаємодію"
  * "Підключити до каналу"
  * "Деталі агента"

### 5. Клік

* Відкриває Agent Console (Task 2)

## Acceptance Criteria

* Картки агентів відображаються у сітці
* Показуються метрики (вік, 1T, репутація)
* Hover показує опції взаємодії
* Клік відкриває Agent Console
* Фільтри та пошук працюють

## Приклад промта для Cursor

```
Implement Agent Cards Grid using:

- 23_agent_cards_and_console.md
- 10_agent_ui_system.md
- 05_coding_standards.md

Deliverables:

1) AgentCard component with avatar, name, role, metrics (age, 1T, reputation).
2) AgentGrid component with responsive layout (1-4 columns).
3) Hover overlay with action buttons.
4) Filters: All / Connected / Available.
5) Search by name/role.

Output: list of files + diff + summary.
```

---

# Task 2 — Agent-Console-UI (повний інтерфейс)

## Мета

Створити Agent Console — повний інтерфейс для взаємодії з агентом з 5 вкладками.

## Специфікація

### 1. Структура Agent Console

* Верхня панель: Аватар, імʼя, метрики
* Вкладки: Чат, Файли, Памʼять, Присутність, Еволюція
* Контент вкладок (деталі нижче)

### 2. Вкладка "Чат"

* Використовує `AgentChatWindow` з `10_agent_ui_system.md`
* Додатково: кнопка "Голосовий діалог" (stub для MVP)
* Показ поточного контексту

### 3. Вкладка "Файли та Документи"

* Список файлів (з API або stub)
* Кнопка "Завантажити файл"
* Індикатор: "Документи зберігаються в просторі вашої microDAO"

### 4. Вкладка "Памʼять і Знання"

* Використовує компоненти з `13_agent_memory_system.md`
* Короткострокова та довгострокова памʼять
* Кнопки управління памʼяттю

### 5. Вкладка "Присутність / Права доступу"

* Таблиця просторів (канали, проєкти)
* Перемикачі підключення
* Рівні доступу
* Кнопка "Додати до нового каналу/проєкту"

### 6. Вкладка "Еволюція та дух спільноти"

* Лог внеску агента
* Статистика запитів
* Репутація від спільноти
* Без фінансових термінів

## Acceptance Criteria

* Agent Console відкривається при кліку на картку
* Всі 5 вкладок працюють
* Чат інтегрований з Agent Runtime Core
* Файли показуються (stub дані OK)
* Памʼять інтегрована з Memory System
* Присутність показує реальні дані
* Еволюція показує лог (stub OK)

## Приклад промта для Cursor

```
Implement Agent Console UI using:

- 23_agent_cards_and_console.md
- 10_agent_ui_system.md
- 13_agent_memory_system.md
- 12_agent_runtime_core.md
- 05_coding_standards.md

Deliverables:

1) AgentConsole component with 5 tabs.
2) Chat tab: integrate AgentChatWindow.
3) Files tab: file list + upload button (stub).
4) Memory tab: integrate memory components.
5) Presence tab: table with connect/disconnect toggles.
6) Evolution tab: log display (stub data OK).

Output: list of files + diff + summary.
```

---

# Task 3 — Agent-Experience-Metrics (1T + репутація)

## Мета

Реалізувати систему метрик досвіду агентів: вік, досвід 1T, репутація спільноти.

## Специфікація

### 1. Вік агента

* Розрахунок: `created_at` до поточної дати
* Формат: "3 тижні", "6 місяців", "1 рік 2 місяці"
* API: `GET /agents/{id}/metrics` → `{ age: { weeks, months, years } }`

### 2. Досвід 1T

* Лічильник: велике число з розділювачами (12 340 1T)
* Tooltip: "1T — це внутрішня одиниця обчислень і досвіду агента"
* API: `GET /agents/{id}/metrics` → `{ experience1T: number }`
* Візуалізація: великий текст з іконкою

### 3. Репутація спільноти

* Шкала: 0-100 або 0-5 зірок
* Розрахунок: на основі фідбеку від учасників
* API: `GET /agents/{id}/metrics` → `{ reputation: { score, type } }`
* Візуалізація: прогрес-бар або зірки

### 4. Компонент AgentMetrics

```tsx
interface AgentMetricsProps {
  agentId: string;
  compact?: boolean; // для картки vs консолі
}

export function AgentMetrics({ agentId, compact }: AgentMetricsProps) {
  // Відображення метрик
}
```

## Acceptance Criteria

* Вік агента розраховується правильно
* 1T показується з tooltip
* Репутація відображається візуально
* Метрики оновлюються при зміні даних

## Приклад промта для Cursor

```
Implement Agent Experience Metrics using:

- 23_agent_cards_and_console.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Deliverables:

1) Calculate agent age from created_at.
2) Display 1T experience with tooltip explanation.
3) Display reputation (0-100 scale or 0-5 stars).
4) AgentMetrics component for reuse in Card and Console.
5) API integration: GET /agents/{id}/metrics.

Output: list of files + diff + summary.
```

---

# Task 4 — Agent-Connections-Toggles (підключення/відключення)

## Мета

Реалізувати управління підключеннями агентів до просторів (канали, проєкти) з перемикачами.

## Специфікація

### 1. На картці агента

* Бейджі: "Публічні простори: 2", "Конфіденційні: 1"
* При кліку — модалка зі списком просторів
* Перемикачі для кожного простору

### 2. У Agent Console (вкладка "Присутність")

* Таблиця просторів:
  * Простір / Тип / Доступ / Статус / Дії
* Перемикач "Підключено/Відʼєднано"
* Кнопка "Додати до нового простору"

### 3. API

* `GET /agents/{id}/presence` → список просторів
* `POST /agents/{id}/presence/connect` → підключити
* `POST /agents/{id}/presence/disconnect` → відключити

### 4. UX

* При відключенні: підтвердження
* При підключенні: вибір прав доступу
* Оновлення UI після зміни

## Acceptance Criteria

* Бейджі на картці показують кількість просторів
* Модалка зі списком просторів працює
* Перемикачі в консолі працюють
* API виклики зберігають зміни
* UI оновлюється після змін

## Приклад промта для Cursor

```
Implement Agent Connections Management using:

- 23_agent_cards_and_console.md
- 21_agent_only_interface.md
- 03_api_core_snapshot.md
- 05_coding_standards.md

Deliverables:

1) Badges on agent card showing presence count.
2) Modal with list of spaces (channels/projects) for agent.
3) Toggle switches in Agent Console Presence tab.
4) Connect/disconnect API calls.
5) UI updates after connection changes.

Output: list of files + diff + summary.
```

---

# Порядок виконання задач

Рекомендований порядок:

1. **Task 1** — Agent-Cards-Grid (базова структура карток)
2. **Task 3** — Agent-Experience-Metrics (метрики для карток)
3. **Task 2** — Agent-Console-UI (повний інтерфейс)
4. **Task 4** — Agent-Connections-Toggles (управління підключеннями)

---

# Залежності між задачами

- **Task 1** не залежить від інших
- **Task 3** може використовуватися в Task 1
- **Task 2** потребує Task 1 (відкриття консолі з картки)
- **Task 4** потребує Task 2 (вкладка "Присутність")

---

# Загальні вимоги

## Термінологія

**Важливо:** Використовувати тільки людську термінологію:

✅ Дозволено:
- "досвід"
- "шлях агента"
- "довіра спільноти"
- "внесок у колективний розум"
- "репутація"

❌ Заборонено:
- "інвестиції"
- "юніти вартості"
- "ROI"
- "прибуток"
- будь-які фінансові терміни

## Зберігання даних

* Всі файли/документи зберігаються в сховищі microDAO
* Показувати індикатор: "Документи зберігаються в просторі вашої microDAO"
* DAGI використовується як "мозок", але не як сховище

---

**Готово.**  
Це **структурований список задач для Agent Cards та Console**, готовий до використання в Cursor.


