# Масштабування GREENFOOD до 1000+ агентів

**Поточний стан**: 13 агентів, 4 crews  
**Мета**: 1000+ паралельних агентів для сотень комітентів

---

## 🎯 Архітектурні виклики

### 1. **Паралелізм та черги**

**Проблема**: 1000 агентів = 1000+ одночасних LLM-викликів  
**Рішення**:
- **Черги завдань**: Redis Queue (RQ), Celery, або NATS JetStream
- **Rate limiting**: Обмеження кількості одночасних запитів до LLM
- **Пріоритизація**: VIP-клієнти → звичайні → фонові завдання

```python
# Приклад з Celery
from celery import Celery

app = Celery('greenfood', broker='redis://localhost:6379')

@app.task(priority=1)  # Високий пріоритет
def process_urgent_order(order_id):
    crew = GREENFOOD_CREWS["fulfill_order"]
    return crew.kickoff()

@app.task(priority=9)  # Низький пріоритет
def generate_analytics_report():
    crew = GREENFOOD_CREWS["monthly_settlement"]
    return crew.kickoff()
```

---

### 2. **Державне управління (State Management)**

**Проблема**: Кожен агент має контекст, пам'ять, стан діалогу  
**Рішення**:
- **Redis** для швидкого кешу (поточні діалоги, сесії)
- **PostgreSQL** для персистентного стану (історія, транзакції)
- **Memory Service** (вже є в проєкті!)

```python
# Приклад збереження стану
from redis import Redis
import json

redis_client = Redis(host='localhost', port=6379, db=0)

def save_agent_state(agent_id: str, state: dict):
    redis_client.setex(
        f"agent:{agent_id}:state",
        3600,  # TTL 1 година
        json.dumps(state)
    )

def get_agent_state(agent_id: str) -> dict:
    state = redis_client.get(f"agent:{agent_id}:state")
    return json.loads(state) if state else {}
```

---

### 3. **LLM інфраструктура**

**Проблема**: Ollama на одній машині не витримає 1000 запитів/хв  
**Рішення**:

#### A. Розподілені LLM (Horizontal Scaling)
```yaml
# docker-compose для LLM кластера
services:
  ollama-1:
    image: ollama/ollama
    environment:
      - OLLAMA_NUM_PARALLEL=4
  
  ollama-2:
    image: ollama/ollama
    environment:
      - OLLAMA_NUM_PARALLEL=4
  
  ollama-3:
    image: ollama/ollama
    environment:
      - OLLAMA_NUM_PARALLEL=4

  llm-load-balancer:
    image: nginx:alpine
    # Балансування навантаження між ollama-1, 2, 3
```

#### B. Використання хмарних LLM для пікових навантажень
```python
# Гібридна стратегія
def get_llm_provider(priority: str):
    if priority == "urgent":
        return "cloud_deepseek"  # Швидкий хмарний LLM
    elif is_local_available():
        return "local_qwen3_8b"  # Локальний Ollama
    else:
        return "cloud_deepseek"  # Fallback на хмару
```

#### C. Кешування відповідей LLM
```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=10000)
def get_llm_response_cached(prompt: str, agent_id: str):
    # Кеш для повторюваних запитів
    cache_key = hashlib.md5(f"{agent_id}:{prompt}".encode()).hexdigest()
    cached = redis_client.get(f"llm_cache:{cache_key}")
    if cached:
        return cached
    
    response = call_llm(prompt, agent_id)
    redis_client.setex(f"llm_cache:{cache_key}", 3600, response)
    return response
```

---

### 4. **Моніторинг та observability**

**Проблема**: Як зрозуміти, що відбувається з 1000 агентами?  
**Рішення**:

#### A. Метрики (Prometheus + Grafana)
```python
from prometheus_client import Counter, Histogram, Gauge

agent_requests = Counter('greenfood_agent_requests', 'Запити до агентів', ['agent_id'])
agent_latency = Histogram('greenfood_agent_latency', 'Затримка агентів', ['agent_id'])
active_agents = Gauge('greenfood_active_agents', 'Активні агенти')

# Використання
@track_metrics
def execute_agent(agent_id: str, task: dict):
    agent_requests.labels(agent_id=agent_id).inc()
    with agent_latency.labels(agent_id=agent_id).time():
        return agent.execute(task)
```

#### B. Distributed Tracing (Jaeger / Tempo)
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("fulfill_order")
def fulfill_order(order_data: dict):
    with tracer.start_as_current_span("warehouse.reserve"):
        warehouse_agent.reserve_items(order_data)
    
    with tracer.start_as_current_span("logistics.create_route"):
        logistics_agent.create_route(order_data)
```

#### C. Логування (ELK Stack / Loki)
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "agent_execution_started",
    agent_id="warehouse_agent",
    task_id="task_123",
    vendor_id="vendor_456",
)
```

---

### 5. **Ізоляція та безпека**

**Проблема**: Один збійний агент не має зупинити всю систему  
**Рішення**:

#### A. Circuit Breaker Pattern
```python
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(fail_max=5, timeout_duration=60)

@breaker
def call_warehouse_agent(task):
    # Якщо warehouse_agent падає 5 разів підряд,
    # circuit breaker відкривається на 60 сек
    return warehouse_agent.execute(task)
```

#### B. Sandbox для кожного агента
```python
# Docker container per agent instance
docker run --rm \
  --memory="512m" \
  --cpus="0.5" \
  --name agent_warehouse_001 \
  greenfood/agent:latest \
  python -m greenfood.crew.warehouse_agent
```

---

### 6. **Дані та API**

**Проблема**: 1000 агентів = тисячі запитів до БД/API  
**Рішення**:

#### A. Connection Pooling
```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    "postgresql://...",
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=50,
)
```

#### B. Read Replicas
```yaml
# PostgreSQL з реплікацією
primary:
  host: postgres-primary
  port: 5432

replicas:
  - host: postgres-replica-1
    port: 5432
  - host: postgres-replica-2
    port: 5432

# Читання з реплік, запис в primary
```

#### C. Кешування на рівні API
```python
from cachetools import TTLCache

api_cache = TTLCache(maxsize=10000, ttl=300)

@cached(cache=api_cache)
def get_product_catalog(vendor_id: str):
    return db.query(Product).filter_by(vendor_id=vendor_id).all()
```

---

## 📊 Орієнтовні потужності

### Поточна архітектура (13 агентів)
- **Throughput**: ~10-20 задач/хв
- **Latency**: 3-10 сек на задачу
- **Concurrent agents**: 5-10

### Для 1000 агентів
- **Throughput**: 1000-5000 задач/хв
- **Latency**: <5 сек (95 percentile)
- **Concurrent agents**: 500-1000

### Необхідна інфраструктура

| Компонент | Мінімум | Рекомендовано |
|-----------|---------|---------------|
| **LLM Nodes** | 3x Ollama (RTX 4090) | 10x Ollama або хмара |
| **Redis** | 1 instance (16GB RAM) | Redis Cluster (64GB RAM) |
| **PostgreSQL** | 1 primary + 1 replica | 1 primary + 3 replicas |
| **Message Queue** | NATS Core | NATS JetStream Cluster |
| **API Gateway** | 2 instances | 5+ instances (auto-scaling) |
| **Monitoring** | Prometheus + Grafana | Full observability stack |

### Орієнтовний бюджет
- **On-premise**: $15,000-30,000 (обладнання) + $500-1000/міс (утримання)
- **Cloud**: $2,000-5,000/міс (залежно від навантаження)

---

## 🛠️ План масштабування

### Phase 1: Proof of Concept (Current)
- ✅ 13 агентів
- ✅ 4 crews
- ✅ Базова інтеграція з Router
- **Навантаження**: 1-10 комітентів

### Phase 2: Production Ready (1-3 місяці)
- [ ] Черги завдань (Celery/NATS)
- [ ] Redis для стану
- [ ] Моніторинг (Prometheus)
- [ ] Circuit breakers
- **Навантаження**: 10-50 комітентів, 100-200 задач/год

### Phase 3: Scale Out (3-6 місяців)
- [ ] LLM кластер (3-5 nodes)
- [ ] PostgreSQL реплікація
- [ ] API rate limiting
- [ ] Distributed tracing
- **Навантаження**: 50-200 комітентів, 1000+ задач/год

### Phase 4: Enterprise Scale (6-12 місяців)
- [ ] Auto-scaling (Kubernetes)
- [ ] Multi-region deployment
- [ ] Advanced caching (CDN, edge)
- [ ] ML для оптимізації маршрутизації
- **Навантаження**: 200-1000 комітентів, 5000+ задач/год

---

## 💡 Швидкий старт для масштабування

### 1. Додай черги (швидко)
```bash
# Install Redis
docker run -d -p 6379:6379 redis:alpine

# Install Celery
pip install celery redis
```

```python
# services/greenfood/tasks.py
from celery import Celery
from services.greenfood.crew.greenfood_crews import GREENFOOD_CREWS

app = Celery('greenfood', broker='redis://localhost:6379')

@app.task
def execute_crew_async(crew_name: str, data: dict):
    crew = GREENFOOD_CREWS[crew_name]
    # ... setup tasks ...
    return crew.kickoff()
```

### 2. Додай моніторинг (швидко)
```bash
# Prometheus + Grafana
docker-compose up -d prometheus grafana
```

### 3. Додай load balancer для LLM (середньо)
```yaml
# nginx.conf
upstream ollama_backend {
    least_conn;  # Балансування по найменшому навантаженню
    server ollama-1:11434;
    server ollama-2:11434;
    server ollama-3:11434;
}
```

---

## 🎯 Висновок

**Для 1000 агентів потрібно**:
1. ✅ Архітектура вже хороша (crewAI + модульність)
2. ⏳ Додати черги та state management (1-2 тижні)
3. ⏳ Масштабувати LLM інфраструктуру (2-4 тижні)
4. ⏳ Додати observability (1-2 тижні)
5. ⏳ Тестування під навантаженням (2-4 тижні)

**Реальний термін до production-ready 1000 агентів: 2-3 місяці**

---

*Документ створено: 2025-11-18*

