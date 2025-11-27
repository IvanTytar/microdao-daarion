# SECOND ME SERVICE SPEC (PORT 7003)
# Version: 1.0.0

---

## 0. PURPOSE

`Second Me Service` — це сервіс створення та управління **персональними цифровими двійниками** користувачів та агентів у DAARION.city.

Це ядро системи персоналізації:

- кожен користувач має SecondMe-профіль,
- SecondMe є persistent-пам'яттю,
- SecondMe може діяти як мультиагентний "асистент у тіні",
- SecondMe синхронізується з мультимодальністю (audio → текст, image → профіль),
- SecondMe допомагає іншим агентам (в т.ч. Метаморфу) адаптувати поведінку.

SecondMe працює як:

- storage (пам'ять користувача),
- continuous learning module,
- персональна reasoning-прошивка.

Порт сервісу: **7003**.

---

## 1. HIGH-LEVEL ARCHITECTURE

```text
      [ User ]
      /  |   \
Telegram Web  Matrix
       \  |  /
    [ DAGI Router ]
           ↓
   [ Second Me Service (7003) ]
           ↓
  [ Vector DB + Redis + Postgres ]
           ↓
       [ Agents ]
```

SecondMe Service перехоплює:

* історію взаємодії,
* мультимодальний контент (image/audio/doc),
* профіль користувача,
* поведінкові патерни.

---

## 2. CORE RESPONSIBILITIES

### 2.1. Профіль SecondMe

Містить:

* user_id,
* персональні налаштування,
* пам'ять (context store),
* переваги, хобі, стилі,
* NFTs / achievements (майбутнє),
* зв'язки з microDAO.

### 2.2. Персональна пам'ять

SecondMe має 3 типи пам'яті:

1. **Short-term** (до 48 год, швидкий доступ)
2. **Long-term** (векторна пам'ять)
3. **Structured Memory**:

   * knowledge cards,
   * tasks,
   * goals,
   * архіви розмов.

### 2.3. Learning Pipeline

SecondMe автоматично:

* аналізує повідомлення та файли,
* перетворює їх у structured facts,
* зберігає у векторну пам'ять,
* оновлює профіль (переваги/мету/поведінку),
* генерує особисті інсайти.

### 2.4. Behavior Assistant

SecondMe допомагає іншим агентам:

* підказувати Helion/Helix, що знає про користувача,
* спрощує пояснення контексту,
* додає пам'ять у DAGI Router подіями типу:

  * `user.context_update`,
  * `user.preference_update`,
  * `user.knowledge_card`.

---

## 3. DATA MODEL (Postgres + Vector DB)

### 3.1. Users

```sql
CREATE TABLE users (
    user_id       TEXT PRIMARY KEY,
    created_at    TIMESTAMP NOT NULL DEFAULT now(),
    meta          JSONB DEFAULT '{}'::jsonb
);
```

### 3.2. SecondMe Profile

```sql
CREATE TABLE secondme_profile (
    user_id       TEXT PRIMARY KEY,
    preferences   JSONB DEFAULT '{}'::jsonb,
    traits        JSONB DEFAULT '{}'::jsonb,
    skills        JSONB DEFAULT '{}'::jsonb,
    settings      JSONB DEFAULT '{}'::jsonb,
    updated_at    TIMESTAMP NOT NULL DEFAULT now()
);
```

### 3.3. Memory — Short Term

```sql
CREATE TABLE secondme_memory_short (
    memory_id     TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    text          TEXT NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT now()
);
```

### 3.4. Memory — Long Term (Vector DB)

Хоститься в твоєму VectorDB (8898).

Документ:

```json
{
  "id": "mem123",
  "user_id": "u1",
  "text": "користувач любить працювати з GREENFOOD",
  "embedding": [...1024 floats...],
  "metadata": {
    "type": "preference",
    "timestamp": "2025-11-24T12:00:00Z"
  }
}
```

---

## 4. PUBLIC API (HTTP)

### 4.1. `POST /secondme/update_from_event`

Вхідна точка для DAGI Router.

**Request:**

```json
{
  "event": {
    "source": "telegram",
    "user": { "id": "u1" },
    "project_id": "proj-greenfood",
    "text": "мені дуже подобається зелена аналітика",
    "attachments": { "images": [], "audio": [] }
  }
}
```

**Response:**

```json
{
  "status": "ok",
  "actions": [
    "short_memory_added",
    "long_memory_indexed",
    "profile_trait_updated"
  ]
}
```

---

### 4.2. `GET /secondme/profile/{user_id}`

Отримати повний профіль користувача.

---

### 4.3. `GET /secondme/memory/{user_id}`

Повертає коротку + довгу пам'ять.

---

### 4.4. `POST /secondme/query`

Пошук у пам'яті:

**Request:**

```json
{
  "user_id": "u1",
  "query": "що цей користувач любить робити?"
}
```

**Response:**

```json
{
  "results": [
    {
      "text": "користувач любить працювати з GREENFOOD",
      "score": 0.92
    }
  ]
}
```

---

### 4.5. `POST /secondme/summarize`

Генерує персональний summary користувача для агентів:

**Response:**

```json
{
  "summary": "Користувач працює над GREENFOOD, любить аналітику, часто дає задачі Helix."
}
```

---

## 5. AGENT INTEGRATION

### 5.1. Helion integration

Helion отримує SecondMe-summary для:

* кращих відповідей,
* виконання задач з персональним контекстом.

### 5.2. Helix integration

SecondMe → Helix:

* історія рішень користувача,
* технічні вподобання,
* деталі проектів користувача.

### 5.3. Metamorph integration

SecondMe → Metamorph:

* персоналізація поведінки агентів,
* рекомендації по агентах, які потрібні користувачу.

### 5.4. Geo-agent

Якщо користувач дає гео-події:

* SecondMe зберігає маршрути / активність,
* може допомагати City Service сортувати події.

---

## 6. LEARNING PIPELINE

SecondMe обробляє кожну подію:

1. **Extract facts**
   Визначає, чи є текст чи медіа важливим для пам'яті.

2. **Classify type**

   * preference
   * skill
   * long-term fact
   * behavioural pattern
   * project affinity

3. **Embed**

   * створює embedding (через твою bge-m3 модель).

4. **Index**

   * зберігає у Vector DB.

5. **Profile Update**

   * якщо знайдені нові патерни → оновити SecondMe Profile.

6. **Emit Events**
   Публікує в NATS:

   * `secondme.{user_id}.memory_added`
   * `secondme.{user_id}.profile_updated`

---

## 7. INTERACTION WITH DAGI ROUTER

DAGI Router повинен:

* при кожному `RouterEvent` викликати `POST /secondme/update_from_event`,
* отримувати у відповідь:

  * пам'ять-дії,
  * профільні зміни.

SecondMe діє як **фонова підсистема**, що збагачує контекст.

---

## 8. PROJECT BUS INTEGRATION

SecondMe може бути підписаним на:

```
project.<project_id>.events
project.<project_id>.chat.human
```

щоб вчитися на:

* командних подіях,
* рішеннях,
* поведінці користувача всередині проекту.

---

## 9. MULTIMODAL SUPPORT

SecondMe працює з мультимодальністю:

* image → Vision-agent → SecondMe ("користувач показує X"),
* audio → STT → SecondMe (зберігає розмови і суть),
* docs → Doc-agent → SecondMe (пам'ятає PDF-документи користувача).

---

## 10. HEALTHCHECK & METRICS

### 10.1. `GET /healthz`

```json
{
  "status": "ok",
  "db": "ok",
  "vector": "ok",
  "uptime_seconds": 21344
}
```

### 10.2. Prometheus

* `secondme_events_total`
* `memory_added_total`
* `profile_updates_total`
* `embedding_latency_ms_bucket`
* `vector_search_latency_ms_bucket`

---

## 11. SUMMARY

Second Me Service (7003):

* персональна пам'ять,
* особистісний профіль,
* обробка мультимодальних подій,
* забезпечує глибинну персоналізацію системи,
* розуміє контекст користувача,
* допомагає іншим агентам приймати кращі рішення,
* працює автономно, мовчки, але є ключовим "мозком користувача".

