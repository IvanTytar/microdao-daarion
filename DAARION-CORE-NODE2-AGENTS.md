# ✅ DAARION Core - 50 агентів з НОДА2

**Дата:** 2025-11-23  
**Сторінка:** `http://localhost:8899/microdao/daarion`  
**Статус:** ✅ Підключено до НОДА2

---

## 🔄 Що змінено

### Було (помилково):
- DAARION завантажував агенти з **НОДА1** (7 агентів)
- Використовувались агенти для GREENFOOD, Helion, тощо

### Стало (правильно):
- DAARION завантажує агенти з **НОДА2** (50 агентів)
- Це команда агентів DAARION Core

---

## 📊 Структура агентів НОДА2

### System Agents (10):
1. Monitor Agent (НОДА2)
2. Memory Service Agent
3. RAG Service Agent
4. Vector DB Agent
5. Grafana Monitor
6. NATS Messaging Agent
7. PostgreSQL DB Agent
8. STT Service Agent
9. Image Generation Agent
10. System Health Agent

### Domain Agents (40):
- Product Management (4 агенти)
- Finance & Pricing (4 агенти)
- Marketing & SMM (4 агенти)
- Analytics & BI (4 агенти)
- Compliance & Audit (4 агенти)
- Customer Care (4 агенти)
- Logistics & Delivery (4 агенти)
- Warehouse Management (4 агенти)
- Vendor Success (4 агенти)
- Batch Quality (4 агенти)

**Всього:** 50 агентів

---

## 🛠️ Зміни в коді

### 1. Додано імпорт NODE2 агентів

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` (рядок 8)

```typescript
import { getNode1Agents, type Node1Agent } from '../api/node1Agents';
import { getNode2Agents, type Node2Agent } from '../api/node2Agents';
```

---

### 2. Додано useQuery для НОДА2

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` (рядки 207-221)

```typescript
// Отримуємо агентів з НОДИ2 для DAARION Core (50 агентів)
const { data: node2AgentsData } = useQuery({
  queryKey: ['node2-agents-for-microdao'],
  queryFn: async () => {
    try {
      return await getNode2Agents();
    } catch (error) {
      console.error('Error fetching node2 agents:', error);
      return null;
    }
  },
  staleTime: 60000,
  gcTime: 300000,
  refetchOnWindowFocus: false,
  retry: false,
});
```

---

### 3. Оновлено пошук оркестратора

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` (рядки 223-260)

**Було:**
```typescript
const orchestratorFromNode1 = useMemo(() => {
  // Шукали тільки в НОДА1
}, [node1AgentsData, orchestratorAgentId, orchestratorMapping]);
```

**Стало:**
```typescript
const orchestratorFromNodes = useMemo(() => {
  if (!orchestratorAgentId) {
    console.log('❌ No orchestratorAgentId:', orchestratorAgentId);
    return undefined;
  }
  
  // Для DAARION шукаємо в НОДА2 (daarwizz)
  if (orchestratorAgentId === 'daarwizz' && node2AgentsData?.items) {
    const found = node2AgentsData.items.find(
      (agent: Node2Agent) => 
        agent.id === 'agent-daarwizz' || 
        agent.id === 'daarwizz' ||
        agent.name.toLowerCase().includes('daarwizz')
    );
    if (found) {
      console.log('🔍 Found orchestrator from NODE2:', found.name);
      return found;
    }
  }
  
  // Для інших мікроДАО (GREENFOOD, Helion) шукаємо в НОДА1
  if (node1AgentsData?.items) {
    const found = node1AgentsData.items.find(/* ... */);
    if (found) {
      console.log('🔍 Found orchestrator from NODE1:', found.name);
      return found;
    }
  }
  
  console.log('❌ Orchestrator NOT FOUND for:', orchestratorAgentId);
  return undefined;
}, [node1AgentsData, node2AgentsData, orchestratorAgentId, orchestratorMapping]);
```

**Ключова логіка:**
1. Якщо `orchestratorAgentId === 'daarwizz'` → шукати в НОДА2
2. Інакше → шукати в НОДА1

---

### 4. Оновлено об'єднання агентів

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` (рядки 262-320)

**Було:**
```typescript
const allAgents = useMemo(() => {
  // Завжди використовували НОДА1
  if (baseAgents.length === 0 && node1AgentsData?.items) {
    return node1AgentsData.items.map(/* ... */);
  }
}, [agentsData?.items, orchestratorFromNode1, node1AgentsData?.items]);
```

**Стало:**
```typescript
const allAgents = useMemo(() => {
  const baseAgents = agentsData?.items || [];
  
  console.log('🔄 Combining agents:', {
    baseAgents: baseAgents.length,
    hasOrchestrator: !!orchestratorFromNodes,
    orchestratorName: orchestratorFromNodes?.name,
    totalNode1Agents: node1AgentsData?.items?.length || 0,
    totalNode2Agents: node2AgentsData?.items?.length || 0,
    microDaoId,
  });
  
  // Для DAARION використовуємо агенти з НОДА2 (50 агентів)
  if (baseAgents.length === 0 && microDaoId === 'daarion-dao' && node2AgentsData?.items) {
    console.log('✅ Using NODE2 agents for DAARION Core (50 agents)');
    return node2AgentsData.items.map((agent: Node2Agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role || 'Агент',
      language: 'uk',
      focus: agent.category || agent.department || 'Core',
      enabled: agent.status === 'active' || agent.deployment_status?.deployed === true,
      type: (agent.type || 'worker') as 'worker' | 'orchestrator',
      node2Agent: agent,
    }));
  }
  
  // Для інших мікроДАО використовуємо агенти з НОДА1
  if (baseAgents.length === 0 && node1AgentsData?.items) {
    console.log('✅ Using NODE1 agents as fallback');
    return node1AgentsData.items.map(/* ... */);
  }
  
  // ... додавання оркестратора
  
  return baseAgents;
}, [agentsData?.items, orchestratorFromNodes, node1AgentsData?.items, node2AgentsData?.items, microDaoId]);
```

**Ключова логіка:**
1. Якщо `microDaoId === 'daarion-dao'` → використати НОДА2 агенти
2. Інакше → використати НОДА1 агенти

---

## 🎯 Розподіл агентів по мікроДАО

### DAARION Core (`daarion-dao`):
- **Нода:** НОДА2 (MacBook M4 Max)
- **Агенти:** 50
- **Оркестратор:** Daarwizz (з НОДА2)
- **Модель:** `gpt-oss:latest`, `mistral-nemo:12b`, `qwen2.5:3b`, тощо

### GREENFOOD (`greenfood-dao`):
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 13
- **Оркестратор:** GREENFOOD Assistant (з НОДА1)
- **CrewAI:** ✅ Enabled

### ENERGY UNION (`energy-union-dao`):
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 1 (Helion)
- **Оркестратор:** Helion (з НОДА1)
- **CrewAI:** ❌ Disabled

### Yaromir (`yaromir-dao`):
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 5 (Yaromir + 4 субагенти)
- **Оркестратор:** Yaromir (з НОДА1)
- **CrewAI:** ✅ Enabled

---

## 🧪 Тестування

### 1. Відкрити DAARION Core

```
http://localhost:8899/microdao/daarion
```

### 2. Перевірити консоль браузера (F12)

**Має бути:**
```
✅ Using NODE2 agents for DAARION Core (50 agents)
🔍 Found orchestrator from NODE2: Daarwizz
🔄 Combining agents: {
  baseAgents: 0,
  totalNode1Agents: 7,
  totalNode2Agents: 50,
  microDaoId: 'daarion-dao'
}
```

### 3. Перевірити вкладку "Агенти"

**Має відображатися 50 агентів:**

**System (10):**
- Monitor Agent (НОДА2)
- Memory Service Agent
- RAG Service Agent
- Vector DB Agent
- Grafana Monitor
- NATS Messaging Agent
- PostgreSQL DB Agent
- STT Service Agent
- Image Generation Agent
- System Health Agent

**Domain (40):**
- Product Management агенти
- Finance & Pricing агенти
- Marketing & SMM агенти
- Analytics & BI агенти
- Compliance & Audit агенти
- Customer Care агенти
- Logistics & Delivery агенти
- Warehouse Management агенти
- Vendor Success агенти
- Batch Quality агенти

---

## 📊 Порівняння NODE1 vs NODE2

### НОДА1 (Hetzner GEX44):
- **Агенти:** 7 (Core + Orchestrators)
- **GPU:** NVIDIA RTX 4000 SFF Ada (20 GB VRAM)
- **Роль:** Production, Orchestrators
- **МікроДАО:** GREENFOOD, ENERGY UNION, Yaromir

### НОДА2 (MacBook M4 Max):
- **Агенти:** 50 (System + Domain)
- **GPU:** Apple M4 Max (40-core, 48 GB Unified Memory)
- **Роль:** Development, DAARION Core
- **МікроДАО:** DAARION

---

## 🔧 API Endpoints

### NODE1 Agents:
```
GET http://144.76.224.179:8899/api/agents
Response: { agents: Node1Agent[] } (7 agents)
```

### NODE2 Agents:
```
GET http://localhost:8899/api/agents
Response: { agents: Node2Agent[] } (50 agents)
```

**Fallback:** Якщо API не працює, використовуються статичні списки з:
- `src/api/node1Agents.ts` → `ALL_NODE1_AGENTS`
- `src/api/node2Agents.ts` → `ALL_NODE2_AGENTS`

---

## ✅ Чекліст

- [x] Додано імпорт `getNode2Agents` та `Node2Agent`
- [x] Додано `useQuery` для НОДА2 агентів
- [x] Оновлено `orchestratorFromNodes` для пошуку в обох нодах
- [x] Додано логіку вибору ноди за `microDaoId`
- [x] Додано логування для діагностики
- [x] Оновлено `useMemo` dependencies
- [x] Протестовано на `http://localhost:8899/microdao/daarion`
- [ ] Перевірено на інших мікроДАО (GREENFOOD, ENERGY UNION)
- [ ] Додано реальні метрики агентів з НОДА2
- [ ] Інтеграція з CrewAI для DAARION команди

---

**СТАТУС:** ✅ ГОТОВО  
**Тестуйте:** `http://localhost:8899/microdao/daarion`  
**Консоль:** F12 → Console → Шукайте `✅ Using NODE2 agents for DAARION Core (50 agents)`

**Очікувана кількість агентів:** 50 (з НОДА2)

