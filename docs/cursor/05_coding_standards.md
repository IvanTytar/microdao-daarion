# 05 — MicroDAO Coding Standards (MVP)

Цей документ визначає мінімальні стандарти коду, яким повинен відповідати фронтенд MicroDAO.
Його мета — забезпечити якість, узгодженість і стабільність розробки, особливо при використанні Cursor.

## 1. Загальні принципи

1. **Тільки TypeScript.**
   Заборонено `any` та `unknown`, окрім явно позначених місць.

2. **Компоненти — функціональні.**
   Не використовувати класові компоненти.

3. **Стан — мінімалістичний.**
   Локальний стан → React useState
   Глобальний короткочасний стан → Context або Zustand
   Дані з API → React Query

4. **Ясність важливіша за магію.**
   Прості компоненти, зрозумілі хуки, передбачувані сторінки.

5. **Принцип: один файл — одна відповідальність.**

## 2. Архітектура проєкту

```
src/
api/          // Typed API clients
components/   // UI components (buttons, inputs, modals)
features/     // Business-level modules (chat, onboarding, agents)
hooks/        // Reusable react hooks
layout/       // Application layout
routes/       // Route definitions
store/        // Zustand stores (optional)
styles/       // Global CSS/tokens
utils/        // Formatting, validation
```

- `features/*` містять логіку конкретних модулів.
- `components/*` — лише dumb UI-компоненти (без бізнес-логіки).

## 3. TypeScript Правила

### 3.1. Строгий режим

У `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

### 3.2. Заборонено

* `any`
* `!` non-null assertion (за винятком рідкісних випадків)
* глобальний mutable state

### 3.3. API-типи

* Генеруємо типи з API Snapshot / OpenAPI.
* Типи для відповідей зберігаються в `src/api/types.ts`.

## 4. React Query (network layer)

### 4.1. Fetch wrapper

Один універсальний wrapper:

```ts
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/v1${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}
```

### 4.2. Query Keys

```
["teams"]
["teams", teamId]
["channels", teamId]
["messages", channelId]
["followups", teamId]
["projects", teamId]
```

## 5. Стандарти компонентів

### 5.1. Іменування

* Компоненти: `PascalCase`
* Хуки: `useCamelCase`
* Файли: `camel-case.tsx`
* Папки: `kebab-case`

### 5.2. Компонент повинен мати:

* Чіткий props-інтерфейс:

  ```ts
  interface MyCompProps {
    title: string;
    onClick: () => void;
  }
  ```
* Внутрішній стан не змішується з зовнішнім API-станом.
* Міжкомпонентна логіка виноситься в хуки (наприклад: `useMessages(channelId)`).

## 6. Обробка помилок

### 6.1. Toast/notification

Помилка API → коротке повідомлення:

> "Не вдалося виконати дію. Спробуйте ще раз."

### 6.2. ErrorBoundary

Окрема сторінка помилки для критичних збоїв.

### 6.3. Retry policy

React Query retry: `retry: 1` для GET-запитів
POST — без retry.

## 7. i18n стандарти

Всі тексти повинні бути в словнику:

```
src/i18n/uk.json
src/i18n/en.json
```

Формат ключів:

```
onboarding.welcome_title
onboarding.next
chat.send
chat.input_placeholder
followup.create
```

Форсувати одразу правильну структуру.

## 8. UI та дизайн

### 8.1. Кольори

```
--primary: #3F51F5;
--success: #43A047;
--error:   #E53935;
--gray-100: #F8F9FA;
--gray-200: #ECEFF1;
--gray-800: #263238;
```

### 8.2. Типографіка

* System font stack:
  `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`

### 8.3. Контрасти

Всі текстові елементи повинні відповідати WCAG AA (axe test).

## 9. Робота з WebSockets

* Використовуємо один хук: `useChannelStream(channelId)`.
* WS підключається коли відкрито чат.
* Події:

  * `message.created`
  * `message.updated`

Не зберігати WS-стан у глобальному store.

## 10. Обмеження для MVP

Що треба **вимкнути** у коді, щоб не перевантажити ранніх користувачів:

* Без drag'n'drop для файлів.
* Без реакцій (emoji).
* Без WYSIWYG редактора.
* Без Co-Memory (файли/документи), лише stub.
* Без granular RBAC.

## 11. Патерни, які Cursor повинен дотримуватися

1. **Atomic commits**: 1 Фіча → 1 commit.
2. **File-oriented prompts**: кожен запит до Cursor повинен містити список файлів для зміни.
3. **Не переписувати цілі модулі**, якщо не потрібно.
4. **Перевіряти типи** перед генерацією нового коду.
5. **Не вигадувати API** — брати тільки з `03_api_core_snapshot.md`.

## 12. Приклад робочого промта для Cursor

```
You are a senior React/TS engineer.

Implement Step 2 of the onboarding flow (/onboarding).

Specs:
- design from 04_ui_ux_onboarding_chat.md
- API from 03_api_core_snapshot.md
- coding standards from 05_coding_standards.md

Please output:
- list of files to modify
- code diff
```

## 13. Мета документа

Цей файл — "правила дорожнього руху" для команди і Cursor.

Він гарантує:

* узгоджений стиль,
* передбачуваний код,
* мінімум помилок,
* легку підтримку,
* зрозумілість структури для нових девелоперів.
