# Monitor Agent Service

Backend сервіс для Monitor Agent чату з підключенням до локальної LLM Mistral через Ollama.

## 🚀 Запуск

```bash
cd services/monitor-agent-service
python -m uvicorn app.main:app --host 0.0.0.0 --port 9500 --reload
```

Або через Docker:

```bash
docker build -t monitor-agent-service .
docker run -p 9500:9500 monitor-agent-service
```

## 📋 Environment Variables

```bash
# Ollama на НОДА2
OLLAMA_BASE_URL=http://192.168.1.244:11434

# Модель Mistral для Monitor Agent
# Рекомендовано: mistral:7b (4.1 GB) - менша модель для не перевантаження НОДА2
# Альтернативи: mistral:latest (4.1 GB), mistral-nemo:12b (7.1 GB - більша, але краща якість)
MISTRAL_MODEL=mistral:7b

# Memory Service
MEMORY_SERVICE_URL=http://localhost:8000
```

## 🔌 API Endpoints

### POST /api/agent/monitor/chat

Чат з Monitor Agent (загальний для всіх НОД)

**Request:**
```json
{
  "agent_id": "monitor",
  "message": "Який статус системи?",
  "node_id": null
}
```

**Response:**
```json
{
  "response": "Поточний статус системи...",
  "agent_id": "monitor",
  "model": "mistral-nemo:12b",
  "timestamp": "2025-01-27T12:00:00Z"
}
```

### POST /api/agent/monitor-node-{node_id}/chat

Чат з Monitor Agent конкретної ноди

**Request:**
```json
{
  "agent_id": "monitor-node-2",
  "message": "Який статус НОДА2?",
  "node_id": "node-2"
}
```

## 🎯 Функціональність

- ✅ Підключення до Ollama Mistral
- ✅ Отримання контексту з Memory Service
- ✅ System prompt для Monitor Agent
- ✅ Підтримка різних нод (monitor-node-1, monitor-node-2)
- ✅ Загальний Monitor Agent для всіх НОД

## 📊 Архітектура

```
Frontend (MonitorChat)
    ↓
Monitor Agent Service (port 9500)
    ↓
Ollama (port 11434) → Mistral Model
    ↓
Memory Service (port 8000) → PostgreSQL
```

## 🔧 Налаштування

### Зміна моделі

Встановіть змінну оточення:
```bash
export MISTRAL_MODEL=mistral:latest
```

### Зміна URL Ollama

```bash
export OLLAMA_BASE_URL=http://localhost:11434
```

## ✅ Статус

- ✅ Backend готовий
- ✅ Підключення до Ollama Mistral
- ✅ Інтеграція з Memory Service
- ✅ Підтримка різних нод

