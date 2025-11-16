# TODO — RAG Stack (Haystack + PARSER Agent)

Цей план описує, як побудувати RAG-шар навколо PARSER (dots.ocr) та DAGI Router.

**Статус:** 🟡 Планування

---

## 1. Document Store (pgvector або Qdrant)

### 1.1. Вибір бекенду

- [ ] Обрати бекенд:
  - [ ] `Postgres + pgvector` (рекомендовано, якщо в нас уже є Postgres)
  - [ ] або `Qdrant` (docker-сервіс)

**Рекомендація:** Використати `pgvector` (вже є в `city-db`)

### 1.2. Ініціалізація Haystack DocumentStore

Приклад для PostgreSQL + pgvector:

```python
# services/rag-service/app/document_store.py

from haystack.document_stores import PGVectorDocumentStore

def get_document_store() -> PGVectorDocumentStore:
    return PGVectorDocumentStore(
        connection_string="postgresql+psycopg2://postgres:postgres@city-db:5432/daarion_city",
        embedding_dim=1024,  # залежить від моделі ембеддингів
        table_name="rag_documents",
        search_strategy="approximate",
    )
```

**Завдання:**
- [ ] Створити `services/rag-service/` структуру
- [ ] Додати `app/document_store.py` з ініціалізацією
- [ ] Налаштувати підключення до `city-db`

---

## 2. Embedding-модель

### 2.1. Обрати модель

- [ ] Вибрати embedding-модель:
  - [ ] `BAAI/bge-m3` (multilingual, 1024 dim)
  - [ ] `sentence-transformers/all-MiniLM-L12-v2` (легка, 384 dim)
  - [ ] `intfloat/multilingual-e5-base` (українська підтримка, 768 dim)

**Рекомендація:** `BAAI/bge-m3` для кращої підтримки української

### 2.2. Обгортка під Haystack

```python
# services/rag-service/app/embedding.py

from haystack.components.embedders import SentenceTransformersTextEmbedder

def get_text_embedder():
    return SentenceTransformersTextEmbedder(
        model="BAAI/bge-m3",
        device="cuda"  # або "cpu"
    )
```

**Завдання:**
- [ ] Створити `app/embedding.py`
- [ ] Додати конфігурацію моделі через env
- [ ] Тестувати на українському тексті

---

## 3. Ingest-пайплайн: PARSER → RAG

### 3.1. Функція ingest_document

- [ ] Створити `services/rag-service/app/ingest_pipeline.py`:

```python
# services/rag-service/app/ingest_pipeline.py

from haystack import Pipeline
from haystack.components.preprocessors import DocumentSplitter
from haystack.components.writers import DocumentWriter
from haystack.schema import Document

from .document_store import get_document_store
from .embedding import get_text_embedder

# 1) splitter — якщо треба додатково різати текст
splitter = DocumentSplitter(
    split_by="sentence",
    split_length=8,
    split_overlap=1
)

embedder = get_text_embedder()
doc_store = get_document_store()
writer = DocumentWriter(document_store=doc_store)

ingest_pipeline = Pipeline()
ingest_pipeline.add_component("splitter", splitter)
ingest_pipeline.add_component("embedder", embedder)
ingest_pipeline.add_component("writer", writer)

ingest_pipeline.connect("splitter.documents", "embedder.documents")
ingest_pipeline.connect("embedder.documents", "writer.documents")


def ingest_parsed_document(dao_id: str, doc_id: str, parsed_json: dict):
    """
    parsed_json — результат PARSER (mode=raw_json або qa_pairs/chunks).
    Тут треба перетворити його у список haystack.Document.
    """
    blocks = parsed_json.get("blocks", [])
    docs = []

    for b in blocks:
        text = b.get("text") or ""
        if not text.strip():
            continue

        meta = {
            "dao_id": dao_id,
            "doc_id": doc_id,
            "page": b.get("page"),
            "section_type": b.get("type"),
        }

        docs.append(Document(content=text, meta=meta))

    if not docs:
        return

    ingest_pipeline.run(
        {
            "splitter": {"documents": docs}
        }
    )
```

**Завдання:**
- [ ] Створити ingest pipeline
- [ ] Додати конвертацію ParsedDocument → Haystack Documents
- [ ] Додати обробку chunks mode (якщо PARSER повертає готові chunks)

### 3.2. Інтеграція з PARSER Service

- [ ] Додати виклик `parser-service` у DevTools / CrewAI workflow:
  - [ ] Завантажити файл
  - [ ] Викликати `/ocr/parse?output_mode=raw_json` або `/ocr/parse_chunks`
  - [ ] Передати `parsed_json` у `ingest_parsed_document`

**Завдання:**
- [ ] Створити `services/rag-service/app/parser_client.py` для виклику parser-service
- [ ] Додати endpoint `/rag/ingest` для завантаження документів
- [ ] Інтегрувати з Gateway для команди `/upload_doc`

---

## 4. Query-пайплайн: питання → RAG → LLM

### 4.1. Retriever + Generator

```python
# services/rag-service/app/query_pipeline.py

from haystack import Pipeline
from haystack.components.retrievers import DocumentRetriever
from haystack.components.generators import OpenAIGenerator  # або свій LLM через DAGI Router
from .document_store import get_document_store
from .embedding import get_text_embedder

doc_store = get_document_store()
embedder = get_text_embedder()

retriever = DocumentRetriever(document_store=doc_store)
# У проді замінити на кастомний generator, що ходить у DAGI Router
generator = OpenAIGenerator(
    api_key="DUMMY",
    model="gpt-4o-mini"
)

query_pipeline = Pipeline()
query_pipeline.add_component("embedder", embedder)
query_pipeline.add_component("retriever", retriever)
query_pipeline.add_component("generator", generator)

query_pipeline.connect("embedder.documents", "retriever.documents")
query_pipeline.connect("retriever.documents", "generator.documents")


def answer_query(dao_id: str, question: str):
    filters = {"dao_id": [dao_id]}

    result = query_pipeline.run(
        {
            "embedder": {"texts": [question]},
            "retriever": {"filters": filters},
            "generator": {"prompt": question},
        }
    )

    answer = result["generator"]["replies"][0]
    documents = result["retriever"]["documents"]
    return answer, documents
```

**У реальному стеку:**
- Генератором буде не OpenAI, а DAGI Router (через окремий компонент / кастомний генератор)
- Фільтри по `dao_id`, `roles`, `visibility` будуть інтегровані з RBAC

**Завдання:**
- [ ] Створити query pipeline
- [ ] Додати кастомний generator для DAGI Router
- [ ] Додати RBAC фільтри
- [ ] Створити endpoint `/rag/query`

---

## 5. Інтеграція з DAGI Router

### 5.1. Режим `mode=rag_query`

- [ ] Додати у `router-config.yml` rule:

```yaml
routing:
  - id: rag_query
    when:
      mode: rag_query
    use_provider: llm_local_qwen3_8b  # або окремий RAG-provider
```

- [ ] Додати handler у `RouterApp`, який:
  - До виклику LLM запускає `answer_query(dao_id, question)`
  - В prompt LLM додає витягнуті документи як контекст

**Завдання:**
- [ ] Оновити `router-config.yml`
- [ ] Додати RAG provider в Router
- [ ] Створити handler для `mode=rag_query`

---

## 6. RAG Service (FastAPI)

### 6.1. Структура сервісу

- [ ] Створити `services/rag-service/`:
  - [ ] `app/main.py` - FastAPI додаток
  - [ ] `app/api/endpoints.py` - ендпоінти:
    - [ ] `POST /rag/ingest` - інжест документу
    - [ ] `POST /rag/query` - запит до RAG
    - [ ] `GET /rag/health` - health check
  - [ ] `app/schemas.py` - Pydantic моделі
  - [ ] `requirements.txt` - залежності (haystack, pgvector, etc.)
  - [ ] `Dockerfile`

### 6.2. Ендпоінти

```python
# services/rag-service/app/api/endpoints.py

@router.post("/rag/ingest")
async def ingest_document_endpoint(
    doc_id: str,
    dao_id: str,
    parsed_doc: ParsedDocument  # або doc_url для завантаження
):
    """Ingest parsed document into RAG"""
    # Викликати ingest_parsed_document()
    pass

@router.post("/rag/query")
async def query_endpoint(
    dao_id: str,
    question: str,
    user_id: str
):
    """Query RAG and return answer with citations"""
    # Викликати answer_query()
    # Повернути відповідь + цитати
    pass
```

---

## 7. Інтеграція з DAARWIZZBot / microDAO

### 7.1. Команди для бота

- [ ] Додати команди в `gateway-bot/http_api.py`:
  - [ ] `/upload_doc` → інжест документу в RAG через PARSER
    - [ ] Підтримка завантаження файлів через Telegram
    - [ ] Виклик `parser-service` → `rag-service`
  - [ ] `/ask_doc` → питання до бази документів DAO
    - [ ] Виклик `rag-service` → DAGI Router
    - [ ] Відправка відповіді з цитатами

### 7.2. RBAC

- [ ] Хто може інжестити документи (`role: admin`, `role: researcher`)
- [ ] Хто може ставити питання до приватних документів
- [ ] Перевірка прав в `microdao/rbac.py`

---

## 8. Тести

- [ ] Інжест одного PDF (наприклад, "Токеноміка MicroDAO") через PARSER → ingest
- [ ] Питання:
  > "Поясни, як працює стейкінг у цьому microDAO."
- [ ] Перевірити, що Haystack знаходить потрібні фрагменти і LLM будує відповідь з цитатами

**Завдання:**
- [ ] Створити тестові фікстури (PDF документи)
- [ ] E2E тести для ingest → query
- [ ] Тести на RBAC фільтри

---

## Порядок виконання (рекомендований)

### Фаза 1: Document Store + Embeddings (1-2 дні)
1. Налаштувати pgvector в city-db
2. Створити Haystack DocumentStore
3. Вибрати та налаштувати embedding-модель

### Фаза 2: Ingest Pipeline (2-3 дні)
1. Створити ingest pipeline
2. Інтегрувати з PARSER Service
3. Створити RAG Service з endpoint `/rag/ingest`

### Фаза 3: Query Pipeline (2-3 дні)
1. Створити query pipeline
2. Інтегрувати з DAGI Router
3. Додати RBAC фільтри

### Фаза 4: Інтеграція з ботом (1-2 дні)
1. Додати команди `/upload_doc`, `/ask_doc`
2. Тестування E2E

**Загальний час:** ~6-10 днів

---

## Залежності

### Python пакети
- `haystack-ai>=2.0.0`
- `sentence-transformers>=2.2.0`
- `pgvector>=0.2.0`
- `psycopg2-binary>=2.9.0`

### Системні залежності
- PostgreSQL з pgvector (вже є в city-db)

---

## Посилання

- [PARSER Agent Documentation](./docs/agents/parser.md)
- [TODO: PARSER Implementation](./TODO-PARSER-RAG.md)
- [Haystack Documentation](https://docs.haystack.deepset.ai/)

