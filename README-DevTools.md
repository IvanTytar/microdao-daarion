# DAGI Router + DevTools Agent - Quick Start

## 🚀 Поточний статус

✅ **DAGI Router** працює на `http://127.0.0.1:9101`  
✅ **Ollama qwen3:8b** налаштовано як основну модель  
✅ **router-config.yml** створено з профілем DevTools Agent  
✅ **Тестовий скрипт** готовий до запуску  

## 📋 Швидкий старт

### 1. Перевірити, що все працює

```bash
# Health check DAGI Router
curl -s http://127.0.0.1:9101/health | jq

# Перевірити Ollama моделі
ollama list

# Має показати qwen3:8b
```

### 2. Запустити базовий тест

```bash
cd /opt/dagi-router
./test-devtools.sh
```

### 3. Простий запит до DevTools через Router

```bash
curl -X POST http://127.0.0.1:9101/route \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "agent_id": "devtools",
      "user_id": "test-user"
    },
    "message": "Привіт! Як ти можеш допомогти з розробкою?",
    "metadata": {
      "provider": "local_slm"
    }
  }' | jq
```

## 📁 Файли конфігурації

```
/opt/dagi-router/
├── .env                    # Environment variables (OLLAMA_MODEL=qwen3:8b)
├── router-config.yml       # Повна конфігурація Router + DevTools
├── main.py                 # Код DAGI Router
├── test-devtools.sh        # Тестовий скрипт
├── NEXT-STEPS.md          # Детальний план дій
└── README-DevTools.md     # Цей файл
```

## 🎯 Наступні дії

1. **Інтеграція YAML** - підключити `router-config.yml` в код
2. **Імплементація tools** - fs_read, fs_write, git_*, run_tests
3. **Золоті сценарії** - bugfix, refactor, architecture review

Детально див. `NEXT-STEPS.md`

## 🔧 Корисні команди

```bash
# Логи Router
tail -f /tmp/dagi-router.log

# Перезапуск
pkill -f "uvicorn main:app.*9101"
cd /opt/dagi-router && nohup .venv/bin/uvicorn main:app --host 127.0.0.1 --port 9101 > /tmp/dagi-router.log 2>&1 &

# Конфігурація
cat router-config.yml
cat .env
```

## 📖 Конфігурація DevTools Agent

З `router-config.yml`:

```yaml
agents:
  devtools:
    description: "DevTools Agent - помічник з кодом"
    default_llm: local_qwen3_8b  # Використовує qwen3:8b
    
    tools:
      - fs_read      # Читання файлів
      - fs_write     # Запис файлів
      - run_tests    # Запуск тестів
      - git_diff     # Git операції
      - git_commit

routing:
  # Прості задачі → local qwen3:8b
  - when: {agent: devtools}
    use_llm: local_qwen3_8b
  
  # Складні (architecture, security) → DeepSeek
  - when: 
      agent: devtools
      task_type: [architecture_review, security_audit]
    use_llm: cloud_deepseek
```

## ❓ FAQ

**Q: DevTools може працювати тільки на qwen3:8b?**  
A: Так! Для більшості задач (bugfix, простий refactor) цього достатньо. Складні задачі можуть йти на DeepSeek згідно з routing rules.

**Q: Як додати новий агент?**  
A: Додайте в `router-config.yml` секцію `agents.your_agent` і routing rule. Детально в NEXT-STEPS.md

**Q: Де налаштовується модель?**  
A: В `.env` → `OLLAMA_MODEL=qwen3:8b` та в `router-config.yml` → `llm_profiles.local_qwen3_8b`

---

**Version:** 0.3.0  
**Updated:** 15.11.2025  
**Status:** ✅ Ready for integration
