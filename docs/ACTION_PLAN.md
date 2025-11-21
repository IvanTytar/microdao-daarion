# 🚀 План дій: Інтеграція всіх сервісів

**Дата**: 2025-11-18  
**На основі**: SERVER_AUDIT_REPORT.md

---

## ✅ Що вже працює (готово до використання)

### 1. **CrewAI** 🤖
- **Статус**: ✅ Працює (`dagi-crewai:9102`)
- **Що робити**: Додати workflows для GREENFOOD та інших агентів
- **Час**: 30 хв
- **Пріоритет**: 🔴 ВИСОКИЙ

### 2. **Neo4j** 📊
- **Статус**: ✅ Працює (ports 7474, 7687)
- **Що робити**: Підключити до Router для knowledge graphs
- **UI**: http://144.76.224.179:7474
- **Час**: 45 хв
- **Пріоритет**: 🟡 СЕРЕДНІЙ

### 3. **Dify AI Platform** 🎯
- **Статус**: ✅ Повний стек працює!
- **Компоненти**: API, Web, Workers, Weaviate, Plugins
- **Можливості**:
  - LLM orchestration
  - RAG workflows (через Weaviate)
  - **МОЖЕ МАТИ GPT-4V/Claude Vision!**
- **Що робити**: Дослідити API та можливості
- **Час**: 1 год
- **Пріоритет**: 🔴 ВИСОКИЙ

### 4. **Weaviate** 🔍
- **Статус**: ✅ Працює (port 8080)
- **Використання**: Vector DB для Dify
- **Інтеграція**: Через Dify RAG

---

## ❌ Що потребує фіксу

### 5. **Memory Service** 🧠
- **Проблема**: PostgreSQL не має `pgvector` extension
- **Рішення**: 
  1. Встановити pgvector в PostgreSQL container
  2. АБО використовувати Memory з Dify/Neo4j
- **Час**: 1 год
- **Пріоритет**: 🟢 НИЗЬКИЙ (не критично)

### 6. **RAG Service** 📚
- **Проблема**: Haystack 2.x API changes
- **Рішення**: 
  1. Виправити imports
  2. АБО використовувати Dify RAG (через Weaviate)
- **Час**: 1-2 год
- **Пріоритет**: 🟡 СЕРЕДНІЙ

### 7. **Milvus** 🔍
- **Проблема**: Зупинено 2 дні тому
- **Рішення**: Запустити, ЯКЩО потрібна альтернатива Qdrant
- **Час**: 15 хв
- **Пріоритет**: 🟢 НИЗЬКИЙ (є Qdrant і Weaviate)

---

## 🎯 Рекомендований план (пріоритезовано)

### **Phase 1: Дослідити Dify** (1 год) 🔴
**Чому**: Dify може замінити багато сервісів!

```bash
# 1. Перевірити Dify API
curl http://localhost/v1/models

# 2. Перевірити чи підключено GPT-4V/Claude
curl http://localhost/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4-vision-preview", "messages": [...]}'

# 3. Перевірити RAG capabilities
# Через Dify Web UI: http://localhost/
```

**Результат**: Якщо Dify має GPT-4V - ГОТОВО! Якщо ні - знаємо що додати.

---

### **Phase 2: Інтегрувати CrewAI** (30 хв) 🔴
**Що**: Додати CrewAI workflows для агентів

#### Крок 1: Перевірити CrewAI API
```bash
curl http://dagi-crewai:9102/health
curl http://dagi-crewai:9102/crews  # List available crews
```

#### Крок 2: Додати CrewAI provider в Router
`router-config.yml`:
```yaml
providers:
  crewai:
    type: "crew"
    base_url: "http://dagi-crewai:9102"
```

#### Крок 3: Створити workflow для GREENFOOD
```python
# services/greenfood/crew/workflows.py
async def web_search_workflow(query: str):
    """Пошук в інтернеті через CrewAI"""
    response = await httpx.post(
        "http://dagi-crewai:9102/crews/research/run",
        json={"query": query}
    )
    return response.json()
```

**Результат**: GREENFOOD може шукати в інтернеті!

---

### **Phase 3: Підключити Neo4j** (45 хв) 🟡
**Що**: Knowledge graph для зв'язків

#### Крок 1: Перевірити Neo4j
```bash
# Browser: http://144.76.224.179:7474
# Username: neo4j
# Password: <перевірити в docker-compose>
```

#### Крок 2: Створити Neo4j client
```python
# utils/neo4j_client.py
from neo4j import GraphDatabase

class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            "bolt://neo4j:7687",
            auth=("neo4j", "password")
        )
    
    async def save_interaction(self, user_id, agent_id, message, response):
        """Зберегти взаємодію"""
        with self.driver.session() as session:
            session.run("""
                MERGE (u:User {id: $user_id})
                MERGE (a:Agent {id: $agent_id})
                CREATE (u)-[:ASKED]->(m:Message {text: $message, timestamp: datetime()})
                CREATE (a)-[:RESPONDED]->(r:Response {text: $response, timestamp: datetime()})
                CREATE (m)-[:GOT_RESPONSE]->(r)
            """, user_id=user_id, agent_id=agent_id, message=message, response=response)
```

**Результат**: Візуалізація зв'язків користувач ↔ агент ↔ документи!

---

### **Phase 4: Vision через Dify або API** (30 хв) 🟡
**Варіант A**: Якщо Dify має GPT-4V:
```python
# Use Dify API for vision
async def analyze_image_dify(image_url: str, prompt: str):
    response = await httpx.post(
        "http://localhost/v1/chat/completions",
        json={
            "model": "gpt-4-vision",
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }]
        }
    )
    return response.json()
```

**Варіант B**: Якщо немає - додати OpenAI API key:
```python
# Прямий виклик OpenAI
import openai
openai.api_key = "sk-..."

response = openai.ChatCompletion.create(
    model="gpt-4-vision-preview",
    messages=[...]
)
```

**Результат**: Боти описують зображення!

---

### **Phase 5: Streaming TTS** (1 год) 🟢
**Що**: Замінити gTTS на Coqui TTS або ElevenLabs

#### Варіант A: Coqui TTS (локальний)
```dockerfile
# Dockerfile для Coqui TTS
FROM python:3.10
RUN pip install TTS
CMD ["tts-server", "--host", "0.0.0.0", "--port", "5002"]
```

#### Варіант B: ElevenLabs API
```python
import elevenlabs

async def text_to_speech_elevenlabs(text: str):
    audio = elevenlabs.generate(
        text=text,
        voice="Bella",  # Ukrainian voice
        model="eleven_multilingual_v2"
    )
    return audio
```

**Результат**: Якісніший голос, підтримка довших текстів!

---

### **Phase 6: Grafana Alerts** (30 хв) 🟢
**Що**: Налаштувати alerting rules

`monitoring/prometheus/alerts/daarion_alerts.yml`:
```yaml
groups:
  - name: critical_alerts
    rules:
      - alert: ServiceDown
        expr: up{job=~"dagi-.*|telegram-gateway"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
```

**Налаштувати Telegram notifications**:
```yaml
# monitoring/prometheus/alertmanager.yml
receivers:
  - name: 'telegram'
    telegram_configs:
      - bot_token: 'YOUR_BOT_TOKEN'
        chat_id: YOUR_CHAT_ID
```

**Результат**: Автоматичні алерти в Telegram!

---

## 📊 Пріоритизований Timeline

### Сьогодні (3-4 год):
1. ✅ Дослідити Dify (1 год) - може має все що треба!
2. ✅ Інтегрувати CrewAI (30 хв) - web search для агентів
3. ✅ Vision через Dify або OpenAI (30 хв) - описи зображень

### Завтра (2-3 год):
4. ✅ Підключити Neo4j (45 хв) - knowledge graphs
5. ✅ Streaming TTS (1 год) - якісний голос
6. ✅ Grafana Alerts (30 хв) - моніторинг

### Опційно (якщо потрібно):
7. ⚠️ Виправити RAG Service (2 год) - АБО використовувати Dify RAG
8. ⚠️ Виправити Memory Service (1 год) - АБО використовувати Neo4j
9. ⚠️ Запустити Milvus (15 хв) - тільки якщо Qdrant недостатньо

---

## 💡 Ключові висновки

### Що маємо:
- ✅ **35 Docker контейнерів** - величезна інфраструктура!
- ✅ **Dify AI Platform** - може замінити багато сервісів
- ✅ **CrewAI** - готовий до використання
- ✅ **Neo4j** - готовий до використання
- ✅ **3 Vector DBs** - Qdrant, Weaviate, (Milvus)

### Що можна зробити швидко:
1. **Dify exploration** - може вже все є!
2. **CrewAI integration** - web search для агентів
3. **Neo4j integration** - knowledge graphs

### Що не критично:
- Memory Service (є альтернативи)
- RAG Service (є Dify RAG)
- Milvus (є Qdrant і Weaviate)

---

## 🚀 Готовий почати?

**Рекомендую порядок**:
1. **Dify** - дослідити можливості (може GPT-4V вже там!)
2. **CrewAI** - додати до GREENFOOD
3. **Vision** - через Dify або OpenAI API
4. **Neo4j** - knowledge graphs
5. **Інше** - за потребою

**З чого почнемо?** 🎯

---

*Створено: 2025-11-18*  
*Базується на: SERVER_AUDIT_REPORT.md*

