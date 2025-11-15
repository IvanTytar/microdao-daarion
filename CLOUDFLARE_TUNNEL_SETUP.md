# CloudFlare Tunnel Setup для Telegram Bot

## Швидке налаштування

### 1. Встановити cloudflared

```bash
# На сервері
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
```

### 2. Авторизуватися

```bash
cloudflared tunnel login
```

### 3. Створити тунель

```bash
cloudflared tunnel create dagi-gateway
```

### 4. Налаштувати route

```bash
cloudflared tunnel route dns dagi-gateway gateway.daarion.city
```

### 5. Створити конфіг

Створити файл `~/.cloudflared/config.yml`:

```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: gateway.daarion.city
    service: http://localhost:9300
  - service: http_status:404
```

### 6. Запустити тунель

```bash
# Як сервіс
cloudflared tunnel --config ~/.cloudflared/config.yml run dagi-gateway

# Або через systemd
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### 7. Оновити Telegram webhook

```bash
TELEGRAM_BOT_TOKEN="your-token"
WEBHOOK_URL="https://gateway.daarion.city/telegram/webhook"

curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}"
```

## Перевірка

```bash
# Перевірити webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# Перевірити тунель
curl https://gateway.daarion.city/health
```

