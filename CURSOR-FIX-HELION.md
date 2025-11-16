# Завдання для Cursor: Виправити Helion system_prompt

## Проблема
Telegram бот Helion працює, але відповідає як generic Qwen замість використання Helion system prompt про Energy Union та EcoMiner.

## Репозиторій
`/opt/microdao-daarion` (поточний, на сервері)

## Діагностика

### Що працює:
- ✅ Gateway отримує Telegram повідомлення через Cloudflare tunnel
- ✅ Router маршрутизує запити (правило `helion_agent` матчиться)
- ✅ Ollama відповідає
- ✅ Відповіді надсилаються в Telegram

### Що НЕ працює:
- ❌ Router не використовує `context.system_prompt` від gateway
- ❌ Відповіді generic ("Меня зовут Qwen") замість Helion personality

## Причина
Gateway надсилає в файлі `gateway-bot/http_api.py` (рядки 466-470):
```python
"payload": {"context": {
    "agent_name": HELION_NAME,
    "system_prompt": HELION_SYSTEM_PROMPT,
    "memory": memory_context,
},
```

Router в файлі `providers/llm_provider.py` (метод `_get_system_prompt`) шукає:
```python
context = req.payload.get("context") or {}
if "system_prompt" in context:
    return context["system_prompt"]
```

Але `req.payload` це вже dict, а `payload.get("context")` шукає ключ "context" в payload.

## Завдання

### 1. Виправити структуру в gateway-bot/http_api.py

**Файл:** `gateway-bot/http_api.py`  
**Рядки:** 453-471 (функція `helion_telegram_webhook`)

**Поточний код:**
```python
router_request = {
    "message": text,
    "mode": "chat",
    "agent": "helion",
    "metadata": { ... },
    "payload": {"context": {
        "agent_name": HELION_NAME,
        "system_prompt": HELION_SYSTEM_PROMPT,
        "memory": memory_context,
    },
    },
}
```

**Має бути:**
```python
router_request = {
    "message": text,
    "mode": "chat",
    "agent": "helion",
    "metadata": { ... },
    "payload": {
        "context": {
            "agent_name": HELION_NAME,
            "system_prompt": HELION_SYSTEM_PROMPT,
            "memory": memory_context,
        }
    },
}
```

Проблема: подвійні дужки `{"context": {` мають бути на різних рівнях indent.

### 2. Перевірити що router отримує context

**Файл:** `providers/llm_provider.py`  
**Метод:** `_get_system_prompt` (близько рядка 95)

Додати debug logging:
```python
def _get_system_prompt(self, req: RouterRequest) -> Optional[str]:
    """Get system prompt based on agent or context"""
    # 1. Check if context.system_prompt provided
    context = req.payload.get("context") or {}
    
    # DEBUG: Log what we received
    logger.info(f"[DEBUG] payload keys: {list(req.payload.keys())}")
    logger.info(f"[DEBUG] context keys: {list(context.keys())}")
    
    if "system_prompt" in context:
        system_prompt = context["system_prompt"]
        logger.info(f"[DEBUG] Using context.system_prompt ({len(system_prompt)} chars)")
        return system_prompt
    
    # 2. Agent-specific fallbacks...
```

### 3. Перезапустити і протестувати

```bash
# Перезапустити gateway
docker compose restart gateway

# Перезапустити router
docker compose restart router

# Почекати 5 секунд
sleep 5

# Перевірити логи
docker compose logs --tail=20 router | grep DEBUG
```

### 4. Надіслати тестове повідомлення

Надішли боту в Telegram: **"Хто ти і що таке EcoMiner?"**

Очікувана відповідь має містити:
- "Helion"
- "Energy Union"
- "EcoMiner" або "BioMiner"

Якщо бачиш "Qwen" - system_prompt все ще не працює.

## Перевірка після виправлення

```bash
# 1. Перевірити що gateway відправляє правильно
docker compose logs --tail=30 gateway | grep "Sending to Router"

# 2. Перевірити що router отримує context
docker compose logs --tail=30 router | grep "DEBUG.*context"

# 3. Надіслати тестове повідомлення і подивитись відповідь
```

## Файли які треба змінити

1. **gateway-bot/http_api.py** - виправити структуру payload
2. **providers/llm_provider.py** - додати debug logging (опціонально)

## Очікуваний результат

Після виправлення, бот має відповідати:
```
Я — Helion, AI-агент платформи Energy Union. 
EcoMiner (SES-77) — це модульна когенераційна установка...
```

Замість:
```
Меня зовут Qwen, и я являюсь частью серии моделей Alibaba Cloud...
```

---

**Після виконання - запустіть тести і повідомте про результат!**
