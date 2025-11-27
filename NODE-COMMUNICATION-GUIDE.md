# Node Communication Guide - Як агенти Node #1 контактують з Node #2

## 📋 Огляд

Агенти на різних нодах можуть спілкуватися через кілька механізмів. Цей документ описує всі доступні методи та їх використання.

---

## 🔗 Методи комунікації

### 1. DAGI Router (Основний метод)

**Призначення:** Маршрутизація запитів між нодами через централізовані роутери.

**Node #1 Router:**
- URL: `http://144.76.224.179:9102`
- Endpoint: `/v1/chat/completions`
- Порт: `9102`

**Node #2 Router:**
- URL: `http://localhost:9102`
- Endpoint: `/v1/chat/completions`
- Порт: `9102`

**Як працює:**
1. Агент на Node #1 відправляє запит до свого локального DAGI Router
2. Router перевіряє Node Registry для визначення розташування цільового агента
3. Якщо агент на іншій ноді, Router пересилає запит до Router цільової ноди
4. Цільовий Router доставляє повідомлення агенту
5. Відповідь проходить зворотним шляхом

**Приклад використання:**
```python
import httpx

async def contact_agent_on_other_node(agent_id: str, message: str, target_node: str):
    router_url = "http://144.76.224.179:9102" if target_node == "node1" else "http://localhost:9102"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{router_url}/v1/chat/completions",
            json={
                "model": "agent-model",
                "messages": [
                    {"role": "user", "content": message}
                ],
                "agent_id": agent_id,
                "target_node": target_node
            }
        )
        return response.json()
```

---

### 2. Node Registry (Service Discovery)

**Призначення:** Централізований реєстр всіх нод та агентів для service discovery.

**URL:** `http://144.76.224.179:9205`

**Endpoints:**
- `/health` - перевірка статусу
- `/api/v1/nodes` - список зареєстрованих нод
- `/api/v1/agents` - список агентів з їх розташуванням
- `/api/v1/agent/{agent_id}` - інформація про конкретного агента

**Як працює:**
1. Кожна нода реєструється в Node Registry при старті
2. Агенти реєструються з інформацією про свою ноду
3. При пошуку агента, система запитує Registry для визначення його розташування
4. Registry повертає інформацію про ноду та доступні endpoints

**Приклад використання:**
```python
async def find_agent_location(agent_id: str):
    registry_url = "http://144.76.224.179:9205"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{registry_url}/api/v1/agent/{agent_id}")
        agent_info = response.json()
        return agent_info.get("node"), agent_info.get("endpoint")
```

---

### 3. NATS JetStream (Message Broker)

**Призначення:** Асинхронна комунікація через message broker для event-driven архітектури.

**URL:** `nats://144.76.224.179:4222`

**HTTP Monitoring:** `http://144.76.224.179:8222/varz`

**Як працює:**
1. Агент публікує повідомлення в NATS subject (наприклад, `agent.{agent_id}.inbox`)
2. Node Registry визначає, на якій ноді знаходиться цільовий агент
3. NATS маршрутизує повідомлення до відповідної ноди
4. Агент на цільовій ноді підписується на свій subject та отримує повідомлення
5. Відповідь публікується в subject відправника

**Приклад використання:**
```python
import nats
from nats.aio.client import Client as NATS

async def send_message_via_nats(agent_id: str, message: str):
    nc = await nats.connect("nats://144.76.224.179:4222")
    
    # Публікувати повідомлення
    subject = f"agent.{agent_id}.inbox"
    await nc.publish(subject, message.encode())
    
    # Підписатися на відповідь
    reply_subject = f"agent.{agent_id}.reply"
    sub = await nc.subscribe(reply_subject)
    
    # Очікувати відповідь
    msg = await sub.next_msg()
    return msg.data.decode()
```

---

### 4. HTTP/HTTPS API (Direct Calls)

**Призначення:** Прямі REST API виклики між нодами для синхронної комунікації.

**Node #1 API:**
- Base URL: `http://144.76.224.179:9102`
- Agent endpoint: `/api/agent/{agent_id}/chat`

**Node #2 API:**
- Base URL: `http://localhost:9102`
- Agent endpoint: `/api/agent/{agent_id}/chat`

**Як працює:**
1. Якщо відома адреса цільової ноди, можна зробити прямий HTTP запит
2. Запит йде безпосередньо до API цільової ноди
3. Відповідь повертається синхронно

**Приклад використання:**
```python
async def direct_agent_call(agent_id: str, message: str, target_node_url: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{target_node_url}/api/agent/{agent_id}/chat",
            json={"message": message}
        )
        return response.json()
```

---

## 🔄 Cross-Node Communication Flow

### Типовий сценарій: Agent на Node #1 → Agent на Node #2

```
┌─────────────────┐
│ Agent (Node #1) │
│  (Daarwizz)     │
└────────┬────────┘
         │ 1. Send request
         ▼
┌─────────────────┐
│ DAGI Router     │
│   (Node #1)     │
└────────┬────────┘
         │ 2. Query Node Registry
         ▼
┌─────────────────┐
│ Node Registry   │
│  (Centralized)  │
└────────┬────────┘
         │ 3. Return agent location (Node #2)
         ▼
┌─────────────────┐
│ DAGI Router     │
│   (Node #1)     │
└────────┬────────┘
         │ 4. Forward to Node #2 Router
         ▼
┌─────────────────┐
│ DAGI Router     │
│   (Node #2)     │
└────────┬────────┘
         │ 5. Deliver to agent
         ▼
┌─────────────────┐
│ Agent (Node #2) │
│   (Solarius)    │
└────────┬────────┘
         │ 6. Process & respond
         ▼
    [Response follows reverse path]
```

---

## 📊 Порівняння методів

| Метод | Тип | Latency | Надійність | Використання |
|-------|-----|---------|------------|--------------|
| **DAGI Router** | Синхронний | Низька | Висока | Основна комунікація між агентами |
| **Node Registry** | Service Discovery | N/A | Висока | Пошук агентів та нод |
| **NATS JetStream** | Асинхронний | Низька | Висока | Event-driven, pub/sub |
| **HTTP/HTTPS** | Синхронний | Середня | Висока | Прямі API виклики |

---

## 🛠️ Реалізація в коді

### Python приклад для агента

```python
class CrossNodeAgent:
    def __init__(self, agent_id: str, node: str):
        self.agent_id = agent_id
        self.node = node
        self.router_url = self._get_router_url()
        self.registry_url = "http://144.76.224.179:9205"
    
    def _get_router_url(self):
        if self.node == "node1":
            return "http://144.76.224.179:9102"
        else:
            return "http://localhost:9102"
    
    async def contact_agent(self, target_agent_id: str, message: str):
        # 1. Знайти розташування цільового агента
        async with httpx.AsyncClient() as client:
            registry_response = await client.get(
                f"{self.registry_url}/api/v1/agent/{target_agent_id}"
            )
            target_info = registry_response.json()
            target_node = target_info.get("node")
            
            # 2. Визначити router URL для цільової ноди
            if target_node == "node1":
                target_router = "http://144.76.224.179:9102"
            else:
                target_router = "http://localhost:9102"
            
            # 3. Відправити запит через router
            response = await client.post(
                f"{target_router}/v1/chat/completions",
                json={
                    "model": target_info.get("model", "default"),
                    "messages": [
                        {"role": "user", "content": message}
                    ],
                    "agent_id": target_agent_id,
                    "source_agent": self.agent_id,
                    "source_node": self.node
                }
            )
            
            return response.json()
```

---

## ✅ Перевірка зв'язку

### Тестування через API

```bash
# Перевірка зв'язку між нодами
curl http://localhost:8899/api/agents/connection-test

# Перевірка Node Registry
curl http://144.76.224.179:9205/health

# Перевірка NATS
curl http://144.76.224.179:8222/varz

# Перевірка DAGI Router (Node #1)
curl http://144.76.224.179:9102/health

# Перевірка DAGI Router (Node #2)
curl http://localhost:9102/health
```

---

## 📍 Де знаходиться інформація

### В кабінеті агента

Кожен агент має свій кабінет (`/agent/{agent_id}`), де відображається:

1. **Current Node** - на якій ноді знаходиться агент
2. **Communication Methods** - доступні методи комунікації
3. **How to Contact Agents on Other Nodes** - інструкції
4. **Cross-Node Communication Flow** - схема процесу

### На сторінці Agent Connections

Сторінка `/agents/connections` показує:
- Список агентів на кожній ноді
- Результати тестів зв'язку
- Статус кожного методу комунікації

---

## 🎯 Рекомендації

1. **Для синхронної комунікації:** Використовуйте DAGI Router
2. **Для event-driven:** Використовуйте NATS JetStream
3. **Для service discovery:** Використовуйте Node Registry
4. **Для прямих викликів:** Використовуйте HTTP/HTTPS API (якщо відома адреса)

---

**Status:** ✅ Complete  
**Date:** 2025-11-22  
**Version:** DAGI Monitor V5.1

