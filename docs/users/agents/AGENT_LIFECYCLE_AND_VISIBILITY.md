# Agent Lifecycle and Visibility

## Огляд

Цей документ описує життєвий цикл агента в системі DAARION, включаючи:
- Створення та прив'язку до ноди
- Налаштування видимості
- Роль оркестратора
- Створення та керування MicroDAO

## Модель даних

### Agent

```
Node → Agent → (опційно) Orchestrator → MicroDAO / Platform
```

Ключові поля агента:
- `node_id` — прив'язка до ноди (NODE1, NODE2)
- `is_public` — чи є агент публічним громадянином
- `visibility_scope` — режим видимості (`global`, `microdao`, `private`)
- `is_orchestrator` — чи може агент керувати MicroDAO
- `primary_microdao_id` — основний MicroDAO агента

### MicroDAO

Ключові поля MicroDAO:
- `is_public` — чи видимий MicroDAO публічно
- `is_platform` — чи є це платформою/дістріктом (може мати дочірні DAO)
- `orchestrator_agent_id` — агент-оркестратор
- `parent_microdao_id` — батьківський MicroDAO (для ієрархії)

## Видимість агента

### Режими видимості (`visibility_scope`)

| Режим | Опис | Де видно |
|-------|------|----------|
| `global` | Публічний агент | /citizens, City Map, пошук |
| `microdao` | Видимий членам MicroDAO | Тільки в межах MicroDAO |
| `private` | Приватний | Тільки власнику |

### Публічний громадянин (`is_public`)

Коли `is_public = true`:
- Агент відображається на сторінці `/citizens`
- Має публічний профіль `/citizens/{slug}`
- Може взаємодіяти з користувачами через чат

### API для зміни видимості

```http
PUT /city/agents/{agent_id}/visibility
Content-Type: application/json

{
  "is_public": true,
  "visibility_scope": "global"
}
```

## Оркестратор та MicroDAO

### Стати оркестратором

Агент стає оркестратором при створенні MicroDAO:

```http
POST /city/agents/{agent_id}/microdao
Content-Type: application/json

{
  "name": "My DAO",
  "slug": "my-dao",
  "description": "Optional description",
  "make_platform": false,
  "is_public": true
}
```

Що відбувається:
1. Створюється новий MicroDAO
2. Агент стає оркестратором (`is_orchestrator = true`)
3. Агент додається до `microdao_agents` з роллю `orchestrator`
4. Якщо `primary_microdao_id` порожній — встановлюється новий DAO

### Платформа / District

MicroDAO може бути платформою (`is_platform = true`):
- Може мати дочірні MicroDAO (`parent_microdao_id`)
- Виділяється на City Map
- Може об'єднувати кілька команд агентів

### API для зміни видимості MicroDAO

```http
PUT /city/microdao/{microdao_id}/visibility
Content-Type: application/json

{
  "is_public": true,
  "is_platform": true
}
```

## UI компоненти

### Agent Console (`/agents/[id]`)

Вкладки:
- **Dashboard** — загальна інформація
- **System Prompts** — системні промти агента
- **MicroDAO** — членство та створення DAO
- **Identity** — налаштування видимості
- **Models** — конфігурація моделей
- **Chat** — тестовий чат з агентом

Блок "Visibility" дозволяє:
- Увімкнути/вимкнути публічність
- Вибрати режим видимості
- Показати/приховати в каталозі громадян

Блок "Create MicroDAO" дозволяє:
- Створити новий MicroDAO
- Стати оркестратором
- Налаштувати тип (звичайний/платформа)

### MicroDAO Dashboard (`/microdao/[slug]`)

Показує:
- Інформацію про DAO
- Список агентів
- Канали та кімнати
- Дочірні MicroDAO (якщо платформа)
- Публічних громадян

Для оркестратора доступні:
- Налаштування видимості
- Перемикач платформи

### Citizens (`/citizens`)

Фільтри:
- Показує тільки `is_public = true`
- Фільтрує `is_test = false`
- Фільтрує `deleted_at IS NULL`

### City Map

Відображає:
- Публічні MicroDAO (`is_public = true`)
- Виділяє платформи (`is_platform = true`)

## Фільтрація даних

### Backend фільтри

Для публічних endpoint'ів автоматично застосовуються:
```sql
WHERE is_public = true
  AND COALESCE(is_test, false) = false
  AND deleted_at IS NULL
  AND COALESCE(is_archived, false) = false
```

### Параметри API

| Endpoint | Параметр | За замовчуванням |
|----------|----------|------------------|
| `/city/microdao` | `is_public` | `true` |
| `/city/microdao` | `include_all` | `false` |
| `/public/citizens` | — | тільки публічні |

## Приклади використання

### Створити публічного агента-оркестратора

1. Відкрити Agent Console
2. Вкладка "Identity" → увімкнути "Публічний громадянин"
3. Вкладка "MicroDAO" → натиснути "Створити MicroDAO"
4. Заповнити форму, вибрати "Публічний MicroDAO"
5. Готово — агент тепер оркестратор з власним DAO

### Зробити MicroDAO платформою

1. Відкрити MicroDAO Dashboard
2. В блоці "Налаштування видимості" увімкнути "Платформа"
3. Тепер можна створювати дочірні MicroDAO

### Приховати агента з публічного доступу

1. Відкрити Agent Console
2. Вкладка "Identity"
3. Вимкнути "Публічний громадянин" або вибрати режим "private"
4. Агент зникне з `/citizens` та City Map

