# 🤖 Аудит Telegram Ботів на NODE1

**Дата:** 2025-11-24  
**NODE1 IP:** 144.76.224.179  
**Gateway Port:** 8443 (через nginx-gateway)  
**Gateway Container:** dagi-gateway (HEALTHY, Up 31 minutes)

---

## 📊 Статус Telegram Ботів

### ✅ Токени в .env (NODE1)

| # | Агент | Token | Статус |
|---|-------|-------|--------|
| 1 | CLAN | `8516872152:AAGbjL6zCMOCqHgu9rcuagdhm0LEwYJFpKw` | ✅ Токен є |
| 2 | DAARWIZZ | `8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M` | ✅ Токен є |
| 3 | DRUID | `8145618489:AAGgR5KmPr9P1_ppSrFa_Gpq5yqf3vNJ5AQ` | ✅ Токен є |
| 4 | EONARCH | `7962391584:AAFYkelLRG3VR_Lxuu6pEGG76t4vZdANtz4` | ✅ Токен є |
| 5 | GREENFOOD | `7495165343:AAHpxY8w3iXevaQT2rfj97OHLauu9Iq8vYM` | ✅ Токен є |
| 6 | HELION | `8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM` | ✅ Токен є |
| 7 | NUTRA | `PLACEHOLDER_ADD_NUTRA_TOKEN_LATER` | ❌ Placeholder |
| 8 | SOUL | `8041596416:AAGyHEjalPEH2TC0AOxfIQ2aZvFTFRanO0g` | ✅ Токен є |
| 9 | YAROMIR | `8128180674:AAGNZdG3LwECI4z_803smsuRHsK3nPdjMLY` | ✅ Токен є |

**ВСЬОГО:** 9 змінних токенів  
**Реальних токенів:** 8 (NUTRA = placeholder)

---

## 📝 System Prompts

| # | Файл | Статус |
|---|------|--------|
| 1 | `clan_prompt.txt` | ✅ Існує |
| 2 | `daarwizz_prompt.txt` | ✅ Існує |
| 3 | `dario_prompt.txt` | ✅ Існує (агент без Telegram) |
| 4 | `domir_prompt.txt` | ✅ Існує (CrewAI internal) |
| 5 | `druid_prompt.txt` | ✅ Існує |
| 6 | `eonarch_prompt.txt` | ✅ Існує |
| 7 | `greenfood_prompt.txt` | ✅ Існує |
| 8 | `helion_prompt.txt` | ✅ Існує |
| 9 | `nutra_prompt.txt` | ✅ Існує |
| 10 | `provodnik_prompt.txt` | ✅ Існує (CrewAI internal) |
| 11 | `soul_prompt.txt` | ✅ Існує |
| 12 | `sozdatel_prompt.txt` | ✅ Існує (CrewAI internal) |
| 13 | `vozhd_prompt.txt` | ✅ Існує (CrewAI internal) |

**ВСЬОГО:** 13 промптів

---

## 🔗 Зареєстровані Webhook Endpoints (http_api.py)

З коду `http_api.py` (2066 рядків):

```python
@router.post("/telegram/webhook")           # DAARWIZZ (default)
@router.post("/helion/telegram/webhook")    # HELION
@router.post("/greenfood/telegram/webhook") # GREENFOOD
```

**ВСЬОГО:** Тільки 3 endpoints зареєстровані! ❌

---

## 🚨 Критичні Проблеми

### 1. ❌ 404 Not Found (6 ботів без endpoints)

**Боти з 404:**
- `CLAN` → `/clan/telegram/webhook` (NOT REGISTERED)
- `DAARWIZZ` → `/daarwizz/telegram/webhook` (NOT REGISTERED, використовує `/telegram/webhook`)
- `DRUID` → `/druid/telegram/webhook` (NOT REGISTERED)
- `EONARCH` → `/eonarch/telegram/webhook` (NOT REGISTERED)
- `SOUL` → НЕ ТЕСТУВАВСЯ
- `YAROMIR` → НЕ ТЕСТУВАВСЯ
- `NUTRA` → Немає реального токену

**Причина:** В `http_api.py` зареєстровані тільки 3 webhook endpoints, але вебхуки налаштовані для 8 ботів.

### 2. ❌ 500 Internal Server Error (GREENFOOD)

**Лог помилки:**
```python
AttributeError: 'NoneType' object has no attribute 'get'
File "/app/gateway-bot/http_api.py", line 729, in handle_telegram_webhook
    from_user = update.message.get("from", {})
                ^^^^^^^^^^^^^^^^^^
```

**Причина:** `update.message` є `None`. Баг в обробці Telegram updates.

**Pending Updates:** 10 повідомлень в черзі

### 3. ⚠️ Wrong Webhook URLs

**DAARWIZZ Webhook:**
```
url: "https://144.76.224.179:8443/daarwizz/telegram/webhook"
pending_update_count: 10
last_error: "Wrong response from the webhook: 404 Not Found"
```

**HELION Webhook:**
```
url: "https://144.76.224.179:8443/helion/telegram/webhook"
pending_update_count: 0
last_error: "Connection refused"
```

**GREENFOOD Webhook:**
```
url: "https://144.76.224.179:8443/greenfood/telegram/webhook"
pending_update_count: 10
last_error: "Wrong response from the webhook: 500 Internal Server Error"
```

---

## 🔧 Nginx Конфігурація

```nginx
location ~ ^/([a-z0-9_-]+)/telegram/webhook$ {
    proxy_pass http://gateway;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Статус:** ✅ Nginx коректно проксує всі `/*/telegram/webhook` запити  
**Проблема:** Gateway (dagi-gateway) не має endpoints для всіх ботів

---

## 📋 Telegram Боти з INFRASTRUCTURE.md

Згідно з документацією повинні бути:

1. ✅ **DAARWIZZ** (@DAARWIZZBot) — токен є, endpoint `/telegram/webhook` працює
2. ✅ **Helion** (@HelionEnergyBot) — токен є, endpoint зареєстрований
3. ⚠️ **GREENFOOD** — токен є, endpoint зареєстрований, але 500 error
4. ❌ **CLAN** — токен є, endpoint НЕ зареєстрований
5. ❌ **DRUID** — токен є, endpoint НЕ зареєстрований
6. ❌ **EONARCH** — токен є, endpoint НЕ зареєстрований
7. ❌ **SOUL** — токен є, endpoint НЕ зареєстрований
8. ❌ **YAROMIR** — токен є (CrewAI Orchestrator), endpoint НЕ зареєстрований
9. ❌ **NUTRA** — PLACEHOLDER токен

---

## 🎯 План Виправлення

### Фаза 1: Виправити GREENFOOD (500 error)

**Файл:** `/opt/microdao-daarion/gateway-bot/http_api.py:729`

**Проблема:**
```python
from_user = update.message.get("from", {})  # update.message is None
```

**Рішення:**
```python
message = getattr(update, 'message', None) or getattr(update, 'edited_message', None)
if not message:
    logger.warning(f"No message in update: {update}")
    return {"ok": True}  # Ignore non-message updates

from_user = message.get("from", {})
```

### Фаза 2: Додати endpoints для всіх ботів

**Архітектура (з INFRASTRUCTURE.md):**

```python
BOT_CONFIGS = {
    "clan": {
        "agent_id": "agent-clan",
        "token": os.getenv("CLAN_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "clan_prompt.txt"
    },
    "druid": {
        "agent_id": "agent-druid",
        "token": os.getenv("DRUID_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "druid_prompt.txt"
    },
    "eonarch": {
        "agent_id": "agent-eonarch",
        "token": os.getenv("EONARCH_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "eonarch_prompt.txt"
    },
    "soul": {
        "agent_id": "agent-soul",
        "token": os.getenv("SOUL_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "soul_prompt.txt"
    },
    "yaromir": {
        "agent_id": "agent-yaromir",
        "token": os.getenv("YAROMIR_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "yaromir_prompt.txt",
        "crewai_orchestrator": True
    },
    "nutra": {
        "agent_id": "agent-nutra",
        "token": os.getenv("NUTRA_TELEGRAM_BOT_TOKEN"),
        "prompt_file": "nutra_prompt.txt"
    }
}

# Додати endpoints:
@router.post("/clan/telegram/webhook")
async def clan_telegram_webhook(update: TelegramUpdate):
    return await handle_telegram_webhook(BOT_CONFIGS["clan"], update)

@router.post("/druid/telegram/webhook")
async def druid_telegram_webhook(update: TelegramUpdate):
    return await handle_telegram_webhook(BOT_CONFIGS["druid"], update)

# ... і так далі для всіх ботів
```

### Фаза 3: Re-register Webhooks

```bash
# Скрипт для перереєстрації всіх webhook
ssh root@144.76.224.179 "cd /opt/microdao-daarion && ./scripts/register-all-webhooks.sh"
```

Або вручну:
```bash
TOKEN="8516872152:AAGbjL6zCMOCqHgu9rcuagdhm0LEwYJFpKw"
curl -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -d "url=https://144.76.224.179:8443/clan/telegram/webhook"
```

### Фаза 4: Додати реальний токен для NUTRA

**BotFather → створити @NUTRABot → отримати токен → додати в .env**

---

## ✅ Рекомендації

### 1. Використати Universal Webhook (Оптимальне рішення)

Замість окремих endpoints для кожного бота:

```python
@router.post("/{bot_id}/telegram/webhook")
async def universal_telegram_webhook(bot_id: str, update: TelegramUpdate):
    """Universal webhook for all Telegram bots."""
    bot_config = BOT_CONFIGS.get(bot_id)
    if not bot_config:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' not found")
    
    return await handle_telegram_webhook(bot_config, update)
```

**Переваги:**
- ✅ Один endpoint для всіх ботів
- ✅ Автоматична підтримка нових ботів
- ✅ Менше коду для підтримки

### 2. Створити BOT_CONFIGS централізовано

```python
BOT_CONFIGS = {
    bot_id: {
        "agent_id": f"agent-{bot_id}",
        "token": os.getenv(f"{bot_id.upper()}_TELEGRAM_BOT_TOKEN"),
        "prompt_file": f"{bot_id}_prompt.txt",
        "memory_scope": "channel",
        "multimodal": True  # voice/photo/document support
    }
    for bot_id in ["clan", "daarwizz", "druid", "eonarch", "greenfood", 
                   "helion", "soul", "yaromir", "nutra"]
}
```

### 3. Додати Health Check для кожного бота

```python
@router.get("/bots/health")
async def bots_health_check():
    """Check health of all Telegram bots."""
    results = {}
    for bot_id, config in BOT_CONFIGS.items():
        token = config["token"]
        if not token or token.startswith("PLACEHOLDER"):
            results[bot_id] = {"status": "no_token", "token": False}
            continue
        
        # Check bot via getMe
        try:
            resp = requests.get(f"https://api.telegram.org/bot{token}/getMe")
            if resp.status_code == 200:
                results[bot_id] = {"status": "ok", "bot": resp.json()["result"]}
            else:
                results[bot_id] = {"status": "error", "error": resp.text}
        except Exception as e:
            results[bot_id] = {"status": "error", "error": str(e)}
    
    return results
```

### 4. Automated Webhook Registration Script

```bash
#!/bin/bash
# scripts/register-all-webhooks.sh

DOMAIN="144.76.224.179:8443"
BOTS="clan daarwizz druid eonarch greenfood helion soul yaromir nutra"

for bot in $BOTS; do
    TOKEN_VAR="${bot^^}_TELEGRAM_BOT_TOKEN"
    TOKEN="${!TOKEN_VAR}"
    
    if [[ "$TOKEN" == "PLACEHOLDER"* ]]; then
        echo "⚠️  $bot: skipping (placeholder token)"
        continue
    fi
    
    WEBHOOK_URL="https://$DOMAIN/$bot/telegram/webhook"
    
    echo "🔗 Registering webhook for $bot..."
    curl -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
      -d "url=$WEBHOOK_URL" \
      -d "drop_pending_updates=true"
    
    echo ""
done
```

---

## 📊 Підсумок

### Проблеми:
- ❌ **6 ботів** не мають зареєстрованих endpoints (404)
- ❌ **1 бот** (GREENFOOD) має критичний баг (500)
- ❌ **1 бот** (NUTRA) має placeholder токен
- ⚠️ **10+ pending updates** в чергах DAARWIZZ та GREENFOOD

### Рішення:
1. ✅ Виправити баг в `handle_telegram_webhook` (GREENFOOD 500)
2. ✅ Додати universal webhook endpoint
3. ✅ Створити централізований BOT_CONFIGS
4. ✅ Перереєструвати всі webhooks
5. ✅ Додати реальний токен для NUTRA
6. ✅ Додати health check для моніторингу

### Пріоритет:
1. 🔥 **КРИТИЧНИЙ:** Виправити GREENFOOD (500) + очистити pending updates
2. 🔥 **КРИТИЧНИЙ:** Додати endpoints для CLAN, DRUID, EONARCH, SOUL, YAROMIR
3. ⚠️ **ВАЖЛИВО:** Перереєструвати webhooks з `drop_pending_updates=true`
4. 📝 **ДОДАТКОВО:** Додати NUTRA токен + health check

---

**Статус:** 🟡 ГОТОВО ДО ВИПРАВЛЕННЯ  
**Час на виправлення:** ~2 години  
**Last Updated:** 2025-11-24 by Claude





