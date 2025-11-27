# ⚠️ Помилка YAML в router-config-final.yml

**Дата:** 2025-01-27

## 🔍 Проблема

Файл `/tmp/router-config-final.yml` має синтаксичну помилку YAML:

```
YAML parse error: while parsing a block mapping
  in "/app/router-config.yml", line 807, column 3
expected <block end>, but found '-'
  in "/app/router-config.yml", line 938, column 3
```

## 🔧 Причина

В секції `policies:` (лінія 806) є поля, які не належать до policies:

```yaml
policies:
  rate_limit:
    enabled: false
  cost_tracking:
    enabled: true
  audit_mode:
    enabled: false
    description: "Многомерная мета-сущность..."  # ❌ Це не має бути тут!
    telegram_bot_token_env: YAROMIR_TELEGRAM_BOT_TOKEN  # ❌ Це не має бути тут!
    system_prompt_file: /app/prompts/yaromir_prompt_ru.txt  # ❌ Це не має бути тут!
    # ... інші поля yaromir агента
```

Ці поля (`description`, `telegram_bot_token_env`, `system_prompt_file`, `default_llm_profile`, `crew_enabled`, `crew_agents`, `voice`, `tools`, `routing_rules`) мають бути в секції `agents: yaromir:`, а не в `policies:`.

## ✅ Рішення

Потрібно виправити файл `/tmp/router-config-final.yml`:

1. Залишити в `policies:` тільки:
   - `rate_limit`
   - `cost_tracking`
   - `audit_mode`

2. Перемістити всі поля yaromir в секцію `agents: yaromir:`

## 📝 Наступні кроки

1. Виправити `/tmp/router-config-final.yml`
2. Перевірити YAML валідність
3. Скопіювати виправлений файл на NODE1
4. Перезапустити router

---

**Last Updated:** 2025-01-27  
**Status:** ⚠️ Потрібне виправлення YAML

