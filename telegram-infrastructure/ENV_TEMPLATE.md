# Environment Variables Template

Скопіюй цей файл як `.env` і заповни реальні значення.

```env
# Telegram Bot API (Local Bot API)
TELEGRAM_API_ID=XXXXXXX
TELEGRAM_API_HASH=XXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Telegram Gateway Service
TELEGRAM_API_BASE=http://telegram-bot-api:8081
NATS_URL=nats://nats:4222
ROUTER_BASE_URL=http://router:9102
DEBUG=false

# Bot Tokens (опційно, якщо не використовується bots.yaml)
# BOT_DAARWIZZ_TOKEN=8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
# BOT_HELION_TOKEN=8112062582:AAGI7tPFo4gvZ6bfbkFu9miq5GdAH2_LvcM
```

## Опис змінних

- `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` — отримай з https://my.telegram.org/apps
- `TELEGRAM_API_BASE` — URL Local Telegram Bot API (за замовчуванням: `http://telegram-bot-api:8081`)
- `NATS_URL` — URL NATS event bus (за замовчуванням: `nats://nats:4222`)
- `ROUTER_BASE_URL` — URL DAGI Router (за замовчуванням: `http://router:9102`)
- `DEBUG` — увімкнути детальне логування (`true`/`false`)

## Примітки

- Токени ботів краще зберігати в `bots.yaml` (не комітити в Git!)
- `.env` файл не повинен потрапляти в Git (додай до `.gitignore`)

