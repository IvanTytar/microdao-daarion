# PARSER Service

Document Ingestion & Structuring Agent using dots.ocr.

## Опис

PARSER Service — це FastAPI сервіс для розпізнавання та структурування документів (PDF, зображення) через модель `dots.ocr`.

## Структура

```
parser-service/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   └── endpoints.py     # API endpoints
│   ├── core/
│   │   └── config.py        # Configuration
│   ├── runtime/
│   │   ├── __init__.py
│   │   ├── model_loader.py  # Model loading
│   │   └── inference.py     # Inference functions
│   └── schemas.py           # Pydantic models
├── requirements.txt
├── Dockerfile
└── README.md
```

## API Endpoints

### POST /ocr/parse

Parse document (PDF or image).

**Request:**
- `file`: UploadFile (multipart/form-data)
- `doc_url`: Optional[str] (not yet implemented)
- `output_mode`: `raw_json` | `markdown` | `qa_pairs` | `chunks`
- `dao_id`: Optional[str]
- `doc_id`: Optional[str]

**Response:**
```json
{
  "document": {...},      // for raw_json mode
  "markdown": "...",       // for markdown mode
  "qa_pairs": [...],      // for qa_pairs mode
  "chunks": [...],        // for chunks mode
  "metadata": {}
}
```

### POST /ocr/parse_qa

Parse document and return Q&A pairs.

### POST /ocr/parse_markdown

Parse document and return Markdown.

### POST /ocr/parse_chunks

Parse document and return chunks for RAG.

### GET /health

Health check endpoint.

## Конфігурація

Environment variables:

- `PARSER_MODEL_NAME`: Model name (default: `rednote-hilab/dots.ocr`)
- `PARSER_DEVICE`: Device (`cuda`, `cpu`, `mps`)
- `PARSER_MAX_PAGES`: Max pages to process (default: 100)
- `PARSER_MAX_RESOLUTION`: Max resolution (default: `4096x4096`)
- `MAX_FILE_SIZE_MB`: Max file size in MB (default: 50)
- `TEMP_DIR`: Temporary directory (default: `/tmp/parser`)

## Запуск

### Development

```bash
cd services/parser-service
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 9400
```

### Docker

```bash
docker-compose up parser-service
```

## Статус реалізації

- [x] Базова структура сервісу
- [x] API endpoints (з mock-даними)
- [x] Pydantic schemas
- [x] Configuration
- [ ] Інтеграція з dots.ocr моделлю
- [ ] PDF processing
- [ ] Image processing
- [ ] Markdown conversion
- [ ] QA pairs extraction

## Наступні кроки

1. Інтегрувати dots.ocr модель в `app/runtime/inference.py`
2. Додати PDF → images конвертацію
3. Реалізувати реальний parsing замість dummy
4. Додати тести

## Посилання

- [PARSER Agent Documentation](../../docs/agents/parser.md)
- [TODO: PARSER + RAG Implementation](../../TODO-PARSER-RAG.md)

