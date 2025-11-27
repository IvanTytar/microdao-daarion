# Звіт про синхронізацію агентів та дашборд моніторингу

**Дата:** 2025-11-21  
**Дашборд:** http://localhost:8889 (monitoring/local_monitor.py)

## 🔍 Знайдені інструменти пошуку

### ✅ Інструменти пошуку ВЖЕ встановлені

**1. Web Search Tool (GREENFOOD)**
- **Файл:** `services/greenfood/crew/tools/crawl4ai_tool.py`
- **Інструменти:**
  - `web_search_tool` - Пошук в інтернеті через Crawl4AI
  - `crawl_url_tool` - Обробка конкретного URL та витягування контенту
- **Використання:** Parser Service (Crawl4AI) на порту 9400
- **Статус:** ✅ Налаштовано для GREENFOOD агентів

**2. Parser Service (Crawl4AI)**
- **Порт:** 9400
- **Endpoint:** `/crawl`
- **Можливості:**
  - Пошук через Google
  - Crawl конкретних URL
  - Витягування markdown контенту
  - Підтримка Playwright для JavaScript сайтів

---

## 🤖 Агенти в системі

### Агенти в router-config.yml (8 агентів)

1. **devtools** - DevTools Agent (з інструментами: fs_read, fs_write, run_tests, git_diff, git_commit)
2. **microdao_orchestrator** - Multi-agent orchestrator
3. **greenfood** - GREENFOOD Assistant (ERP для крафтових виробників)
4. **helion** - Helion (Energy Union platform)
5. **cto** - CTO Agent (оркеструє команду розробки)
6. **parser** - Document parsing agent
7. **monitor** - Monitor Agent (Architect-inspector)
8. **crewai** - CrewAI orchestrator

### Агенти в config/agents.yaml (1 агент)

1. **tokenomics-advisor** - TokenomicsAdvisor (спеціалізований агент)

### Агенти в AGENT_REGISTRY на сервері (2 агенти) ⚠️

1. **daarwizz** - DAARWIZZ Bot
2. **helion** - Helion Bot

### Проблема синхронізації

**❌ Розбіжність між конфігураціями:**

| Джерело | Кількість агентів | Агенти |
|---------|------------------|--------|
| `router-config.yml` | 8 | devtools, microdao_orchestrator, greenfood, helion, cto, parser, monitor, crewai |
| `config/agents.yaml` | 1 | tokenomics-advisor |
| `AGENT_REGISTRY` (gateway-bot) | 2 | daarwizz, helion |
| **ВСЬОГО унікальних** | **11** | devtools, microdao_orchestrator, greenfood, helion, cto, parser, monitor, crewai, tokenomics-advisor, daarwizz |

**Проблема:** AGENT_REGISTRY містить тільки агенти з Telegram ботами, але не всі агенти з router-config.yml.

---

## 📊 Дашборд моніторингу (порт 8889)

### Поточний стан

**Файл:** `monitoring/local_monitor.py` (5978 рядків)

**Що вже відображено:**
- ✅ Ноди (Node Registry)
- ✅ Агенти (з router-config.yml та gateway-bot)
- ✅ Провайдери (LLM, Orchestrator)
- ✅ Сервіси та їх статус
- ✅ Swapper Service метрики
- ✅ Метрики нод (CPU, RAM, GPU)
- ✅ Telegram боти інформація
- ✅ DAO інформація

**API Endpoints:**
- `/api/nodes` - Список нод
- `/api/agents` - Список агентів
- `/api/providers` - Список провайдерів
- `/api/services` - Статус сервісів
- `/api/swapper/status` - Статус Swapper Service
- `/api/dagi/nodes/{node_id}/metrics` - Метрики ноди
- `/api/dagi/nodes/{node_id}/events` - Події ноди
- `/api/dagi/stack/nodes/overview` - Огляд стеку нод
- `/api/dagi/stack/agents/overview` - Огляд стеку агентів

**Що відсутнє:**
- ❌ Інтеграція з Prometheus (метрики в реальному часі)
- ❌ Інтеграція з Grafana (дашборди)
- ❌ Відображення інструментів пошуку
- ❌ Відображення мультимодальних можливостей

---

## 🔧 Рекомендації

### 1. Додати інтеграцію з Prometheus

Додати до `monitoring/local_monitor.py`:

```python
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "http://localhost:9090")

async def fetch_prometheus_metrics(query: str) -> Dict:
    """Отримати метрики з Prometheus"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{PROMETHEUS_URL}/api/v1/query",
                params={"query": query}
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.error(f"Prometheus query error: {e}")
    return {}

@app.get("/api/prometheus/metrics")
async def get_prometheus_metrics():
    """Отримати метрики з Prometheus"""
    metrics = {
        "router_requests": await fetch_prometheus_metrics("dagi_router_requests_total"),
        "gateway_requests": await fetch_prometheus_metrics("dagi_gateway_requests_total"),
        "agent_requests": await fetch_prometheus_metrics("dagi_agent_requests_total"),
        "service_health": await fetch_prometheus_metrics("up"),
    }
    return metrics
```

### 2. Додати інтеграцію з Grafana

Додати посилання на Grafana дашборди та embedded iframes:

```python
GRAFANA_URL = os.getenv("GRAFANA_URL", "http://localhost:3000")

@app.get("/api/grafana/dashboards")
async def get_grafana_dashboards():
    """Отримати список Grafana дашбордів"""
    # Можна використати Grafana API для отримання дашбордів
    return {
        "url": f"{GRAFANA_URL}",
        "dashboards": [
            {"id": "router", "name": "Router Metrics", "url": f"{GRAFANA_URL}/d/router"},
            {"id": "gateway", "name": "Gateway Metrics", "url": f"{GRAFANA_URL}/d/gateway"},
        ]
    }
```

### 3. Синхронізувати всіх агентів

**Проблема:** AGENT_REGISTRY містить тільки агенти з Telegram ботами.

**Рішення:** Додати всіх агентів з router-config.yml до AGENT_REGISTRY (навіть якщо вони не мають Telegram ботів):

```python
# Додати до gateway-bot/http_api.py
# Завантажити всіх агентів з router-config.yml
if ROUTER_CONFIG_PATH.exists():
    with open(ROUTER_CONFIG_PATH, "r") as f:
        router_config = yaml.safe_load(f)
        for agent_id, agent_config in router_config.get("agents", {}).items():
            if agent_id not in AGENT_REGISTRY:
                # Створити конфігурацію для агентів без Telegram
                config = AgentConfig(
                    agent_id=agent_id,
                    name=agent_config.get("description", agent_id),
                    prompt_path="",  # Немає окремого файлу
                    telegram_token_env="",  # Немає Telegram бота
                    default_prompt=agent_config.get("system_prompt", ""),
                    system_prompt=agent_config.get("system_prompt", "")
                )
                AGENT_REGISTRY[agent_id] = config
```

### 4. Відобразити інструменти пошуку на дашборді

Додати секцію про інструменти:

```python
@app.get("/api/tools")
async def get_tools():
    """Отримати список інструментів"""
    tools = []
    
    # Інструменти пошуку
    tools.append({
        "id": "web_search_tool",
        "name": "Web Search via Crawl4AI",
        "agent": "greenfood",
        "type": "search",
        "description": "Пошук в інтернеті через Crawl4AI"
    })
    
    # Інструменти DevTools
    for tool_id in ["fs_read", "fs_write", "run_tests", "git_diff", "git_commit"]:
        tools.append({
            "id": tool_id,
            "name": tool_id,
            "agent": "devtools",
            "type": "builtin",
            "description": f"DevTools tool: {tool_id}"
        })
    
    return {"tools": tools}
```

---

## 📝 Підсумок

### ✅ Що працює
- Дашборд на порту 8889 працює
- Інструменти пошуку встановлені (web_search_tool для greenfood)
- Мультимодальність працює (фото, голос, документи)
- Дашборд відображає ноди, агенти, сервіси

### ⚠️ Що потрібно виправити
- Синхронізувати всіх агентів між router-config.yml та AGENT_REGISTRY
- Додати інтеграцію з Prometheus до дашборду
- Додати інтеграцію з Grafana до дашборду
- Відобразити інструменти пошуку на дашборді
- Додати інструменти пошуку для інших агентів (не тільки greenfood)

### 🔧 Наступні кроки
1. Додати Prometheus/Grafana інтеграцію до дашборду
2. Синхронізувати всіх агентів
3. Додати інструменти пошуку для daarwizz та helion
4. Оновити документацію

---

**Останнє оновлення:** 2025-11-21  
**Статус:** ⚠️ Потребує синхронізації та інтеграції



