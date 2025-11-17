# Завдання для Cursor AI: Запуск агента Helion на сервері

**Репозиторій**: `microdao-daarion` (поточний)  
**Сервер**: 144.76.224.179  
**Мета**: Запустити Telegram бота Helion для платформи Energy Union

---

## 📋 Контекст

Агент Helion повністю розроблений на рівні коду, але не запущений на сервері. Потрібно:
1. Додати Memory Service в docker-compose.yml
2. Налаштувати всі залежності
3. Створити інструкції для запуску на сервері

**Існуючі компоненти**:
- ✅ `gateway-bot/helion_prompt.txt` - system prompt (200+ рядків)
- ✅ `gateway-bot/http_api.py` - endpoint `/helion/telegram/webhook`
- ✅ `gateway-bot/memory_client.py` - клієнт для Memory Service
- ✅ `services/memory-service/` - код Memory Service
- ✅ `.env` - Telegram токен вже є
- ✅ `scripts/setup-nginx-gateway.sh` - скрипт для HTTPS
- ✅ `scripts/register-agent-webhook.sh` - скрипт для webhook

---

## 🎯 Завдання 1: Додати Memory Service в docker-compose.yml

**Файл**: `docker-compose.yml`

### Що зробити:

1. **Додати сервіс memory-service** після `rag-service`:

```yaml
  # Memory Service
  memory-service:
    build:
      context: ./services/memory-service
      dockerfile: Dockerfile
    container_name: dagi-memory-service
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${MEMORY_DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/daarion_memory}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
    volumes:
      - ./logs:/app/logs
      - memory-data:/app/data
    depends_on:
      - postgres
    networks:
      - dagi-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

2. **Додати PostgreSQL** для Memory Service (якщо ще немає):

```yaml
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: dagi-postgres
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=daarion_memory
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./services/memory-service/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - dagi-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

3. **Оновити volumes секцію**:

```yaml
volumes:
  rag-model-cache:
    driver: local
  memory-data:
    driver: local
  postgres-data:
    driver: local
```

4. **Додати STT Service** (для голосових повідомлень - опціонально):

```yaml
  # STT Service (Speech-to-Text)
  stt-service:
    build:
      context: ./services/stt-service
      dockerfile: Dockerfile
    container_name: dagi-stt-service
    ports:
      - "9000:9000"
    environment:
      - MODEL_NAME=${STT_MODEL_NAME:-openai/whisper-base}
      - DEVICE=${STT_DEVICE:-cpu}
    volumes:
      - ./logs:/app/logs
      - stt-model-cache:/root/.cache/huggingface
    networks:
      - dagi-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

5. **Оновити gateway environment**:

```yaml
  gateway:
    # ... існуючий код ...
    environment:
      - ROUTER_URL=http://router:9102
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN:-}
      - DAARWIZZ_NAME=${DAARWIZZ_NAME:-DAARWIZZ}
      - DAARWIZZ_PROMPT_PATH=/app/gateway-bot/daarwizz_prompt.txt
      - HELION_TELEGRAM_BOT_TOKEN=${HELION_TELEGRAM_BOT_TOKEN:-}
      - HELION_NAME=${HELION_NAME:-Helion}
      - HELION_PROMPT_PATH=/app/gateway-bot/helion_prompt.txt
      - MEMORY_SERVICE_URL=http://memory-service:8000
      - STT_SERVICE_URL=http://stt-service:9000  # Додати це
```

---

## 🎯 Завдання 2: Оновити .env файл

**Файл**: `.env`

### Що додати:

```bash
# -----------------------------------------------------------------------------
# Memory Service Configuration
# -----------------------------------------------------------------------------
MEMORY_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/daarion_memory
MEMORY_SERVICE_URL=http://memory-service:8000

# -----------------------------------------------------------------------------
# STT Service Configuration (optional)
# -----------------------------------------------------------------------------
STT_SERVICE_URL=http://stt-service:9000
STT_MODEL_NAME=openai/whisper-base
STT_DEVICE=cpu

# -----------------------------------------------------------------------------
# PostgreSQL Configuration
# -----------------------------------------------------------------------------
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=daarion_memory
```

---

## 🎯 Завдання 3: Перевірити Memory Service має init.sql

**Файл**: `services/memory-service/init.sql`

### Створити файл якщо відсутній:

```sql
-- Memory Service Database Schema
-- Created: 2025-01-16

-- User facts table
CREATE TABLE IF NOT EXISTS user_facts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255),
    fact_key VARCHAR(255) NOT NULL,
    fact_value TEXT,
    fact_value_json JSONB,
    token_gated BOOLEAN DEFAULT FALSE,
    token_requirements JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id, fact_key)
);

-- Dialog summaries table
CREATE TABLE IF NOT EXISTS dialog_summaries (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    agent_id VARCHAR(255),
    user_id VARCHAR(255),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    summary_text TEXT,
    summary_json JSONB,
    message_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    topics TEXT[],
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent memory events table
CREATE TABLE IF NOT EXISTS agent_memory_events (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    user_id VARCHAR(255),
    scope VARCHAR(50) DEFAULT 'short_term',
    kind VARCHAR(50) NOT NULL,
    body_text TEXT,
    body_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_facts_user_team ON user_facts(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_team_channel ON dialog_summaries(team_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_agent_team ON agent_memory_events(agent_id, team_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_created ON agent_memory_events(created_at DESC);

-- Update trigger for user_facts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_facts_updated_at BEFORE UPDATE ON user_facts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 🎯 Завдання 4: Перевірити Memory Service має health endpoint

**Файл**: `services/memory-service/app/main.py`

### Перевірити наявність:

```python
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "memory-service",
        "timestamp": datetime.utcnow().isoformat()
    }
```

Якщо відсутній - додати.

---

## 🎯 Завдання 5: Створити інструкцію для запуску на сервері

**Файл**: `DEPLOY-HELION-SERVER.md`

### Створити файл з інструкціями:

```markdown
# Інструкція: Запуск Helion на сервері 144.76.224.179

## Крок 1: Підготовка сервера

```bash
# SSH на сервер
ssh root@144.76.224.179

# Оновити систему
apt-get update && apt-get upgrade -y

# Встановити Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Встановити Docker Compose
apt-get install -y docker-compose

# Встановити додаткові утиліти
apt-get install -y git curl jq certbot
```

## Крок 2: Клонувати репозиторій

```bash
# Клонувати код
cd /opt
git clone https://github.com/IvanTytar/microdao-daarion.git
cd microdao-daarion

# Створити директорії для логів та даних
mkdir -p logs data/rbac
chmod -R 755 logs data
```

## Крок 3: Налаштувати .env

```bash
# Скопіювати приклад
cp .env.example .env

# Відредагувати .env
nano .env
```

**Важливі змінні для Helion**:
```bash
HELION_TELEGRAM_BOT_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
HELION_NAME=Helion
HELION_PROMPT_PATH=./gateway-bot/helion_prompt.txt

MEMORY_SERVICE_URL=http://memory-service:8000
MEMORY_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/daarion_memory

OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3:8b
```

## Крок 4: Налаштувати DNS

**Потрібно зробити ДО запуску скриптів!**

1. Зайти в панель управління DNS (Cloudflare / Hetzner DNS)
2. Створити A запис:
   - **Name**: `gateway.daarion.city`
   - **Type**: `A`
   - **Value**: `144.76.224.179`
   - **TTL**: 300

3. Перевірити DNS:
```bash
dig gateway.daarion.city +short
# Повинно вивести: 144.76.224.179
```

## Крок 5: Запустити Ollama (якщо локально)

```bash
# Встановити Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Запустити Ollama
ollama serve &

# Завантажити модель
ollama pull qwen3:8b
```

## Крок 6: Запустити DAGI Stack

```bash
# Збілдити та запустити сервіси
docker-compose up -d

# Перевірити статус
docker-compose ps

# Переглянути логи
docker-compose logs -f gateway

# Очікувані сервіси:
# - dagi-router (9102)
# - dagi-gateway (9300)
# - dagi-memory-service (8000)
# - dagi-postgres (5432)
# - dagi-devtools (8008)
# - dagi-crewai (9010)
# - dagi-rbac (9200)
# - dagi-rag-service (9500)
```

## Крок 7: Перевірити health endpoints

```bash
# Gateway
curl http://localhost:9300/health

# Повинно вивести:
# {
#   "status": "healthy",
#   "agents": {
#     "daarwizz": {"name": "DAARWIZZ", "prompt_loaded": true},
#     "helion": {"name": "Helion", "prompt_loaded": true}
#   }
# }

# Memory Service
curl http://localhost:8000/health

# Router
curl http://localhost:9102/health
```

## Крок 8: Налаштувати HTTPS Gateway

```bash
# Запустити скрипт (автоматично створює Let's Encrypt сертифікати)
sudo ./scripts/setup-nginx-gateway.sh gateway.daarion.city admin@daarion.city

# Перевірити HTTPS
curl https://gateway.daarion.city/health
```

**Скрипт автоматично**:
- Встановить certbot
- Отримає SSL сертифікат
- Налаштує nginx reverse proxy
- Створить auto-renewal для сертифікатів
- Запустить nginx в Docker контейнері

## Крок 9: Зареєструвати Telegram Webhook

```bash
# Зареєструвати webhook для Helion
./scripts/register-agent-webhook.sh \
  helion \
  8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM \
  gateway.daarion.city

# Перевірити webhook
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"
```

## Крок 10: Тестування

1. Відкрити бота в Telegram
2. Надіслати повідомлення: **"Привіт! Що таке EcoMiner?"**
3. Очікувати відповідь від Helion

### Debugging

```bash
# Переглянути логи Gateway
docker-compose logs -f gateway

# Переглянути логи Memory Service
docker-compose logs -f memory-service

# Переглянути логи Router
docker-compose logs -f router

# Перевірити webhook статус
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo" | jq

# Увійти в контейнер Gateway
docker exec -it dagi-gateway bash

# Перевірити промпт файл
cat /app/gateway-bot/helion_prompt.txt
```

## Troubleshooting

### Проблема: Memory Service не доступний

```bash
# Перевірити чи запущено
docker ps | grep memory-service

# Перезапустити
docker-compose restart memory-service

# Переглянути логи
docker-compose logs --tail=100 memory-service
```

### Проблема: Бот не відповідає

```bash
# 1. Перевірити webhook
curl "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo"

# 2. Перевірити Gateway доступний
curl https://gateway.daarion.city/health

# 3. Перевірити nginx
docker logs nginx-gateway

# 4. Переглянути логи Gateway
docker-compose logs -f gateway
```

### Проблема: SSL сертифікат не отримується

```bash
# Перевірити DNS
dig gateway.daarion.city +short

# Спробувати отримати сертифікат вручну
sudo certbot certonly --standalone -d gateway.daarion.city --email admin@daarion.city

# Перезапустити nginx
docker restart nginx-gateway
```

## Моніторинг

```bash
# Статус всіх сервісів
docker-compose ps

# Використання ресурсів
docker stats

# Disk usage
df -h

# Логи всіх сервісів
docker-compose logs --tail=50

# Restart всього стеку
docker-compose restart
```

## Backup

```bash
# Backup бази даних
docker exec dagi-postgres pg_dump -U postgres daarion_memory > backup_$(date +%Y%m%d).sql

# Backup логів
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/

# Backup .env
cp .env .env.backup
```

## Оновлення коду

```bash
cd /opt/microdao-daarion
git pull origin main
docker-compose build
docker-compose up -d
docker-compose logs -f gateway
```
```

---

## 🎯 Завдання 6: Створити fallback для Memory Service (опціонально)

**Файл**: `gateway-bot/memory_client.py`

### Додати fallback режим:

Якщо Memory Service недоступний, gateway має працювати в stateless режимі.

Перевірити що методи `get_context()` та `save_chat_turn()` вже мають try-catch і повертають порожні дані при помилці:

```python
async def get_context(...) -> Dict[str, Any]:
    try:
        # ... existing code ...
    except Exception as e:
        logger.warning(f"Memory context fetch failed: {e}")
        return {
            "facts": [],
            "recent_events": [],
            "dialog_summaries": []
        }
```

Це вже реалізовано - перевірити що працює.

---

## 📝 Checklist для виконання

- [ ] **Завдання 1**: Додати memory-service в docker-compose.yml
- [ ] **Завдання 1**: Додати postgres в docker-compose.yml
- [ ] **Завдання 1**: Додати stt-service в docker-compose.yml (опціонально)
- [ ] **Завдання 1**: Оновити volumes секцію
- [ ] **Завдання 2**: Оновити .env з новими змінними
- [ ] **Завдання 3**: Створити init.sql для PostgreSQL
- [ ] **Завдання 4**: Перевірити health endpoint в Memory Service
- [ ] **Завдання 5**: Створити DEPLOY-HELION-SERVER.md
- [ ] **Завдання 6**: Перевірити fallback режим в memory_client.py

---

## 🧪 Тестування після змін

### Локальне тестування (на Mac)

```bash
# Запустити стек локально
cd /Users/apple/github-projects/microdao-daarion
docker-compose up -d

# Перевірити health endpoints
curl http://localhost:9300/health
curl http://localhost:8000/health

# Переглянути логи
docker-compose logs -f gateway memory-service
```

### Перевірка файлів

```bash
# Перевірити що всі файли на місці
ls -la gateway-bot/helion_prompt.txt
ls -la services/memory-service/Dockerfile
ls -la services/memory-service/init.sql
ls -la scripts/setup-nginx-gateway.sh
ls -la scripts/register-agent-webhook.sh
```

---

## 📚 Додаткова інформація

### Архітектура Helion

```
User (Telegram)
      ↓
Telegram Bot API (webhook)
      ↓
nginx-gateway (HTTPS)
      ↓
Gateway Service (/helion/telegram/webhook)
      ↓
Memory Service (fetch context)
      ↓
DAGI Router (process with Helion prompt)
      ↓
LLM (Ollama qwen3:8b)
      ↓
Memory Service (save history)
      ↓
Telegram Bot API (send response)
```

### Документація

- **Helion Quick Start**: `docs/HELION-QUICKSTART.md`
- **Agents Map**: `docs/agents.md`
- **System Prompt**: `gateway-bot/helion_prompt.txt`
- **Memory Service README**: `services/memory-service/README.md`

---

## ⚠️ Важливі нотатки

1. **Токени в .env**: Ніколи не комітити .env файл в git
2. **DNS налаштування**: Має бути зроблено ДО запуску setup-nginx-gateway.sh
3. **Ollama**: Має бути запущено локально або віддалено
4. **Memory fallback**: Якщо Memory Service не доступний, бот працюватиме без історії
5. **SSL сертифікати**: Автоматично оновлюються кожної неділі через cron

---

**Після виконання всіх завдань, агент Helion має запрацювати!** 🚀
