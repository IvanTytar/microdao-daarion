# 📊 Архітектура потоків даних Monitor Agent

**Дата:** 2025-11-23  
**Статус:** ✅ Всі потоки даних працюють

---

## 🎯 Загальна архітектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    ДЖЕРЕЛА ДАНИХ                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. WebSocket події (ws://localhost:8899/ws/events)              │
│    - node_event, agent_event, system_event, project_event       │
│                                                                  │
│ 2. Project Changes (projectChangeTracker)                       │
│    - file, config, service, agent, deployment, git changes      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ОБРОБКА ТА ЗБЕРЕЖЕННЯ                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. Загальний Monitor Agent (DAARION)                     │  │
│  │    - Отримує ВСІ події з усіх джерел                     │  │
│  │    - Генерує повідомлення через mistral-nemo:12b        │  │
│  │    - Зберігає в загальну пам'ять: monitor                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 2. Memory Service (PostgreSQL)                           │  │
│  │                                                           │  │
│  │  Подвійне збереження:                                    │  │
│  │  ├── Специфічна пам'ять:                                 │  │
│  │  │   - monitor-node-{node_id}                            │  │
│  │  │   - monitor-microdao-{microdao_id}                    │  │
│  │  │                                                         │  │
│  │  └── Загальна пам'ять:                                    │  │
│  │      - monitor (ВСІ події з усіх нод та мікроДАО)         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              ВІДОБРАЖЕННЯ В ЧАТАХ                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MonitorChat (Глобальний)                                 │  │
│  │ - Показує ВСІ події (не фільтрує)                         │  │
│  │ - Розташований на всіх сторінках                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ NodeMonitorChat (Кабінети НОД)                           │  │
│  │ - Фільтрує події по node_id                               │  │
│  │ - Показує тільки події для конкретної НОДИ                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MicroDaoMonitorChat (Кабінети мікроДАО)                  │  │
│  │ - Фільтрує події по microdao_id                           │  │
│  │ - Показує тільки події для конкретного мікроДАО           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ DaarionMonitorChat (Кабінет DAARION)                     │  │
│  │ - Показує ВСІ події (агрегація)                           │  │
│  │ - Аналогічно MonitorChat                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📥 1. Надходження даних до загального Monitor Agent (DAARION)

### Джерела даних:

#### A. WebSocket події (`useMonitorEvents`)

**Файл:** `src/hooks/useMonitorEvents.ts`

```typescript
// WebSocket підключення
const ws = new WebSocket('ws://localhost:8899/ws/events');

// Отримання події
ws.onmessage = async (event) => {
  const monitorEvent: MonitorEvent = {
    timestamp: data.timestamp,
    type: data.type, // 'agent' | 'node' | 'system' | 'project'
    action: data.action,
    message: data.message,
    details: data.details,
    node_id: data.node_id,
  };
  
  // Збереження в пам'ять (батчинг)
  await addMonitorEventToBatch(nodeId, {
    kind: eventKind,
    body_text: monitorEvent.message,
    body_json: { ...monitorEvent.details }
  });
};
```

**Що надходить:**
- Події з нод (node_event)
- Події з агентів (agent_event)
- Системні події (system_event)
- Події проєкту (project_event)

#### B. Project Changes (`projectChangeTracker`)

**Файл:** `src/services/projectChangeTracker.ts`

```typescript
// Відстеження змін проєкту
private async generateMonitorMessage(change: ProjectChange) {
  const baseMessage = this.formatChangeMessage(change);
  const monitorMessage = `🤖 **Monitor Agent повідомляє:**\n\n${baseMessage}`;
  
  // Збереження в пам'ять Monitor Agent
  await this.saveToMonitorMemory(change, monitorMessage);
  
  // Відправка події для відображення в чаті
  this.emitChangeEvent(monitorMessage, change);
  
  // Генерація через API (асинхронно)
  await this.tryGenerateViaAPI(change, baseMessage);
}
```

**Що надходить:**
- Зміни файлів (file)
- Зміни конфігурацій (config)
- Зміни сервісів (service)
- Зміни агентів (agent)
- Деплойменти (deployment)
- Git коміти (git)

### Обробка загальним Monitor Agent:

**Файл:** `services/monitor-agent-service/app/main.py`

```python
# Загальний Monitor Agent отримує контекст з загальної пам'яті
async def get_monitor_memory_context(
    node_id: Optional[str] = None,
    microdao_id: Optional[str] = None,
    limit: int = 10
) -> str:
    # 1. Загальна пам'ять (для всіх Monitor Agent)
    response = await client.get(
        f"{MEMORY_SERVICE_URL}/agents/monitor/memory",
        params={"limit": limit // 2}
    )
    
    # 2. Специфічна пам'ять (якщо вказана)
    if node_id:
        agent_id = f"monitor-node-{node_id}"
    elif microdao_id:
        agent_id = f"monitor-microdao-{microdao_id}"
    
    # Генерація відповіді через mistral-nemo:12b
    response = await client.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={"model": "mistral-nemo:12b", "prompt": full_prompt}
    )
```

**Результат:**
- ✅ Загальний Monitor Agent отримує ВСІ події
- ✅ Генерує повідомлення через LLM
- ✅ Зберігає в загальну пам'ять `monitor`

---

## 💾 2. Збереження в загальну пам'ять агентів Monitor сервісу

### Архітектура збереження:

**Файл:** `services/memory-service/app/monitor_events.py`

```python
async def save_monitor_events_batch(
    batch: MonitorEventBatch,
    db: Session
) -> MonitorEventResponse:
    # Визначаємо специфічний agent_id
    specific_agent_id = f"monitor-node-{batch.node_id}"
    
    # Загальний agent_id для всіх Monitor Agent
    global_agent_id = "monitor"
    
    for event_data in batch.events:
        # 1. Зберегти в специфічну пам'ять
        specific_event = AgentMemoryEventCreate(
            agent_id=specific_agent_id,  # monitor-node-{node_id}
            body_text=event_data.get("body_text", ""),
            body_json=event_data.get("body_json", {})
        )
        create_agent_memory_event(db, specific_event)
        
        # 2. Зберегти в загальну пам'ять
        global_event = AgentMemoryEventCreate(
            agent_id=global_agent_id,  # monitor
            body_text=event_data.get("body_text", ""),
            body_json={
                **event_data.get("body_json", {}),
                "source_node": batch.node_id,  # Додаємо джерело
                "specific_agent_id": specific_agent_id
            }
        )
        create_agent_memory_event(db, global_event)
```

### Структура пам'яті:

#### A. Специфічна пам'ять (для кожної НОДИ/мікроДАО):

```
monitor-node-node-1
  ├── Події з НОДА1
  └── Зберігається в таблиці agent_memory_events

monitor-node-node-2
  ├── Події з НОДА2
  └── Зберігається в таблиці agent_memory_events

monitor-microdao-daarion-dao
  ├── Події з DAARION MicroDAO
  └── Зберігається в таблиці agent_memory_events
```

#### B. Загальна пам'ять (для всіх Monitor Agent):

```
monitor
  ├── ВСІ події з усіх НОД та мікроДАО
  ├── body_json.source_node - джерело події
  ├── body_json.specific_agent_id - специфічний agent_id
  └── Зберігається в таблиці agent_memory_events
```

### Батчинг для оптимізації:

**Файл:** `src/api/monitorMemory.ts`

```typescript
// Батч для збереження подій
const BATCH_SIZE = 10; // Зберігати батч кожні 10 подій
const BATCH_TIMEOUT = 5000; // Або кожні 5 секунд

export async function addMonitorEventToBatch(
  nodeId: string,
  event: Omit<MonitorEvent, 'node_id'>
): Promise<void> {
  eventBatch.push(fullEvent);
  
  // Якщо батч досяг розміру, зберігаємо
  if (eventBatch.length >= BATCH_SIZE) {
    await flushMonitorEventBatch();
  }
}
```

**Результат:**
- ✅ Подвійне збереження: специфічна + загальна пам'ять
- ✅ Батчинг для оптимізації (10 подій або 5 секунд)
- ✅ Всі події доступні в загальній пам'яті `monitor`

---

## 💬 3. Відображення повідомлень у власних чатах кожного агента

### Архітектура відображення:

#### A. MonitorChat (Глобальний - ВСІ події)

**Файл:** `src/components/monitor/MonitorChat.tsx`

```typescript
export function MonitorChat() {
  const { events, isConnected } = useMonitorEvents();
  
  // Додаємо події від Monitor Agent як повідомлення
  // Головний MonitorChat показує ВСІ події (не фільтрує)
  useEffect(() => {
    if (events.length > 0 && isOpen) {
      events.forEach((event) => {
        const eventMessage: ChatMessage = {
          id: `event-${event.timestamp}-${event.action}`,
          role: 'assistant',
          content: `📊 ${getEventIcon(event.type)} ${event.message}`,
          timestamp: event.timestamp,
        };
        
        setMessages((prev) => {
          const newMessages = [...prev, eventMessage];
          return newMessages.slice(-100); // Максимум 100 повідомлень
        });
      });
    }
  }, [events, isOpen]);
}
```

**Де відображається:**
- ✅ Всі сторінки (через `App.tsx`)
- ✅ Показує ВСІ події з усіх НОД та мікроДАО
- ✅ Не фільтрує події

#### B. NodeMonitorChat (Кабінети НОД - фільтр по node_id)

**Файл:** `src/components/monitor/NodeMonitorChat.tsx`

```typescript
export function NodeMonitorChat({ nodeId, nodeName }: NodeMonitorChatProps) {
  const { events, isConnected } = useMonitorEvents();
  
  // Фільтруємо події тільки для цієї ноди
  const nodeEvents = events.filter(event => event.node_id === nodeId);
  
  // Додаємо події від Monitor Agent як повідомлення
  useEffect(() => {
    if (nodeEvents.length > 0 && isOpen) {
      const latestEvent = nodeEvents[0];
      const eventMessage: ChatMessage = {
        id: `event-${latestEvent.timestamp}`,
        role: 'assistant',
        content: `📊 ${getEventIcon(latestEvent.type)} ${latestEvent.message}`,
        timestamp: latestEvent.timestamp,
      };
      
      setMessages((prev) => {
        const newMessages = [...prev, eventMessage];
        return newMessages.slice(-50); // Максимум 50 повідомлень
      });
    }
  }, [nodeEvents, isOpen]);
}
```

**Де відображається:**
- ✅ Кабінет НОДА1 (`/nodes/node-1-hetzner-gex44`)
- ✅ Кабінет НОДА2 (`/nodes/node-2-macbook-m4max`)
- ✅ Показує тільки події для конкретної НОДИ
- ✅ Фільтрує по `node_id`

#### C. MicroDaoMonitorChat (Кабінети мікроДАО - фільтр по microdao_id)

**Файл:** `src/components/monitor/MicroDaoMonitorChat.tsx`

```typescript
export function MicroDaoMonitorChat({ microDaoId, microDaoName }: MicroDaoMonitorChatProps) {
  const { events, isConnected } = useMonitorEvents();
  
  // Фільтруємо події тільки для цього мікроДАО
  const microDaoEvents = events.filter(event => 
    event.details?.team_id === microDaoId || 
    event.details?.microdao_id === microDaoId
  );
  
  // Додаємо події від Monitor Agent як повідомлення
  useEffect(() => {
    if (microDaoEvents.length > 0 && isOpen) {
      const latestEvent = microDaoEvents[0];
      const eventMessage: ChatMessage = {
        id: `event-${latestEvent.timestamp}`,
        role: 'assistant',
        content: `📊 ${getEventIcon(latestEvent.type)} ${latestEvent.message}`,
        timestamp: latestEvent.timestamp,
      };
      
      setMessages((prev) => {
        const newMessages = [...prev, eventMessage];
        return newMessages.slice(-50); // Максимум 50 повідомлень
      });
    }
  }, [microDaoEvents, isOpen]);
}
```

**Де відображається:**
- ✅ Кабінет DAARION MicroDAO (`/microdao/daarion`)
- ✅ Кабінет GREENFOOD MicroDAO (`/microdao/greenfood`)
- ✅ Кабінет ENERGY UNION MicroDAO (`/microdao/energy-union`)
- ✅ Показує тільки події для конкретного мікроДАО
- ✅ Фільтрує по `microdao_id` або `team_id`

#### D. DaarionMonitorChat (Кабінет DAARION - ВСІ події)

**Файл:** `src/components/monitor/DaarionMonitorChat.tsx`

```typescript
export function DaarionMonitorChat() {
  const { events, isConnected } = useMonitorEvents();
  
  // DaarionMonitorChat показує ВСІ події (агрегація з усіх НОД та мікроДАО)
  // Аналогічно MonitorChat, але в кабінеті DAARION
}
```

**Де відображається:**
- ✅ Кабінет DAARION (`/microdao/daarion`)
- ✅ Показує ВСІ події (агрегація)
- ✅ Аналогічно MonitorChat

#### E. DagiMonitorPage (Головна сторінка моніторингу)

**Файл:** `src/pages/DagiMonitorPage.tsx`

```typescript
export function DagiMonitorPage() {
  const { events, isConnected } = useMonitorEvents();
  
  // Конвертуємо MonitorEvent в ProjectChange для генерації повідомлень
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[0];
      
      // Конвертуємо подію в ProjectChange
      const projectChange: ProjectChange = {
        id: `change-${latestEvent.timestamp}`,
        type: latestEvent.type,
        action: latestEvent.action,
        path: latestEvent.details?.path || '',
        description: latestEvent.message,
        timestamp: latestEvent.timestamp,
        details: {
          node_id: latestEvent.node_id,
          ...latestEvent.details,
        },
      };
      
      // Додаємо до projectChangeTracker для генерації повідомлення
      projectChangeTracker.addChange(projectChange);
    }
  }, [events]);
  
  // Обробник подій про зміни проєкту (повідомлення від Monitor Agent)
  useEffect(() => {
    const handleProjectChange = (customEvent: CustomEvent) => {
      const changeMessage = customEvent.detail as ProjectChange;
      const message = changeMessage.description || '';
      
      // Додаємо повідомлення в чат
      const monitorMessage = `🤖 **Monitor Agent повідомляє:**\n\n${message}`;
      
      setMessages((prev) => {
        const newMessages = [{
          id: changeMessage.id,
          role: 'assistant',
          content: monitorMessage,
          timestamp: changeMessage.timestamp,
        }, ...prev]; // Нові повідомлення зверху
        
        return newMessages.slice(0, 100);
      });
    };
    
    window.addEventListener('project-change', handleProjectChange);
    return () => window.removeEventListener('project-change', handleProjectChange);
  }, []);
}
```

**Де відображається:**
- ✅ Головна сторінка моніторингу (`/dagi-monitor`)
- ✅ Показує ВСІ події
- ✅ Генерує повідомлення через Monitor Agent API

---

## 🔄 Повний потік даних

### Приклад: Подія з НОДА1

```
1. WebSocket подія надходить
   └─> useMonitorEvents отримує подію
       └─> addMonitorEventToBatch(node-1, event)
           └─> flushMonitorEventBatch()
               └─> POST /api/memory/monitor-events/batch
                   └─> Memory Service зберігає:
                       ├── monitor-node-node-1 (специфічна пам'ять)
                       └── monitor (загальна пам'ять)

2. Project Change надходить
   └─> projectChangeTracker.addChange(change)
       └─> generateMonitorMessage(change)
           ├── saveToMonitorMemory() → POST /api/agent/monitor/memory
           │   └─> Memory Service зберігає в monitor
           └── emitChangeEvent() → CustomEvent('project-change')
               └─> Відображається в чатах

3. Відображення в чатах
   ├── MonitorChat (глобальний)
   │   └─> Показує подію (не фільтрує)
   │
   ├── NodeMonitorChat (кабінет НОДА1)
   │   └─> Фільтрує по node_id === 'node-1'
   │       └─> Показує подію
   │
   ├── NodeMonitorChat (кабінет НОДА2)
   │   └─> Фільтрує по node_id === 'node-2'
   │       └─> НЕ показує подію (інша нода)
   │
   └── MicroDaoMonitorChat (кабінети мікроДАО)
       └─> Фільтрує по microdao_id
           └─> Показує тільки події для конкретного мікроДАО
```

---

## ✅ Підсумок

### 1. Загальний Monitor Agent (DAARION)

✅ **Отримує:**
- ВСІ WebSocket події з усіх НОД та мікроДАО
- ВСІ Project Changes з проєкту
- Контекст з загальної пам'яті `monitor`

✅ **Генерує:**
- Повідомлення через `mistral-nemo:12b`
- Зберігає в загальну пам'ять `monitor`

### 2. Загальна пам'ять агентів Monitor сервісу

✅ **Зберігає:**
- Подвійне збереження:
  - Специфічна пам'ять: `monitor-node-{node_id}` або `monitor-microdao-{microdao_id}`
  - Загальна пам'ять: `monitor` (ВСІ події)

✅ **Оптимізація:**
- Батчинг: 10 подій або 5 секунд
- Автоматичне збереження

### 3. Власні чати кожного агента

✅ **MonitorChat (Глобальний):**
- Показує ВСІ події
- Розташований на всіх сторінках

✅ **NodeMonitorChat (Кабінети НОД):**
- Фільтрує по `node_id`
- Показує тільки події для конкретної НОДИ

✅ **MicroDaoMonitorChat (Кабінети мікроДАО):**
- Фільтрує по `microdao_id` або `team_id`
- Показує тільки події для конкретного мікроДАО

✅ **DaarionMonitorChat (Кабінет DAARION):**
- Показує ВСІ події (агрегація)

✅ **DagiMonitorPage (Головна сторінка):**
- Показує ВСІ події
- Генерує повідомлення через Monitor Agent API

---

**Статус:** ✅ Всі потоки даних працюють правильно  
**Збереження:** ✅ Подвійне збереження працює  
**Відображення:** ✅ Всі чати показують відповідні події

