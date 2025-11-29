# MicroDAO & Agent Consistency Cleanup (Task 037A)

**Дата:** 29 листопада 2025  
**Статус:** Реалізовано (інструменти готові)

Цей документ описує процедуру очистки та вирівнювання даних між агентами, MicroDAO та Citizens Layer.

---

## 1. Проблематика

У системі накопичилися:
* Агенти без привʼязки до MicroDAO (orphans).
* Публічні агенти без `public_slug` або `node_id`.
* MicroDAO без кімнат або без `primary` кімнати.
* Це призводить до некоректного відображення у `/citizens`, `/microdao` та `/nodes`.

## 2. Інструменти аудиту

### SQL Аудит (`db/sql/037_microdao_agent_audit.sql`)

Цей SQL-файл містить запити для ручної перевірки стану бази даних:
* Пошук публічних агентів без membership.
* Пошук агентів без `node_id`.
* Пошук MicroDAO без кімнат.
* Пошук MicroDAO з дубльованими primary-кімнатами.

Запуск (приклад):
```bash
cat db/sql/037_microdao_agent_audit.sql | docker exec -i dagi-postgres psql -U postgres -d daarion
```

### Автоматичний скрипт (`services/city-service/tools/fix_microdao_agent_consistency.py`)

Скрипт для автоматичного виправлення типових помилок.

**Що він робить:**
1. **Агенти:**
   * Якщо `public_slug` відсутній → встановлює `public_slug = id`.
   * Логує агентів без `node_id` та MicroDAO membership.
2. **MicroDAO:**
   * Перевіряє наявність кімнат.
   * Якщо є кімнати, але немає `primary` → призначає кімнату з найменшим `sort_order` як primary.
   * Якщо є кілька `primary` → залишає одну, інші робить `team`.

**Запуск:**
1. Зайти в контейнер `city-service` (або локально з налаштованим venv).
2. Запустити в режимі Dry Run (тільки логування):
   ```bash
   python tools/fix_microdao_agent_consistency.py
   ```
3. Застосувати зміни:
   ```bash
   python tools/fix_microdao_agent_consistency.py --apply
   ```

---

## 3. Зміни в API (Citizens Layer)

Впроваджено суворішу фільтрацію для публічних громадян (`/public/citizens`):
* Агент повинен мати `is_public = true`.
* `public_slug` не NULL.
* **`node_id` не NULL.**
* **Має хоча б одне MicroDAO membership** (`EXISTS (SELECT 1 FROM microdao_agents ...)`).

Це гарантує, що "сміттєві" тестові агенти не потрапляють у публічні списки.

Також API тепер повертає розширену інформацію:
* `home_microdao_slug`, `home_microdao_name`
* `primary_city_room` (об'єкт з деталями кімнати)

---

## 4. Рекомендації для Operations

1. Регулярно запускати `audit.sql` для моніторингу здоров'я даних.
2. При створенні нових агентів вручну через SQL — обов'язково додавати їх у `microdao_agents` та прописувати `node_id`.
3. При створенні MicroDAO — обов'язково створювати хоча б одну кімнату і робити її `primary`.

