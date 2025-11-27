# 🔧 Router - Підтримка мультимодальних запитів

**Дата:** 2025-11-23  
**Мета:** Додати підтримку images/files у Router payload  
**Статус:** 📝 Інструкції для бекенду

---

## 🎯 Що потрібно реалізувати

### Поточна структура запиту:

```json
POST http://144.76.224.179:9102/route

{
  "agent": "daarwizz",
  "message": "текст повідомлення",
  "mode": "chat",
  "payload": {
    "context": {
      "system_prompt": "..."
    }
  }
}
```

### Нова структура з мультимодальністю:

```json
POST http://144.76.224.179:9102/route

{
  "agent": "daarwizz",
  "message": "Проаналізуй це зображення",
  "mode": "chat",
  "payload": {
    "context": {
      "system_prompt": "...",
      "images": [
        "data:image/png;base64,iVBORw0KGgoAAAANS..."
      ],
      "files": [
        {
          "name": "document.pdf",
          "type": "application/pdf",
          "data": "data:application/pdf;base64,JVBERi0xLj..."
        }
      ]
    }
  }
}
```

---

## 📝 Зміни в Router (NODE1)

### 1. Оновити `router-config-final.yml`

**Файл:** `/opt/microdao-daarion/router/router-config-final.yml`

**Додати підтримку мультимодальних моделей:**

```yaml
llm_profiles:
  # Існуючі профілі...
  
  # Мультимодальні профілі
  - name: sofia_vision
    provider: xai
    model: grok-4.1
    settings:
      temperature: 0.7
      max_tokens: 4096
      supports_vision: true  # Нове поле
    description: "Sofia - Vision + Code"
  
  - name: spectra_multimodal
    provider: ollama
    model: qwen3-vl:latest
    settings:
      temperature: 0.7
      max_tokens: 2048
      supports_vision: true  # Нове поле
    description: "Spectra - Vision + Language"
```

---

### 2. Оновити Python Router код

**Файл:** `/opt/microdao-daarion/router/main.py` (або аналогічний)

**Додати обробку images/files:**

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import base64
import io
from PIL import Image

app = FastAPI()

class ContextPayload(BaseModel):
    system_prompt: Optional[str] = None
    images: Optional[List[str]] = None  # base64 encoded images
    files: Optional[List[Dict[str, str]]] = None  # file metadata + base64 data

class RouteRequest(BaseModel):
    agent: str
    message: str
    mode: str = "chat"
    payload: Optional[Dict[str, Any]] = None

def process_images(images: List[str]) -> List[Image.Image]:
    """Конвертує base64 зображення в PIL Image об'єкти"""
    processed = []
    for img_data in images:
        # Видалити data:image/...;base64, префікс
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        
        # Декодувати base64
        img_bytes = base64.b64decode(img_data)
        img = Image.open(io.BytesIO(img_bytes))
        processed.append(img)
    
    return processed

def process_files(files: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """Обробляє файли (PDF, TXT, тощо)"""
    processed = []
    for file_data in files:
        name = file_data.get('name')
        file_type = file_data.get('type')
        data = file_data.get('data')
        
        # Видалити data:...;base64, префікс
        if ',' in data:
            data = data.split(',')[1]
        
        # Декодувати base64
        file_bytes = base64.b64decode(data)
        
        processed.append({
            'name': name,
            'type': file_type,
            'content': file_bytes,
            'size': len(file_bytes)
        })
    
    return processed

@app.post("/route")
async def route_message(request: RouteRequest):
    try:
        # Отримати payload
        payload = request.payload or {}
        context = payload.get('context', {})
        
        # Обробити зображення (якщо є)
        images = None
        if context.get('images'):
            images = process_images(context['images'])
            print(f"✅ Processed {len(images)} images")
        
        # Обробити файли (якщо є)
        files = None
        if context.get('files'):
            files = process_files(context['files'])
            print(f"✅ Processed {len(files)} files")
        
        # Визначити агента
        agent_id = request.agent
        
        # Перевірити чи агент підтримує vision
        agent_supports_vision = agent_id in ['sofia', 'spectra', 'daarwizz']
        
        if images and not agent_supports_vision:
            return {
                "error": f"Агент {agent_id} не підтримує обробку зображень",
                "suggestion": "Спробуйте sofia або spectra для vision tasks"
            }
        
        # Підготувати запит до LLM
        llm_request = {
            "model": get_model_for_agent(agent_id),
            "messages": [
                {
                    "role": "system",
                    "content": context.get('system_prompt', get_default_prompt(agent_id))
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ]
        }
        
        # Додати зображення до запиту (для vision моделей)
        if images and agent_supports_vision:
            # Для Ollama qwen3-vl або grok-4.1
            llm_request['images'] = [img_to_base64(img) for img in images]
        
        # Додати файли як контекст
        if files:
            files_context = "\n\n".join([
                f"Файл: {f['name']} ({f['size']} bytes)"
                for f in files
            ])
            llm_request['messages'][-1]['content'] += f"\n\nПрикріплені файли:\n{files_context}"
        
        # Викликати LLM
        response = await call_llm(llm_request)
        
        return {
            "data": {
                "text": response['text'],
                "model": response['model'],
                "tokens": response.get('tokens', 0)
            },
            "metadata": {
                "agent": agent_id,
                "has_images": bool(images),
                "has_files": bool(files)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def img_to_base64(img: Image.Image) -> str:
    """Конвертує PIL Image в base64"""
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode()

def get_model_for_agent(agent_id: str) -> str:
    """Мапінг агентів до моделей"""
    models = {
        'sofia': 'grok-4.1',
        'spectra': 'qwen3-vl:latest',
        'solarius': 'deepseek-r1:70b',
        'daarwizz': 'qwen3-8b',
    }
    return models.get(agent_id, 'qwen3-8b')

def get_default_prompt(agent_id: str) -> str:
    """System prompts для агентів"""
    # ... (існуючі промпти)
    pass

async def call_llm(request: Dict[str, Any]) -> Dict[str, Any]:
    """Викликає LLM (Ollama або xAI)"""
    # ... (існуюча логіка)
    pass
```

---

## 🧪 Тестування

### 1. Текстовий запит (існуючий)

```bash
curl -X POST http://144.76.224.179:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "daarwizz",
    "message": "Привіт!",
    "mode": "chat"
  }'
```

**Очікується:** `{ "data": { "text": "..." } }`

---

### 2. Запит з зображенням

```bash
# Конвертувати зображення в base64
BASE64_IMAGE=$(base64 -w 0 image.png)

curl -X POST http://144.76.224.179:9102/route \
  -H "Content-Type: application/json" \
  -d "{
    \"agent\": \"sofia\",
    \"message\": \"Що на цьому зображенні?\",
    \"mode\": \"chat\",
    \"payload\": {
      \"context\": {
        \"images\": [\"data:image/png;base64,$BASE64_IMAGE\"]
      }
    }
  }"
```

**Очікується:** `{ "data": { "text": "На зображенні..." }, "metadata": { "has_images": true } }`

---

### 3. Запит з файлом

```bash
# Конвертувати PDF в base64
BASE64_PDF=$(base64 -w 0 document.pdf)

curl -X POST http://144.76.224.179:9102/route \
  -H "Content-Type: application/json" \
  -d "{
    \"agent\": \"solarius\",
    \"message\": \"Проаналізуй цей документ\",
    \"mode\": \"chat\",
    \"payload\": {
      \"context\": {
        \"files\": [
          {
            \"name\": \"document.pdf\",
            \"type\": \"application/pdf\",
            \"data\": \"data:application/pdf;base64,$BASE64_PDF\"
          }
        ]
      }
    }
  }"
```

**Очікується:** `{ "data": { "text": "Документ містить..." }, "metadata": { "has_files": true } }`

---

## 📊 Підтримка моделей

### Vision-моделі (підтримують зображення):

| Агент | Модель | Provider | Vision |
|-------|--------|----------|--------|
| Sofia | grok-4.1 | xAI | ✅ |
| Spectra | qwen3-vl:latest | Ollama | ✅ |
| Daarwizz | qwen3-8b | Ollama | ❌ → можна додати |

### Text-моделі (не підтримують зображення):

| Агент | Модель | Provider | Vision |
|-------|--------|----------|--------|
| Solarius | deepseek-r1:70b | Ollama | ❌ |
| Monitor | mistral-nemo:12b | Ollama | ❌ |

---

## 🔧 Додаткові покращення

### 1. STT (Speech-to-Text) для голосових повідомлень

**Endpoint:** `POST /stt`

```python
@app.post("/stt")
async def speech_to_text(audio_data: str):
    """Конвертує аудіо в текст"""
    # Використати Whisper або інший STT сервіс
    # TODO: Інтеграція з STT Service на НОДА2
    pass
```

---

### 2. OCR для документів

**Endpoint:** `POST /ocr`

```python
@app.post("/ocr")
async def extract_text_from_image(image_data: str):
    """Витягує текст з зображення"""
    # Використати Tesseract або аналогічний
    # TODO: Інтеграція з OCR Service
    pass
```

---

### 3. Веб-пошук

**Endpoint:** `POST /web-search`

```python
@app.post("/web-search")
async def web_search(query: str):
    """Виконує веб-пошук"""
    # Використати Google Search API або аналогічний
    # TODO: Інтеграція з Web Search Service
    pass
```

---

## ✅ Чекліст реалізації

### Backend (Router на NODE1):
- [ ] Оновити `router-config-final.yml` з `supports_vision: true`
- [ ] Додати `process_images()` функцію
- [ ] Додати `process_files()` функцію
- [ ] Оновити `/route` endpoint для обробки images/files
- [ ] Додати маппінг агентів до vision-моделей
- [ ] Протестувати з Sofia (grok-4.1)
- [ ] Протестувати з Spectra (qwen3-vl:latest)
- [ ] Додати error handling для non-vision агентів
- [ ] Додати логування розміру images/files
- [ ] Оновити документацію API

### Frontend (вже готово):
- [x] Enhanced Chat UI
- [x] MultimodalInput компонент
- [x] Image upload
- [x] File upload
- [x] Voice recording (Web Audio API)
- [x] Switch toggle для Enhanced режиму
- [x] Base64 encoding для images
- [x] Відправка в payload.context.images
- [x] Відправка в payload.context.files

---

## 🚀 Деплой

### 1. SSH до NODE1

```bash
ssh root@144.76.224.179
```

### 2. Backup існуючої конфігурації

```bash
cd /opt/microdao-daarion/router
cp router-config-final.yml router-config-final.yml.backup
cp main.py main.py.backup  # якщо є
```

### 3. Оновити код

```bash
# Завантажити новий код з Git або вручну відредагувати
nano router-config-final.yml
nano main.py
```

### 4. Перезапустити Router

```bash
docker restart dagi-router
# або
docker-compose restart router
```

### 5. Перевірити логи

```bash
docker logs -f dagi-router
```

**Шукати:**
```
✅ Processed 1 images
✅ Vision model grok-4.1 selected for sofia
```

---

## 📄 Документація

**Файли для оновлення:**
- `INFRASTRUCTURE.md` - додати info про мультимодальність
- `router-config-final.yml` - оновити конфігурацію
- `README.md` (Router) - додати приклади з images/files

---

**СТАТУС:** 📝 Інструкції готові для бекенд команди  
**Наступний крок:** Реалізувати на NODE1 Router

