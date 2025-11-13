# MicroDAO — Документація для Cursor

Ця папка містить структуровану документацію для розробки MVP MicroDAO з використанням Cursor AI.

## Структура документації

### 00_overview_microdao.md
Загальний огляд системи MicroDAO, ключові модулі та посилання на інші документи.

**Коли використовувати:** Для швидкого ознайомлення з проєктом.

### 01_product_brief_mvp.md
Product Requirements для MVP: мета, персони, ключові сценарії, обсяг та межі.

**Коли використовувати:** Для розуміння бізнес-логіки та цілей MVP.

### 02_architecture_basics.md
Технічна архітектура: стек, основні сервіси, дані та моделі, WebSockets, приватність.

**Коли використовувати:** Для розуміння технічної архітектури та інтеграцій.

### 03_api_core_snapshot.md
Стисла витяжка з OpenAPI 3.1: всі ендпоїнти, необхідні для MVP, з прикладами запитів та відповідей.

**Коли використовувати:** При створенні API клієнтів та інтеграції з бекендом.

### 04_ui_ux_onboarding_chat.md
UI/UX специфікація: онбординг, чат, публічний канал, стандарти дизайну, адаптивність.

**Коли використовувати:** При розробці UI компонентів та сторінок.

### 05_coding_standards.md
Стандарти кодування: TypeScript правила, React патерни, обробка помилок, i18n, UI стандарти.

**Коли використовувати:** При написанні коду для забезпечення якості та узгодженості.

### 06_tasks_onboarding_mvp.md
Технічні задачі для Cursor: детальні специфікації для кожної функції MVP з acceptance criteria.

**Коли використовувати:** Як "панель управління" розробкою — копіювати задачі в Cursor.

### 07_testing_checklist_mvp.md
Тестовий чеклист: критичні E2E тести, тести чату, follow-ups, проєктів, агентів, обробка помилок.

**Коли використовувати:** При тестуванні та перевірці готовності MVP.

## Як використовувати з Cursor

### 1. Початкове налаштування
Додай всю папку `docs/cursor/` в контекст Cursor або вкажи на конкретні файли при створенні промптів.

### 2. Створення промптів
Використовуй формат з `06_tasks_onboarding_mvp.md`:

```
You are a senior React/TypeScript engineer.

Task: [Назва задачі з 06_tasks_onboarding_mvp.md]

Context:
- Product brief: 01_product_brief_mvp.md
- API specs: 03_api_core_snapshot.md
- UI/UX: 04_ui_ux_onboarding_chat.md
- Coding standards: 05_coding_standards.md

Please output:
- List of files to modify/create
- Code diff
- Short summary
```

### 3. Перевірка коду
Після генерації коду перевіряй відповідність:
- `05_coding_standards.md` — стандарти кодування
- `07_testing_checklist_mvp.md` — тестові сценарії

## Швидкий старт

1. **Ознайомся з проєктом:** `00_overview_microdao.md`
2. **Зрозумій бізнес-логіку:** `01_product_brief_mvp.md`
3. **Вивчи архітектуру:** `02_architecture_basics.md`
4. **Почни з онбордингу:** `06_tasks_onboarding_mvp.md` → Block A
5. **Тестуй:** `07_testing_checklist_mvp.md`

## Важливі примітки

- Всі API контракти беріть тільки з `03_api_core_snapshot.md`
- Всі UI тексти беріть з `04_ui_ux_onboarding_chat.md`
- Дотримуйтесь стандартів з `05_coding_standards.md`
- Не вигадуйте нові API або UI елементи без узгодження

## Посилання на повну документацію

- Повна OpenAPI специфікація (за потреби)
- Data Model & Event Catalog
- Tech Spec / Технічний опис MicroDAO
- UI/UX Specification — microdao (web)

---

**Версія:** MVP v1.0  
**Останнє оновлення:** 2025-01-XX

