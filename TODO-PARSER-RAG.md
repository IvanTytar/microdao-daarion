# TODO: PARSER Agent + RAG Haystack Stack

Детальний план реалізації PARSER-агента на базі `dots.ocr` та RAG-системи на базі Haystack.

**Статус:** 🟡 Планування

---

## G. PARSER Agent (dots.ocr)

### G.1. Runtime моделі PARSER

- [x] **G.1.1** Обрати runtime для dots.ocr ✅
  - [x] **Рішення:** Python 3.11 + PyTorch + FastAPI
  - [x] **Обґрунтування:**
    - dots.ocr — torch-модель, потребує PyTorch
    - FastAPI для HTTP-обгортки (інтеграція з G.2)
    - Python 3.11 для сучасного синтаксису
  - [x] **Структура модуля:**
    - `parser_runtime/model_loader.py` — завантаження dots.ocr
    - `parser_runtime/schemas.py` — ParsedDocument, Page, Chunk
    - `parser_runtime/inference.py` — функція `run_ocr(...)`
  - [x] **Формат інтерфейсу:**
    ```python
    def parse_document(
        input: bytes | str,  # bytes або path
        output_mode: Literal["raw_json", "markdown", "qa_pairs", "chunks"]
    ) -> ParsedDocument
    ```
  - [ ] **Реалізація:** Створено каркас, потрібна інтеграція з реальною моделлю

- [x] **G.1.2** Створити `parser-runtime/` сервіс ✅
  - [x] `app/runtime/__init__.py`
  - [x] `app/runtime/model_loader.py` (lazy init, GPU/CPU fallback)
  - [x] `app/runtime/inference.py` (функції: `parse_document`, `dummy_parse_document`)
  - [x] Конфігурація в `app/core/config.py`

- [ ] **G.1.3** Додати конфіг
  - [ ] `PARSER_MODEL_NAME=rednote-hilab/dots.ocr`
  - [ ] `PARSER_DEVICE=cuda` / `cpu`
  - [ ] `PARSER_MAX_PAGES=100`
  - [ ] `PARSER_MAX_RESOLUTION=4096x4096`
  - [ ] `PARSER_BATCH_SIZE=1` (для початку)

---

### G.2. HTTP-сервіс `parser-service`

- [x] **G.2.1** Створити сервіс `services/parser-service/` (FastAPI) ✅
  - [x] `app/main.py` — FastAPI додаток
  - [x] `app/schemas.py` — Pydantic моделі (ParsedDocument, ParsedBlock, ...)
  - [x] `app/core/config.py` — конфігурація
  - [x] `Dockerfile` — Docker образ
  - [x] `requirements.txt` — залежності
  - [x] `README.md` — документація

- [x] **G.2.2** Ендпоінти ✅
  - [x] `POST /ocr/parse` — повертає raw JSON (з mock-даними)
    - Request: `multipart/form-data` (file) + `output_mode`
    - Response: `ParseResponse` з `document`, `markdown`, `qa_pairs`, або `chunks`
  - [x] `POST /ocr/parse_qa` — Q&A-представлення (поки що mock)
  - [x] `POST /ocr/parse_markdown` — Markdown-версія (поки що mock)
  - [x] `POST /ocr/parse_chunks` — семантичні фрагменти для RAG (поки що mock)
  - [x] `GET /health` — health check

- [ ] **G.2.3** Підтримати типи файлів
  - [ ] PDF (розбиття по сторінках → зображення)
    - Використати `pdf2image` або `PyMuPDF`
  - [ ] PNG/JPEG
    - Пряма обробка через `PIL` / `Pillow`
  - [ ] TIFF (опційно)
  - [ ] WebP (опційно)

- [ ] **G.2.4** Додати pre-/post-processing
  - [ ] Нормалізація розміру зображень (resize до max resolution)
  - [ ] Конвертація PDF → зображення (по сторінках)
  - [ ] Mapping вихідного JSON dots.ocr → внутрішню структуру `ParsedBlock`
  - [ ] Валідація структури (перевірка наявності обов'язкових полів)

- [ ] **G.2.5** Додати базові тести
  - [ ] Створити `tests/fixtures/docs/` з тестовими документами
  - [ ] 1–2 короткі PDF-файли (2–3 сторінки)
  - [ ] 1–2 PNG зображення з текстом
  - [ ] Snapshot-тести JSON-структури (без чутливості до точного тексту)
  - [ ] Тести на обробку помилок (невалідний PDF, занадто великий файл)

- [ ] **G.2.6** Додати в `docker-compose.yml`
  - [ ] Сервіс `parser-service` з залежностями
  - [ ] Environment variables
  - [ ] Health check
  - [ ] Volumes для тимчасових файлів

---

### G.3. Інтеграція PARSER у DAGI Router

- [ ] **G.3.1** Додати LLM-профіль у `router-config.yml`
  ```yaml
  llm_profiles:
    parser_dots_ocr:
      model: "dots.ocr"
      base_url: "http://parser-runtime:11435"   # або Ollama/vLLM endpoint
      timeout_s: 120
  ```

- [ ] **G.3.2** Додати provider
  ```yaml
  providers:
    parser:
      type: ocr
      base_url: "http://parser-service:9400"
  ```

- [ ] **G.3.3** Додати routing rule
  ```yaml
  routing:
    - id: doc_parse
      when:
        mode: doc_parse
      use_provider: parser
  ```

- [ ] **G.3.4** Розширити `RouterRequest` (в `router_client.py` або `types/api.ts`)
  - [ ] Поля `doc_url: Optional[str]`
  - [ ] Поля `doc_type: Optional[str]` (`pdf`, `image`)
  - [ ] Поля `output_mode: Optional[str]` (`raw_json|qa_pairs|markdown|chunks`)
  - [ ] Поля `file_bytes: Optional[bytes]` (для прямого завантаження)

- [ ] **G.3.5** E2E curl-тест
  ```bash
  curl -X POST http://localhost:9102/route \
    -H "Content-Type: application/json" \
    -d '{
      "mode": "doc_parse",
      "dao_id": "daarion",
      "user_id": "test",
      "payload": {
        "doc_url": "https://.../example.pdf",
        "output_mode": "qa_pairs"
      }
    }'
  ```

---

### G.4. Опис агента PARSER

- [ ] **G.4.1** Створити `docs/agents/parser.md` ✅ (вже створено)
  - [x] Роль: **Document Ingestion & Structuring Agent**
  - [x] Вхід: `doc_url`, `file_id`, `raw bytes`
  - [x] Вихід: `ParsedDocument { blocks[], tables[], qa_pairs[] }`
  - [x] Обмеження: max pages, max file size

- [ ] **G.4.2** Додати `parser_agent` у CrewAI/оркестратор
  - [ ] Створити `orchestrator/agents/parser_agent.py`
  - [ ] Задачі:
    - [ ] `parse_for_rag` — підготовка chunk'ів для індексації
    - [ ] `parse_for_summary` — підготовка структурованого огляду doc'а
    - [ ] `parse_for_qa` — Q&A базу для SecondMe/microDAO
  - [ ] Інтеграція з CrewAI workflow

- [ ] **G.4.3** Зв'язати PARSER з RBAC
  - [ ] Перевірка прав на інжест документів (`role: admin`, `role: researcher`)
  - [ ] Обмеження на приватні/публічні документи
  - [ ] Перевірка `dao_id` для ізоляції даних
  - [ ] Додати в `microdao/rbac.py` (якщо потрібно)

---

## H. RAG Haystack Stack (PARSER як головний агент)

Тут PARSER — **головний агент інжесту**, а RAG шар — **Haystack-пайплайни для пошуку відповідей**.

### H.1. Вибір стеку RAG

- [ ] **H.1.1** Обрати фреймворк
  - [ ] Варіант A: **deepset Haystack 2.x** (pipelines, retrievers, document stores)
    - Переваги: готові компоненти, добра документація
    - Недоліки: може бути overkill для простого випадку
  - [ ] Варіант B: власний RAG поверх `pgvector`/Qdrant + простий код
    - Переваги: легше, більше контролю
    - Недоліки: треба писати більше коду
  - **Рекомендація:** Почнути з варіанту B (pgvector вже є), потім можна перейти на Haystack

- [ ] **H.1.2** Обрати векторне сховище
  - [ ] Postgres + pgvector (вже є в `city-db`)
  - [ ] Або [ ] Qdrant / Weaviate / Milvus (якщо потрібна краща продуктивність)
  - **Рекомендація:** Використати `pgvector` (вже налаштовано)

- [ ] **H.1.3** Обрати embedding-модель
  - [ ] Варіант A: `sentence-transformers/all-MiniLM-L6-v2` (легка, швидка)
  - [ ] Варіант B: `intfloat/multilingual-e5-base` (краще для української)
  - [ ] Варіант C: Qwen embedding (якщо є)
  - **Рекомендація:** Почнути з `multilingual-e5-base`

---

### H.2. Інджест-пайплайн (PARSER → RAG)

- [ ] **H.2.1** Створити `services/rag_ingest_pipeline.py`
  - [ ] Функція `ingest_document(doc_id, doc_url, dao_id, user_id)`
  - [ ] Функція `ingest_chunks(chunks: List[ParsedChunk], dao_id, doc_id)`

- [ ] **H.2.2** Кроки пайплайну
  - [ ] Виклик PARSER (`mode=doc_parse`, `output_mode=chunks`)
  - [ ] Нормалізація блоків у формат для індексації:
    - [ ] `content` — текст блоку
    - [ ] `meta` — `dao_id`, `doc_id`, `page`, `bbox`, `section_type`
  - [ ] Обчислення ембеддингів (окремий embedding-модель/провайдер)
    - [ ] Створити `services/embedding_service.py` або використати `sentence-transformers`
  - [ ] Запис у document store (Postgres + pgvector)
    - [ ] Створити таблицю `document_chunks`:
      ```sql
      CREATE TABLE document_chunks (
        id UUID PRIMARY KEY,
        doc_id TEXT NOT NULL,
        dao_id TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding vector(768),  -- або інший розмір
        page_num INTEGER,
        bbox JSONB,
        section_type TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ```

- [ ] **H.2.3** Тест
  - [ ] Індексувати 1 PDF (наприклад, "Токеноміка MicroDAO")
  - [ ] Перевірити, що в storage з'явилися Documents з meta `[dao_id=... , doc_id=...]`
  - [ ] Перевірити, що embeddings обчислені та збережені

---

### H.3. Query-пайплайн (RAG-відповіді)

- [ ] **H.3.1** Створити `services/rag_query_pipeline.py`
  - [ ] Функція `answer_query(dao_id, user_id, question: str) -> RAGResponse`

- [ ] **H.3.2** RAG-пайплайн (якщо використовуємо Haystack)
  - [ ] `retriever` → top-k документів/фрагментів по `dao_id`
    - [ ] Використати `pgvector` для similarity search
    - [ ] Фільтр по `dao_id` для ізоляції даних
  - [ ] (опційно) `ranker` → rerank за релевантністю
  - [ ] `generator` → LLM (qwen3:8b або PokeeResearch-7B)
    - [ ] Формувати промпт з контекстом: `question + retrieved_chunks`

- [ ] **H.3.3** Вихід `RAGResponse`
  ```python
  class RAGResponse:
      answer: str
      citations: List[Citation]
      confidence: float

  class Citation:
      doc_id: str
      doc_title: str
      page: int
      excerpt: str
      bbox: Optional[Dict]  # для виділення в PDF
  ```

- [ ] **H.3.4** E2E-тест
  - [ ] `mode="rag_query"` запит до Router:
    ```json
    {
      "mode": "rag_query",
      "dao_id": "daarion",
      "user_id": "test",
      "payload": {
        "question": "Поясни токеноміку microDAO і роль стейкінгу."
      }
    }
    ```
  - [ ] Очікування: відповідь + 2–3 посилання на індексовані документи

---

### H.4. Оркестрація: PARSER як головний агент

- [ ] **H.4.1** Додати в CrewAI workflow `doc_ingest_workflow`
  - [ ] Agent `parser_agent`:
    - [ ] Перевіряє тип документа
    - [ ] Вирішує: локальний PARSER vs хмарний (якщо важкі PDF)
    - [ ] Викликає `rag_ingest_pipeline`
  - [ ] Agent `validation_agent`:
    - [ ] Робить sanity-check: кількість блоків, чи є таблиці, чи коректна мова
    - [ ] Перевіряє якість розпізнавання (confidence scores)

- [ ] **H.4.2** Додати в workflow `rag_answer_workflow`
  - [ ] Крок 1: `retrieval_agent` (Haystack/pgvector)
    - [ ] Пошук релевантних фрагментів
  - [ ] Крок 2: `answer_agent` (LLM)
    - [ ] Генерація відповіді на основі контексту
  - [ ] Крок 3: (опційно) `citation_checker`
    - [ ] Верифікація відповідей по фрагментах
    - [ ] Перевірка на галлюцинації

---

### H.5. Інтеграція з DAARWIZZBot / microDAO

- [ ] **H.5.1** Додати команди для бота (в `gateway-bot/http_api.py`)
  - [ ] `/upload_doc` → інжест документу в RAG через PARSER
    - [ ] Підтримка завантаження файлів через Telegram
    - [ ] Виклик `doc_ingest_workflow`
  - [ ] `/ask_doc` → питання до бази документів DAO
    - [ ] Виклик `rag_answer_workflow`
    - [ ] Відправка відповіді з цитатами

- [ ] **H.5.2** RBAC
  - [ ] Хто може інжестити документи (`role: admin`, `role: researcher`)
  - [ ] Хто може ставити питання до приватних документів
  - [ ] Перевірка прав в `microdao/rbac.py`

- [ ] **H.5.3** UI для Console (опційно)
  - [ ] Сторінка `/console/documents` — список документів DAO
  - [ ] Завантаження документів через drag-and-drop
  - [ ] Перегляд розпарсених документів
  - [ ] Чат-інтерфейс для питань до документів

---

## Порядок виконання (рекомендований)

### Фаза 1: PARSER Runtime (1-2 дні)
1. G.1.1 — Обрати runtime
2. G.1.2 — Створити `parser-runtime/`
3. G.1.3 — Додати конфіг

### Фаза 2: PARSER Service (2-3 дні)
1. G.2.1 — Створити FastAPI сервіс
2. G.2.2 — Реалізувати ендпоінти
3. G.2.3 — Підтримка PDF/зображень
4. G.2.4 — Pre/post-processing
5. G.2.5 — Тести
6. G.2.6 — Docker Compose

### Фаза 3: Інтеграція з Router (1 день)
1. G.3.1 — LLM-профіль
2. G.3.2 — Provider
3. G.3.3 — Routing rule
4. G.3.4 — Розширити RouterRequest
5. G.3.5 — E2E тест

### Фаза 4: RAG Ingest (2-3 дні)
1. H.1.1 — Обрати стек
2. H.2.1 — Створити ingest pipeline
3. H.2.2 — Реалізувати кроки
4. H.2.3 — Тест

### Фаза 5: RAG Query (2-3 дні)
1. H.3.1 — Створити query pipeline
2. H.3.2 — Реалізувати RAG-пайплайн
3. H.3.3 — Вихід з цитатами
4. H.3.4 — E2E тест

### Фаза 6: Оркестрація (1-2 дні)
1. H.4.1 — `doc_ingest_workflow`
2. H.4.2 — `rag_answer_workflow`

### Фаза 7: Інтеграція з ботом (1-2 дні)
1. H.5.1 — Команди `/upload_doc`, `/ask_doc`
2. H.5.2 — RBAC

**Загальний час:** ~10-15 днів (залежить від складності моделі та налаштування)

---

## Залежності та ресурси

### Python пакети
- `qwen3-asr-toolkit` (якщо доступний)
- `transformers` / `torch` (для моделі)
- `pdf2image` / `PyMuPDF` (для PDF)
- `Pillow` (для зображень)
- `sentence-transformers` (для embeddings)
- `pgvector` (вже є)
- `haystack` (якщо використовуємо)

### Системні залежності
- `ffmpeg` (може знадобитися)
- `poppler` (для PDF → images)

### GPU
- Рекомендовано GPU для dots.ocr (можна CPU fallback)

---

## Посилання

- [PARSER Agent Documentation](./docs/agents/parser.md)
- [DAGI Router Documentation](./docs/agents/dagi-router.md)
- [CrewAI Orchestrator](./docs/agents/crewai-orchestrator.md)

