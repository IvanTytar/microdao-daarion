# 🏙️ DAARION City Service

**Версія:** 1.0.0  
**Статус:** Development (Mock Data)  
**Порт:** 7001

---

## 📋 Опис

City Service — це агрегатор даних для City Dashboard в екосистемі DAARION. Збирає та об'єднує інформацію з різних джерел для створення повного знімку стану міста.

### Функціонал

- 📊 **City Snapshot** — повний знімок стану міста
- 👤 **User Context** — профіль користувача та archetype
- 🏛️ **MicroDAO State** — стан microDAO користувача
- 📈 **Metrics Aggregation** — глобальні метрики міста
- 🖥️ **Node Status** — стан усіх нод
- 🤖 **Agent Presence** — активні агенти
- 🎯 **Quests** — активні квести
- 📡 **Events Feed** — останні події міста

---

## 🚀 Швидкий старт

### Через Docker Compose

```bash
# З кореня проєкту
./scripts/start-city-space-services.sh
```

### Локально (Development)

```bash
cd services/city-service

# Створити віртуальне середовище
python -m venv venv
source venv/bin/activate  # Linux/Mac
# або venv\Scripts\activate  # Windows

# Встановити залежності
pip install -r requirements.txt

# Запустити сервіс
python main.py

# Або через uvicorn
uvicorn main:app --reload --port 7001
```

---

## 📡 API Endpoints

### **GET** `/health`

Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "city-service"
}
```

---

### **GET** `/api/city/snapshot`

Повертає повний знімок стану міста DAARION

**Response:** `CitySnapshot`

```json
{
  "user": {
    "id": "user:93",
    "handle": "@alice:daarion.city",
    "archetype": "Explorer",
    "microdaoId": "microdao:7"
  },
  "microdao": {
    "id": "microdao:7",
    "name": "Quantum Garden",
    "members": 7,
    "humans": 4,
    "agents": 3,
    "balanceDcr": 12820,
    "activity24h": 0.84
  },
  "metrics": {
    "activityIndex": 0.71,
    "avgAgentLatencyMs": 13,
    "natsTps": 48200,
    "nodeAvgLoad": 0.66,
    "errorRate": 0.009,
    "questEngagement": 0.62
  },
  "nodes": [...],
  "agents": [...],
  "quests": [...],
  "events": [...]
}
```

---

## 🗺️ Схема агрегації даних

```
┌─────────────────────────────────────────────────────────┐
│                   City Service                          │
│                  (Port: 7001)                           │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│   Auth /    │  │  microDAO   │  │   Metrics    │
│  Profile    │  │   Service   │  │  Collector   │
│   Service   │  │             │  │              │
└─────────────┘  └─────────────┘  └──────────────┘
                                          │
                 ┌────────────────────────┤
                 │                        │
                 ▼                        ▼
         ┌──────────────┐         ┌──────────────┐
         │ NATS         │         │ Redis /      │
         │ JetStream    │         │ Timescale    │
         └──────────────┘         └──────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
┌──────────────┐  ┌──────────────┐
│ NodeMetrics  │  │ Agent        │
│ Agent        │  │ Registry     │
└──────────────┘  └──────────────┘
```

---

## 📊 Джерела даних

| Поле       | Джерело                                   | NATS Subject              |
| ---------- | ----------------------------------------- | ------------------------- |
| `user`     | Auth / Profile service                    | `user.profile.*`          |
| `microdao` | microDAO service                          | `microdao.state.*`        |
| `metrics`  | Metrics collector (NATS → Redis/TSDB)     | `metrics.city.*`          |
| `nodes`    | NodeMetrics Agent (NATS `node.metrics.*`) | `node.metrics.*`          |
| `agents`   | Agent Registry                            | `agent.status.*`          |
| `quests`   | Quest Engine                              | `quest.active.*`          |
| `events`   | JetStream Stream `events.city.*`          | `events.city.*`           |

---

## 🔧 Конфігурація

### Environment Variables

```bash
# Service
LOG_LEVEL=INFO
ENVIRONMENT=development

# Redis (для кешу метрик)
REDIS_URL=redis://redis:6379

# NATS (для підписки на події)
NATS_URL=nats://nats:4222

# PostgreSQL (для user/microDAO даних)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/daarion

# CORS
CORS_ORIGINS=http://localhost:8899,https://daarion.city
```

---

## 🏗️ Структура проєкту

```
services/city-service/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Dockerfile          # Docker image
├── README.md           # Ця документація
├── models/             # Pydantic models (TODO)
│   ├── __init__.py
│   ├── city.py
│   └── response.py
├── services/           # Business logic (TODO)
│   ├── __init__.py
│   ├── aggregator.py   # Data aggregation
│   ├── nats_client.py  # NATS integration
│   └── redis_client.py # Redis integration
└── tests/              # Unit tests (TODO)
    ├── __init__.py
    └── test_api.py
```

---

## 🧪 Тестування

```bash
# Health check
curl http://localhost:7001/health

# Get city snapshot
curl http://localhost:7001/api/city/snapshot

# Через API Gateway
curl http://localhost:8080/api/city/snapshot
```

### Expected Response Time

- `/health`: < 10ms
- `/api/city/snapshot`: < 100ms (з кешем)

---

## 📈 Моніторинг

### Health Checks

```bash
# Docker health check
docker inspect daarion-city-service | grep Health

# Manual health check
curl -f http://localhost:7001/health || exit 1
```

### Logs

```bash
# Follow logs
docker logs -f daarion-city-service

# Last 100 lines
docker logs --tail 100 daarion-city-service
```

### Metrics (TODO)

- Prometheus endpoint: `/metrics`
- Grafana dashboard: City Service Overview

---

## 🚨 Troubleshooting

### Service not starting

```bash
# Check logs
docker logs daarion-city-service

# Rebuild
docker-compose -f docker-compose.city-space.yml up -d --build city-service
```

### CORS errors

```bash
# Check CORS_ORIGINS environment variable
docker exec daarion-city-service env | grep CORS
```

### Slow response times

- Перевір з'єднання з Redis
- Перевір з'єднання з NATS
- Переглянь логи для помилок агрегації

---

## 🗺️ Roadmap

### Phase 1: Mock Data ✅
- [x] FastAPI application
- [x] Mock city snapshot
- [x] OpenAPI documentation
- [x] Docker setup

### Phase 2: Real Data Integration (Current)
- [ ] NATS client integration
- [ ] Redis client integration
- [ ] PostgreSQL integration
- [ ] Real-time metrics aggregation
- [ ] User profile integration
- [ ] MicroDAO state integration

### Phase 3: WebSocket Support
- [ ] `/ws/city` — real-time city updates
- [ ] `/ws/events` — event stream
- [ ] `/ws/metrics` — live metrics

### Phase 4: Optimization
- [ ] Response caching
- [ ] Query optimization
- [ ] Load testing
- [ ] Horizontal scaling

---

## 📚 Документація

- **OpenAPI Docs:** http://localhost:7001/docs
- **ReDoc:** http://localhost:7001/redoc
- **OpenAPI JSON:** http://localhost:7001/openapi.json

---

## 🤝 Contributing

1. Створи feature branch
2. Додай тести
3. Оновити документацію
4. Створи PR

---

## 📄 License

Proprietary — DAARION Ecosystem

---

## 📞 Контакти

- **Maintainer:** DAARION Core Team
- **Issues:** GitHub Issues
- **Slack:** #city-service




