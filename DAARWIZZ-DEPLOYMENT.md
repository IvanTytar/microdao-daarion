# DAARWIZZ Telegram Bot - Deployment Guide

## Status
✅ **Docker Stack: RUNNING** (all services healthy)
- Router (9102) - ✅ healthy
- DevTools (8008) - ✅ healthy  
- CrewAI (9010) - ✅ healthy
- RBAC (9200) - ✅ healthy
- Gateway (9300) - ✅ healthy with DAARWIZZ prompt loaded

## Telegram Bot Info
- **Bot**: @DAARWIZZBot
- **Bot ID**: 8323412397
- **Token**: configured in `.env`
- **Webhook**: Not configured yet

## Next Steps

### 1. Expose Gateway to Internet

**Option A: Using ngrok (для тестування)**
```bash
# Install ngrok if needed
brew install ngrok  # or download from https://ngrok.com

# Start tunnel
ngrok http 9300

# You'll get URL like: https://abc123.ngrok.io
```

**Option B: Using CloudFlare Tunnel (production-ready)**
```bash
# Install cloudflared
brew install cloudflared

# Login and configure
cloudflared tunnel login
cloudflared tunnel create daarion-gateway
cloudflared tunnel route dns daarion-gateway gateway.daarion.city

# Start tunnel
cloudflared tunnel run daarion-gateway
```

**Option C: Direct domain + NGINX (production)**
```nginx
# /etc/nginx/sites-available/daarion-gateway
server {
    listen 443 ssl http2;
    server_name gateway.daarion.city;
    
    ssl_certificate /etc/letsencrypt/live/daarion.city/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/daarion.city/privkey.pem;
    
    location / {
        proxy_pass http://localhost:9300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Configure Telegram Webhook

Replace `YOUR_PUBLIC_URL` with the URL from step 1:

```bash
# Set webhook
curl -X POST "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/setWebhook" \
  -d "url=YOUR_PUBLIC_URL/telegram/webhook"

# Example with ngrok:
curl -X POST "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/setWebhook" \
  -d "url=https://abc123.ngrok.io/telegram/webhook"

# Verify webhook
curl "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getWebhookInfo" | jq
```

### 3. Test DAARWIZZ

Send message to @DAARWIZZBot in Telegram:
```
Привіт! Хто ти?
```

Expected response:
```
Привіт! Я — DAARWIZZ, AI-агент екосистеми DAARION.city. 
Я тут, щоб допомогти вам з питаннями про проєкт, 
координувати ресурси і надавати інформацію про 
децентралізовані DAO і Web3-інфраструктуру.
```

### 4. Monitor Logs

```bash
# All services
docker compose logs -f

# Gateway only
docker compose logs -f gateway

# Router only  
docker compose logs -f router

# Check DAARWIZZ prompt loading
docker compose logs gateway | grep -i daarwizz
```

## Troubleshooting

### Webhook not working
```bash
# Check webhook status
curl "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getWebhookInfo"

# Delete webhook (reset)
curl -X POST "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/deleteWebhook"

# Test Gateway directly
curl -X POST http://localhost:9300/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"text":"test"}}'
```

### Gateway not responding
```bash
# Check health
curl http://localhost:9300/health

# Restart Gateway
docker compose restart gateway

# Check Gateway logs
docker compose logs gateway --tail 50
```

### DAARWIZZ prompt not loaded
```bash
# Check prompt file exists in container
docker exec dagi-gateway ls -la /app/gateway-bot/daarwizz_prompt.txt

# Check prompt content
docker exec dagi-gateway cat /app/gateway-bot/daarwizz_prompt.txt
```

## Architecture Flow

```
User (Telegram) 
  → @DAARWIZZBot
  → Telegram API (webhook)
  → Gateway (port 9300)
    ├─ Load DAARWIZZ prompt
    ├─ Enrich context (dao_id, user_id, agent="daarwizz")
    └─ Forward to Router
  → Router (port 9102)
    ├─ Fetch RBAC context (port 9200)
    ├─ Inject system prompt
    └─ Call Ollama qwen3:8b
  → LLM Response
  → Gateway
  → Telegram API
  → User
```

## Security Notes

1. **Never commit `.env`** - token is in `.gitignore`
2. **HTTPS only** for webhook URL (Telegram requirement)
3. **Firewall rules** - only Gateway port 9300 needs public access
4. **Rate limiting** - consider adding rate limits to Gateway
5. **Monitoring** - set up alerts for Gateway downtime

## Performance

Current setup (local Ollama qwen3:8b):
- **Response time**: 2-5 seconds for typical query
- **Concurrent users**: ~10 with local LLM
- **Scaling**: Add remote LLM profiles for more load

For production scale, configure remote LLM in `router-config.yml`:
```yaml
llm_profiles:
  - profile_id: "production-qwen-remote"
    provider_id: "openai_remote"
    model: "qwen3-8b"
    base_url: "https://api.your-llm-provider.com"
    api_key_env: "REMOTE_LLM_API_KEY"
```

## What's Next

After successful deployment:
1. ✅ Collect 5-10 real dialogs
2. ✅ Analyze patterns and update `docs/SCENARIOS.md`
3. ✅ Monitor performance and adjust token limits
4. ✅ Set up auto-restart/watchdog for production reliability
5. ✅ Integrate with Dify (see `docs/integrations/dify-integration.md`)

---

**Last Updated**: 2025-11-15  
**DAGI Stack Version**: 0.2.0  
**DAARWIZZ Agent**: Active
