# PARSER Service - Deployment Guide

Інструкції з розгортання PARSER-сервісу з dots.ocr моделлю.

## Варіанти розгортання

### 1. Docker Compose (рекомендовано)

Найпростіший спосіб - використовувати готовий `docker-compose.yml`:

```bash
cd services/parser-service

# CPU версія (за замовчуванням)
docker-compose up -d

# Або з GPU (якщо є NVIDIA GPU)
# Спочатку встановіть nvidia-container-toolkit
# Потім розкоментуйте GPU секцію в docker-compose.yml
docker-compose up -d
```

**Environment variables** (через `.env` або `docker-compose.yml`):

```bash
# Модель
PARSER_MODEL_NAME=rednote-hilab/dots.ocr
DOTS_OCR_MODEL_ID=rednote-hilab/dots.ocr
PARSER_DEVICE=cpu  # або cuda, mps

# Runtime
RUNTIME_TYPE=local  # або ollama
USE_DUMMY_PARSER=false
ALLOW_DUMMY_FALLBACK=true

# Ollama (якщо RUNTIME_TYPE=ollama)
OLLAMA_BASE_URL=http://ollama:11434
```

### 2. Локальне розгортання (Python venv)

#### Крок 1: Створити venv

```bash
cd services/parser-service
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# або
venv\Scripts\activate  # Windows
```

#### Крок 2: Встановити залежності

**CPU версія:**
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

**CUDA версія (якщо є NVIDIA GPU):**
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements.txt
```

**MPS версія (Apple Silicon):**
```bash
pip install torch torchvision torchaudio
pip install -r requirements.txt
```

#### Крок 3: Налаштувати environment

Створити `.env` файл:

```bash
# .env
PARSER_MODEL_NAME=rednote-hilab/dots.ocr
DOTS_OCR_MODEL_ID=rednote-hilab/dots.ocr
PARSER_DEVICE=cpu  # або cuda, mps
RUNTIME_TYPE=local
USE_DUMMY_PARSER=false
ALLOW_DUMMY_FALLBACK=true
```

#### Крок 4: Запустити сервіс

```bash
uvicorn app.main:app --host 0.0.0.0 --port 9400 --reload
```

### 3. Ollama Runtime (альтернатива)

Якщо не хочете встановлювати transformers/torch локально:

#### Крок 1: Встановити Ollama

```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Завантажити з https://ollama.ai/download
```

#### Крок 2: Завантажити dots-ocr модель

```bash
ollama pull dots-ocr
# Або якщо модель називається інакше:
# ollama pull <model-name>
```

#### Крок 3: Налаштувати parser-service

```bash
export RUNTIME_TYPE=ollama
export OLLAMA_BASE_URL=http://localhost:11434
export PARSER_MODEL_NAME=dots-ocr
```

#### Крок 4: Запустити сервіс

```bash
uvicorn app.main:app --host 0.0.0.0 --port 9400
```

## Модель dots.ocr

### Варіанти отримання моделі

1. **HuggingFace Hub** (автоматично):
   - Модель завантажиться автоматично при першому використанні
   - Кешується в `~/.cache/huggingface/`

2. **Локальний шлях**:
   ```bash
   export PARSER_MODEL_NAME=/opt/models/dots.ocr
   ```

3. **Git clone**:
   ```bash
   git clone https://huggingface.co/rednote-hilab/dots.ocr /opt/models/dots.ocr
   export PARSER_MODEL_NAME=/opt/models/dots.ocr
   ```

### Розмір моделі та вимоги

- **Розмір:** Залежить від конкретної версії dots.ocr (зазвичай 1-7GB)
- **RAM:** Мінімум 4GB для CPU, 8GB+ для GPU
- **GPU:** Опційно, значно прискорює обробку

## Перевірка роботи

### Health check

```bash
curl http://localhost:9400/health
```

Очікуваний відповідь:
```json
{
  "status": "healthy",
  "service": "parser-service",
  "model": "rednote-hilab/dots.ocr",
  "device": "cpu",
  "version": "1.0.0"
}
```

### Тестовий запит

```bash
curl -X POST http://localhost:9400/ocr/parse \
  -F "file=@test.pdf" \
  -F "output_mode=raw_json"
```

## Troubleshooting

### Помилка: "CUDA not available"

**Рішення:**
- Перевірте, чи встановлено CUDA: `nvidia-smi`
- Встановіть правильну версію PyTorch з CUDA підтримкою
- Або використовуйте `PARSER_DEVICE=cpu`

### Помилка: "Model not found"

**Рішення:**
- Перевірте правильність `PARSER_MODEL_NAME`
- Переконайтеся, що є доступ до HuggingFace Hub
- Або вкажіть локальний шлях до моделі

### Помилка: "Out of memory"

**Рішення:**
- Зменште `PARSER_MAX_PAGES`
- Використовуйте CPU замість GPU
- Або використовуйте Ollama runtime

### Модель завантажується повільно

**Рішення:**
- Перший раз модель завантажується з HuggingFace (може бути повільно)
- Наступні запуски використовують кеш
- Можна попередньо завантажити: `python -c "from transformers import AutoModelForVision2Seq; AutoModelForVision2Seq.from_pretrained('rednote-hilab/dots.ocr')"`

## Інтеграція з docker-compose.yml (основний проект)

Додати в основний `docker-compose.yml`:

```yaml
services:
  parser-service:
    build:
      context: ./services/parser-service
      dockerfile: Dockerfile
      target: cpu
    container_name: dagi-parser-service
    ports:
      - "9400:9400"
    environment:
      - PARSER_MODEL_NAME=${PARSER_MODEL_NAME:-rednote-hilab/dots.ocr}
      - PARSER_DEVICE=${PARSER_DEVICE:-cpu}
      - RUNTIME_TYPE=local
      - USE_DUMMY_PARSER=${USE_DUMMY_PARSER:-false}
    volumes:
      - parser-model-cache:/root/.cache/huggingface
    networks:
      - dagi-network
    depends_on:
      - city-db
    restart: unless-stopped
```

## Production рекомендації

1. **GPU:** Використовуйте GPU для кращої продуктивності
2. **Model caching:** Зберігайте модель в volume для швидшого старту
3. **Resource limits:** Встановіть memory limits в docker-compose
4. **Monitoring:** Додайте логування та метрики
5. **Scaling:** Можна запускати кілька інстансів за load balancer

