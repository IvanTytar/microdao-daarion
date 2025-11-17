# Task: Web Crawler Service (crawl4ai) & Agent Tool Integration

## Goal

Інтегрувати **crawl4ai** в агентську систему MicroDAO/DAARION як:

1. Окремий бекенд-сервіс **Web Crawler**, який:
   - вміє скрапити сторінки з JS (Playwright/Chromium),
   - повертати структурований текст/HTML/метадані,
   - (опційно) генерувати події `doc.upserted` для RAG-ingestion.
2. Агентський **tool** `web_crawler`, який викликається через Tool Proxy і доступний агентам (Team Assistant, Bridges Agent, тощо) з урахуванням безпеки.

Мета — дати агентам можливість читати зовнішні веб-ресурси (з обмеженнями) і, за потреби, індексувати їх у RAG.

---

## Context

- Root: `microdao-daarion/`.
- Інфраструктура агентів та tools:
  - `docs/cursor/12_agent_runtime_core.md`
  - `docs/cursor/13_agent_memory_system.md`
  - `docs/cursor/37_agent_tools_and_plugins_specification.md`
  - `docs/cursor/20_integrations_bridges_agent.md`
- RAG-шар:
  - `docs/cursor/rag_gateway_task.md`
  - `docs/cursor/rag_ingestion_worker_task.md`
  - `docs/cursor/rag_ingestion_events_wave1_mvp_task.md`
- Event Catalog / NATS:
  - `docs/cursor/42_nats_event_streams_and_event_catalog.md`
  - `docs/cursor/43_database_events_outbox_design.md`

На сервері вже встановлено `crawl4ai[all]` та `playwright chromium`.

---

## 1. Сервіс Web Crawler

### 1.1. Структура сервісу

Створити новий Python-сервіс (подібно до інших внутрішніх сервісів):

- Директорія: `services/web-crawler/`
- Файли (пропозиція):
  - `main.py` — entrypoint (FastAPI/uvicorn).
  - `api.py` — визначення HTTP-ендпоїнтів.
  - `crawl_client.py` — обгортка над crawl4ai.
  - `models.py` — Pydantic-схеми (request/response).
  - `config.py` — налаштування (timeouts, max_depth, allowlist доменів, тощо).

Сервіс **не** має прямого UI; його викликають Tool Proxy / інші бекенд-сервіси.

### 1.2. Основний ендпоїнт: `POST /api/web/scrape`

Пропонований контракт:

**Request JSON:**

```json
{
  "url": "https://example.com/article",
  "team_id": "dao_greenfood",
  "session_id": "sess_...",        
  "max_depth": 1,                    
  "max_pages": 1,                    
  "js_enabled": true,                
  "timeout_seconds": 30,
  "user_agent": "MicroDAO-Crawler/1.0",
  "mode": "public",                
  "indexed": false,                 
  "tags": ["external", "web", "research"],
  "return_html": false,             
  "max_chars": 20000                
}
```

**Response JSON (скорочено):**

```json
{
  "ok": true,
  "url": "https://example.com/article",
  "final_url": "https://example.com/article",
  "status_code": 200,
  "content": {
    "text": "... main extracted text ...",
    "html": "<html>...</html>",
    "title": "Example Article",
    "language": "en",
    "meta": {
      "description": "...",
      "keywords": ["..."]
    }
  },
  "links": [
    { "url": "https://example.com/next", "text": "Next" }
  ],
  "raw_size_bytes": 123456,
  "fetched_at": "2025-11-17T10:45:00Z"
}
```

Використати API/параметри crawl4ai для:

- рендеру JS (Playwright),
- витягання основного контенту (article/reader mode, якщо є),
- нормалізації тексту (видалення зайвого boilerplate).

### 1.3. Додаткові ендпоїнти (опційно)

- `POST /api/web/scrape_batch` — масовий скрап кількох URL (обмежений top-K).
- `POST /api/web/crawl_site` — обхід сайту з `max_depth`/`max_pages` (для MVP можна не реалізовувати або залишити TODO).
- `POST /api/web/scrape_and_ingest` — варіант, який одразу шле подію `doc.upserted` (див. розділ 3).

### 1.4. Обмеження та безпека

У `config.py` передбачити:

- `MAX_DEPTH` (наприклад, 1–2 для MVP).
- `MAX_PAGES` (наприклад, 3–5).
- `MAX_CHARS`/`MAX_BYTES` (щоб не забивати памʼять).
- (Опційно) allowlist/denylist доменів для кожної команди/DAO.
- таймаут HTTP/JS-запиту.

Логувати тільки мінімальний технічний контекст (URL, код статусу, тривалість), **не** зберігати повний HTML у логах.

---

## 2. Обгортка над crawl4ai (`crawl_client.py`)

Створити модуль, який інкапсулює виклики crawl4ai, щоб API/деталі можна було змінювати централізовано.

Приблизна логіка:

- функція `async def fetch_page(url: str, options: CrawlOptions) -> CrawlResult`:
  - налаштувати crawl4ai з Playwright (chromium),
  - виконати рендер/збір контенту,
  - повернути нормалізований результат: text, html (опційно), метадані, посилання.

Обовʼязково:

- коректно обробляти помилки мережі, редіректи, 4xx/5xx;
- повертати `ok=false` + error message у HTTP-відповіді API.

---

## 3. Інтеграція з RAG-ingestion (doc.upserted)

### 3.1. Подія `doc.upserted` для веб-сторінок

Після успішного скрапу, якщо `indexed=true`, Web Crawler може (в майбутньому або одразу) створювати подію:

- `event`: `doc.upserted`
- `stream`: `STREAM_PROJECT` або спеціальний `STREAM_DOCS`

Payload (адаптований під RAG-дизайн):

```json
{
  "doc_id": "web::<hash_of_url>",
  "team_id": "dao_greenfood",
  "project_id": null,
  "path": "web/https_example_com_article",
  "title": "Example Article",
  "text": "... main extracted text ...",
  "url": "https://example.com/article",
  "tags": ["web", "external", "research"],
  "visibility": "public",
  "doc_type": "web",
  "indexed": true,
  "mode": "public",
  "updated_at": "2025-11-17T10:45:00Z"
}
```

Цю подію можна:

1. заповнити в таблицю outbox (див. `43_database_events_outbox_design.md`),
2. з неї Outbox Worker відправить у NATS (JetStream),
3. `rag-ingest-worker` (згідно `rag_ingestion_events_wave1_mvp_task.md`) сприйме `doc.upserted` і проіндексує сторінку в Milvus/Neo4j.

### 3.2. Підтримка у нормалізаторі

У `services/rag-ingest-worker/pipeline/normalization.py` уже є/буде `normalize_doc_upserted`:

- для веб-сторінок `doc_type="web"` потрібно лише переконатися, що:
  - `source_type = "doc"` або `"web"` (на твій вибір, але консистентний),
  - у `tags` включено `"web"`/`"external"`,
  - у metadata є `url`.

Якщо потрібно, можна додати просту гілку для `doc_type == "web"`.

---

## 4. Agent Tool: `web_crawler`

### 4.1. Категорія безпеки

Відповідно до `37_agent_tools_and_plugins_specification.md`:

- Зовнішній інтернет — **Category D — Critical Tools** (`browser-full`, `external_api`).
- Новий інструмент:
  - назва: `web_crawler`,
  - capability: `tool.web_crawler.invoke`,
  - категорія: **D (Critical)**,
  - за замовчуванням **вимкнений** — вмикається Governance/адміністратором для конкретних MicroDAO.

### 4.2. Tool request/response контракт

Tool Proxy викликає Web Crawler через HTTP.

**Request від Agent Runtime до Tool Proxy:**

```json
{
  "tool": "web_crawler",
  "args": {
    "url": "https://example.com/article",
    "max_chars": 8000,
    "indexed": false,
    "mode": "public"
  },
  "context": {
    "agent_run_id": "ar_123",
    "team_id": "dao_greenfood",
    "user_id": "u_001",
    "channel_id": "ch_abc"
  }
}
```

Tool Proxy далі робить HTTP-запит до `web-crawler` сервісу (`POST /api/web/scrape`).

**Відповідь до агента (спрощена):**

```json
{
  "ok": true,
  "output": {
    "title": "Example Article",
    "url": "https://example.com/article",
    "snippet": "Короткий уривок тексту...",
    "full_text": "... обрізаний до max_chars ..."
  }
}
```

Для безпеки:

- у відповідь, яку бачить LLM/агент, повертати **обмежений** `full_text` (наприклад, 8–10k символів),
- якщо `full_text` занадто довгий — обрізати та явно це позначити.

### 4.3. PDP та quotas

- Перед викликом Tool Proxy повинен викликати PDP:
  - `action = tool.web_crawler.invoke`,
  - `subject = agent_id`,
  - `resource = team_id`.
- Usage Service (див. 44_usage_accounting_and_quota_engine.md) може:
  - рахувати кількість викликів `web_crawler`/день,
  - обмежувати тривалість/обʼєм даних.

---

## 5. Інтеграція з Bridges Agent / іншими агентами

### 5.1. Bridges Agent

Bridges Agent (`20_integrations_bridges_agent.md`) може використовувати `web_crawler` як один зі своїх tools:

- сценарій: "Підтяни останню версію документації з https://docs.example.com/... і збережи як doc у Co-Memory";
- Bridges Agent викликає tool `web_crawler`, отримує текст, створює внутрішній doc (через Projects/Co-Memory API) і генерує `doc.upserted`.

### 5.2. Team Assistant / Research-агенти

Для окремих DAO можна дозволити:

- `Team Assistant` викликає `web_crawler` для досліджень (наприклад, "знайди інформацію на сайті Мінекономіки про гранти"),
- але з жорсткими лімітами (whitelist доменів, rate limits).

---

## 6. Confidential mode та privacy

Згідно з `47_messaging_channels_and_privacy_layers.md` та `48_teams_access_control_and_confidential_mode.md`:

- Якщо контекст агента `mode = confidential`:
  - інструмент `web_crawler` **не повинен** отримувати confidential plaintext із внутрішніх повідомлень (тобто, у `args` не має бути фрагментів внутрішнього тексту);
  - зазвичай достатньо лише URL.
- Якщо `indexed=true` та `mode=confidential` для веб-сторінки (рідкісний кейс):
  - можна дозволити зберігати plaintext сторінки в RAG, оскільки це зовнішнє джерело;
  - але варто позначати таку інформацію як `source_type="web_external"` і у PDP контролювати, хто може її читати.

Для MVP в цій задачі достатньо:

- заборонити виклик `web_crawler` із confidential-контексту без явної конфігурації (тобто PDP повертає deny).

---

## 7. Логування та моніторинг

Додати базове логування в Web Crawler:

- при кожному скрапі:
  - `team_id`,
  - `url`,
  - `status_code`,
  - `duration_ms`,
  - `bytes_downloaded`.

Без збереження body/HTML у логах.

За бажанням — контрприклад метрик:

- `web_crawler_requests_total`,
- `web_crawler_errors_total`,
- `web_crawler_avg_duration_ms`.

---

## 8. Files to create/modify (suggested)

> Назви/шляхи можна адаптувати до фактичної структури, важлива ідея.

- `services/web-crawler/main.py`
- `services/web-crawler/api.py`
- `services/web-crawler/crawl_client.py`
- `services/web-crawler/models.py`
- `services/web-crawler/config.py`

- Tool Proxy / агентський runtime (Node/TS):
  - додати tool `web_crawler` у список інструментів (див. `37_agent_tools_and_plugins_specification.md`).
  - оновити Tool Proxy, щоб він міг робити HTTP-виклик до Web Crawler.

- Bridges/Team Assistant агенти:
  - (опційно) додати `web_crawler` у їхні конфіги як доступний tool.

- RAG ingestion:
  - (опційно) оновити `rag-ingest-worker`/docs, щоб описати `doc_type="web"` у `doc.upserted` подіях.

---

## 9. Acceptance criteria

1. Існує новий сервіс `web-crawler` з ендпоїнтом `POST /api/web/scrape`, який використовує crawl4ai+Playwright для скрапу сторінок.
2. Ендпоїнт повертає текст/метадані у структурованому JSON, з обмеженнями по розміру.
3. Заготовлена (або реалізована) інтеграція з Event Catalog через подію `doc.upserted` для `doc_type="web"` (indexed=true).
4. У Tool Proxy зʼявився tool `web_crawler` (категорія D, capability `tool.web_crawler.invoke`) з чітким request/response контрактом.
5. PDP/usage engine враховують новий tool (принаймні у вигляді basic перевірок/квот).
6. Bridges Agent (або Team Assistant) може використати `web_crawler` для простого MVP-сценарію (наприклад: скрапнути одну сторінку і показати її summary користувачу).
7. Конфіденційний режим враховано: у конфігурації за замовчуванням `web_crawler` недоступний у `confidential` каналах/командах.

---

## 10. Інструкція для Cursor

```text
You are a senior backend engineer (Python + Node/TS) working on the DAARION/MicroDAO stack.

Implement the Web Crawler service and agent tool integration using:
- crawl4ai_web_crawler_task.md
- 37_agent_tools_and_plugins_specification.md
- 20_integrations_bridges_agent.md
- rag_gateway_task.md
- rag_ingestion_worker_task.md
- 42_nats_event_streams_and_event_catalog.md

Tasks:
1) Create the `services/web-crawler` service (FastAPI or equivalent) with /api/web/scrape based on crawl4ai.
2) Implement basic options: js_enabled, max_depth, max_pages, max_chars, timeouts.
3) Add tool `web_crawler` to the Tool Proxy (category D, capability tool.web_crawler.invoke).
4) Wire Tool Proxy → Web Crawler HTTP call with proper request/response mapping.
5) (Optional but preferred) Implement doc.upserted emission for indexed=true pages (doc_type="web") via the existing outbox → NATS flow.
6) Add a simple usage example in Bridges Agent or Team Assistant config (one agent that can use this tool in dev).

Output:
- list of modified files
- diff
- summary
```