# Helion AI Agent - Quick Start Guide

**Helion** — це AI-агент платформи Energy Union, який допомагає користувачам з технологіями EcoMiner/BioMiner, токеномікою (ENERGY, 1T, kWt, NFT) та DAO governance.

## 🎯 Основні функції

- **Технічна підтримка**: специфікації EcoMiner, BioMiner, когенерація
- **Токеноміка**: пояснення ENERGY, 1T, kWt токенів та NFT
- **DAO governance**: правила голосування, ролі, механіки
- **Multi-mode адаптація**: 9 режимів взаємодії (інвестор, інженер, новачок, тощо)
- **RAG верифікація**: всі відповіді базуються на перевіреній базі знань
- **Compliance**: 4-рівневий контроль доступу до інформації (R1-R4)

## 📋 Передумови

- Docker та Docker Compose встановлені
- Telegram Bot Token (отриманий від @BotFather)
- DAGI Stack запущений (router, gateway, memory-service)

## 🚀 Швидкий старт

### 1. Налаштування Telegram бота

```bash
# Створіть бота через @BotFather в Telegram
# Збережіть отриманий токен
```

### 2. Налаштування environment variables

```bash
# Відредагуйте .env файл
nano .env
```

Додайте:
```bash
# Helion Agent Configuration
HELION_TELEGRAM_BOT_TOKEN=ВАШ_ТОКЕН_ТУТ
HELION_NAME=Helion
HELION_PROMPT_PATH=./gateway-bot/helion_prompt.txt
```

### 3. Встановлення webhook для Telegram

```bash
# Замініть YOUR_BOT_TOKEN та YOUR_DOMAIN
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_DOMAIN/helion/telegram/webhook",
    "allowed_updates": ["message"]
  }'
```

Для локального тестування використовуйте ngrok:
```bash
# Запустіть ngrok
ngrok http 9300

# Використовуйте ngrok URL для webhook
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_NGROK_URL.ngrok.io/helion/telegram/webhook"
  }'
```

### 4. Запуск DAGI Stack

```bash
# З кореневої директорії проєкту
docker-compose up -d

# Перевірка логів
docker-compose logs -f gateway

# Перевірка здоров'я
curl http://localhost:9300/health
```

Очікуваний результат:
```json
{
  "status": "healthy",
  "agents": {
    "daarwizz": {
      "name": "DAARWIZZ",
      "prompt_loaded": true
    },
    "helion": {
      "name": "Helion",
      "prompt_loaded": true
    }
  },
  "timestamp": "2025-01-16T17:00:00Z"
}
```

### 5. Тестування бота

Відкрийте свого бота в Telegram і надішліть повідомлення:

```
Привіт! Що таке EcoMiner?
```

Helion має відповісти з технічними деталями про EcoMiner.

## 🧪 Тестові запити

### Для інвесторів
```
Який ROI від EcoMiner?
Які ризики інвестування в ENERGY токен?
```

### Для інженерів
```
Які технічні характеристики EcoMiner SES-77?
Як працює когенерація в системі?
```

### Для новачків
```
Що таке Energy Union?
Як почати користуватися платформою?
```

### Для DAO учасників
```
Як працює голосування в DAO?
Які є ролі учасників?
```

## 📊 Моніторинг

### Перевірка статусу

```bash
# Gateway health
curl http://localhost:9300/health

# Router health
curl http://localhost:9102/health

# Memory service health
curl http://localhost:8000/health
```

### Перегляд логів

```bash
# Всі сервіси
docker-compose logs -f

# Тільки gateway
docker-compose logs -f gateway

# Останні 100 рядків
docker-compose logs --tail=100 gateway
```

### Debugging

```bash
# Увійти в контейнер
docker exec -it dagi-gateway bash

# Перевірити файл промпту
cat /app/gateway-bot/helion_prompt.txt

# Перевірити env змінні
env | grep HELION
```

## 🔧 Налаштування

### Зміна системного промпту

1. Відредагуйте `gateway-bot/helion_prompt.txt`
2. Перезапустіть gateway:
   ```bash
   docker-compose restart gateway
   ```

### Додавання нових режимів взаємодії

Helion автоматично адаптується до типу користувача. Для налаштування редагуйте `helion_prompt.txt`.

### Налаштування memory context

Memory зберігається автоматично через Memory Service. Налаштуйте ліміт історії:

```python
# У http_api.py, функція helion_telegram_webhook
memory_context = await memory_client.get_context(
    user_id=f"tg:{user_id}",
    agent_id="helion",
    team_id=dao_id,
    channel_id=chat_id,
    limit=10  # Змініть це значення
)
```

## 🐛 Troubleshooting

### Бот не відповідає

1. Перевірте webhook встановлено:
   ```bash
   curl "https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo"
   ```

2. Перевірте gateway запущено:
   ```bash
   docker ps | grep dagi-gateway
   ```

3. Перевірте логи:
   ```bash
   docker-compose logs --tail=50 gateway
   ```

### Помилка "prompt file not found"

```bash
# Перевірте файл існує
ls -la gateway-bot/helion_prompt.txt

# Перевірте права доступу
chmod 644 gateway-bot/helion_prompt.txt
```

### Memory Service недоступний

```bash
# Перевірте memory-service запущено
docker ps | grep memory-service

# Запустіть якщо потрібно
docker-compose up -d memory-service
```

## 📚 Архітектура

```
User (Telegram)
      ↓
Telegram Bot API (webhook)
      ↓
Gateway Service (/helion/telegram/webhook)
      ↓
Memory Service (отримання контексту)
      ↓
DAGI Router (обробка з Helion промптом)
      ↓
LLM Provider (Ollama/DeepSeek)
      ↓
Memory Service (збереження історії)
      ↓
Telegram Bot API (відправка відповіді)
```

## 🔐 Security

- **Токени**: Ніколи не комітьте `.env` файл
- **Webhook**: Використовуйте HTTPS в продакшені
- **Rate limiting**: Налаштовано на рівні router
- **Compliance**: 4-рівнева система доступу R1-R4

## 📖 Додаткові ресурси

- [DAGI Stack Documentation](../WARP.md)
- [Router Configuration](../router-config.yml)
- [Agent Map](agents.md)
- [System Prompt](../gateway-bot/helion_prompt.txt)

## 🆘 Підтримка

- GitHub Issues: [IvanTytar/microdao-daarion](https://github.com/IvanTytar/microdao-daarion/issues)
- Energy Union: energyunion.io
- DAARION.city ecosystem

---

**Version**: 1.0  
**Last Updated**: 2025-01-16  
**Status**: Production Ready ✅
