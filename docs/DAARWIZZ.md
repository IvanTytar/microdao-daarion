# DAARWIZZ - AI Agent for DAARION.city

**DAARWIZZ** is the official AI agent for the DAARION.city ecosystem, designed to help community members navigate microDAO processes, understand roles, and interact with the DAGI Stack.

---

## 🎯 What is DAARWIZZ?

DAARWIZZ is an intelligent agent that:
- **Guides users** through microDAO operations
- **Explains roles** and permissions (RBAC)
- **Answers questions** about DAO processes
- **Provides onboarding** for new members
- **Enforces security** by respecting user entitlements

---

## 🧠 Personality & Behavior

### Core Traits
- **Helpful**: Provides practical, actionable guidance
- **Concise**: Avoids unnecessary explanations
- **Security-aware**: Respects RBAC permissions
- **Honest**: Admits when it doesn't know something
- **Professional yet friendly**: Approachable but not casual

### Style Guidelines
- Short paragraphs, no fluff
- Step-by-step instructions when needed
- Uses numbered lists for procedures
- Always considers user's role and permissions

---

## 📋 System Prompt

DAARWIZZ's behavior is defined by its system prompt located at:
```
gateway-bot/daarwizz_prompt.txt
```

**Key elements:**
1. Identity: Official DAARION.city AI agent
2. Role: Help with microDAO, roles, processes
3. Context awareness: Uses dao_id, user_id, RBAC data
4. Limitations: No legal/financial/medical advice
5. Knowledge boundaries: Only DAARION/microDAO topics

---

## 🔄 How DAARWIZZ Works

### Message Flow

```
User (Telegram)
    ↓ "Привіт! Що це за DAO?"
Gateway (:9300)
    ↓ Load daarwizz_prompt.txt
    ↓ Build request with agent="daarwizz"
Router (:9102)
    ↓ Fetch RBAC context
RBAC (:9200)
    ↓ role: member, entitlements: [chat, vote, comment]
Router
    ↓ Inject RBAC + system_prompt
LLM Provider (Ollama/OpenAI)
    ↓ Generate response with full context
Gateway
    ↓ Send to Telegram
User receives answer
```

---

## 🛠️ Technical Implementation

### Gateway Integration

**File**: `gateway-bot/http_api.py`

```python
# Load DAARWIZZ prompt on startup
DAARWIZZ_SYSTEM_PROMPT = load_daarwizz_prompt()

# Build request to Router
router_request = {
    "prompt": text,
    "mode": "chat",
    "agent": "daarwizz",  # Agent identifier
    "metadata": {
        "dao_id": "greenfood-dao",
        "user_id": "tg:12345",
        ...
    },
    "context": {
        "agent_name": "DAARWIZZ",
        "system_prompt": DAARWIZZ_SYSTEM_PROMPT,
        # RBAC injected by Router
    },
}
```

### LLM Provider Support

**File**: `providers/llm_provider.py`

```python
def _get_system_prompt(self, req: RouterRequest) -> Optional[str]:
    # 1. Check context.system_prompt (from Gateway)
    context = req.payload.get("context") or {}
    if "system_prompt" in context:
        return context["system_prompt"]
    
    # 2. Agent-specific fallback
    if req.agent == "daarwizz":
        return "Ти — DAARWIZZ, AI-агент DAARION.city..."
    
    return None
```

### Docker Configuration

**File**: `gateway-bot/Dockerfile`

```dockerfile
# Copy DAARWIZZ prompt
COPY gateway-bot/daarwizz_prompt.txt /app/gateway-bot/daarwizz_prompt.txt

ENV DAARWIZZ_NAME=DAARWIZZ
ENV DAARWIZZ_PROMPT_PATH=/app/gateway-bot/daarwizz_prompt.txt
```

---

## 📖 Example Interactions

### Basic Greeting

**User**: `Привіт! Хто ти?`

**DAARWIZZ**: 
```
Привіт! Я — DAARWIZZ, AI-агент екосистеми DAARION.city. 

Я допомагаю учасникам розібратися з:
• microDAO та їх структурою
• Ролями і правами доступу (RBAC)
• Процесами голосування та пропозиціями
• Завданнями та винагородами

Чим можу допомогти?
```

### Role Information

**User**: `Які у мене права в цьому DAO?`

**DAARWIZZ** (with RBAC context):
```
У greenfood-dao ти маєш роль: member

Твої права (entitlements):
1. chat_access - писати в чат
2. read_proposals - читати пропозиції
3. vote - голосувати за пропозиції
4. comment - коментувати

Для більших прав (наприклад, створення пропозицій) потрібна роль contributor або вища.
```

### Onboarding

**User**: `Як розпочати роботу в DAO?`

**DAARWIZZ**:
```
Ласкаво просимо! Ось кроки для старту:

1. Ознайомся з документацією DAO (команда /docs)
2. Переглянь активні пропозиції (/proposals)
3. Познайомся з командою в чаті
4. Виконай перше завдання (/tasks)
5. Накопичуй репутацію для підвищення ролі

Твоя поточна роль: guest
Наступна роль: member (після 1 виконаного завдання)

Є питання? Запитуй!
```

---

## 🎛️ Customization

### Updating System Prompt

1. **Edit prompt file**:
   ```bash
   nano gateway-bot/daarwizz_prompt.txt
   ```

2. **Rebuild Gateway**:
   ```bash
   docker-compose build gateway
   docker-compose restart gateway
   ```

3. **Verify loading**:
   ```bash
   docker-compose logs gateway | grep "DAARWIZZ system prompt loaded"
   ```

### Environment Variables

```bash
# .env
DAARWIZZ_NAME=DAARWIZZ
DAARWIZZ_PROMPT_PATH=/app/gateway-bot/daarwizz_prompt.txt
```

---

## 🧪 Testing DAARWIZZ

### Local Test (curl)

```bash
curl -X POST http://localhost:9300/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": 1,
      "from": {"id": 12345, "username": "testuser"},
      "chat": {"id": 12345, "type": "private"},
      "text": "Привіт! Хто ти?"
    }
  }'
```

### Telegram Bot

1. **Set up webhook**:
   ```bash
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d "url=https://your-domain.com/telegram/webhook"
   ```

2. **Send message** to bot in Telegram

3. **Check logs**:
   ```bash
   docker-compose logs -f gateway router
   ```

### Expected Log Output

```
gateway | INFO: DAARWIZZ system prompt loaded (1243 chars)
gateway | INFO: Telegram message from testuser (tg:12345): Привіт! Хто ти?
gateway | INFO: Sending to Router: agent=daarwizz, dao=greenfood-dao
router  | INFO: Received request: mode=chat, agent=daarwizz
router  | INFO: RBAC context: role=member, entitlements=4
router  | INFO: Routing to llm_local_qwen3_8b
router  | INFO: Response generated (345 chars, 2.3s)
gateway | INFO: Telegram message sent to chat 12345
```

---

## 📊 Metrics & Monitoring

### Health Check

```bash
curl http://localhost:9300/health
```

**Response**:
```json
{
  "status": "healthy",
  "agent": "DAARWIZZ",
  "system_prompt_loaded": true,
  "timestamp": "2024-11-15T14:30:00Z"
}
```

### Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Prompt loading | < 100ms | On startup |
| Request enrichment | < 50ms | Gateway processing |
| End-to-end response | < 5s | Including LLM generation |
| RBAC lookup | < 100ms | From RBAC service |

---

## 🚀 Future Enhancements

### Phase 4 Roadmap

1. **Knowledge Base Integration**
   - Connect to microdao-daarion docs
   - RAG (Retrieval-Augmented Generation)
   - Contextual answers from official docs

2. **Multi-language Support**
   - Ukrainian (default)
   - English
   - Auto-detect user language

3. **Workflow Triggers**
   - User: "Onboard me" → triggers CrewAI workflow
   - User: "Review proposal #123" → triggers multi-agent review

4. **Analytics**
   - Track common questions
   - Identify knowledge gaps
   - Improve prompt iteratively

5. **Personalization**
   - Remember user context across sessions
   - Adapt responses based on user role
   - Suggest relevant actions

---

## 🔗 Related Documentation

- [Gateway Bot](../gateway-bot/README.md)
- [RBAC Service](../microdao/README.md)
- [LLM Providers](../providers/README.md)
- [Router Configuration](../router-config.yml)

---

**Version**: 0.2.0  
**Agent**: DAARWIZZ  
**Status**: Production-ready ✅  
**Last Updated**: 2024-11-15
