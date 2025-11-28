# TASK 033: Agent & MicroDAO Chat Widgets

**Дата:** 28 листопада 2025  
**Статус:** ✅ Завершено

## Мета

1. У кожному Agent Dashboard (`/agents/[id]`) має бути **діалогове вікно (Matrix-чат) з цим агентом**.
2. У кожному MicroDAO (`/microdao/[slug]`) має бути **публічний чат кімнати цього MicroDAO**, де оркестратор спілкується з користувачами.

## Виконані зміни

### 1. Backend: Agent Dashboard → primary_city_room

**Файл:** `services/city-service/routes_city.py`

- Оновлено endpoint `GET /city/agents/{id}/dashboard`
- Додано поле `primary_city_room` до відповіді
- Пріоритет визначення кімнати:
  1. Перша кімната агента з `city_rooms`
  2. Primary room MicroDAO агента (якщо є `primary_microdao_id`)
  3. `null` якщо немає

### 2. Backend: MicroDAO Detail → primary_city_room

**Файл:** `services/city-service/models_city.py`

- Додано модель `CityRoomSummary`:
  ```python
  class CityRoomSummary(BaseModel):
      id: str
      slug: str
      name: str
      matrix_room_id: Optional[str] = None
  ```
- Оновлено `MicrodaoDetail` — додано поле `primary_city_room`

**Файл:** `services/city-service/repo_city.py`

- Додано функцію `get_microdao_primary_room(microdao_id)`:
  - Шукає primary room MicroDAO
  - Пріоритет: `room_type='primary'` → `room_type='public'` → будь-яка активна

**Файл:** `services/city-service/routes_city.py`

- Оновлено endpoint `GET /city/microdao/{slug}`
- Додано виклик `get_microdao_primary_room()` та заповнення `primary_city_room`

### 3. Frontend: Типи

**Файл:** `apps/web/src/lib/agent-dashboard.ts`

- Додано тип `CityRoomSummary`
- Оновлено `AgentDashboard` — додано поле `primary_city_room`

**Файл:** `apps/web/src/lib/types/microdao.ts`

- Додано тип `CityRoomSummary`
- Оновлено `MicrodaoDetail` — додано поле `primary_city_room`

### 4. Frontend: Agent Console (`/agents/[agentId]`)

**Файл:** `apps/web/src/app/agents/[agentId]/page.tsx`

- Оновлено Chat Tab:
  - Прямий чат з агентом через DAGI Router (існуючий)
  - Нова секція "Публічна кімната агента" з `CityChatWidget`
- Якщо `primary_city_room` є — показує Matrix-чат
- Якщо немає — показує повідомлення про необхідність налаштування

### 5. Frontend: MicroDAO Page (`/microdao/[slug]`)

**Файл:** `apps/web/src/app/microdao/[slug]/page.tsx`

- Додано секцію "Публічний чат MicroDAO"
- Використовує `CityChatWidget` з `primary_city_room.slug`
- Показує інформацію про оркестратора
- Якщо кімната не налаштована — показує placeholder

## Перевикористання

Обидві сторінки використовують існуючий компонент `CityChatWidget` з `/components/city/CityChatWidget.tsx`, який вже працює на сторінці громадянина (`/citizens/[slug]`).

## Acceptance Criteria

- [x] `/agents/[id]` — секція "Публічна кімната агента" з Matrix-чатом
- [x] `/microdao/[slug]` — секція "Публічний чат MicroDAO" з Matrix-чатом
- [x] Перевикористано `CityChatWidget`
- [x] Білд проходить успішно
- [x] Типи оновлено на фронтенді та бекенді

## Пов'язані завдання

- **TASK 031:** Node Agents Discovery
- **TASK 032:** Node Guardian/Steward Formalize
- **Citizen Interact Layer v1:** Базовий функціонал чату для громадян

