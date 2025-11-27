# 🌌 DAARION Space Service

**Версія:** 1.0.0  
**Статус:** Development (Mock Data)  
**Порт:** 7002

---

## 📋 Опис

Space Service — це агрегатор даних для Space Dashboard в екосистемі DAARION. Відповідає за космічний шар візуалізації (planets, nodes, events).

### Функціонал

- 🪐 **Space Planets** — DAO-планети з метриками
- 🖥️ **Space Nodes** — детальні метрики нод
- 📡 **Space Events** — події космічного рівня
- 🔭 **Anomaly Detection** — виявлення аномалій
- 🌠 **Governance Temperature** — активність управління

---

## 🚀 Швидкий старт

### Через Docker Compose

```bash
# З кореня проєкту
./scripts/start-city-space-services.sh
```

### Локально (Development)

```bash
cd services/space-service

# Створити віртуальне середовище
python -m venv venv
source venv/bin/activate

# Встановити залежності
pip install -r requirements.txt

# Запустити сервіс
python main.py
```

---

## 📡 API Endpoints

### **GET** `/health`

Health check endpoint

---

### **GET** `/space/planets`

Повертає DAO-планети у космічному шарі

**Response:** `List[SpacePlanet]`

```json
[
  {
    "dao_id": "dao:3",
    "name": "Aurora Circle",
    "health": "good",
    "treasury": 513200,
    "activity": 0.84,
    "governance_temperature": 72,
    "anomaly_score": 0.04,
    "position": { "x": 120, "y": 40, "z": -300 },
    "node_count": 12,
    "satellites": [...]
  }
]
```

---

### **GET** `/space/nodes`

Повертає детальні метрики усіх нод

**Response:** `List[SpaceNode]`

```json
[
  {
    "node_id": "node:03",
    "name": "Quantum Relay",
    "microdao": "microdao:7",
    "gpu": {
      "load": 0.72,
      "vram_used": 30.1,
      "vram_total": 40.0,
      "temperature": 71
    },
    "cpu": { "load": 0.44, "temperature": 62 },
    "memory": { "used": 11.2, "total": 32.0 },
    "network": {
      "latency": 12,
      "bandwidth_in": 540,
      "bandwidth_out": 430,
      "packet_loss": 0.01
    },
    "agents": 14,
    "status": "healthy"
  }
]
```

---

### **GET** `/space/events`

Поточні Space/DAO/Node події

**Query Parameters:**
- `seconds` (optional): Time window in seconds (default: 120)

**Response:** `List[SpaceEvent]`

```json
[
  {
    "type": "dao.vote.opened",
    "dao_id": "dao:3",
    "timestamp": 1735680041,
    "severity": "info",
    "meta": {
      "proposal_id": "P-173",
      "title": "Budget Allocation 2025"
    }
  }
]
```

---

## 🗺️ Схема агрегації даних

```
┌─────────────────────────────────────────────────────────┐
│                   Space Service                         │
│                  (Port: 7002)                           │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│  microDAO   │  │ Node        │  │   Agent      │
│  Service    │  │ Metrics     │  │   Registry   │
└─────────────┘  └─────────────┘  └──────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼                             ▼
┌──────────────┐             ┌──────────────┐
│ NATS         │             │ Redis /      │
│ JetStream    │             │ Timescale    │
└──────────────┘             └──────────────┘
```

---

## 📊 Джерела даних

| Endpoint        | Джерела                               | NATS Subject          |
| --------------- | ------------------------------------- | --------------------- |
| `/planets`      | microDAO service + Node metrics       | `dao.state.*`         |
| `/nodes`        | NodeMetrics Agent → NATS              | `node.metrics.*`      |
| `/events`       | JetStream Stream                      | `events.space.*`      |

---

## 🔧 Конфігурація

### Environment Variables

```bash
# Service
LOG_LEVEL=INFO
ENVIRONMENT=development

# Redis
REDIS_URL=redis://redis:6379

# NATS
NATS_URL=nats://nats:4222

# CORS
CORS_ORIGINS=http://localhost:8899,https://daarion.city
```

---

## 🧪 Тестування

```bash
# Health check
curl http://localhost:7002/health

# Get planets
curl http://localhost:7002/space/planets

# Get nodes
curl http://localhost:7002/space/nodes

# Get events (last 60 seconds)
curl "http://localhost:7002/space/events?seconds=60"

# Через API Gateway
curl http://localhost:8080/space/planets
```

---

## 📚 Документація

- **OpenAPI Docs:** http://localhost:7002/docs
- **ReDoc:** http://localhost:7002/redoc

---

## 🗺️ Roadmap

### Phase 1: Mock Data ✅
- [x] FastAPI application
- [x] Mock planets/nodes/events
- [x] OpenAPI documentation
- [x] Docker setup

### Phase 2: Real Data Integration (Current)
- [ ] NATS client integration
- [ ] Redis client for metrics
- [ ] Real-time node metrics
- [ ] DAO state integration
- [ ] Event stream from JetStream

### Phase 3: Advanced Features
- [ ] Anomaly detection algorithm
- [ ] Governance temperature calculation
- [ ] Predictive analytics
- [ ] WebSocket support

---

## 📄 License

Proprietary — DAARION Ecosystem




