# Telegram Gateway Service

Сервіс для інтеграції Telegram-ботів з DAGI/microDAO через NATS message bus.

**Частина DAGI Stack** — див. [INFRASTRUCTURE.md](../../INFRASTRUCTURE.md) для повної інформації про інфраструктуру.

## Інтеграція з DAGI Stack

- **Router** (порт 9102): маршрутизація повідомлень до агентів
- **NATS** (порт 4222): event bus для подій `agent.telegram.update`
- **Local Telegram Bot API** (порт 8081): long polling без SSL/webhook

**Network Nodes:**
- **Node #1 (Production):** `144.76.224.179` — Hetzner GEX44
- **Node #2 (Development):** `192.168.1.244` — MacBook Pro M4 Max

## Архітектура

```
Telegram Bot → Local Bot API → telegram-gateway (polling) → NATS → Router/microDAO
                                                                    ↓
Telegram Bot ← Local Bot API ← telegram-gateway (/send) ← HTTP API ← Router/microDAO
```

## Особливості

- **Long Polling** через Local Telegram Bot API (без SSL/webhook)
- Автоматична ініціалізація ботів з конфігурації при старті
- Публікація подій `agent.telegram.update` у NATS
- HTTP API для відправки повідомлень (`/send`)
- Підтримка кількох ботів одночасно (DAARWIZZ, Helion, тощо)

## Швидкий старт

### 1. Конфігурація ботів

Створи файл `bots.yaml` в корені `telegram-gateway/`:

```yaml
bots:
  - agent_id: "daarwizz"
    bot_token: "YOUR_DAARWIZZ_BOT_TOKEN"
    enabled: true
    description: "DAARWIZZ agent bot"

  - agent_id: "helion"
    bot_token: "YOUR_HELION_BOT_TOKEN"
    enabled: true
    description: "Helion agent bot"
```

Або використовуй environment variables:

```bash
export BOT_DAARWIZZ_TOKEN="your_token_here"
export BOT_HELION_TOKEN="your_token_here"
```

### 2. Environment variables

У `.env` файлі (в корені `telegram-infrastructure/`):

```env
TELEGRAM_API_ID=XXXXXXX
TELEGRAM_API_HASH=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
NATS_URL=nats://nats:4222
TELEGRAM_API_BASE=http://telegram-bot-api:8081
DEBUG=false
```

### 3. Запуск

```bash
cd telegram-infrastructure

# Збірка
docker compose build telegram-gateway

# Запуск
docker compose up -d telegram-bot-api nats telegram-gateway

# Перевірка
curl http://localhost:8000/healthz
curl http://localhost:8000/bots/list
```

## API Endpoints

### `GET /healthz`
Health check endpoint.

**Відповідь:**
```json
{"status": "ok"}
```

### `GET /bots/list`
Список зареєстрованих ботів.

**Відповідь:**
```json
{
  "bots": ["daarwizz", "helion"],
  "count": 2
}
```

### `POST /bots/register`
Реєстрація нового бота (якщо не використовується `bots.yaml`).

**Request:**
```json
{
  "agent_id": "helion",
  "bot_token": "YOUR_BOT_TOKEN"
}
```

**Відповідь:**
```json
{
  "status": "registered",
  "agent_id": "helion"
}
```

### `POST /send`
Відправка повідомлення в Telegram від імені агента.

**Request:**
```json
{
  "agent_id": "helion",
  "chat_id": 123456789,
  "text": "Привіт від Helion!",
  "reply_to_message_id": null
}
```

**Відповідь:**
```json
{
  "status": "sent"
}
```

## NATS Events

### `agent.telegram.update`
Подія, яка публікується при отриманні повідомлення з Telegram.

**Payload:**
```json
{
  "agent_id": "helion",
  "bot_id": "bot:12345678",
  "chat_id": 123456789,
  "user_id": 987654321,
  "text": "Привіт!",
  "raw_update": { ... }
}
```

### `bot.registered`
Подія, яка публікується при реєстрації нового бота.

**Payload:**
```json
{
  "agent_id": "helion",
  "bot_token": "12345678..."
}
```

## Логування

Логи містять:
- Отримання повідомлень: `agent_id`, `chat_id`, `user_id`, довжина тексту
- Публікацію в NATS: subject, agent_id
- Відправку повідомлень: agent_id, chat_id, довжина тексту

Для детального логування встанови `DEBUG=true` в `.env`.

## Діагностика

### Перевірка webhook статусу

```bash
# DAARWIZZ
curl -s "https://api.telegram.org/bot<DAARWIZZ_TOKEN>/getWebhookInfo"

# Helion
curl -s "https://api.telegram.org/bot<HELION_TOKEN>/getWebhookInfo"
```

Якщо є проблеми з SSL/webhook, видали webhook:

```bash
curl -s "https://api.telegram.org/bot<HELION_TOKEN>/deleteWebhook"
```

### Перевірка сервісу

```bash
# Health check
curl http://localhost:8000/healthz

# Список ботів
curl http://localhost:8000/bots/list

# Логи
docker compose logs -f telegram-gateway
```

## Додавання нового бота

### Варіант 1: Через `bots.yaml`

Додай запис у `bots.yaml`:

```yaml
bots:
  - agent_id: "new_agent"
    bot_token: "NEW_BOT_TOKEN"
    enabled: true
```

Перезапусти сервіс:

```bash
docker compose restart telegram-gateway
```

### Варіант 2: Через HTTP API

```bash
curl -X POST http://localhost:8000/bots/register \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "new_agent",
    "bot_token": "NEW_BOT_TOKEN"
  }'
```

### Варіант 3: Через environment variable

```bash
export BOT_NEW_AGENT_TOKEN="NEW_BOT_TOKEN"
docker compose restart telegram-gateway
```

## Troubleshooting

### Бот не отримує повідомлення

1. Перевір, чи бот зареєстрований: `curl http://localhost:8000/bots/list`
2. Перевір логи: `docker compose logs telegram-gateway`
3. Перевір, чи видалено webhook: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`
4. Перевір, чи працює Local Bot API: `curl http://localhost:8081/bot<TOKEN>/getMe`

### Події не досягають NATS

1. Перевір підключення до NATS: `docker compose logs telegram-gateway | grep NATS`
2. Перевір, чи працює NATS: `docker compose ps nats`
3. Перевір логи на помилки публікації

### Повідомлення не відправляються

1. Перевір, чи бот зареєстрований
2. Перевір логи на помилки відправки
3. Перевір формат `agent_id` (має збігатися з тим, що в NATS подіях)

## Розробка

### Локальний запуск (без Docker)

```bash
cd telegram-gateway

# Встановити залежності
pip install -r requirements.txt

# Запустити
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Структура проєкту

```
telegram-gateway/
├── Dockerfile
├── requirements.txt
├── bots.yaml.example
├── README.md
└── app/
    ├── __init__.py
    ├── config.py          # Налаштування та завантаження конфігурації ботів
    ├── models.py          # Pydantic моделі
    ├── nats_client.py     # Клієнт NATS
    ├── bots_registry.py   # Реєстр ботів
    ├── telegram_listener.py  # Long polling та обробка повідомлень
    └── main.py            # FastAPI додаток
```

## Deployment

### Production Deployment

```bash
# З локальної машини
cd /Users/apple/github-projects/microdao-daarion/telegram-infrastructure
./scripts/deploy.sh production
```

### Development Deployment

```bash
# Локально
cd telegram-infrastructure
./scripts/deploy.sh development
```

### Health Check

```bash
./scripts/check-health.sh
```

## Інтеграція з DAGI Stack

### Підключення до Router

Router отримує події через NATS:
- Subject: `agent.telegram.update`
- Payload: `TelegramUpdateEvent` (див. `app/models.py`)

### Підключення до microDAO

microDAO може відправляти повідомлення через HTTP API:
- Endpoint: `POST /send`
- Payload: `TelegramSendCommand` (див. `app/models.py`)

### Network Configuration

Для інтеграції з DAGI Stack додай в `docker-compose.yml`:

```yaml
telegram-gateway:
  networks:
    - telegram-net
    - dagi-network  # Підключення до DAGI Stack
```

І створи external network:
```bash
docker network create dagi-network
```

## Майбутні покращення

- [ ] Персистентне сховище ботів (PostgreSQL/microDAO DB)
- [ ] Підписка на NATS `agent.telegram.send` для відправки через події
- [ ] Rate limiting
- [ ] Метрики (Prometheus)
- [ ] Підтримка інших типів повідомлень (документи, фото, тощо)
- [ ] Інтеграція з Grafana для моніторингу

## Документація

- [INFRASTRUCTURE.md](../../INFRASTRUCTURE.md) — повна інформація про інфраструктуру
- [docs/infrastructure_quick_ref.ipynb](../../docs/infrastructure_quick_ref.ipynb) — швидкий довідник
- [CURSOR_INSTRUCTIONS.md](../CURSOR_INSTRUCTIONS.md) — інструкції для розробки

