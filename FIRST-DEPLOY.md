# First Live Deployment Guide

Step-by-step guide for the first production deployment of DAGI Stack.

---

## 📋 Pre-Deployment Checklist

### Environment
- [ ] Server/VM with Ubuntu 20.04+ or similar
- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] 4GB+ RAM available
- [ ] 10GB+ disk space available
- [ ] Network ports available: 9102, 9300, 8008, 9010, 9200

### Credentials
- [ ] Telegram bot created (via @BotFather)
- [ ] Telegram bot token obtained
- [ ] Discord bot created (optional)
- [ ] Ollama installed and qwen3:8b model pulled (or remote LLM API key)

### Repository
- [ ] Repository cloned to `/opt/dagi-stack` (or preferred location)
- [ ] Git history clean (no secrets committed)
- [ ] `.env` not in git history

---

## 🚀 Deployment Steps

### Step 1: Initial Setup (5 min)

```bash
# 1. Navigate to project directory
cd /opt/dagi-stack

# 2. Copy environment template
cp .env.example .env

# 3. Generate secrets
export RBAC_SECRET_KEY=$(openssl rand -hex 32)
echo "Generated RBAC secret: $RBAC_SECRET_KEY"

# 4. Edit .env with your values
nano .env
```

**Required variables in `.env`:**
```bash
# Bots (REQUIRED)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# LLM (REQUIRED)
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=qwen3:8b

# Security (REQUIRED)
RBAC_SECRET_KEY=<your_generated_secret_here>

# Ports (optional - defaults are fine)
ROUTER_PORT=9102
GATEWAY_PORT=9300
DEVTOOLS_PORT=8008
CREWAI_PORT=9010
RBAC_PORT=9200

# Environment
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
LOG_FORMAT=json
```

**Save and exit** (`Ctrl+X`, then `Y`, then `Enter`)

---

### Step 2: Pre-flight Checks (2 min)

```bash
# 1. Verify Docker
docker --version
# Expected: Docker version 20.10.0 or higher

docker-compose --version
# Expected: Docker Compose version 2.0.0 or higher

# 2. Verify disk space
df -h /var/lib/docker
# Expected: 10GB+ available

# 3. Verify memory
free -h
# Expected: 4GB+ available

# 4. Verify .env configured
cat .env | grep -v '^#' | grep -v '^$' | head -10
# Expected: Your configured values (tokens, secrets)

# 5. Verify Ollama (if using local LLM)
curl http://localhost:11434/api/tags
# Expected: JSON response with available models including qwen3:8b
```

---

### Step 3: Service Startup (3 min)

```bash
# 1. Start all services in detached mode
docker-compose up -d

# Expected output:
# Creating network "dagi-network" ... done
# Creating dagi-router ... done
# Creating devtools-backend ... done
# Creating crewai-orchestrator ... done
# Creating rbac-service ... done
# Creating gateway-bot ... done

# 2. Wait for services to initialize
sleep 30

# 3. Check service status
docker-compose ps

# Expected: All services "Up" with "healthy" status
# NAME                STATUS
# dagi-router         Up (healthy)
# devtools-backend    Up (healthy)
# crewai-orchestrator Up (healthy)
# rbac-service        Up (healthy)
# gateway-bot         Up (healthy)
```

**If any service is not healthy:**
```bash
# Check logs for specific service
docker-compose logs <service_name>

# Example: Check router logs
docker-compose logs router
```

---

### Step 4: Health Verification (2 min)

```bash
# Run automated smoke tests
./smoke.sh

# Expected output:
# 🧪 DAGI Stack Smoke Tests
# =========================
# 
# Running tests...
# 
# Testing Router health... ✓ PASSED
# Testing DevTools health... ✓ PASSED
# Testing CrewAI health... ✓ PASSED
# Testing RBAC health... ✓ PASSED
# Testing Gateway health... ✓ PASSED
# 
# Functional tests...
# 
# Testing Router → LLM... ✓ PASSED
# Testing DevTools → fs_read... ✓ PASSED
# Testing CrewAI → workflow list... ✓ PASSED
# Testing RBAC → role resolve... ✓ PASSED
# Testing Gateway → health... ✓ PASSED
# 
# =========================
# Results: 10 passed, 0 failed
# 
# ✅ All smoke tests passed!
```

**If tests fail:**
```bash
# Check individual service health manually
curl http://localhost:9102/health  # Router
curl http://localhost:8008/health  # DevTools
curl http://localhost:9010/health  # CrewAI
curl http://localhost:9200/health  # RBAC
curl http://localhost:9300/health  # Gateway

# Review logs
docker-compose logs -f
```

---

### Step 5: First Real Dialog (5 min)

**Option A: Via Telegram Bot**

1. Open Telegram and find your bot by username
2. Send message: `/start`
3. Send message: `Привіт! Що це за DAO?`
4. Wait for response (5-10 seconds)

**Expected response:**
- Bot replies with context about the DAO
- Response includes information from LLM

**Monitor logs in real-time:**
```bash
# In separate terminal
docker-compose logs -f gateway router rbac
```

**Expected log flow:**
```json
// Gateway receives Telegram update
{"timestamp":"2024-11-15T12:00:00Z","level":"INFO","service":"gateway","message":"POST /telegram/webhook","request_id":"abc-123"}

// Router receives request
{"timestamp":"2024-11-15T12:00:01Z","level":"INFO","service":"router","message":"POST /route","request_id":"abc-123","mode":"chat"}

// RBAC resolves user role
{"timestamp":"2024-11-15T12:00:01Z","level":"INFO","service":"rbac","message":"Resolved role","user_id":"tg:12345","role":"member"}

// Router sends to LLM
{"timestamp":"2024-11-15T12:00:02Z","level":"INFO","service":"router","message":"Routing to provider","provider":"llm_local_qwen3_8b"}

// Response returned
{"timestamp":"2024-11-15T12:00:05Z","level":"INFO","service":"router","message":"Response 200 (3250ms)","request_id":"abc-123"}
```

**Option B: Via curl (if Telegram not ready)**

```bash
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello from DAGI Stack!",
    "mode": "chat",
    "metadata": {
      "dao_id": "greenfood-dao",
      "user_id": "tg:12345"
    }
  }'
```

**Expected response:**
```json
{
  "response": "Hello! I'm the DAGI Stack AI assistant...",
  "provider": "llm_local_qwen3_8b",
  "metadata": {
    "dao_id": "greenfood-dao",
    "user_id": "tg:12345",
    "rbac": {
      "role": "member",
      "entitlements": ["chat_access", "read_proposals", "vote", "comment"]
    }
  }
}
```

---

## 📊 Post-Deployment Verification

### Logs Analysis

```bash
# 1. Check for errors in last 100 lines
docker-compose logs --tail=100 | grep -i error

# Expected: No critical errors

# 2. Check response times
docker-compose logs router | grep "duration_ms"

# Expected: Most requests < 5000ms (5s)

# 3. Check RBAC integration
docker-compose logs router | grep "rbac"

# Expected: RBAC context injected in requests
```

### Metrics Collection

```bash
# Create metrics baseline file
cat > /tmp/dagi-metrics-baseline.txt << 'METRICS'
Deployment Date: $(date)
First Request Time: TBD
Average LLM Response Time: TBD
RBAC Resolution Time: TBD
DevTools Latency: TBD
CrewAI Workflow Time: TBD
METRICS

echo "✅ Metrics baseline created at /tmp/dagi-metrics-baseline.txt"
```

---

## 🔍 Troubleshooting

### Issue: Service won't start

```bash
# 1. Check container logs
docker-compose logs <service>

# 2. Check resource usage
docker stats

# 3. Restart service
docker-compose restart <service>

# 4. If persistent, rebuild
docker-compose down
docker-compose up -d --build
```

### Issue: LLM timeout

```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/tags

# 2. Test LLM directly
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"qwen3:8b","prompt":"Hello"}'

# 3. Increase timeout in router-config.yml
nano router-config.yml
# Change timeout_ms: 60000 (60 seconds)

# 4. Restart router
docker-compose restart router
```

### Issue: Gateway not receiving messages

```bash
# 1. Verify bot token
echo $TELEGRAM_BOT_TOKEN

# 2. Test bot API
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# 3. Set webhook manually
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -d "url=https://your-domain.com:9300/telegram/webhook"

# 4. Check Gateway logs
docker-compose logs gateway
```

### Issue: RBAC errors

```bash
# 1. Test RBAC directly
curl -X POST http://localhost:9200/rbac/resolve \
  -H "Content-Type: application/json" \
  -d '{"dao_id":"greenfood-dao","user_id":"tg:12345"}'

# 2. Check RBAC database
docker-compose exec rbac ls -la /app/*.db

# 3. Restart RBAC service
docker-compose restart rbac
```

---

## 📝 Success Confirmation

After completing all steps, you should have:

- ✅ All 5 services running and healthy
- ✅ All smoke tests passing (10/10)
- ✅ First Telegram dialog successful
- ✅ RBAC context injected in requests
- ✅ Structured JSON logs flowing
- ✅ No critical errors in logs
- ✅ Response times acceptable (< 5s for chat)

---

## 🎉 Next Steps

### 1. Update CHANGELOG.md

```bash
nano CHANGELOG.md
```

Add entry:
```markdown
## [0.2.0] - 2024-11-15

### Milestone
- First live production deployment
- Telegram bot live with greenfood-dao
- All 5 services operational

### Verified
- Chat routing (Telegram → Gateway → Router → LLM)
- RBAC integration (role: member, entitlements: 4)
- DevTools health checks passing
- CrewAI workflows available
- Structured logging operational
```

### 2. Document First Dialog

```bash
# Save first dialog details
cat > /tmp/first-dialog-$(date +%Y%m%d).txt << 'DIALOG'
Date: $(date)
User: tg:12345
DAO: greenfood-dao
Prompt: "Привіт! Що це за DAO?"
Response: [paste response here]
Duration: 3.2s
RBAC Role: member
Entitlements: 4
Status: SUCCESS ✅
DIALOG
```

### 3. Run Golden Scenarios

See [SCENARIOS.md](SCENARIOS.md) for 5 production test scenarios:
1. Basic Chat
2. microDAO Onboarding
3. DevTools File Operation
4. Code Review Workflow
5. RBAC Permission Check

```bash
# Run scenarios manually or automated
./test-scenarios.sh
```

### 4. Monitor for 24 Hours

```bash
# Set up monitoring cron
crontab -e

# Add line:
*/5 * * * * /opt/dagi-stack/smoke.sh > /var/log/dagi-health.log 2>&1
```

---

## 📞 Support

If issues persist after troubleshooting:

1. **GitHub Issues**: https://github.com/daarion/dagi-stack/issues
2. **Discord**: https://discord.gg/daarion
3. **Email**: dev@daarion.city

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**First Dialog Success**: ⬜ Yes ⬜ No  
**All Tests Passing**: ⬜ Yes ⬜ No  
**Ready for Production**: ⬜ Yes ⬜ No  

---

**Version**: 0.2.0  
**Last updated**: 2024-11-15
