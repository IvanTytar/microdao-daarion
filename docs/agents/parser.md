# PARSER Agent (dots.ocr)

**Document Ingestion & Structuring Agent** для DAARION / microDAO / SecondMe.

## Роль та призначення

PARSER — це агент, який перетворює неструктуровані документи (PDF, зображення) у структуровані дані для RAG (Retrieval-Augmented Generation) та знань-орієнтованих систем.

**Основна мета:** Забезпечити якісний інжест документів у базу знань зі збереженням структури, layout та семантики.

## Технічна база

### Модель: `rednote-hilab/dots.ocr`

- **Тип:** Image-Text-to-Text VLM (Vision Language Model)
- **Орієнтація:** Документ-орієнтований OCR з layout detection
- **GitHub:** https://github.com/QwenLM/Qwen3-ASR-Toolkit (або відповідний репозиторій)

### Ключові можливості моделі

1. **Мультимовний OCR + Layout**
   - Розпізнає текст на багатьох мовах (включаючи low-resource)
   - Правильно відновлює **reading order** (колонки, блоки, змішаний макет)
   - Підтримка складних макетів (наукові статті, звіти, форми)

2. **Єдиний VLM для всього**
   - Один модельний стек для **layout detection + OCR**
   - Не потребує окремих моделей для таблиць/тексту/формул
   - Уніфікований підхід до різних типів контенту

3. **Структурований вихід**
   - JSON з блоками (`paragraph`, `heading`, `table`, `formula`, `figure_caption`, ...)
   - Bbox-координати, сторінка, читальний порядок
   - Окремі структури для таблиць (рядки/колонки, merged cells)
   - Markdown/HTML-подібний текст (таблиці можна відтворювати як Markdown)

4. **Орієнтація на документи**
   - Підтримка форм, інвойсів, звітів, наукових статей, презентацій
   - Добре працює із змішаним контентом (текст навколо формул, підписи до рисунків)

## Вхідні дані

### Підтримувані формати

- **PDF:**
  - Скани (зображення сторінок)
  - "Цифрові" PDF (текст + векторна графіка)
  - Багатосторінкові документи

- **Зображення:**
  - PNG, JPEG, TIFF
  - Підтримка різних роздільних здатностей

- **Документи зі змішаним контентом:**
  - Текст + таблиці + схеми + формули
  - Наукові статті, звіти, презентації

## Режими виводу

PARSER підтримує кілька режимів виводу (конфігурується через промпт/параметри):

### 1. `raw_json`
Повний структурований JSON з усіма блоками:
```json
{
  "pages": [
    {
      "page_num": 1,
      "blocks": [
        {
          "type": "heading",
          "text": "Заголовок",
          "bbox": [x, y, width, height],
          "reading_order": 1
        },
        {
          "type": "paragraph",
          "text": "Текст параграфу...",
          "bbox": [...],
          "reading_order": 2
        },
        {
          "type": "table",
          "rows": [...],
          "columns": [...],
          "merged_cells": [...]
        }
      ]
    }
  ]
}
```

### 2. `markdown`
Таблиці/розділи у Markdown форматі:
```markdown
# Заголовок

Текст параграфу...

| Колонка 1 | Колонка 2 |
|-----------|-----------|
| Значення 1 | Значення 2 |
```

### 3. `qa_pairs`
Парсер одразу повертає Q&A-пари по документу (через LLM-постпроцес):
```json
{
  "qa_pairs": [
    {
      "question": "Що таке токеноміка microDAO?",
      "answer": "Токеноміка microDAO включає...",
      "source_page": 1,
      "source_bbox": [...]
    }
  ]
}
```

### 4. `chunks`
Масив семантичних фрагментів для RAG:
```json
{
  "chunks": [
    {
      "text": "Фрагмент тексту...",
      "page": 1,
      "bbox": [...],
      "section": "introduction",
      "metadata": {
        "dao_id": "daarion",
        "doc_id": "tokenomics_v1"
      }
    }
  ]
}
```

## Вихідні дані

### Структура `ParsedDocument`

```typescript
interface ParsedDocument {
  doc_id: string;
  doc_url?: string;
  doc_type: "pdf" | "image";
  pages: ParsedPage[];
  metadata: {
    dao_id: string;
    user_id: string;
    uploaded_at: string;
    file_size: number;
    page_count: number;
  };
}

interface ParsedPage {
  page_num: number;
  blocks: ParsedBlock[];
  width: number;
  height: number;
}

interface ParsedBlock {
  type: "paragraph" | "heading" | "table" | "formula" | "figure_caption" | "list";
  text: string;
  bbox: [x: number, y: number, width: number, height: number];
  reading_order: number;
  // Для таблиць:
  table_data?: {
    rows: string[][];
    columns: string[];
    merged_cells?: Array<{row: number, col: number, rowspan: number, colspan: number}>;
  };
}
```

## Обмеження

- **Max pages:** Конфігурується через `PARSER_MAX_PAGES` (за замовчуванням: 100)
- **Max resolution:** Конфігурується через `PARSER_MAX_RESOLUTION` (за замовчуванням: 4096x4096)
- **Max file size:** Залежить від runtime (рекомендовано: до 50MB для PDF)
- **Підтримка мов:** Залежить від моделі dots.ocr (українська підтримується)

## Інтеграція з системою

### 1. DAGI Router

PARSER інтегрується як окремий провайдер:

```yaml
providers:
  parser:
    type: ocr
    base_url: "http://parser-service:9400"
```

**Routing rule:**
```yaml
routing:
  - id: doc_parse
    when:
      mode: doc_parse
    use_provider: parser
```

### 2. CrewAI Orchestrator

PARSER як агент у CrewAI workflow:

- **`doc_ingest_workflow`:** Перевірка типу документа → виклик PARSER → інжест у RAG
- **`rag_answer_workflow`:** Використання розпарсених документів для відповідей

### 3. RBAC Integration

- Перевірка прав на інжест документів (`role: admin`, `role: researcher`)
- Обмеження на приватні/публічні документи
- Перевірка `dao_id` для ізоляції даних

## Використання

### Приклад запиту до PARSER

```bash
curl -X POST http://parser-service:9400/ocr/parse \
  -H "Content-Type: application/json" \
  -d '{
    "doc_url": "https://example.com/tokenomics.pdf",
    "output_mode": "chunks",
    "dao_id": "daarion",
    "user_id": "user123"
  }'
```

### Приклад через DAGI Router

```bash
curl -X POST http://router:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "doc_parse",
    "dao_id": "daarion",
    "user_id": "user123",
    "payload": {
      "doc_url": "https://example.com/tokenomics.pdf",
      "output_mode": "qa_pairs"
    }
  }'
```

## Архітектура сервісу

```
parser-service/
├── main.py                 # FastAPI сервіс
├── parser_runtime/          # Runtime для dots.ocr
│   ├── __init__.py
│   ├── model_loader.py     # Lazy init, GPU/CPU fallback
│   └── inference.py         # parse_image, parse_pdf
├── schemas.py               # Pydantic моделі
└── config.py               # Конфігурація
```

## Залежності

- **Runtime:** HuggingFace Transformers + vLLM/SGLang (або llama.cpp/GGUF)
- **Модель:** `rednote-hilab/dots.ocr`
- **Python:** 3.11+
- **GPU:** Рекомендовано (можна CPU fallback)

## Посилання

- [TODO: PARSER + RAG Implementation](../TODO-PARSER-RAG.md)
- [DAGI Router Documentation](./dagi-router.md)
- [CrewAI Orchestrator](./crewai-orchestrator.md)

