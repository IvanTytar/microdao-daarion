# DAARWIZZ Quick Start Guide

**@DAARWIZZBot** is now live and ready to connect to DAGI Stack!

---

## 🎯 Bot Information

- **Username**: [@DAARWIZZBot](https://t.me/DAARWIZZBot)
- **Bot ID**: 8323412397
- **Token**: `8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M` ✅ (stored in `.env`)
- **Status**: Active ✅

---

## 🚀 Quick Start (5 steps)

### Step 1: Verify Token

Token already added to `.env`:
```bash
TELEGRAM_BOT_TOKEN=8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M
```

**Test bot**:
```bash
curl "https://api.telegram.org/bot8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M/getMe"
```

### Step 2: Deploy Services

```bash
cd /opt/dagi-router

# Build and start Gateway with DAARWIZZ
docker-compose up -d --build gateway

# Start other services if needed
docker-compose up -d router rbac

# Check status
docker-compose ps
```

### Step 3: Get Public URL

**Option A: Using ngrok (for testing)**
```bash
# Install ngrok
sudo snap install ngrok

# Start tunnel
ngrok http 9300

# Copy https URL (e.g., https://abc123.ngrok.io)
```

**Option B: Using your domain**
```
https://your-domain.com:9300
```

### Step 4: Set Webhook

Replace `YOUR_PUBLIC_URL` with your ngrok or domain URL:

```bash
export BOT_TOKEN="8323412397:AAFxaru-hHRl08A3T6TC02uHLvO5wAB0m3M"
export PUBLIC_URL="https://abc123.ngrok.io"  # or your domain

curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -d "url=$PUBLIC_URL/telegram/webhook" \
  -d "drop_pending_updates=true"
```

**Expected response**:
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

**Verify webhook**:
```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

### Step 5: Test DAARWIZZ

1. **Open Telegram** and search for [@DAARWIZZBot](https://t.me/DAARWIZZBot)
2. **Send message**: `/start`
3. **Send message**: `Привіт! Хто ти?`

**Expected response**:
```
Привіт! Я — DAARWIZZ, AI-агент екосистеми DAARION.city.

Я допомагаю учасникам розібратися з:
• microDAO та їх структурою
• Ролями і правами доступу (RBAC)
• Процесами голосування та пропозиціями
• Завданнями та винагородами

Чим можу допомогти?
```

---

## 📊 Monitoring

### Check Logs

```bash
# Gateway logs (DAARWIZZ)
docker-compose logs -f gateway

# Router logs
docker-compose logs -f router

# All logs
docker-compose logs -f
```

**Expected log entries**:
```
gateway | INFO: DAARWIZZ system prompt loaded (1243 chars)
gateway | INFO: Telegram message from user123 (tg:12345): Привіт! Хто ти?
gateway | INFO: Sending to Router: agent=daarwizz, dao=greenfood-dao
router  | INFO: Received request: mode=chat, agent=daarwizz
router  | INFO: RBAC context: role=member, entitlements=4
router  | INFO: Routing to llm_local_qwen3_8b
router  | INFO: Response generated (234 chars, 3.1s)
gateway | INFO: Telegram message sent to chat 12345
```

### Health Checks

```bash
# Gateway health
curl http://localhost:9300/health

# Router health
curl http://localhost:9102/health

# RBAC health
curl http://localhost:9200/health
```

---

## 🔧 Troubleshooting

### Issue: Bot not responding

**Check webhook status**:
```bash
curl "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo"
```

**Check if public URL is accessible**:
```bash
curl https://your-ngrok-url.ngrok.io/telegram/webhook
# Should return: Method Not Allowed (POST expected)
```

**Check Gateway logs**:
```bash
docker-compose logs gateway | grep ERROR
```

### Issue: Gateway not receiving messages

**Verify Gateway is running**:
```bash
docker-compose ps gateway
# STATUS should be "Up (healthy)"
```

**Test Gateway directly**:
```bash
curl -X POST http://localhost:9300/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": 1,
      "from": {"id": 12345, "username": "test"},
      "chat": {"id": 12345, "type": "private"},
      "text": "Test"
    }
  }'
```

### Issue: LLM not responding

**Check Ollama**:
```bash
curl http://localhost:11434/api/tags
```

**If Ollama not running**:
```bash
# Start Ollama
ollama serve &

# Pull model
ollama pull qwen3:8b
```

**Check Router config**:
```bash
cat router-config.yml | grep -A5 llm_local
```

---

## 🎛️ Configuration

### Bot Settings (via BotFather)

1. **Set Description** (shown in bot info):
   ```
   /setdescription @DAARWIZZBot
   ```
   ```
   DAARWIZZ - Official AI agent for DAARION.city ecosystem. 
   Helps members navigate microDAO processes, roles, and governance.
   ```

2. **Set About** (shown when starting bot):
   ```
   /setabouttext @DAARWIZZBot
   ```
   ```
   I'm DAARWIZZ, your AI guide for DAARION.city microDAOs. 
   Ask me about roles, permissions, proposals, and DAO operations!
   ```

3. **Set Commands**:
   ```
   /setcommands @DAARWIZZBot
   ```
   ```
   start - Start conversation with DAARWIZZ
   help - Show available commands
   info - Get your role and permissions
   docs - View microDAO documentation
   proposals - List active proposals
   ```

4. **Set Profile Picture**:
   - Upload DAARWIZZ logo via `/setuserpic @DAARWIZZBot`

### Customize DAARWIZZ Personality

Edit system prompt:
```bash
nano gateway-bot/daarwizz_prompt.txt
```

Rebuild and restart:
```bash
docker-compose build gateway
docker-compose restart gateway
```

---

## 📈 Next Steps

### Phase 4 Enhancements

1. **Knowledge Base Integration**
   - Connect DAARWIZZ to microdao-daarion docs
   - Implement RAG for contextual answers

2. **Workflow Triggers**
   - `/onboard` → triggers CrewAI onboarding workflow
   - `/review` → triggers code review workflow

3. **Multi-language Support**
   - Auto-detect user language (UK/EN)
   - Respond in user's language

4. **Analytics**
   - Track usage patterns
   - Identify common questions
   - Improve responses iteratively

---

## 🔗 Resources

- **Bot Link**: https://t.me/DAARWIZZBot
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **DAARWIZZ Docs**: [docs/DAARWIZZ.md](docs/DAARWIZZ.md)
- **Gateway Code**: [gateway-bot/http_api.py](gateway-bot/http_api.py)
- **System Prompt**: [gateway-bot/daarwizz_prompt.txt](gateway-bot/daarwizz_prompt.txt)

---

## ✅ Checklist

- [x] Bot created (@DAARWIZZBot)
- [x] Token stored in .env
- [ ] Services deployed (docker-compose up -d)
- [ ] Public URL obtained (ngrok or domain)
- [ ] Webhook configured
- [ ] First dialog tested
- [ ] Logs verified
- [ ] Bot description set (optional)
- [ ] Profile picture uploaded (optional)

---

**DAARWIZZ is ready to chat!** 🎉

Open Telegram → https://t.me/DAARWIZZBot → Start conversation!

**Version**: 0.2.0  
**Last Updated**: 2024-11-15
