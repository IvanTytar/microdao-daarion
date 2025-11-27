# Виправлення агента GREENFOOD

**Дата:** 2025-11-23  
**Статус:** ✅ Виправлено

---

## 🐛 Проблема

Агент GREENFOOD не відповідав у чаті. Помилка 502 Bad Gateway:
```
{"detail":"HTTP 404: {\"error\":\"Unknown specialist model: vision-8b\"}"}
```

### Причина

1. **Відсутність правил роутингу** для агента `greenfood` в `router-config.yml`
2. **Router використовував неправильне правило** `specialist_vision` замість `greenfood_agent`
3. **Неправильний шлях до конфігурації**: редагувався `/opt/dagi-router/router-config.yml`, а Router монтує `/opt/microdao-daarion/router-config.yml`

### Логи помилки
```
routing_engine: Matched rule: specialist_vision → llm_specialist_vision_8b
Provider error: HTTP 404: {"error":"Unknown specialist model: vision-8b"}
```

---

## ✅ Рішення

### 1. Знайдено правильний файл конфігурації

```bash
$ docker inspect dagi-router | grep -A 10 'Mounts'
"Source": "/opt/microdao-daarion/router-config.yml",  # ✅ Правильний шлях
"Destination": "/app/router-config.yml",
```

### 2. Додано правила роутингу для агентів

**Файл:** `/opt/microdao-daarion/router-config.yml`

```yaml
routing:
  # ... інші правила ...
  
  # GREENFOOD Agent
  - id: greenfood_agent
    priority: 5
    when:
      agent: greenfood
    use_llm: local_qwen3_8b
    use_context_prompt: true
    description: "GREENFOOD agent → uses context.system_prompt"

  # Yaromir Agent
  - id: yaromir_agent
    priority: 5
    when:
      agent: yaromir
    use_llm: local_qwen3_8b
    use_context_prompt: true
    description: "Yaromir agent → uses context.system_prompt"

  # DAARWIZZ Agent
  - id: daarwizz_agent
    priority: 5
    when:
      agent: daarwizz
    use_llm: local_qwen3_8b
    use_context_prompt: true
    description: "DAARWIZZ agent → uses context.system_prompt"
  
  # Helion Energy Union Agent
  - id: helion_agent
    priority: 5
    when:
      agent: helion
    use_llm: local_qwen3_8b
    use_context_prompt: true
    description: "Helion agent → uses context.system_prompt"
```

### 3. Перезавантажено Router

```bash
$ docker restart dagi-router
$ curl http://localhost:9102/health
{"status":"healthy","service":"dagi-router"}
```

---

## 🎯 Результат

### До виправлення:
```
User: привіт
Error: 502 Bad Gateway
Detail: HTTP 404: {"error":"Unknown specialist model: vision-8b"}
```

### Після виправлення:
```
User: привіт
GREENFOOD: Привіт! Я GREENFOOD агент, AI-ERP для крафтових виробників. Чим можу допомогти?
```

---

## 📊 Статус роутингу

### Правильні правила (priority 5):
1. ✅ `greenfood_agent` → `local_qwen3_8b`
2. ✅ `yaromir_agent` → `local_qwen3_8b`
3. ✅ `daarwizz_agent` → `local_qwen3_8b`
4. ✅ `helion_agent` → `local_qwen3_8b`

### Логи Router (після виправлення):
```
INFO: Config loaded: node=dagi-devtools-node-01
INFO: Incoming request: agent=greenfood, mode=chat
INFO: Matched rule: greenfood_agent → llm_local_qwen3_8b
INFO: Selected provider: LLMProvider(id='llm_local_qwen3_8b')
```

---

## ✅ Всі агенти-оркестратори налаштовані

1. **GREENFOOD** (greenfood-dao)
   - ✅ System prompt в frontend
   - ✅ Routing rule в Router
   - ✅ `use_context_prompt: true`

2. **Helion** (energy-union-dao)
   - ✅ System prompt в frontend
   - ✅ Routing rule в Router
   - ✅ `use_context_prompt: true`

3. **Yaromir** (yaromir-dao)
   - ✅ System prompt в frontend
   - ✅ Routing rule в Router
   - ✅ `use_context_prompt: true`

4. **DAARWIZZ** (daarion-dao)
   - ✅ System prompt в frontend
   - ✅ Routing rule в Router
   - ✅ `use_context_prompt: true`

---

## 📝 Висновок

Агент GREENFOOD тепер працює коректно. Проблема була в:
1. Відсутності правила роутингу для агента
2. Редагуванні неправильного конфігураційного файлу

Всі оркестратори мікроДАО тепер налаштовані та працюють з system prompts.





