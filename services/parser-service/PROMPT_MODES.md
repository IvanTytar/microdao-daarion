# Prompt Modes Integration - dots.ocr Native Modes

Цей документ описує інтеграцію режимів `OutputMode` в `parser-service` з нативними prompt-модами `dots.ocr`.

---

## 📋 Мапа режимів

### Базові режими

| OutputMode | dots.ocr Prompt Mode | Опис |
|------------|---------------------|------|
| `raw_json` | `prompt_layout_all_en` | Повний JSON (layout + контент) |
| `markdown` | `prompt_ocr` | Текст/таблиці в Markdown |
| `qa_pairs` | `prompt_layout_all_en` | Повний JSON, потім 2-й крок LLM |
| `chunks` | `prompt_layout_all_en` | Повний JSON для chunking |
| `layout_only` | `prompt_layout_only_en` | Тільки layout (bbox + категорії, без тексту) |
| `region` | `prompt_grounding_ocr` | Таргетований парсинг регіону |

---

## 🔄 Архітектура

### 1. Local Runtime (`local_runtime.py`)

Використовує нативні prompt-режими `dots.ocr` через `dict_promptmode_to_prompt`:

```python
from dots_ocr.utils.prompts import dict_promptmode_to_prompt

DOTS_PROMPT_MAP = {
    "raw_json": "prompt_layout_all_en",
    "markdown": "prompt_ocr",
    "qa_pairs": "prompt_layout_all_en",
    # ...
}

def _build_prompt(output_mode: str) -> str:
    prompt_key = DOTS_PROMPT_MAP.get(output_mode, "prompt_layout_all_en")
    return dict_promptmode_to_prompt[prompt_key]
```

**Fallback:** Якщо `dict_promptmode_to_prompt` недоступний, використовуються fallback-промпти.

---

### 2. Ollama Runtime (`ollama_client.py`)

Використовує ту саму мапу prompt-режимів, але з fallback-промптами (оскільки Ollama не має прямого доступу до `dict_promptmode_to_prompt`).

---

### 3. 2-стадійний пайплайн `qa_pairs`

**Stage 1: PARSER (dots.ocr)**
- Використовує `prompt_layout_all_en` → повний JSON

**Stage 2: LLM (DAGI Router)**
- Бере parsed JSON
- Генерує Q&A пари через `qa_builder.py`
- Викликає DAGI Router з `mode="qa_build"`

```python
# Stage 1: PARSER
parsed_doc = parse_document_from_images(images, output_mode="qa_pairs")

# Stage 2: LLM
qa_pairs = await build_qa_pairs_via_router(parsed_doc, dao_id)
```

---

## 🎯 Використання

### Приклад 1: Raw JSON (layout + content)

```python
# POST /ocr/parse
{
    "output_mode": "raw_json"
}

# Використовує: prompt_layout_all_en
# Результат: ParsedDocument з повним JSON
```

### Приклад 2: Markdown

```python
# POST /ocr/parse
{
    "output_mode": "markdown"
}

# Використовує: prompt_ocr
# Результат: Markdown текст
```

### Приклад 3: Q&A Pairs (2-stage)

```python
# POST /ocr/parse_qa
{
    "dao_id": "daarion"
}

# Stage 1: prompt_layout_all_en → ParsedDocument
# Stage 2: DAGI Router → QAPair[]
```

### Приклад 4: Layout Only

```python
# POST /ocr/parse
{
    "output_mode": "layout_only"
}

# Використовує: prompt_layout_only_en
# Результат: ParsedDocument з тільки layout (без тексту)
```

---

## 🔧 Конфігурація

### Environment Variables

```bash
# DAGI Router (для qa_pairs 2-stage pipeline)
ROUTER_BASE_URL=http://router:9102
ROUTER_TIMEOUT=60

# dots.ocr model
PARSER_MODEL_NAME=rednote-hilab/dots.ocr
PARSER_DEVICE=cuda  # or cpu, mps
```

---

## 📝 Примітки

1. **qa_pairs композитний режим**: У `dots.ocr` немає нативного `qa_pairs` prompt-моду. Тому використовується 2-стадійний пайплайн.

2. **Fallback промпти**: Якщо `dict_promptmode_to_prompt` недоступний, використовуються fallback-промпти з `local_runtime.py`.

3. **Ollama runtime**: Ollama використовує fallback-промпти, оскільки не має прямого доступу до `dict_promptmode_to_prompt`.

4. **DAGI Router integration**: Для `qa_pairs` потрібен доступ до DAGI Router з `mode="qa_build"` (потрібно додати в `router-config.yml`).

---

## 🚀 Наступні кроки

1. Додати `mode="qa_build"` в DAGI Router (`router-config.yml`)
2. Тестувати 2-стадійний пайплайн `qa_pairs`
3. Додати підтримку `region` mode (grounding OCR)

