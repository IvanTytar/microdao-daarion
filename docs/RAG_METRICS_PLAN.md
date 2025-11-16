# RAG Metrics & Dashboard Plan

План збору метрик та створення дашборду для RAG + Memory стеку.

---

## 1. Метрики для збору

### 1.1. RAG Service Metrics

**Ingest Metrics:**
- `rag_ingest_total` - загальна кількість ingest операцій
- `rag_ingest_duration_seconds` - час ingest (histogram)
- `rag_ingest_documents_indexed` - кількість індексованих документів
- `rag_ingest_pages_processed` - кількість оброблених сторінок
- `rag_ingest_errors_total` - кількість помилок ingest

**Query Metrics:**
- `rag_query_total` - загальна кількість запитів
- `rag_query_duration_seconds` - час query (histogram)
- `rag_query_documents_retrieved` - кількість знайдених документів
- `rag_query_citations_count` - кількість citations
- `rag_query_embedding_time_seconds` - час embedding
- `rag_query_retrieval_time_seconds` - час retrieval
- `rag_query_llm_time_seconds` - час LLM генерації
- `rag_query_errors_total` - кількість помилок query
- `rag_query_empty_results_total` - запити без результатів

**Quality Metrics:**
- `rag_query_dao_filter_applied` - застосування dao_id фільтра
- `rag_query_doc_ids_found` - унікальні doc_ids в результатах

### 1.2. Router Metrics (RAG Query Mode)

- `router_rag_query_total` - загальна кількість rag_query запитів
- `router_rag_query_duration_seconds` - загальний час обробки
- `router_rag_query_memory_used` - використання Memory
- `router_rag_query_rag_used` - використання RAG
- `router_rag_query_prompt_tokens_estimated` - оцінка токенів промпту
- `router_rag_query_fallback_total` - fallback на Memory only

### 1.3. Memory Service Metrics

- `memory_context_fetch_total` - кількість викликів get_context
- `memory_context_fetch_duration_seconds` - час отримання контексту
- `memory_context_facts_count` - кількість facts
- `memory_context_events_count` - кількість events
- `memory_context_summaries_count` - кількість summaries

---

## 2. Де збирати метрики

### 2.1. RAG Service

**Файл:** `services/rag-service/app/metrics.py`

```python
from prometheus_client import Counter, Histogram, Gauge

# Ingest metrics
ingest_total = Counter('rag_ingest_total', 'Total ingest operations')
ingest_duration = Histogram('rag_ingest_duration_seconds', 'Ingest duration')
ingest_documents = Counter('rag_ingest_documents_indexed', 'Documents indexed')
ingest_errors = Counter('rag_ingest_errors_total', 'Ingest errors')

# Query metrics
query_total = Counter('rag_query_total', 'Total queries')
query_duration = Histogram('rag_query_duration_seconds', 'Query duration')
query_documents = Histogram('rag_query_documents_retrieved', 'Documents retrieved')
query_citations = Histogram('rag_query_citations_count', 'Citations count')
query_errors = Counter('rag_query_errors_total', 'Query errors')
query_empty = Counter('rag_query_empty_results_total', 'Empty results')

# Quality metrics
query_dao_filter = Counter('rag_query_dao_filter_applied', 'DAO filter applied', ['dao_id'])
```

**Використання:**
- В `ingest_pipeline.py`: після успішного ingest
- В `query_pipeline.py`: після кожного query

### 2.2. Router

**Файл:** `metrics.py` (в корені Router)

```python
from prometheus_client import Counter, Histogram

rag_query_total = Counter('router_rag_query_total', 'Total RAG queries')
rag_query_duration = Histogram('router_rag_query_duration_seconds', 'RAG query duration')
rag_query_memory_used = Counter('router_rag_query_memory_used', 'Memory used in RAG queries')
rag_query_rag_used = Counter('router_rag_query_rag_used', 'RAG used in queries')
rag_query_fallback = Counter('router_rag_query_fallback_total', 'Fallback to Memory only')
```

**Використання:**
- В `router_app.py`: в `_handle_rag_query()`

---

## 3. Dashboard (Grafana)

### 3.1. Panels

**RAG Service:**
1. **Ingest Rate** - `rate(rag_ingest_total[5m])`
2. **Ingest Duration** - `histogram_quantile(0.95, rag_ingest_duration_seconds)`
3. **Documents Indexed** - `sum(rag_ingest_documents_indexed)`
4. **Query Rate** - `rate(rag_query_total[5m])`
5. **Query Duration** - `histogram_quantile(0.95, rag_query_duration_seconds)`
6. **Documents Retrieved** - `avg(rag_query_documents_retrieved)`
7. **Citations Count** - `avg(rag_query_citations_count)`
8. **Empty Results Rate** - `rate(rag_query_empty_results_total[5m]) / rate(rag_query_total[5m])`

**Router (RAG Query):**
1. **RAG Query Rate** - `rate(router_rag_query_total[5m])`
2. **RAG Query Duration** - `histogram_quantile(0.95, router_rag_query_duration_seconds)`
3. **Memory Usage Rate** - `rate(router_rag_query_memory_used[5m]) / rate(router_rag_query_total[5m])`
4. **RAG Usage Rate** - `rate(router_rag_query_rag_used[5m]) / rate(router_rag_query_total[5m])`
5. **Fallback Rate** - `rate(router_rag_query_fallback_total[5m]) / rate(router_rag_query_total[5m])`

**Memory Service:**
1. **Context Fetch Rate** - `rate(memory_context_fetch_total[5m])`
2. **Context Fetch Duration** - `histogram_quantile(0.95, memory_context_fetch_duration_seconds)`
3. **Average Facts Count** - `avg(memory_context_facts_count)`
4. **Average Events Count** - `avg(memory_context_events_count)`

### 3.2. Alerts

- **High Error Rate**: `rate(rag_query_errors_total[5m]) > 0.1`
- **Slow Queries**: `histogram_quantile(0.95, rag_query_duration_seconds) > 10`
- **High Fallback Rate**: `rate(router_rag_query_fallback_total[5m]) / rate(router_rag_query_total[5m]) > 0.2`
- **Empty Results**: `rate(rag_query_empty_results_total[5m]) / rate(rag_query_total[5m]) > 0.3`

---

## 4. Реалізація (мінімальна)

### 4.1. Додати Prometheus Client

**RAG Service:**
```bash
pip install prometheus-client
```

**Router:**
```bash
pip install prometheus-client
```

### 4.2. Expose Metrics Endpoint

**RAG Service:**
```python
# app/main.py
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from fastapi.responses import Response

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

**Router:**
```python
# http_api.py
@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

### 4.3. Docker Compose для Prometheus + Grafana

```yaml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## 5. Наступні кроки

1. Додати `prometheus-client` в requirements
2. Створити `metrics.py` в RAG Service та Router
3. Додати `/metrics` endpoints
4. Налаштувати Prometheus scraping
5. Створити Grafana dashboard
6. Налаштувати alerts

---

## 6. Корисні запити для аналізу

**Hit Rate (кількість успішних запитів з результатами):**
```
(rag_query_total - rag_query_empty_results_total) / rag_query_total
```

**Average Documents per Query:**
```
avg(rag_query_documents_retrieved)
```

**DAO Distribution:**
```
sum by (dao_id) (rag_query_dao_filter_applied)
```

**Token Usage:**
```
avg(router_rag_query_prompt_tokens_estimated)
```

