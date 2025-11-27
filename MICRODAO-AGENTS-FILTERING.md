# ✅ Фільтрація агентів за мікроДАО

**Дата:** 2025-11-23  
**Статус:** ✅ Реалізовано чітку фільтрацію агентів

---

## 🎯 Проблема

**Було:**
- GREENFOOD показував **всі** агенти з НОДА1 (7 агентів)
- Не було фільтрації за належністю до мікроДАО

**Потрібно:**
- GREENFOOD → **ТІЛЬКИ** 13 GREENFOOD агентів
- ENERGY UNION → **ТІЛЬКИ** Helion
- Yaromir → **ТІЛЬКИ** Yaromir команда (5 агентів)
- DAARION → **ВСІ інші** агенти (50 з НОДА2 + залишок з НОДА1)

---

## 📊 Структура мікроДАО (4 штуки)

### 1. DAARION (`daarion-dao`)
- **Оркестратор:** Daarwizz
- **Нода:** НОДА2 (MacBook M4 Max)
- **Агенти:** 50 з НОДА2 + решта з НОДА1, які не належать іншим мікроДАО
- **Логіка:** За замовчуванням - всі агенти, які не мають явної належності до інших мікроДАО

### 2. GREENFOOD (`greenfood-dao`)
- **Оркестратор:** GREENFOOD Assistant
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 13 (12 sub-agents + 1 orchestrator)
- **Фільтр:** `department === 'GreenFood'` або `category === 'GreenFood'`

### 3. ENERGY UNION (`energy-union-dao`)
- **Оркестратор:** Helion
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 1 (тільки Helion)
- **Фільтр:** `id === 'agent-helion'` або `department === 'Energy'`

### 4. Yaromir (`yaromir-dao`)
- **Оркестратор:** Yaromir
- **Нода:** НОДА1 (Hetzner GEX44)
- **Агенти:** 5 (Yaromir + Вождь, Проводник, Домир, Создатель)
- **Фільтр:** `id.includes('yaromir')` або `id.includes('vozhd')`, `'provodnik'`, `'domir'`, `'sozdatel'`

---

## 🛠️ Реалізація

### 1. Додано функцію `getAgentMicroDao()`

**Файл:** `src/utils/agentMicroDaoMapping.ts` (рядки 100-130)

```typescript
/**
 * Визначити чи агент належить конкретному мікроДАО
 */
export function getAgentMicroDao(agent: { id: string; department?: string; category?: string }): string | null {
  // 1. GREENFOOD - department: 'GreenFood'
  if (agent.department === 'GreenFood' || agent.category === 'GreenFood') {
    return 'greenfood-dao';
  }
  
  // 2. ENERGY UNION - Helion
  if (agent.id === 'agent-helion' || agent.department === 'Energy') {
    return 'energy-union-dao';
  }
  
  // 3. Yaromir - Yaromir та його команда
  if (agent.id.includes('yaromir') || agent.id.includes('vozhd') || 
      agent.id.includes('provodnik') || agent.id.includes('domir') || 
      agent.id.includes('sozdatel')) {
    return 'yaromir-dao';
  }
  
  // 4. DAARION - всі інші агенти за замовчуванням
  return 'daarion-dao';
}
```

**Логіка:**
1. Перевіряємо `department` та `category` для GREENFOOD
2. Перевіряємо `id` для Helion та Energy
3. Перевіряємо `id` для Yaromir команди (по підстроці)
4. **За замовчуванням** → DAARION

---

### 2. Додано функцію `getAllMicroDaos()`

**Файл:** `src/utils/agentMicroDaoMapping.ts` (рядки 106-111)

```typescript
/**
 * Отримати список мікроДАО (ID та назви)
 */
export function getAllMicroDaos(): AgentMicroDaoMapping[] {
  return AGENT_MICRODAO_MAPPING;
}
```

**Використання:** Для відображення списку всіх мікроДАО в панелі управління.

---

### 3. Оновлено `allAgents` з фільтрацією

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` (рядки 262-375)

**Додано функцію `filterAgentsByMicroDao`:**

```typescript
// Функція для фільтрації агентів за мікроДАО
const filterAgentsByMicroDao = (agents: any[]) => {
  return agents.filter((agent) => {
    const agentMicroDao = getAgentMicroDao(agent);
    const belongs = agentMicroDao === microDaoId;
    
    if (!belongs) {
      console.log(`🚫 Filtering out agent ${agent.name} (belongs to ${agentMicroDao}, not ${microDaoId})`);
    }
    
    return belongs;
  });
};
```

**Логіка для кожного мікроДАО:**

#### DAARION:
```typescript
if (baseAgents.length === 0 && microDaoId === 'daarion-dao') {
  const node2Agents = (node2AgentsData?.items || []).map(/* ... */);
  const node1FilteredAgents = filterAgentsByMicroDao(
    (node1AgentsData?.items || []).map(/* ... */)
  );
  
  const daarionAgents = [...node2Agents, ...node1FilteredAgents];
  console.log(`✅ Using ${node2Agents.length} NODE2 agents + ${node1FilteredAgents.length} NODE1 agents for DAARION (total: ${daarionAgents.length})`);
  return daarionAgents;
}
```

**Ефект:** Всі 50 агентів з НОДА2 + агенти з НОДА1, які не належать GREENFOOD/Helion/Yaromir.

#### GREENFOOD:
```typescript
if (baseAgents.length === 0 && microDaoId === 'greenfood-dao' && node1AgentsData?.items) {
  const greenfoodAgents = filterAgentsByMicroDao(
    node1AgentsData.items.map(/* ... */)
  );
  console.log(`✅ Using ${greenfoodAgents.length} GREENFOOD agents from NODE1`);
  return greenfoodAgents;
}
```

**Ефект:** Тільки агенти з `department: 'GreenFood'` → **1 агент** (GREENFOOD Assistant).

#### ENERGY UNION:
```typescript
if (baseAgents.length === 0 && microDaoId === 'energy-union-dao' && node1AgentsData?.items) {
  const energyAgents = filterAgentsByMicroDao(
    node1AgentsData.items.map(/* ... */)
  );
  console.log(`✅ Using ${energyAgents.length} ENERGY UNION agents from NODE1`);
  return energyAgents;
}
```

**Ефект:** Тільки `agent-helion` → **1 агент**.

#### Yaromir:
```typescript
if (baseAgents.length === 0 && microDaoId === 'yaromir-dao' && node1AgentsData?.items) {
  const yaromirAgents = filterAgentsByMicroDao(
    node1AgentsData.items.map(/* ... */)
  );
  console.log(`✅ Using ${yaromirAgents.length} Yaromir agents from NODE1`);
  return yaromirAgents;
}
```

**Ефект:** Тільки Yaromir команда → **0 агентів** (якщо вони не на НОДА1).

---

## 📊 Очікувані результати

### DAARION (`http://localhost:8899/microdao/daarion`):

**Консоль:**
```
✅ Using 50 NODE2 agents + 4 NODE1 agents for DAARION (total: 54)
🚫 Filtering out agent GREENFOOD Assistant (belongs to greenfood-dao, not daarion-dao)
🚫 Filtering out agent Helion (belongs to energy-union-dao, not daarion-dao)
```

**Агенти:**
- 50 з НОДА2 (System + Domain)
- 4 з НОДА1 (Daarwizz, DevTools, MicroDAO Orchestrator, Monitor, Tokenomics)

**Всього:** ~54 агенти

---

### GREENFOOD (`http://localhost:8899/microdao/greenfood`):

**Консоль:**
```
✅ Using 1 GREENFOOD agents from NODE1
```

**Агенти:**
- GREENFOOD Assistant (оркестратор)

**Всього:** 1 агент (+ 12 CrewAI sub-agents)

---

### ENERGY UNION (`http://localhost:8899/microdao/energy-union`):

**Консоль:**
```
✅ Using 1 ENERGY UNION agents from NODE1
```

**Агенти:**
- Helion (оркестратор)

**Всього:** 1 агент

---

### Yaromir (`http://localhost:8899/microdao/yaromir`):

**Консоль:**
```
✅ Using 0 Yaromir agents from NODE1
```

**Агенти:**
- (Yaromir команда не на НОДА1, потрібно додати)

**Всього:** 0 агентів (потрібно додати в NODE1 список)

---

## 🧪 Тестування

### 1. GREENFOOD

```
http://localhost:8899/microdao/greenfood
```

**Перевірити:**
- ✅ Вкладка "Агенти" → **1 агент** (GREENFOOD Assistant)
- ✅ Консоль → `✅ Using 1 GREENFOOD agents from NODE1`
- ❌ Немає Daarwizz, DevTools, Helion, тощо

### 2. DAARION

```
http://localhost:8899/microdao/daarion
```

**Перевірити:**
- ✅ Вкладка "Агенти" → **~54 агенти** (50 з НОДА2 + 4 з НОДА1)
- ✅ Консоль → `✅ Using 50 NODE2 agents + 4 NODE1 agents for DAARION`
- ✅ Є Daarwizz, DevTools, Solarius, Sofia, тощо
- ❌ Немає GREENFOOD Assistant, Helion

### 3. ENERGY UNION

```
http://localhost:8899/microdao/energy-union
```

**Перевірити:**
- ✅ Вкладка "Агенти" → **1 агент** (Helion)
- ✅ Консоль → `✅ Using 1 ENERGY UNION agents from NODE1`
- ❌ Немає інших агентів

---

## 🔧 Що потрібно додати

### 1. Yaromir команда на НОДА1

**Файл:** `src/api/node1Agents.ts`

**Додати 5 агентів:**
- `agent-yaromir` (Orchestrator)
- `agent-vozhd` (Strategic)
- `agent-provodnik` (Mentor)
- `agent-domir` (Harmony)
- `agent-sozdatel` (Innovation)

**З полями:**
```typescript
{
  id: 'agent-yaromir',
  name: 'Yaromir',
  role: 'Yaromir Orchestrator',
  model: 'qwen2.5:14b',
  backend: 'ollama',
  status: 'active',
  node: 'node-1',
  priority: 'highest',
  category: 'Yaromir',
  type: 'orchestrator',
  department: 'Yaromir',
}
```

### 2. GREENFOOD CrewAI sub-agents

**Проблема:** GREENFOOD має тільки 1 агент (оркестратор), але має 12 CrewAI sub-agents.

**Рішення:** Додати відображення CrewAI команди окремо від основних агентів.

**Файл:** `src/pages/MicroDaoCabinetPage.tsx` → вкладка "Агенти"

**Показувати:**
- Основні агенти (1 - GREENFOOD Assistant)
- CrewAI команда (12 sub-agents)

---

## ✅ Чекліст

- [x] Додано `getAgentMicroDao()` функцію
- [x] Додано `getAllMicroDaos()` функцію
- [x] Реалізовано `filterAgentsByMicroDao()` в `allAgents`
- [x] Додано логування фільтрації
- [x] Додано `department` та `category` до агентів
- [x] Протестовано на DAARION
- [ ] Протестовано на GREENFOOD (1 агент)
- [ ] Протестовано на ENERGY UNION (1 агент)
- [ ] Протестовано на Yaromir (0 агентів, потрібно додати)
- [ ] Додано Yaromir команду на НОДА1
- [ ] Додано відображення CrewAI sub-agents для GREENFOOD

---

**СТАТУС:** ✅ Фільтрація реалізована  
**Тестуйте:** `http://localhost:8899/microdao/greenfood` (має показати **1 агент**)  
**Консоль:** F12 → Console → Шукайте `✅ Using X GREENFOOD agents from NODE1`

---

## 📋 Підсумок мікроДАО

| МікроДАО | Оркестратор | Нода | Очікувано агентів | Фільтр |
|----------|-------------|------|-------------------|--------|
| DAARION | Daarwizz | НОДА2 | 54 (50+4) | За замовчуванням |
| GREENFOOD | GREENFOOD Assistant | НОДА1 | 1 (+12 CrewAI) | `department: 'GreenFood'` |
| ENERGY UNION | Helion | НОДА1 | 1 | `id: 'agent-helion'` |
| Yaromir | Yaromir | НОДА1 | 5 | `id.includes('yaromir')` |

**Всього:** 4 мікроДАО





