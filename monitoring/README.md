# DAARION Platform Monitoring

**Stack**: Prometheus + Grafana  
**Сервер**: `144.76.224.179`

---

## 🚀 Швидкий старт

### 1. Деплой на сервер

```bash
# З локальної машини
cd /Users/apple/github-projects/microdao-daarion
rsync -avz monitoring/ root@144.76.224.179:/opt/microdao-daarion/monitoring/

# На сервері
ssh root@144.76.224.179
cd /opt/microdao-daarion/monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Доступ до інтерфейсів

- **Prometheus**: http://144.76.224.179:9090
- **Grafana**: http://144.76.224.179:3000
  - Username: `admin`
  - Password: `daarion2025`

---

## 📊 Що моніториться?

### Core Services
- **dagi-router** (9102) - Центральний маршрутизатор
- **telegram-gateway** (8000) - Telegram боти
- **dagi-gateway** (9300) - HTTP Gateway
- **dagi-rbac** (9200) - RBAC Service

### AI/ML Services
- **dagi-crewai** (9010) - CrewAI workflows
- **dagi-vision-encoder** (8001) - Vision AI
- **dagi-parser** (9400) - OCR/PDF parsing
- **dagi-stt** (9000) - Speech-to-Text
- **dagi-tts** (9101) - Text-to-Speech

### Infrastructure
- **nats** (8222) - Message broker
- **dagi-qdrant** (6333) - Vector DB
- **dagi-postgres** (5432) - Main DB

---

## 🎯 Ключові метрики

### 1. Request Rate
```promql
rate(http_requests_total[5m])
```

### 2. Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

### 3. Latency (p95)
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### 4. LLM Performance
```promql
rate(llm_requests_total[5m])
histogram_quantile(0.95, rate(llm_request_duration_seconds_bucket[5m]))
```

### 5. Telegram Activity
```promql
rate(telegram_messages_total[5m])
telegram_active_chats
```

---

## 🚨 Alerts

### Critical
- **ServiceDown**: Сервіс не відповідає > 2 хв
- **TelegramGatewayDown**: Telegram боти не працюють
- **PostgreSQLDown**: База даних недоступна
- **NATSDown**: Message broker недоступний
- **DiskSpaceCritical**: < 10% диску

### Warning
- **HighErrorRate**: > 5% помилок
- **RouterHighLatency**: P95 > 10s
- **LLMHighLatency**: P95 > 30s
- **DiskSpaceWarning**: < 20% диску

---

## 📈 Додавання метрик до сервісу

### Python (FastAPI)

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import FastAPI

app = FastAPI()

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('http_request_duration_seconds', 'HTTP request latency', ['method', 'endpoint'])

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Додати сервіс в Prometheus

Відредагувати `monitoring/prometheus/prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-new-service'
    static_configs:
      - targets: ['my-service:9999']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

---

## 🛠️ Troubleshooting

### Prometheus не скрейпить метрики

```bash
# Перевірити статус targets
curl http://localhost:9090/api/v1/targets

# Перевірити logs
docker logs dagi-prometheus

# Перевірити endpoint вручну
curl http://dagi-router:9102/metrics
```

### Grafana не показує дані

```bash
# Перевірити datasource
docker exec dagi-grafana grafana-cli admin reset-admin-password daarion2025

# Restart Grafana
docker restart dagi-grafana
```

### Reload Prometheus config без рестарту

```bash
curl -X POST http://localhost:9090/-/reload
```

---

## 📚 Корисні запити

### Top 10 найповільніших endpoints
```promql
topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

### Error rate по сервісах
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) by (job)
```

### LLM requests per second
```promql
sum(rate(llm_requests_total[1m])) by (agent_id)
```

### Active Telegram chats
```promql
sum(telegram_active_chats) by (agent_id)
```

---

## 🎯 Наступні кроки

1. ✅ Prometheus + Grafana встановлено
2. ⏳ Додати метрики в DAGI Router
3. ⏳ Додати метрики в Telegram Gateway
4. ⏳ Створити дашборди в Grafana
5. ⏳ Налаштувати Alertmanager (Slack/Telegram notifications)
6. ⏳ Додати Loki для централізованих логів
7. ⏳ Додати Jaeger для distributed tracing

---

*Оновлено: 2025-11-18*

