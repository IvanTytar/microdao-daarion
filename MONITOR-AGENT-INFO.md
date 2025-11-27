# Monitor Agent - Configuration & Knowledge Base

## Monitor Agent Configuration

### Model Information:
- **Model:** `local_qwen3_8b`
- **Backend:** `ollama` (local)
- **Node:** `node2`
- **Type:** System Agent (non-orchestrator)

### System Prompt:
Monitor Agent має доступ до:
- Real-time system data (node status, service health)
- Resource usage metrics
- Agent activity tracking
- Infrastructure health monitoring
- **Автоматичний збір знань** про проєкт з системних подій

---

## Knowledge Base

Monitor Agent автоматично збирає знання в свою базу знань:

### Current Knowledge Base Files:

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

---

## Automatic Knowledge Collection

Monitor Agent автоматично збирає знання з:

1. **System Events (EVENT_LOG):**
   - Node creation/status changes
   - Agent creation/updates
   - Service additions/changes
   - Swapper Service updates

2. **Agent Activities:**
   - Agent interactions
   - Task executions
   - Chat messages
   - System changes

3. **Node Status:**
   - Health checks
   - Resource usage
   - Service availability
   - Performance metrics

4. **Infrastructure Changes:**
   - Service deployments
   - Configuration updates
   - Model additions
   - Workspace changes

---

## Chat Interface

### Monitor Agent:
- **Плаваюче вікно чату** (384px × 600px) поверх всіх вікон
- Доступне з будь-якої сторінки через floating button
- z-index: 9999 (найвищий пріоритет)

### Other Agents:
- **Чат всередині кабінету** агента
- Розмір: 500px висота
- Інтегрований в кабінет агента

---

## API Endpoints

### Chat with Monitor Agent:
```http
POST /api/agent/monitor/chat
Content-Type: application/json

{
  "agent_id": "monitor",
  "message": "What is the current system status?"
}
```

### Get Monitor Agent Metrics:
```http
GET /api/agent/monitor/metrics
```

---

## Knowledge Base Updates

Monitor Agent оновлює базу знань автоматично при:
- Створенні нових агентів
- Зміні статусу нод
- Додаванні сервісів
- Виконанні задач
- Системних подіях

Всі події зберігаються в `EVENT_LOG` та автоматично додаються до knowledge base.

---

**Status:** ✅ Configured
**Model:** local_qwen3_8b (Ollama)
**Knowledge Collection:** ✅ Active
**Chat Interface:** ✅ Floating window (Monitor only)

