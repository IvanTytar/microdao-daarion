# Monitor Agent - Memory Integration Guide

## 📊 Статус Monitor Agent

### Деплой:
- ✅ **Задеплоєно:** Так
- **Node:** НОДА1 (node-1-hetzner-gex44)
- **Agent ID:** `agent-monitor`
- **Model:** `local_qwen3_8b`
- **Backend:** `local` (Ollama)
- **Status:** `active`
- **Type:** System Agent (Worker)

### Конфігурація:
- **Priority:** High
- **Category:** Core
- **Department:** Core
- **Workspace:** Не призначено (глобальний агент)

---

## 🧠 Пам'ять Monitor Agent

### Поточна пам'ять (Knowledge Base):

Monitor Agent автоматично збирає знання в файлову систему:

1. **system_metrics.json** (500 KB, live)
   - Real-time system metrics
   - Performance data
   - Resource usage statistics

2. **infrastructure_docs.md** (120 KB, vectorized)
   - Infrastructure documentation
   - System architecture
   - Service configurations

3. **agent_activities.log** (2.1 MB, live)
   - Agent activity logs
   - Task execution history
   - Agent interactions

4. **node_status_history.json** (850 KB, live)
   - Historical node statuses
   - Node health metrics
   - Status change events

5. **system_events.json** (1.2 MB, live)
   - System events log
   - Infrastructure changes
   - Service updates

### Автоматичний збір знань:

Monitor Agent автоматично збирає знання з:
- System Events (EVENT_LOG)
- Agent Activities
- Node Status
- Infrastructure Changes

---

## 🔗 Підключення пам'яті до Memory Service

### 1. Memory Service (PostgreSQL)

**Endpoint:** `http://localhost:5432` (PostgreSQL)
**Service:** `memory-service`

**Таблиці для Monitor Agent:**

```sql
-- Agent Memory Events
CREATE TABLE IF NOT EXISTS agent_memory_events (
    id UUID PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,  -- 'monitor'
    team_id VARCHAR(255) NOT NULL,    -- 'system' або 'global'
    channel_id VARCHAR(255),          -- NULL для системних подій
    user_id VARCHAR(255),              -- NULL для системних подій
    scope VARCHAR(50) DEFAULT 'long_term',  -- long_term для Monitor Agent
    kind VARCHAR(50) NOT NULL,         -- 'node_event', 'agent_event', 'system_event'
    body_text TEXT,
    body_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dialog Summaries (для збереження важливих подій)
CREATE TABLE IF NOT EXISTS dialog_summaries (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255) NOT NULL,    -- 'system'
    channel_id VARCHAR(255),          -- NULL
    agent_id VARCHAR(255),             -- 'monitor'
    user_id VARCHAR(255),              -- NULL
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
```

### 2. Vector Memory (Qdrant)

**Endpoint:** `http://localhost:6333`
**Use Case:** Fast RAG for system events and agent activities

**Collections для Monitor Agent:**
- `monitor_system_events` - системні події
- `monitor_node_changes` - зміни в нодах
- `monitor_agent_changes` - зміни в агентах
- `monitor_infrastructure` - зміни інфраструктури

### 3. Long-Range Memory (Milvus)

**Endpoint:** `http://localhost:19530`
**Use Case:** Heavy vector indexing for large memory

**Collections для Monitor Agent:**
- `monitor_historical_metrics` - історичні метрики
- `monitor_agent_activities` - активності агентів
- `monitor_node_history` - історія нод

### 4. Graph Memory (Neo4j)

**Endpoint:** `http://localhost:7474`
**Bolt:** `bolt://localhost:7687`
**Use Case:** Relations between agents, nodes, events, and changes

**Graph Structure:**
```
(Node)-[:MONITORED_BY]->(MonitorAgent)
(Node)-[:HAS_EVENT]->(SystemEvent)
(Agent)-[:CREATED_ON]->(Node)
(Agent)-[:HAS_ACTIVITY]->(Activity)
(SystemEvent)-[:AFFECTS]->(Node)
(SystemEvent)-[:AFFECTS]->(Agent)
```

### 5. RAG Router

**Endpoint:** `http://localhost:9401`
**Use Case:** Intelligent routing between Qdrant, Milvus, and Neo4j

**Routing Rules для Monitor Agent:**
- Graph queries → Neo4j
- Fast lookups (limit <= 50) → Qdrant
- Heavy searches (limit > 50) → Milvus
- Historical data → Milvus
- Relations → Neo4j

---

## 🔧 Інтеграція Monitor Agent з Memory Service

### API Endpoints для збереження подій:

#### 1. Збереження події ноди:

```http
POST /api/memory/agent-events
Content-Type: application/json

{
  "agent_id": "monitor",
  "team_id": "system",
  "scope": "long_term",
  "kind": "node_event",
  "body_text": "Node node-1-hetzner-gex44 status changed to online",
  "body_json": {
    "node_id": "node-1-hetzner-gex44",
    "node_name": "НОДА1",
    "event_type": "status_changed",
    "old_status": "offline",
    "new_status": "online",
    "timestamp": "2025-01-27T10:30:00Z",
    "metrics": {
      "cpu_usage": 45,
      "memory_usage": 62,
      "disk_usage": 38
    }
  }
}
```

#### 2. Збереження події агента:

```http
POST /api/memory/agent-events
Content-Type: application/json

{
  "agent_id": "monitor",
  "team_id": "system",
  "scope": "long_term",
  "kind": "agent_event",
  "body_text": "Agent agent-solarius created on node-2",
  "body_json": {
    "agent_id": "agent-solarius",
    "agent_name": "Solarius",
    "event_type": "created",
    "node_id": "node-2",
    "model": "deepseek-r1:70b",
    "backend": "ollama",
    "timestamp": "2025-01-27T10:30:00Z"
  }
}
```

#### 3. Збереження системної події:

```http
POST /api/memory/agent-events
Content-Type: application/json

{
  "agent_id": "monitor",
  "team_id": "system",
  "scope": "long_term",
  "kind": "system_event",
  "body_text": "Swapper Service updated on node-1",
  "body_json": {
    "service": "swapper",
    "node_id": "node-1",
    "event_type": "swapper_updated",
    "active_model": "deepseek-r1:70b",
    "timestamp": "2025-01-27T10:30:00Z"
  }
}
```

---

## 📝 Автоматичне збереження подій

### Інтеграція з WebSocket Events:

Monitor Agent автоматично зберігає всі події з `/ws/events` в Memory Service:

```typescript
// При отриманні події через WebSocket
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  
  // Збереження в Memory Service
  await fetch('/api/memory/agent-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: 'monitor',
      team_id: 'system',
      scope: 'long_term',
      kind: `${data.type}_event`,  // node_event, agent_event, system_event
      body_text: data.message,
      body_json: {
        ...data.details,
        timestamp: data.timestamp,
        event_type: data.action
      }
    })
  });
  
  // Збереження в Vector DB (Qdrant)
  await fetch('/api/rag/vectorize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      collection: `monitor_${data.type}_events`,
      text: data.message,
      metadata: {
        agent_id: 'monitor',
        event_type: data.action,
        timestamp: data.timestamp,
        ...data.details
      }
    })
  });
  
  // Збереження в Graph DB (Neo4j)
  await fetch('/api/graph/create-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: data.action,
      node_id: data.details?.node_id,
      agent_id: data.details?.agent_id,
      timestamp: data.timestamp,
      metadata: data.details
    })
  });
};
```

---

## 🔍 Запити до пам'яті Monitor Agent

### 1. Отримати історію змін ноди:

```http
GET /api/memory/agent-events?agent_id=monitor&kind=node_event&body_json->>node_id=node-1-hetzner-gex44
```

### 2. Отримати історію змін агента:

```http
GET /api/memory/agent-events?agent_id=monitor&kind=agent_event&body_json->>agent_id=agent-solarius
```

### 3. Пошук через RAG:

```http
POST /api/rag/search
Content-Type: application/json

{
  "query": "What changes were made to node-1 in the last 24 hours?",
  "collections": ["monitor_node_changes"],
  "limit": 10
}
```

### 4. Графовий запит:

```http
POST /api/graph/query
Content-Type: application/json

{
  "query": "MATCH (n:Node {id: 'node-1-hetzner-gex44'})-[:HAS_EVENT]->(e:SystemEvent) RETURN e ORDER BY e.timestamp DESC LIMIT 10"
}
```

---

## 🚀 Наступні кроки

1. ✅ Створити API endpoints для збереження подій
2. ✅ Інтегрувати з WebSocket events
3. ✅ Налаштувати автоматичне збереження в Qdrant, Milvus, Neo4j
4. ✅ Додати RAG Router для інтелектуального пошуку
5. ✅ Створити dashboard для перегляду пам'яті Monitor Agent

---

**Status:** ⏳ Потрібна інтеграція
**Priority:** High
**Node:** НОДА1 (node-1-hetzner-gex44)

