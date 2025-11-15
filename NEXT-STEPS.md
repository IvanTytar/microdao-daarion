# DAGI Router + DevTools Agent - План Дій

## ✅ Що вже є (станом на 15.11.2025)

1. **DAGI Router** - працює на `http://127.0.0.1:9101`
   - Підтримує multi-provider routing
   - Інтеграція з Ollama (local_slm)
   - Інтеграція з DeepSeek (cloud)
   - Базова маршрутизація через metadata

2. **Ollama + qwen3:8b** - локальна модель
   - Модель: `qwen3:8b` (5.2 GB)
   - Endpoint: `http://localhost:11434`
   - Статус: ✅ працює

3. **Конфігурація**
   - `.env` - environment variables
   - `router-config.yml` - повна конфігурація роутера
   - Підтримка DevTools Agent профілю

---

## 🎯 Наступні кроки

### Крок 1: Інтеграція router-config.yml
**Пріоритет: HIGH**

Зараз DAGI Router використовує hardcoded логіку. Потрібно:

```python
# main.py - додати на початок
import yaml

# Завантажити конфігурацію
with open("router-config.yml", "r") as f:
    config = yaml.safe_load(f)

# Використовувати config["llm_profiles"], config["agents"], config["routing"]
```

**Завдання:**
- [ ] Додати `pyyaml` в requirements.txt
- [ ] Створити функцію `load_config()` в main.py
- [ ] Переписати `simple_routing_strategy()` для використання rules з YAML
- [ ] Додати підтримку `agent_id` в `RoutingContext`
- [ ] Тестування: запустити `./test-devtools.sh`

---

### Крок 2: Імплементація DevTools Agent
**Пріоритет: HIGH**

DevTools Agent потребує інструментів (tools):

```yaml
agents:
  devtools:
    tools:
      - fs_read      # читання файлів
      - fs_write     # запис файлів  
      - run_tests    # запуск pytest/jest
      - git_diff     # git diff
      - git_commit   # git commit
```

**Варіанти реалізації:**

**Варіант A: Вбудовані tools в Router**
```python
# main.py
def execute_tool(tool_id: str, params: dict) -> dict:
    if tool_id == "fs_read":
        return {"content": Path(params["path"]).read_text()}
    elif tool_id == "fs_write":
        Path(params["path"]).write_text(params["content"])
        return {"status": "ok"}
    # ... інші tools
```

**Варіант B: Окремий DevTools Service** (рекомендується)
```bash
# Створити окремий FastAPI сервіс
mkdir -p /opt/devtools-agent
cd /opt/devtools-agent

# main.py з endpoints:
# POST /tools/fs/read
# POST /tools/fs/write
# POST /tools/tests/run
# POST /tools/git/diff
# POST /tools/git/commit
```

**Завдання:**
- [ ] Вибрати варіант реалізації (A або B)
- [ ] Імплементувати базові tools (fs_read, fs_write)
- [ ] Додати безпеку (sandboxing, path validation)
- [ ] Інтегрувати tools в LLM prompts

---

### Крок 3: Золоті сценарії (Golden Path)
**Пріоритет: MEDIUM**

Протестувати 3 основні use cases:

#### Сценарій 1: Bugfix
```bash
# Запит до DevTools Agent
curl -X POST http://127.0.0.1:9101/route \
  -d '{
    "context": {"agent_id": "devtools"},
    "message": "Знайди баг в файлі src/utils.py",
    "metadata": {"task_type": "bugfix"}
  }'

# Очікувана поведінка:
# 1. Router → local_qwen3_8b (згідно з routing rules)
# 2. LLM використовує tool "fs_read" для читання файлу
# 3. Аналізує код
# 4. Повертає опис бага + fix
```

#### Сценарій 2: Рефакторинг
```bash
# Простий рефакторинг
curl -X POST http://127.0.0.1:9101/route \
  -d '{
    "context": {"agent_id": "devtools"},
    "message": "Рефактор функції calculate() в module.py",
    "metadata": {"task_type": "refactor_simple"}
  }'

# → local_qwen3_8b
```

#### Сценарій 3: Архітектурний ревʼю (складний)
```bash
# Складна задача
curl -X POST http://127.0.0.1:9101/route \
  -d '{
    "context": {"agent_id": "devtools"},
    "message": "Проаналізуй архітектуру проекту та запропонуй покращення",
    "metadata": {"task_type": "architecture_review"}
  }'

# → cloud_deepseek (більш потужна модель)
```

**Завдання:**
- [ ] Запустити сценарій 1 (bugfix)
- [ ] Запустити сценарій 2 (refactor)
- [ ] Перевірити роутинг для сценарію 3 (має йти на DeepSeek якщо є API key)
- [ ] Задокументувати результати

---

### Крок 4: Моніторинг і телеметрія
**Пріоритет: LOW**

Згідно з `router-config.yml` → telemetry enabled:

```yaml
telemetry:
  metrics:
    - request_count
    - response_time
    - token_usage
    - error_rate
```

**Завдання:**
- [ ] Додати middleware для збору метрик
- [ ] Логувати всі routing decisions
- [ ] Створити endpoint `/metrics` для Prometheus
- [ ] Dashboard в Grafana (опціонально)

---

## 📝 Поточна архітектура

```
┌─────────────────┐
│   User/Client   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│     DAGI Router :9101       │
│                             │
│  ┌─────────────────────┐   │
│  │ Routing Strategy    │   │
│  │ (config-based)      │   │
│  └──────────┬──────────┘   │
│             │               │
│  ┌──────────▼──────────┐   │
│  │  LLM Profile Select │   │
│  │  - local_qwen3_8b   │   │
│  │  - cloud_deepseek   │   │
│  └──────────┬──────────┘   │
└─────────────┼───────────────┘
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────┐    ┌──────────────┐
│  Ollama  │    │  DeepSeek    │
│ qwen3:8b │    │  API         │
└──────────┘    └──────────────┘
```

---

## 🔧 Швидкі команди

```bash
# Перевірити статус Router
curl -s http://127.0.0.1:9101/health | jq

# Перевірити Ollama моделі
ollama list

# Запустити тестування
./test-devtools.sh

# Переглянути логи Router
tail -f /tmp/dagi-router.log

# Перезапустити Router
pkill -f "uvicorn main:app.*9101"
cd /opt/dagi-router && nohup .venv/bin/uvicorn main:app --host 127.0.0.1 --port 9101 > /tmp/dagi-router.log 2>&1 &

# Перевірити конфігурацію
cat /opt/dagi-router/router-config.yml
cat /opt/dagi-router/.env
```

---

## ❓ Відповіді на питання

### 1. Що далі за планом?
**Крок 1** → Інтеграція router-config.yml в код
**Крок 2** → Реалізація DevTools Agent з інструментами
**Крок 3** → Тестування золотих сценаріїв

### 2. DevTools Agent може працювати на qwen3:8b?
**Так!** Саме для цього створено профіль `local_qwen3_8b` з routing rule:
```yaml
devtools_default_local:
  when: {agent: devtools}
  use_llm: local_qwen3_8b
```

Для складних задач (architecture_review, security_audit) можна використати DeepSeek.

### 3. Як підключити інші агенти?
Додати в `router-config.yml`:
```yaml
agents:
  marketing:
    default_llm: cloud_deepseek
    tools: [...]
  
routing:
  - when: {agent: marketing}
    use_llm: cloud_deepseek
```

---

## 📚 Документація

- Конфіг: `/opt/dagi-router/router-config.yml`
- Env: `/opt/dagi-router/.env`
- Тести: `/opt/dagi-router/test-devtools.sh`
- Код: `/opt/dagi-router/main.py`
- Логи: `/tmp/dagi-router.log`

