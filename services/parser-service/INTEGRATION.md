# PARSER Service - Integration Guide

Інтеграція PARSER-сервісу з DAGI Router та RAG-пайплайном.

## Формат виводу dots.ocr → ParsedBlock

### Очікувані формати виводу dots.ocr

PARSER-сервіс підтримує кілька форматів виводу від dots.ocr моделі:

#### 1. JSON зі структурованими блоками (preferred)

```json
{
  "blocks": [
    {
      "type": "heading",
      "text": "Document Title",
      "bbox": [0, 0, 800, 50],
      "reading_order": 1
    },
    {
      "type": "paragraph",
      "text": "Document content...",
      "bbox": [0, 60, 800, 100],
      "reading_order": 2
    },
    {
      "type": "table",
      "text": "Table content",
      "bbox": [0, 200, 800, 300],
      "reading_order": 3,
      "table_data": {
        "rows": [["Header 1", "Header 2"], ["Value 1", "Value 2"]],
        "columns": ["Header 1", "Header 2"]
      }
    }
  ]
}
```

#### 2. JSON зі сторінками

```json
{
  "pages": [
    {
      "page_num": 1,
      "blocks": [...]
    }
  ]
}
```

#### 3. Plain text / Markdown

```
# Document Title

Document content paragraph...

- List item 1
- List item 2
```

### Нормалізація в ParsedBlock

`model_output_parser.py` автоматично нормалізує всі формати до стандартного `ParsedBlock`:

```python
{
    "type": "paragraph" | "heading" | "table" | "formula" | "figure_caption" | "list",
    "text": "Block text content",
    "bbox": {
        "x": 0.0,
        "y": 0.0,
        "width": 800.0,
        "height": 50.0
    },
    "reading_order": 1,
    "page_num": 1,
    "table_data": {...},  # Optional, for table blocks
    "metadata": {...}      # Optional, additional metadata
}
```

## Must-have поля для RAG

### ParsedDocument

**Обов'язкові поля:**
- `doc_id: str` - Унікальний ідентифікатор документа (для індексації)
- `pages: List[ParsedPage]` - Список сторінок з блоками (контент)
- `doc_type: Literal["pdf", "image"]` - Тип документа

**Рекомендовані поля в metadata:**
- `metadata.dao_id: str` - ID DAO (для фільтрації)
- `metadata.user_id: str` - ID користувача (для access control)
- `metadata.title: str` - Назва документа (для відображення)
- `metadata.created_at: datetime` - Час завантаження (для сортування)

### ParsedChunk

**Обов'язкові поля:**
- `text: str` - Текст фрагменту (для індексації)
- `metadata.dao_id: str` - ID DAO (для фільтрації)
- `metadata.doc_id: str` - ID документа (для citation)

**Рекомендовані поля:**
- `page: int` - Номер сторінки (для citation)
- `section: str` - Назва секції (для контексту)
- `metadata.block_type: str` - Тип блоку (heading, paragraph, etc.)
- `metadata.reading_order: int` - Порядок читання (для сортування)
- `bbox: BBox` - Координати (для виділення в PDF)

## Інтеграція з DAGI Router

### 1. Додати provider в router-config.yml

```yaml
providers:
  parser:
    type: ocr
    base_url: "http://parser-service:9400"
    timeout: 120
```

### 2. Додати routing rule

```yaml
routing:
  - id: doc_parse
    when:
      mode: doc_parse
    use_provider: parser
```

### 3. Розширити RouterRequest

Додати в `router_client.py` або `types/api.ts`:

```python
class RouterRequest(BaseModel):
    mode: str
    dao_id: str
    user_id: str
    payload: Dict[str, Any]
    
    # Нові поля для PARSER
    doc_url: Optional[str] = None
    doc_type: Optional[Literal["pdf", "image"]] = None
    output_mode: Optional[Literal["raw_json", "markdown", "qa_pairs", "chunks"]] = "raw_json"
```

### 4. Handler в Router

```python
@router.post("/route")
async def route(request: RouterRequest):
    if request.mode == "doc_parse":
        # Викликати parser-service
        async with httpx.AsyncClient() as client:
            files = {"file": await download_file(request.doc_url)}
            response = await client.post(
                "http://parser-service:9400/ocr/parse",
                files=files,
                data={"output_mode": request.output_mode}
            )
            parsed_doc = response.json()
            return {"data": parsed_doc}
```

## Інтеграція з RAG Pipeline

### 1. Конвертація ParsedDocument → Haystack Documents

```python
from haystack.schema import Document

def parsed_doc_to_haystack_docs(parsed_doc: ParsedDocument) -> List[Document]:
    """Convert ParsedDocument to Haystack Documents for RAG"""
    docs = []
    
    for page in parsed_doc.pages:
        for block in page.blocks:
            # Skip empty blocks
            if not block.text or not block.text.strip():
                continue
            
            # Build metadata (must-have для RAG)
            meta = {
                "dao_id": parsed_doc.metadata.get("dao_id", ""),
                "doc_id": parsed_doc.doc_id,
                "page": page.page_num,
                "block_type": block.type,
                "reading_order": block.reading_order,
                "section": block.type if block.type == "heading" else None
            }
            
            # Add optional fields
            if block.bbox:
                meta["bbox_x"] = block.bbox.x
                meta["bbox_y"] = block.bbox.y
                meta["bbox_width"] = block.bbox.width
                meta["bbox_height"] = block.bbox.height
            
            # Create Haystack Document
            doc = Document(
                content=block.text,
                meta=meta
            )
            docs.append(doc)
    
    return docs
```

### 2. Ingest Pipeline

```python
from haystack import Pipeline
from haystack.components.embedders import SentenceTransformersTextEmbedder
from haystack.components.writers import DocumentWriter
from haystack.document_stores import PGVectorDocumentStore

def create_ingest_pipeline():
    """Create RAG ingest pipeline"""
    doc_store = PGVectorDocumentStore(
        connection_string="postgresql+psycopg2://...",
        embedding_dim=1024,
        table_name="rag_documents"
    )
    
    embedder = SentenceTransformersTextEmbedder(
        model="BAAI/bge-m3",
        device="cuda"
    )
    
    writer = DocumentWriter(document_store=doc_store)
    
    pipeline = Pipeline()
    pipeline.add_component("embedder", embedder)
    pipeline.add_component("writer", writer)
    pipeline.connect("embedder.documents", "writer.documents")
    
    return pipeline

def ingest_parsed_document(parsed_doc: ParsedDocument):
    """Ingest parsed document into RAG"""
    # Convert to Haystack Documents
    docs = parsed_doc_to_haystack_docs(parsed_doc)
    
    if not docs:
        logger.warning(f"No documents to ingest for doc_id={parsed_doc.doc_id}")
        return
    
    # Create pipeline
    pipeline = create_ingest_pipeline()
    
    # Run ingest
    result = pipeline.run({
        "embedder": {"documents": docs}
    })
    
    logger.info(f"Ingested {len(docs)} chunks for doc_id={parsed_doc.doc_id}")
```

### 3. Query Pipeline з фільтрами

```python
def answer_query(dao_id: str, question: str, user_id: str):
    """Query RAG with RBAC filters"""
    # Build filters (must-have для ізоляції даних)
    filters = {
        "dao_id": [dao_id]  # Фільтр по DAO
    }
    
    # Optional: додати фільтри по roles через RBAC
    # user_roles = get_user_roles(user_id, dao_id)
    # if "admin" not in user_roles:
    #     filters["visibility"] = ["public"]
    
    # Query pipeline
    pipeline = create_query_pipeline()
    
    result = pipeline.run({
        "embedder": {"texts": [question]},
        "retriever": {"filters": filters, "top_k": 5},
        "generator": {"prompt": question}
    })
    
    answer = result["generator"]["replies"][0]
    citations = [
        {
            "doc_id": doc.meta["doc_id"],
            "page": doc.meta["page"],
            "text": doc.content[:200],
            "bbox": {
                "x": doc.meta.get("bbox_x"),
                "y": doc.meta.get("bbox_y")
            }
        }
        for doc in result["retriever"]["documents"]
    ]
    
    return {
        "answer": answer,
        "citations": citations
    }
```

## Приклад повного workflow

### 1. Завантаження документа

```python
# Gateway отримує файл від користувача
file_bytes = await get_file_from_telegram(file_id)

# Викликаємо PARSER
async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://parser-service:9400/ocr/parse_chunks",
        files={"file": ("doc.pdf", file_bytes)},
        data={
            "dao_id": "daarion",
            "doc_id": "tokenomics_v1",
            "output_mode": "chunks"
        }
    )
    result = response.json()

# Конвертуємо в ParsedDocument
parsed_doc = ParsedDocument(**result["document"])

# Додаємо metadata
parsed_doc.metadata.update({
    "dao_id": "daarion",
    "user_id": "user123",
    "title": "Tokenomics v1"
})

# Інжестимо в RAG
ingest_parsed_document(parsed_doc)
```

### 2. Запит до RAG

```python
# Користувач питає через бота
question = "Поясни токеноміку microDAO"

# Викликаємо RAG через DAGI Router
router_request = {
    "mode": "rag_query",
    "dao_id": "daarion",
    "user_id": "user123",
    "payload": {
        "question": question
    }
}

response = await send_to_router(router_request)
answer = response["data"]["answer"]
citations = response["data"]["citations"]

# Відправляємо користувачу з цитатами
await send_message(f"{answer}\n\nДжерела: {len(citations)} документів")
```

## Рекомендації

### Для RAG indexing

1. **Обов'язкові поля:**
   - `doc_id` - для унікальності
   - `dao_id` - для фільтрації
   - `text` - для індексації

2. **Рекомендовані поля:**
   - `page` - для citation
   - `block_type` - для контексту
   - `section` - для семантичної групи

3. **Опційні поля:**
   - `bbox` - для виділення в PDF
   - `reading_order` - для сортування

### Для DAGI Router

1. **Обов'язкові поля в payload:**
   - `doc_url` або `file` - для завантаження
   - `output_mode` - для вибору формату

2. **Рекомендовані поля:**
   - `dao_id` - для контексту
   - `doc_id` - для tracking

### Для RBAC інтеграції

1. **Фільтри в RAG:**
   - `dao_id` - обов'язково
   - `visibility` - для приватних документів
   - `user_id` - для персональних документів

2. **Перевірки в PARSER:**
   - Перевірка прав на завантаження
   - Перевірка обмежень по розміру
   - Перевірка типу файлу

## Посилання

- [PARSER Agent Documentation](../docs/agents/parser.md)
- [TODO: RAG Implementation](./TODO-RAG.md)
- [Deployment Guide](./DEPLOYMENT.md)

