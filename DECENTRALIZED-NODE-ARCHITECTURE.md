# 🌐 Децентралізована мережа нод - Архітектура автоматичного підключення

**Дата:** 2025-11-23  
**Версія:** 2.0.0  
**Статус:** 🎯 Production Architecture

---

## 🎯 Мета

Створити повністю автоматизовану систему для додавання нових нод до децентралізованої мережі штучного інтелекту без ручного втручання.

---

## 🏗️ Архітектура мережі

### Поточна структура

```
┌─────────────────────────────────────────────────────────┐
│                 DAARION AI Network                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  НОДА1 (Hetzner) ◄──────────────────┐                  │
│  144.76.224.179                      │                  │
│  ├─ Node Registry (9205)             │                  │
│  ├─ NATS JetStream (4222)            │                  │
│  ├─ DAGI Router (9102)               │  Discovery       │
│  └─ Gateway (9300)                   │  & Heartbeat     │
│                                      │                  │
│  НОДА2 (MacBook M4 Max) ─────────────┘                  │
│  192.168.1.33 (local)                                   │
│  ├─ Development Node                                    │
│  ├─ 50 DAARION Agents                                   │
│  └─ 8 AI Models                                         │
│                                                          │
│  НОДА3-N (Future) ───────────────────┐                  │
│  Any location                        │                  │
│  └─ Auto-registration ────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Компоненти системи

### 1. Node Registry Service (Вже існує!)

**Місце:** НОДА1 (144.76.224.179:9205)  
**Статус:** ✅ Готовий (потрібна імплементація API)

**Призначення:**
- Центральний реєстр всіх нод
- Автоматична реєстрація нових нод
- Heartbeat tracking (keep-alive)
- Node discovery

**База даних:**
```sql
-- nodes table
node_id           VARCHAR(255)  -- Унікальний ID ноди
node_name         VARCHAR(255)  -- Людське ім'я
ip_address        INET          -- Публічна IP
local_ip          INET          -- Локальна IP
status            VARCHAR(50)   -- online, offline, degraded
last_heartbeat    TIMESTAMP     -- Останній heartbeat
capabilities      JSONB         -- GPU, CPU, RAM, моделі
```

**API Endpoints:**
```bash
POST /api/v1/nodes/register     # Реєстрація нової ноди
POST /api/v1/nodes/heartbeat    # Heartbeat (keep-alive)
GET  /api/v1/nodes              # Список всіх нод
GET  /api/v1/nodes/{node_id}    # Інфо про конкретну ноду
GET  /api/v1/nodes/discover     # Знайти ноди з певними capabilities
```

---

### 2. Bootstrap Agent (Авто-реєстрація)

**Файл:** `tools/dagi_node_agent/bootstrap.py`  
**Статус:** ✅ Існує, потрібне покращення

**Як працює:**

```python
# Запуск на новій ноді
python3 -m tools.dagi_node_agent.bootstrap \
  --role production-node \
  --labels gpu,cpu,ollama \
  --registry-url http://144.76.224.179:9205
```

**Що робить:**
1. ✅ Автоматично визначає hostname, IP
2. ✅ Генерує унікальний node_id
3. ✅ Збирає інформацію про систему (CPU, RAM, GPU)
4. ✅ Реєструється в Node Registry
5. ✅ Зберігає node_id локально
6. ✅ Запускає heartbeat loop

---

### 3. Heartbeat Service (Keep-Alive)

**Призначення:** Підтримувати з'єднання з Registry

**Механізм:**
```python
# Кожні 30 секунд відправляє heartbeat
while True:
    await send_heartbeat(node_id, metrics)
    await asyncio.sleep(30)
```

**Метрики що відправляються:**
- CPU usage %
- RAM usage %
- GPU usage % (якщо є)
- Disk usage %
- Активні сервіси
- Кількість агентів
- Статус моделей

---

### 4. Discovery Service (Пошук нод)

**Призначення:** Знайти ноду з потрібними capabilities

**API Query:**
```bash
# Знайти ноду з GPU
GET /api/v1/nodes/discover?capability=gpu&status=online

# Знайти ноду з конкретною моделлю
GET /api/v1/nodes/discover?model=deepseek-r1:70b

# Знайти найближчу ноду
GET /api/v1/nodes/discover?latency=min&region=europe
```

**Response:**
```json
{
  "nodes": [
    {
      "node_id": "node-1-hetzner",
      "ip_address": "144.76.224.179",
      "latency_ms": 45,
      "capabilities": {
        "gpu": "NVIDIA RTX 4000",
        "models": ["qwen3:8b", "mistral:7b"]
      }
    }
  ]
}
```

---

## 🚀 Автоматичне підключення нової ноди

### Сценарій: Додавання НОДА3

#### Крок 1: Встановлення на новій ноді
```bash
# На НОДА3
git clone git@github.com:IvanTytar/microdao-daarion.git
cd microdao-daarion
pip install -r requirements.txt
```

#### Крок 2: Конфігурація (один файл)
```bash
# Створити .env файл
cat > .env << EOF
# Node Registry URL
NODE_REGISTRY_URL=http://144.76.224.179:9205

# NATS для комунікації
NATS_URL=nats://144.76.224.179:4222

# Роль ноди
NODE_ROLE=worker-node
NODE_LABELS=gpu,inference,home

# Ollama (якщо є)
OLLAMA_BASE_URL=http://localhost:11434
EOF
```

#### Крок 3: Автоматична реєстрація
```bash
# Запустити bootstrap
python3 -m tools.dagi_node_agent.bootstrap --auto
```

**Що відбудеться автоматично:**
1. ✅ Визначить hostname та IP
2. ✅ Згенерує унікальний node_id
3. ✅ Зсканує систему (CPU, RAM, GPU, диск)
4. ✅ Перевірить наявність Ollama та моделей
5. ✅ Зареєструється в Node Registry
6. ✅ Запустить heartbeat service
7. ✅ Стане доступною в мережі через 30 секунд

#### Крок 4: Перевірка
```bash
# На будь-якій ноді
curl http://144.76.224.179:9205/api/v1/nodes

# Побачите НОДА3 в списку!
```

---

## 🔐 Безпека та автентифікація

### Рівень 1: API Key (Базовий)
```bash
# При реєстрації генерується API key
NODE_API_KEY=sk-node-abc123xyz

# Всі запити до Registry потребують ключ
curl -H "Authorization: Bearer $NODE_API_KEY" \
  http://144.76.224.179:9205/api/v1/nodes
```

### Рівень 2: mTLS (Mutual TLS)
```bash
# Кожна нода має свій сертифікат
NODE_CERT=/etc/dagi/certs/node.crt
NODE_KEY=/etc/dagi/certs/node.key
CA_CERT=/etc/dagi/certs/ca.crt

# Всі з'єднання через TLS
```

### Рівень 3: Whitelist (IP або node_id)
```python
# В Node Registry
ALLOWED_NODES = [
    "node-1-hetzner",
    "node-2-macbook",
    # Автоматично додаються після верифікації
]
```

---

## 🌍 Топології мережі

### Топологія 1: Централізована (поточна)
```
          НОДА1 (Registry)
         /    |    \
       /      |      \
   НОДА2   НОДА3   НОДА4
```

**Плюси:**
- ✅ Простота
- ✅ Один point of truth
- ✅ Легке управління

**Мінуси:**
- ⚠️ Single point of failure
- ⚠️ Bottleneck при великій кількості нод

### Топологія 2: Федеративна (майбутнє)
```
    НОДА1 (Registry-EU)  ◄────►  НОДА5 (Registry-US)
      /  |  \                      /  |  \
  НОДА2 3  4                   НОДА6 7  8
```

**Плюси:**
- ✅ Відмовостійкість
- ✅ Географічна близькість
- ✅ Масштабованість

**Мінуси:**
- ⚠️ Складніша синхронізація
- ⚠️ Eventual consistency

### Топологія 3: P2P (повна децентралізація)
```
 НОДА1 ◄──► НОДА2
   ▲ \       / ▲
   │   \   /   │
   │     ◄     │
   └─► НОДА3 ◄─┘
```

**Плюси:**
- ✅ Повна децентралізація
- ✅ Максимальна відмовостійкість
- ✅ Немає central authority

**Мінуси:**
- ⚠️ Складна імплементація
- ⚠️ Consensus протоколи потрібні

---

## 📡 Протоколи комунікації

### 1. HTTP/REST (Реєстрація та discovery)
```
Використання: Реєстрація, heartbeat, queries
Протокол: HTTP/HTTPS
Порт: 9205
```

### 2. NATS JetStream (Messaging)
```
Використання: Асинхронні повідомлення, events
Протокол: NATS
Порт: 4222
Topics:
  - node.{node_id}.events
  - node.{node_id}.tasks
  - system.broadcast
```

### 3. gRPC (High-performance calls)
```
Використання: Швидкі запити між нодами
Протокол: gRPC/HTTP2
Порт: 9106 (майбутнє)
```

### 4. WebSocket (Real-time)
```
Використання: Real-time dashboard, monitoring
Протокол: WebSocket
Порт: 9107 (майбутнє)
```

---

## 🔄 Життєвий цикл ноди

### 1. Registration (Реєстрація)
```
НОДА3 → POST /api/v1/nodes/register → Node Registry
Response: {node_id, api_key, config}
```

### 2. Active (Працює)
```
НОДА3 → POST /api/v1/nodes/heartbeat (every 30s) → Registry
Registry → Marks node as "online"
```

### 3. Degraded (Проблеми)
```
Heartbeat timeout > 90s
Registry → Marks node as "degraded"
Alert sent to admin
```

### 4. Offline (Відключена)
```
Heartbeat timeout > 5min
Registry → Marks node as "offline"
Node removed from active routing
```

### 5. Deregistration (Видалення)
```
НОДА3 → DELETE /api/v1/nodes/{node_id} → Registry
Registry → Removes node from database
```

---

## 🛠️ Практична імплементація

### Файл 1: `bootstrap.py` (Покращений)
```python
#!/usr/bin/env python3
"""
Автоматична реєстрація ноди в DAARION Network
"""
import socket
import platform
import psutil
import requests
import uuid
from pathlib import Path

class NodeBootstrap:
    def __init__(self, registry_url):
        self.registry_url = registry_url
        self.node_id = self.generate_node_id()
    
    def generate_node_id(self):
        """Генерує унікальний node_id"""
        hostname = socket.gethostname()
        # Якщо є збережений ID - використати його
        node_id_file = Path.home() / ".dagi" / "node_id"
        if node_id_file.exists():
            return node_id_file.read_text().strip()
        
        # Інакше створити новий
        short_uuid = str(uuid.uuid4())[:8]
        node_id = f"node-{hostname}-{short_uuid}"
        
        # Зберегти для майбутнього використання
        node_id_file.parent.mkdir(parents=True, exist_ok=True)
        node_id_file.write_text(node_id)
        
        return node_id
    
    def collect_capabilities(self):
        """Збирає інформацію про систему"""
        capabilities = {
            "hostname": socket.gethostname(),
            "ip_address": self.get_public_ip(),
            "local_ip": self.get_local_ip(),
            "os": platform.system(),
            "os_version": platform.version(),
            "cpu_cores": psutil.cpu_count(),
            "ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "disk_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
            "gpu": self.detect_gpu(),
            "ollama": self.check_ollama(),
        }
        return capabilities
    
    def register(self):
        """Реєстрація в Node Registry"""
        payload = {
            "node_id": self.node_id,
            "capabilities": self.collect_capabilities(),
            "status": "online"
        }
        
        response = requests.post(
            f"{self.registry_url}/api/v1/nodes/register",
            json=payload,
            timeout=10
        )
        response.raise_for_status()
        
        return response.json()
    
    def start_heartbeat(self):
        """Запускає heartbeat loop"""
        import asyncio
        asyncio.run(self.heartbeat_loop())
    
    async def heartbeat_loop(self):
        """Безкінечний loop heartbeat"""
        while True:
            try:
                metrics = self.collect_metrics()
                requests.post(
                    f"{self.registry_url}/api/v1/nodes/heartbeat",
                    json={"node_id": self.node_id, "metrics": metrics},
                    timeout=5
                )
            except Exception as e:
                print(f"Heartbeat failed: {e}")
            
            await asyncio.sleep(30)
    
    # ... (інші методи)

if __name__ == "__main__":
    bootstrap = NodeBootstrap("http://144.76.224.179:9205")
    print(f"🔧 Registering node: {bootstrap.node_id}")
    
    result = bootstrap.register()
    print(f"✅ Registered successfully!")
    print(f"   Node ID: {result['node_id']}")
    print(f"   API Key: {result['api_key']}")
    
    print("💓 Starting heartbeat...")
    bootstrap.start_heartbeat()
```

### Файл 2: `node_discovery.py` (Пошук нод)
```python
"""
Пошук доступних нод в мережі
"""
import requests
from typing import List, Dict, Optional

class NodeDiscovery:
    def __init__(self, registry_url):
        self.registry_url = registry_url
    
    def find_nodes(
        self, 
        role: Optional[str] = None,
        capability: Optional[str] = None,
        status: str = "online"
    ) -> List[Dict]:
        """Знайти ноди за критеріями"""
        params = {"status": status}
        if role:
            params["role"] = role
        if capability:
            params["capability"] = capability
        
        response = requests.get(
            f"{self.registry_url}/api/v1/nodes/discover",
            params=params
        )
        response.raise_for_status()
        
        return response.json()["nodes"]
    
    def find_best_node_for_model(self, model_name: str) -> Optional[Dict]:
        """Знайти найкращу ноду для конкретної моделі"""
        nodes = self.find_nodes(capability="ollama")
        
        for node in nodes:
            if model_name in node["capabilities"].get("models", []):
                return node
        
        return None
    
    def get_nearest_node(self, location: str = "auto") -> Dict:
        """Знайти найближчу ноду"""
        response = requests.get(
            f"{self.registry_url}/api/v1/nodes/discover",
            params={"nearest": location}
        )
        response.raise_for_status()
        
        return response.json()["nodes"][0]

# Використання
discovery = NodeDiscovery("http://144.76.224.179:9205")

# Знайти всі ноди з GPU
gpu_nodes = discovery.find_nodes(capability="gpu")
print(f"Found {len(gpu_nodes)} nodes with GPU")

# Знайти ноду з deepseek-r1:70b
node = discovery.find_best_node_for_model("deepseek-r1:70b")
if node:
    print(f"Model available on: {node['node_name']}")
```

---

## 🎯 Переваги цієї архітектури

### Для розробників
- ✅ **Plug and Play** - додали ноду за 5 хвилин
- ✅ **Нульова конфігурація** - все автоматично
- ✅ **Discovery API** - легко знайти потрібну ноду

### Для системи
- ✅ **Fault tolerance** - автоматичне виявлення збоїв
- ✅ **Load balancing** - розподіл навантаження
- ✅ **Horizontal scaling** - додавай скільки потрібно нод

### Для бізнесу
- ✅ **Швидке масштабування** - від 2 до 1000 нод
- ✅ **Географічне розподілення** - ноди по всьому світу
- ✅ **Cost optimization** - використання ресурсів по потребі

---

## 📈 Roadmap

### Phase 1: Базова функціональність (ЗАРАЗ)
- [x] Node Registry Service infrastructure
- [ ] Імплементація Node Registry API
- [ ] Bootstrap agent покращений
- [ ] Heartbeat service
- [ ] Discovery API

### Phase 2: Безпека та моніторинг
- [ ] API key authentication
- [ ] mTLS certificates
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alert system

### Phase 3: Федерація
- [ ] Multi-region registries
- [ ] Registry replication
- [ ] Geographic routing
- [ ] Latency optimization

### Phase 4: Повна децентралізація
- [ ] P2P discovery (DHT)
- [ ] Consensus protocol
- [ ] Blockchain registry (optional)
- [ ] Zero-knowledge proofs

---

## ✅ Що потрібно зробити ЗАРАЗ

### 1. Завершити Node Registry API
```bash
# Файл: services/node-registry/app/main.py
# Імплементувати endpoints:
POST /api/v1/nodes/register
POST /api/v1/nodes/heartbeat
GET  /api/v1/nodes
GET  /api/v1/nodes/{node_id}
GET  /api/v1/nodes/discover
```

### 2. Покращити Bootstrap Agent
```bash
# Файл: tools/dagi_node_agent/bootstrap.py
# Додати:
- Auto-detection capabilities
- Ollama models scanning
- GPU detection (NVIDIA, Apple Silicon)
- Persistent node_id storage
```

### 3. Створити Frontend для моніторингу
```bash
# Додати сторінку в React:
/nodes/registry
- Список всіх нод
- Статус (online/offline)
- Capabilities
- Real-time heartbeat
```

---

## 🎯 Відповідь на ваше питання

### Чи можливо автоматизувати додавання нод?

**✅ ТАК! Це повністю можливо і вже частково реалізовано!**

**Що вже є:**
- ✅ Node Registry Service (infraструктура готова)
- ✅ Bootstrap Agent (базова версія)
- ✅ Database schema для нод
- ✅ Docker конфігурація

**Що треба:**
- 🔧 Завершити Node Registry API (1-2 дні)
- 🔧 Покращити Bootstrap Agent (1 день)
- 🔧 Додати heartbeat service (1 день)
- 🔧 Створити Discovery API (1 день)

**Результат:**
```bash
# На будь-якій новій ноді просто запускаєте:
./scripts/join-network.sh

# І нода автоматично:
# 1. Реєструється
# 2. Починає heartbeat
# 3. Стає доступною в мережі
# 4. З'являється в dashboard
```

---

**Статус:** ✅ **Архітектура готова, залишилась імплементація!**  
**Часова оцінка:** 4-5 днів розробки  
**Складність:** Середня (Node Registry API + Bootstrap покращення)

**Коли буде готово - у вас буде plug-and-play мережа штучного інтелекту! 🚀**


