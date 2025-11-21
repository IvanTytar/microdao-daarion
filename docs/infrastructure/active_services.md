# Активні сервіси на сервері DAARION

**Дата оновлення**: 2025-11-18  
**Сервер**: `144.76.224.179` (Hetzner)

---

## 🚀 Telegram Infrastructure

### 1. **telegram-bot-api** (Local Telegram Bot API)
- **Контейнер**: `telegram-bot-api`
- **Порт**: `8081:8081`
- **Призначення**: Локальна інстанція Telegram Bot API для зменшення латентності
- **Статус**: ✅ Працює

### 2. **telegram-gateway** (Multi-Bot Gateway)
- **Контейнер**: `telegram-gateway`
- **Порт**: `9200:9200`
- **Призначення**: Універсальний шлюз для всіх Telegram ботів
- **Підключені боти**:
  - **DAARWIZZ** (`@DAARWIZZBot`) - Головний оркестратор екосистеми
  - **Helion** (`@energyunionBot`) - Платформа Energy Union
  - **GREENFOOD** (`@greenfoodliveBot`) - ERP для крафтових виробників
- **Механізм**: Long polling через Local Telegram Bot API
- **Інтеграція**: NATS → DAGI Router → LLM
- **Статус**: ✅ Працює (3 боти активні)

---

## 📡 Event Streaming

### 3. **NATS** (Message Broker)
- **Контейнер**: `nats`
- **Порти**: `4222:4222`, `8222:8222` (monitoring)
- **Призначення**: Event-driven комунікація між сервісами
- **Потоки подій**:
  - `agent.telegram.update` - Telegram повідомлення → Router
  - `bot.registered` - Реєстрація нових ботів
  - `telegram.send` - Відправка повідомлень у Telegram
- **Статус**: ✅ Працює

---

## 🧠 DAGI Router (Core Orchestration)

### 4. **dagi-router** (Центральний маршрутизатор)
- **Контейнер**: `dagi-router` (імовірно в основному docker-compose)
- **Порт**: `9102:9102`
- **Призначення**: 
  - Маршрутизація запитів до агентів
  - Вибір LLM provider (Ollama, OpenRouter, DeepSeek)
  - Виконання agent workflows (CrewAI)
- **Агенти**:
  - `daarwizz` - Оркестратор microDAO
  - `helion` - Energy Union
  - `greenfood` - ERP (13 sub-agents)
  - `parser` - OCR/PDF
  - `devtools` - Dev assistant
- **Статус**: ✅ Працює

---

## 🤖 LLM Infrastructure

### 5. **Ollama** (Local LLM)
- **Модель**: `qwen2.5:14b` або `qwen3:8b`
- **Призначення**: Локальна генерація відповідей
- **GPU**: NVIDIA RTX 4090 (якщо доступне)
- **Fallback**: OpenRouter (DeepSeek-Chat) для пікового навантаження
- **Статус**: ✅ Працює

---

## 📊 Мікросервіси

### 6. **parser-service** (DotsOCR)
- **Порт**: `9400:9400`
- **Призначення**: 
  - Парсинг PDF/зображень
  - OCR через Tesseract
  - Витягування тексту та структури
- **Endpoints**:
  - `/ocr/parse` - Базовий парсинг
  - `/ocr/parse_qa` - QA пари
  - `/ocr/parse_markdown` - Markdown
  - `/ocr/parse_chunks` - Чанки для RAG
- **Статус**: ✅ Працює

### 7. **memory-service** (User Context & Facts)
- **Порт**: `9500:9500` (імовірно)
- **Призначення**:
  - Зберігання контексту діалогів
  - User facts (doc_context, preferences)
  - Історія взаємодій
- **Backend**: PostgreSQL або Memory DB
- **Статус**: ✅ Працює

### 8. **rag-service** (Vector Search)
- **Порт**: `9600:9600` (імовірно)
- **Призначення**:
  - Semantic search по документах
  - Vector embeddings (sentence-transformers)
  - Ingestion та query
- **Backend**: ChromaDB або Qdrant
- **Статус**: ✅ Працює

---

## 🗄️ Data Layer

### 9. **PostgreSQL** (Main DB)
- **Призначення**:
  - microDAO дані (daos, members, roles)
  - Транзакції DAAR/DAARION
  - Orders, products (GREENFOOD)
  - Memory Service storage
- **Статус**: ✅ Працює

### 10. **Redis** (Cache & Sessions)
- **Призначення**:
  - Кешування LLM відповідей
  - Session state
  - Rate limiting
- **Статус**: ⚠️ Можливо відсутній (потрібно додати для масштабування)

---

## 📈 Monitoring (Ймовірно)

### 11. **Prometheus** (Metrics)
- **Порт**: `9090:9090`
- **Метрики**: Agent requests, latency, errors
- **Статус**: ❓ Потрібно перевірити

### 12. **Grafana** (Dashboards)
- **Порт**: `3000:3000`
- **Дашборди**: DAGI Router, Telegram Gateway, LLM stats
- **Статус**: ❓ Потрібно перевірити

---

## 🔐 Gateway & Proxy

### 13. **gateway-bot** (HTTP API)
- **Порт**: `9001:9001`
- **Призначення**: HTTP endpoints для веб/мобільних клієнтів
- **Endpoints**:
  - `/api/doc/*` - Document workflow
  - `/telegram/webhook` - Telegram webhooks (deprecated)
  - `/discord/webhook` - Discord integration
- **Статус**: ⚠️ Можливо не використовується (заміна на telegram-gateway)

---

## 🌐 Architecture Flow

```
Telegram User
     ↓
Local Telegram Bot API (8081)
     ↓
telegram-gateway (9200)
     ↓
NATS (4222) [agent.telegram.update]
     ↓
dagi-router (9102)
     ↓
LLM Provider (Ollama / OpenRouter)
     ↓
dagi-router (response)
     ↓
telegram-gateway (send_message)
     ↓
Local Telegram Bot API
     ↓
Telegram User ✅
```

---

## 🎯 Агенти-оркестратори

**Так, у системі є 3 оркестратори**, кожен з яких керує своїм доменом:

### 1. **DAARWIZZ** (Main Ecosystem Orchestrator)
- **Домен**: microDAO, RBAC, governance, tokenomics
- **Підпорядковані**: DevTools, Memory, RAG, Parser
- **Telegram**: `@DAARWIZZBot`

### 2. **Helion** (Energy Union Orchestrator)
- **Домен**: EcoMiner, BioMiner, energy tracking, ENERGY token
- **Підпорядковані**: IoT agents, energy analytics, grid management
- **Telegram**: `@energyunionBot`

### 3. **GREENFOOD** (ERP Orchestrator) 🆕
- **Домен**: Craft food production, warehouses, logistics, sales
- **Підпорядковані**: 12 спеціалізованих агентів (Product, Warehouse, Logistics, Finance, etc.)
- **Telegram**: `@greenfoodliveBot`

---

## 📊 Статистика

| Параметр | Значення |
|----------|----------|
| **Активних ботів** | 3 (DAARWIZZ, Helion, GREENFOOD) |
| **Агентів у Router** | ~10 (daarwizz, helion, greenfood, parser, devtools, etc.) |
| **Sub-агентів (CrewAI)** | 13 (тільки GREENFOOD, поки не запущені) |
| **Мікросервісів** | 8-10 |
| **LLM моделей** | 2-3 (Qwen локально + OpenRouter fallback) |
| **Запитів/день** | ❓ (потрібно додати метрики) |

---

## 🚀 Наступні кроки для масштабування

1. ✅ GREENFOOD підключено до Telegram
2. ⏳ Додати Redis для state management
3. ⏳ Налаштувати Prometheus + Grafana
4. ⏳ Додати черги (Celery/NATS JetStream)
5. ⏳ Load testing (100+ одночасних діалогів)
6. ⏳ Додати auto-scaling (Kubernetes)

---

*Документ оновлено: 2025-11-18 05:30 UTC*

