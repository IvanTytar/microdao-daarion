# Node Agents Inventory

**Дата:** 28 листопада 2025  
**Статус:** ✅ Інвентаризація завершена  
**Результат TASK 031_NODE_AGENTS_DISCOVERY**

---

## 1. Node Monitoring Agents

### 1.1. Monitor Agent (NODE1)

| Поле | Значення |
|------|----------|
| **ID** | `agent-monitor-node1` |
| **Display Name** | Monitor Agent (НОДА1) |
| **Slug** | `monitor-node1` |
| **Role** | System Monitoring & Event Logging (Node-1) |
| **Model** | mistral-nemo:12b |
| **Backend** | ollama |
| **Node** | node-1-hetzner-gex44 |
| **Kind** | infra_monitor |
| **Department** | System |
| **Файл опису** | `src/api/node1Agents.ts` (рядки 76-92) |
| **Статус** | ✅ Існує в коді |

**Функції:**
- Моніторинг CPU, RAM, GPU, Disk
- Відстеження стану сервісів (Router, Swapper, Ollama, Matrix, Postgres, NATS)
- Генерація звітів про інциденти
- Виявлення аномалій

### 1.2. Monitor Agent (NODE2)

| Поле | Значення |
|------|----------|
| **ID** | `agent-monitor-node2` / `monitor-node2` |
| **Display Name** | Monitor Agent (НОДА2) |
| **Slug** | `monitor-node2` |
| **Role** | System Monitoring & Event Logging (Node-2) |
| **Model** | mistral-nemo:12b |
| **Backend** | ollama |
| **Node** | node-2-macbook-m4max |
| **Kind** | infra_monitor |
| **Department** | System |
| **Файли опису** | `src/api/node2Agents.ts` (рядки 37-52), `config/agents_city_mapping.yaml`, `router-config.yml` |
| **Статус** | ✅ Існує в БД та коді |

**Функції:**
- Аналогічні до NODE1 Monitor
- Додатково: архітектор-інспектор DAGI

---

## 2. Node Steward / NodeOps Agents

### 2.1. Node Steward (NODE1)

| Поле | Значення |
|------|----------|
| **ID** | `node-steward-node1` (пропонується) |
| **Display Name** | Node Steward (НОДА1) |
| **Slug** | `node-steward-node1` |
| **Role** | Curator of Node Stack |
| **Model** | mistral-nemo:12b (рекомендовано) |
| **Node** | node-1-hetzner-gex44 |
| **Kind** | infra_ops |
| **Статус** | ❌ НЕ ІСНУЄ — потрібно створити |

**Заплановані функції:**
- Інвентаризація стеку ноди
- Порівняння з DAOS стандартами
- Планування оновлень та встановлень
- Документування конфігурації

### 2.2. Node Steward (NODE2)

| Поле | Значення |
|------|----------|
| **ID** | `node-steward-node2` (пропонується) |
| **Display Name** | Node Steward (НОДА2) |
| **Slug** | `node-steward-node2` |
| **Role** | Curator of Node Stack |
| **Model** | mistral-nemo:12b (рекомендовано) |
| **Node** | node-2-macbook-m4max |
| **Kind** | infra_ops |
| **Статус** | ❌ НЕ ІСНУЄ — потрібно створити |

---

## 3. Кандидати на офіційні ролі

### Node Guardian (is_node_guardian = true)

| Нода | Агент | ID |
|------|-------|-----|
| NODE1 | Monitor Agent (НОДА1) | `monitor-node1` |
| NODE2 | Monitor Agent (НОДА2) | `monitor-node2` |

### Node Steward (is_node_steward = true)

| Нода | Агент | ID |
|------|-------|-----|
| NODE1 | Node Steward (НОДА1) | `node-steward-node1` (створити) |
| NODE2 | Node Steward (НОДА2) | `node-steward-node2` (створити) |

---

## 4. Джерела даних

### Файли з описом агентів:

1. `src/api/node1Agents.ts` — агенти NODE1
2. `src/api/node2Agents.ts` — агенти NODE2
3. `config/agents_city_mapping.yaml` — маппінг агентів на кімнати
4. `router-config.yml` — конфігурація DAGI Router
5. `docs/NODE2_AGENTS_FULL_INVENTORY.md` — повна інвентаризація NODE2
6. `docs/users/agents/SYSTEM_AGENTS_DAIS.md` — DAIS паспорти

### Сервіси моніторингу:

1. `services/monitor-agent-service/` — сервіс Monitor Agent
2. `src/components/monitor/NodeMonitorChat.tsx` — UI компонент чату з Monitor

---

## 5. Рекомендації для TASK 032

1. **Створити міграцію** з полями:
   - `agents.is_node_guardian` (boolean)
   - `agents.is_node_steward` (boolean)
   - `node_cache.guardian_agent_id` (text)
   - `node_cache.steward_agent_id` (text)

2. **Створити агентів Node Steward** для NODE1 та NODE2

3. **Оновити існуючих Monitor Agent** — встановити `is_node_guardian = true`

4. **Прив'язати агентів до нод** через `guardian_agent_id` / `steward_agent_id`

5. **Додати в Node Dashboard UI** панель з агентами ноди

