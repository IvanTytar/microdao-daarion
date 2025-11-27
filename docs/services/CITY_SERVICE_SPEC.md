# CITY SERVICE SPEC (PORT 7001)
# Version: 1.0.0

---

## 0. PURPOSE

`City Service` — геопросторовий та соціальний шар DAARION.city.

Цей сервіс забезпечує:

1. **Living Map** — стан міста в реальному часі:
   - райони,
   - локації,
   - структури microDAO,
   - активні агенти та користувачі.

2. **Presence System** — відстеження присутності:
   - хто знаходиться в якому районі/секторі/каналі,
   - статуси присутності користувачів і агентів.

3. **Geo Intelligence**:
   - обробка геолокаційних даних,
   - інтеграція з Geo-agent (мультимодальність),
   - аналіз шляхів, зон та кластерів.

4. **Project / MicroDAO Mapping**:
   - кожен microDAO має свій "віртуальний район",
   - кожен проєкт — "будівлю/кластер".

5. **Integration with TeamDefinition & ProjectBus**:
   - локації = канали / контексти,
   - routing для комунікації між агентами у межах "районів".

Порт сервісу: **7001**.

---

## 1. FUNCTIONAL OVERVIEW

```text
[ Gateway / Web UI / Living Map UI ]
         ↓
[ DAGI Router ] — (text/multimodal events)
         ↓
[ City Service (7001) ]
         ↓
[ PostgreSQL + NATS + Geo-agent ]
```

City Service синхронізує:

* *місто як карту* (Region/Area/Point),
* *місто як соціальну мережу* (Presence),
* *місто як структуру проектів і microDAO*.

---

## 2. CORE DATA STRUCTURES

### 2.1. Region (Регіон)

Віртуальний район DAARION.city:

```json
{
  "region_id": "district-greenfood",
  "name": "GREENFOOD District",
  "type": "microdao",    // microdao | project | custom
  "microdao_id": "microdao-greenfood",
  "geometry": { "type": "Polygon", "coordinates": [...] },
  "meta": { "color": "#2ecc71" }
}
```

### 2.2. Area / Building / Sector

Локальні локації всередині регіонів:

```json
{
  "area_id": "area-greenfood-core",
  "region_id": "district-greenfood",
  "name": "Core Operations",
  "geometry": { "type": "Polygon", "coordinates": [...] },
  "project_id": "proj-greenfood",
  "meta": {}
}
```

### 2.3. Presence

Хто перебуває де:

```json
{
  "subject_id": "ag_helix",
  "subject_type": "agent",
  "region_id": "district-greenfood",
  "area_id": "area-greenfood-core",
  "status": "active",            // active|idle|offline
  "updated_at": "2025-11-24T10:00:00Z"
}
```

### 2.4. Location Update Event

```json
{
  "subject_id": "user123",
  "subject_type": "user",
  "geo": { "lat": 52.52, "lon": 13.40 },
  "region_id": "district-greenfood",
  "area_id": "area-greenfood-core"
}
```

---

## 3. DATABASE SCHEMA (PostgreSQL + PostGIS)

City Service повинен мати PostGIS.

### 3.1. regions

```sql
CREATE TABLE regions (
    region_id     TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL,
    microdao_id   TEXT,
    geometry      GEOMETRY(POLYGON, 4326),
    meta          JSONB DEFAULT '{}'::jsonb
);
```

### 3.2. areas

```sql
CREATE TABLE areas (
    area_id       TEXT PRIMARY KEY,
    region_id     TEXT REFERENCES regions(region_id),
    name          TEXT NOT NULL,
    project_id    TEXT,
    geometry      GEOMETRY(POLYGON, 4326),
    meta          JSONB DEFAULT '{}'::jsonb
);
```

### 3.3. presence

```sql
CREATE TABLE presence (
    subject_id     TEXT NOT NULL,
    subject_type   TEXT NOT NULL,
    region_id      TEXT NOT NULL,
    area_id        TEXT,
    status         TEXT NOT NULL,
    updated_at     TIMESTAMP NOT NULL DEFAULT now(),
    PRIMARY KEY (subject_id, subject_type)
);
```

---

## 4. PUBLIC HTTP API (CITY SERVICE)

### 4.1. `GET /regions`

Список усіх регіонів міста.

### 4.2. `POST /regions`

Створити новий регіон (переважно для microDAO).

### 4.3. `GET /areas?region_id=...`

Список локацій у межах регіону.

### 4.4. `POST /presence/update`

Оновити присутність учасника/агента.

**Request:**

```json
{
  "subject_id": "ag_helion",
  "subject_type": "agent",
  "geo": { "lat": 50.45, "lon": 30.52 }
}
```

Відповідь після визначення регіону/зони:

```json
{
  "status": "ok",
  "region_id": "district-daariandao",
  "area_id": "area-governance"
}
```

### 4.5. `GET /presence?region_id=...`

Повертає, хто зараз у районі.

---

## 5. GEO-AGENT INTEGRATION

Geo-agent (мультимодальність) використовується для:

1. **Інтерпретація геоданих**:

   * визначити район по координатам,
   * визначити найближчу зону,
   * кластеризація.

2. **Запити від користувача**:

   * "Покажи активність агентів у районі GREENFOOD"
   * "Яким шляхом рухається агент X?"
   * "Які агенти у проекті Y зараз активні?"

3. **Генерація інсайтів**:

   * heat maps,
   * аномалії присутності,
   * навігація робочих потоків.

City Service викликає Geo-agent через:

```
POST /multimodal/geo/infer
```

або NATS subject:

```
dagi.geo.infer
```

Payload:

```json
{
  "lat": 50.45,
  "lon": 30.52,
  "regions": [...],
  "areas": [...]
}
```

---

## 6. PROJECT BUS INTEGRATION

City Service взаємодіє з ProjectBus:

* коли створюється новий microDAO → створюється новий регіон;
* коли створюється новий проект → нова area/cluster;
* агенти/користувачі приєднуються до проектів → presence оновлюється.

Оновлення:

* `project.<id>.events` — події щодо присутності,
* `project.<id>.map.events` — події для UI living map.

Приклад події:

```json
{
  "type": "presence_updated",
  "project_id": "proj-greenfood",
  "subject_id": "ag_helix",
  "region_id": "district-greenfood",
  "area_id": "area-greenfood-core",
  "ts": "2025-11-24T10:10:00Z"
}
```

---

## 7. DAGI ROUTER INTEGRATION

City Service інформує DAGI Router про:

* зміни регіону/зони:

  * агенти отримують контекст `region_id` / `area_id`,
  * Router може маршрутизувати події за локацією,
* routing за region-каналами (геочати),
* особливі правила поведінки в певних регіонах (через TeamDefinition).

Router додає в кожен RouterEvent:

```json
{
  "context": {
    "region_id": "...",
    "area_id": "...",
    "project_id": "...",
    "microdao_id": "..."
  }
}
```

---

## 8. MULTINODE SUPPORT

City Service може бути:

* один на всі ноди (centralized),
* або розгорнутий на кожній НОДА:

  * локальна кешована карта,
  * синхронізація через NATS.

Оптимально:

```
NODE1 = primary city-service
NODE2/NODE3 = read replicas cache + local geo-routing
```

---

## 9. HEALTHCHECK & METRICS

### 9.1. `GET /healthz`

```json
{
  "status": "ok",
  "db": "ok",
  "geo_agent": "ok",
  "uptime_seconds": 21344
}
```

### 9.2. Prometheus metrics

* `presence_updates_total`
* `active_subjects{region_id}`
* `geo_queries_total`
* `geo_inference_latency_ms_bucket`
* `area_popularity{region_id, area_id}`

---

## 10. LIVING MAP UI (FUTURE)

City Service підтримує:

* API для реального часу (WebSocket/NATS),
* 2D-UI та 3D-UI клієнти:

  * Three.js / Babylon.js / Unity WebGL.

Плани:

* місто як **візуальна карта** проектів,
* агентські маршрути,
* стан об'єктів, сервісів та microDAO,
* heatmap активності.

---

## 11. SUMMARY

City Service (7001):

* геопросторовий та "соціальний" шар DAARION,
* формує логіку районів microDAO та проектних зон,
* управляє присутністю користувачів і агентів,
* інтегрується з DAGI Router, Geo-agent, ProjectBus, MicroDAO Service,
* основа для 2D/3D карт та мультимодальних геоаналітик.

Це ключовий сервіс, який робить DAARION.city "живим містом", а не просто набором мікросервісів.

