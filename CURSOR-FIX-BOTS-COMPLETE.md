# 🔧 КРИТИЧНЕ ВИПРАВЛЕННЯ: Telegram Bots Routing

## ❌ ПРОБЛЕМА
Обидва боти (DAARWIZZ і Helion) відповідають неправильно:
- Helion відповідає як Qwen (не використовує свій system_prompt)
- DAARWIZZ може відповідати в чат Helion (неправильний routing)

---

## 🎯 ЗАВДАННЯ

### 1️⃣ ПЕРЕВІРИТИ КОНФІГУРАЦІЮ НА СЕРВЕРІ

**Сервер:** 144.76.224.179 (root)
**Репозиторій на сервері:** `/opt/microdao-daarion`

Підключись до сервера і виконай:

```bash
cd /opt/microdao-daarion

# Перевірка 1: Токени в .env
echo "=== ТОКЕНИ ===="
grep "TELEGRAM_BOT_TOKEN" .env

# Має бути:
# DAARWIZZ_TELEGRAM_BOT_TOKEN=8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
# HELION_TELEGRAM_BOT_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
# (можна видалити TELEGRAM_BOT_TOKEN якщо є)

# Перевірка 2: Структура payload в Helion webhook
echo -e "\n=== HELION PAYLOAD СТРУКТУРА ==="
sed -n '466,473p' gateway-bot/http_api.py

# Має бути:
#             "payload": {
#                 "context": {
#                     "agent_name": HELION_NAME,
#                     "system_prompt": HELION_SYSTEM_PROMPT,
#                     "memory": memory_context,
#                 }
#             },

# Перевірка 3: Токени в контейнері gateway
echo -e "\n=== ТОКЕНИ В GATEWAY КОНТЕЙНЕРІ ==="
docker exec dagi-gateway printenv | grep "TELEGRAM_BOT_TOKEN"

# Перевірка 4: Webhooks в Telegram
echo -e "\n=== WEBHOOK URLs ==="
curl -s "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getWebhookInfo" | python3 -c "import sys, json; print('DAARWIZZ:', json.load(sys.stdin)['result'].get('url', 'NOT SET'))"

curl -s "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/getWebhookInfo" | python3 -c "import sys, json; print('Helion:', json.load(sys.stdin)['result'].get('url', 'NOT SET'))"
```

---

### 2️⃣ ВИПРАВЛЕННЯ

#### A. Якщо токени неправильні в .env:

```bash
cd /opt/microdao-daarion

# Виправити токени
cat > .env.tokens << 'EOF'
DAARWIZZ_TELEGRAM_BOT_TOKEN=8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
HELION_TELEGRAM_BOT_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
EOF

# Додати в .env (видаливши старі TELEGRAM_BOT_TOKEN рядки спочатку)
sed -i '/TELEGRAM_BOT_TOKEN/d' .env
cat .env.tokens >> .env
rm .env.tokens
```

#### B. Виправити Helion payload структуру:

**Файл:** `gateway-bot/http_api.py`  
**Рядки:** 466-473

**Замінити:**
```python
            "payload": {"context": {
                "agent_name": HELION_NAME,
                "system_prompt": HELION_SYSTEM_PROMPT,
                "memory": memory_context,
            },
            },
```

**На:**
```python
            "payload": {
                "context": {
                    "agent_name": HELION_NAME,
                    "system_prompt": HELION_SYSTEM_PROMPT,
                    "memory": memory_context,
                }
            },
```

**Суть:** `"context"` має бути всередині `"payload"` з правильним indent, а не `"payload": {"context":` в одному рядку.

#### C. Додати DAARWIZZ_TELEGRAM_BOT_TOKEN в docker-compose.yml:

**Файл:** `docker-compose.yml`  
**Секція:** `gateway` → `environment`

Знайди секцію gateway environment і **переконайся що є**:
```yaml
    environment:
      - ROUTER_URL=http://router:9102
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
      - DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN:-}
      - DAARWIZZ_TELEGRAM_BOT_TOKEN=${DAARWIZZ_TELEGRAM_BOT_TOKEN:-}  # ← МАЄ БУТИ
      - DAARWIZZ_NAME=${DAARWIZZ_NAME:-DAARWIZZ}
      - DAARWIZZ_PROMPT_PATH=/app/gateway-bot/daarwizz_prompt.txt
      - HELION_TELEGRAM_BOT_TOKEN=${HELION_TELEGRAM_BOT_TOKEN:-}
      - HELION_NAME=${HELION_NAME:-Helion}
      - HELION_PROMPT_PATH=/app/gateway-bot/helion_prompt.txt
      - MEMORY_SERVICE_URL=http://memory-service:8000
```

#### D. Перевірити webhooks registration:

```bash
# Отримати поточний Cloudflare tunnel URL
TUNNEL_URL=$(ps aux | grep cloudflared | grep -v grep | grep -oP 'http://[^ ]+' | head -1)
echo "Tunnel: $TUNNEL_URL"

# Якщо тунелю немає - створити новий
if [ -z "$TUNNEL_URL" ]; then
  # Зупинити старі
  pkill cloudflared
  
  # Створити новий
  nohup cloudflared tunnel --url http://localhost:9300 > /var/log/cloudflared.log 2>&1 &
  sleep 3
  
  # Отримати URL з логу
  TUNNEL_URL=$(grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' /var/log/cloudflared.log | head -1)
fi

echo "Using tunnel: $TUNNEL_URL"

# Зареєструвати webhooks
curl -X POST "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/setWebhook" \
  -d "url=${TUNNEL_URL}/telegram/webhook"

curl -X POST "https://api.telegram.org/bot8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM/setWebhook" \
  -d "url=${TUNNEL_URL}/helion/telegram/webhook"
```

---

### 3️⃣ ПЕРЕЗАПУСК СЕРВІСІВ

```bash
cd /opt/microdao-daarion

# Перезапустити gateway з новими змінними
docker compose up -d gateway

# Перезапустити router (якщо змінювали llm_provider)
docker compose restart router

# Почекати 5 секунд
sleep 5

# Перевірити що все працює
docker compose ps
docker compose logs --tail=10 gateway
docker compose logs --tail=10 router
```

---

### 4️⃣ ТЕСТУВАННЯ

Після виправлень:

#### Тест 1: DAARWIZZ бот
Надішли боту `@DAARWIZZBot`:
```
Хто ти?
```

**Очікувана відповідь:** Має згадувати DAARWIZZ, DAARION.city, microDAO

#### Тест 2: Helion бот  
Надішли боту (username потрібно дізнатись через `getMe`):
```
Хто ти і що таке EcoMiner?
```

**Очікувана відповідь:** Має згадувати Helion, Energy Union, EcoMiner

#### Якщо НЕ працює - дивись логи:

```bash
# Gateway логи (останні 30 рядків)
docker compose logs --tail=30 gateway | grep -E "helion|daarwizz|Sending to Router"

# Router логи (останні 30 рядків)  
docker compose logs --tail=30 router | grep -E "agent=|payload|context|DEBUG"
```

---

## 🔍 ДІАГНОСТИКА ПРОБЛЕМ

### Якщо Helion відповідає як Qwen:

1. **Перевір структуру payload** в `gateway-bot/http_api.py` (рядок 466)
2. **Перевір що HELION_SYSTEM_PROMPT завантажується:**
   ```bash
   docker compose logs gateway | grep -i "helion.*prompt\|prompt.*loaded"
   ```
3. **Додай debug в router:**
   ```bash
   # В providers/llm_provider.py після рядка 161
   docker exec dagi-router cat /app/providers/llm_provider.py | grep -A5 "_get_system_prompt"
   ```

### Якщо боти відповідають в неправильний чат:

1. **Перевір що `send_telegram_message` отримує правильний токен:**
   ```bash
   grep "send_telegram_message.*TELEGRAM_BOT_TOKEN" gateway-bot/http_api.py
   ```
   
   Має бути:
   - Рядок 198: `os.getenv("DAARWIZZ_TELEGRAM_BOT_TOKEN")`
   - Рядок 262: `os.getenv("DAARWIZZ_TELEGRAM_BOT_TOKEN")`  
   - Рядок 498: `os.getenv("HELION_TELEGRAM_BOT_TOKEN")`

2. **Перевір webhooks:**
   ```bash
   curl -s "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getWebhookInfo"
   ```
   URL має бути `/telegram/webhook` для DAARWIZZ

---

## ✅ КРИТЕРІЇ УСПІХУ

- ✅ DAARWIZZ бот відповідає про DAARION/microDAO
- ✅ Helion бот відповідає про Energy Union/EcoMiner (НЕ як Qwen)
- ✅ Кожен бот відповідає у свій чат (не плутає)
- ✅ Webhooks зареєстровані правильно
- ✅ Токени передаються в gateway контейнер

---

## 📝 ВАЖЛИВО

- **НЕ змінюй** файли prompt (`helion_prompt.txt`, `daarwizz_prompt.txt`) - вони правильні
- **НЕ створюй** нові webhook endpoints - вони є
- **Фокус на:** токени, payload структура, docker-compose environment
- **Після змін:** обов'язково перезапусти gateway і протестуй

---

**Після виконання - повідом про результат тестів!**
