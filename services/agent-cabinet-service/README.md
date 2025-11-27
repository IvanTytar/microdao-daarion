# Agent Cabinet Service

FastAPI сервіс для кабінетів агентів, метрик та CrewAI команд.

## 🚀 Швидкий старт

### Локальний запуск

```bash
cd services/agent-cabinet-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8898 --reload
```

### Docker

```bash
docker build -t agent-cabinet-service .
docker run -p 8898:8898 agent-cabinet-service
```

## 📡 API Endpoints

### 1. Health Check
```http
GET /health
```

### 2. Отримати метрики агента
```http
GET /api/agent/{agent_id}/metrics
```

**Response:**
```json
{
  "agent_id": "yaromir",
  "agent_name": "Яромир",
  "status": "active",
  "uptime_hours": 150.5,
  "total_requests": 2500,
  "successful_requests": 2400,
  "failed_requests": 100,
  "avg_response_time_ms": 450.5,
  "last_active": "2025-11-23T12:00:00Z",
  "model": "qwen3:8b",
  "model_backend": "ollama",
  "node": "node-1",
  "is_orchestrator": true,
  "team_size": 4,
  "sub_agents": [...]
}
```

### 3. Отримати CrewAI команди
```http
GET /api/agent/{agent_id}/crews
```

### 4. Стати оркестратором
```http
POST /api/agent/{agent_id}/become-orchestrator
```

### 5. Створити CrewAI команду
```http
POST /api/agent/{agent_id}/crews/create?crew_name=MyCrew&agents=[...]&tasks=[...]
```

### 6. Додати агента до команди
```http
POST /api/agent/{agent_id}/add-sub-agent
Content-Type: application/json

{
  "id": "vozhd",
  "name": "Вождь",
  "role": "Strategic Guardian"
}
```

### 7. Видалити агента з команди
```http
POST /api/agent/{agent_id}/remove-sub-agent?sub_agent_id=vozhd
```

### 8. Чат з агентом
```http
POST /api/agent/{agent_id}/chat?message=Hello
```

## 🔧 Налаштування

### Environment Variables

- `ROUTER_URL` - URL DAGI Router (default: `http://localhost:9102`)

## 📝 Наступні кроки

1. **Інтеграція з базою даних** - замінити in-memory storage на PostgreSQL
2. **Реальні метрики** - підключити до Prometheus/Grafana
3. **CrewAI інтеграція** - підключити до реального CrewAI сервісу
4. **Автоматичне створення кабінету** - при реєстрації нового агента

