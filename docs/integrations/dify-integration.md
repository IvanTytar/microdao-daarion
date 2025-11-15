# Dify Integration Guide

**Use DAGI Router as LLM backend for Dify**

**Status**: Planned  
**Version**: 0.3.0 (planned)  
**Last Updated**: 2024-11-15

---

## 🎯 Overview

DAGI Router can serve as a custom LLM backend for [Dify](https://dify.ai), enabling:
- **Multi-provider routing**: Route to Ollama, OpenAI, DeepSeek based on rules
- **DevTools integration**: File operations, test execution from Dify workflows
- **CrewAI workflows**: Multi-agent orchestration triggered from Dify
- **RBAC enforcement**: microDAO permissions in Dify apps

---

## 🏗️ Architecture

```
┌──────────────┐
│   Dify UI    │
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│  Dify Backend    │
└──────┬───────────┘
       │ HTTP POST /v1/chat/completions
       ↓
┌─────────────────────────────────┐
│      DAGI Router (:9102)        │
│  - Convert Dify → DAGI format   │
│  - Route to LLM/DevTools/CrewAI │
│  - Convert DAGI → Dify format   │
└──────┬──────────────────────────┘
       │
       ├──> Ollama (qwen3:8b)
       ├──> DevTools (:8008)
       └──> CrewAI (:9010)
```

---

## 📋 Prerequisites

- DAGI Stack v0.2.0+ deployed and running
- Dify v0.6.0+ installed (self-hosted or cloud)
- Access to Dify admin panel

---

## 🚀 Setup

### Step 1: Add OpenAI-Compatible Endpoint to DAGI Router

Create adapter endpoint in `router_app.py`:

```python
from pydantic import BaseModel
from typing import List, Optional

class DifyMessage(BaseModel):
    role: str
    content: str

class DifyRequest(BaseModel):
    model: str
    messages: List[DifyMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 200
    stream: Optional[bool] = False

class DifyResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[dict]
    usage: dict

@app.post("/v1/chat/completions")
async def dify_compatible(request: DifyRequest):
    """
    OpenAI-compatible endpoint for Dify integration
    """
    import time
    import uuid
    
    # Convert Dify messages → DAGI prompt
    prompt = "\n".join([
        f"{msg.role}: {msg.content}" for msg in request.messages
    ])
    
    # Create DAGI request
    dagi_request = {
        "prompt": prompt,
        "mode": "chat",
        "metadata": {
            "model": request.model,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
    }
    
    # Route through DAGI
    result = await router.handle(dagi_request)
    
    # Convert to Dify/OpenAI format
    return DifyResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:8]}",
        created=int(time.time()),
        model=request.model,
        choices=[{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": result.get("response", "")
            },
            "finish_reason": "stop"
        }],
        usage={
            "prompt_tokens": len(prompt.split()),
            "completion_tokens": len(result.get("response", "").split()),
            "total_tokens": len(prompt.split()) + len(result.get("response", "").split())
        }
    )
```

**Restart Router:**
```bash
docker-compose restart router
```

---

### Step 2: Configure Dify to Use DAGI Router

1. **Open Dify Admin Panel**
   - Navigate to Settings → Model Providers

2. **Add Custom Provider**
   ```
   Provider Name: DAGI Router
   Provider Type: OpenAI-compatible
   Base URL: http://localhost:9102/v1
   API Key: (optional, leave blank or use dummy)
   Model: dagi-stack
   ```

3. **Test Connection**
   - Click "Test" button
   - Expected: Connection successful

4. **Set as Default Provider**
   - Enable "DAGI Router" in provider list
   - Set as default for new applications

---

### Step 3: Create Dify App with DAGI Backend

1. **Create New App**
   - Type: Chat Application
   - Model: DAGI Router / dagi-stack

2. **Configure Prompt**
   ```
   You are a helpful AI assistant for DAARION microDAOs.
   
   Context:
   - You have access to development tools (file operations, tests)
   - You can orchestrate multi-agent workflows
   - You enforce role-based access control
   
   User query: {{query}}
   ```

3. **Test Chat**
   - Send: "Hello, what can you do?"
   - Expected: Response from qwen3:8b via DAGI Router

---

## 🛠️ Advanced: Tools Integration

### Add DevTools as Dify Tool

**In Dify Tools Configuration:**

```yaml
name: devtools_read_file
description: Read file from workspace
type: api
method: POST
url: http://localhost:9102/route
headers:
  Content-Type: application/json
body:
  mode: devtools
  metadata:
    tool: fs_read
    params:
      path: "{{file_path}}"
parameters:
  - name: file_path
    type: string
    required: true
    description: Path to file in workspace
```

**Usage in Dify Workflow:**
1. User asks: "Read the README.md file"
2. Dify calls `devtools_read_file` tool
3. DAGI Router → DevTools → Returns file content
4. LLM processes content and responds

---

### Add CrewAI Workflow as Dify Tool

```yaml
name: crewai_onboarding
description: Onboard new member to microDAO
type: api
method: POST
url: http://localhost:9102/route
headers:
  Content-Type: application/json
body:
  mode: crew
  metadata:
    workflow: microdao_onboarding
    dao_id: "{{dao_id}}"
    user_id: "{{user_id}}"
parameters:
  - name: dao_id
    type: string
    required: true
  - name: user_id
    type: string
    required: true
```

**Usage:**
1. User: "Onboard me to greenfood-dao"
2. Dify extracts dao_id, user_id
3. Calls CrewAI workflow via DAGI Router
4. Returns onboarding steps

---

## 🔍 Routing Rules for Dify

**Customize routing based on Dify metadata:**

```yaml
# router-config.yml
routing_rules:
  - name: "dify_devtools"
    priority: 5
    conditions:
      mode: "devtools"
      metadata:
        source: "dify"
    use_provider: "devtools_local"
    timeout_ms: 5000
  
  - name: "dify_crew"
    priority: 6
    conditions:
      mode: "crew"
      metadata:
        source: "dify"
    use_provider: "microdao_orchestrator"
    timeout_ms: 60000
  
  - name: "dify_chat"
    priority: 10
    conditions:
      mode: "chat"
      metadata:
        source: "dify"
    use_provider: "llm_local_qwen3_8b"
    timeout_ms: 5000
```

**Tag requests from Dify:**
```python
# In dify_compatible endpoint
metadata = {
    "source": "dify",
    "model": request.model,
    ...
}
```

---

## 📊 Use Cases

### 1. Dify as UI for microDAO Operations

**Scenario**: Members interact with DAO via Dify chat UI

**Flow:**
1. User: "What's my role in the DAO?"
2. Dify → DAGI Router → RBAC service
3. Response: "You are a member with entitlements: chat, vote, comment"

**Benefits:**
- Beautiful UI (Dify)
- Complex backend logic (DAGI Router)
- RBAC enforcement

---

### 2. Dify Workflows with DevTools

**Scenario**: Code review triggered from Dify

**Flow:**
1. User uploads code in Dify
2. Dify workflow: "Review this code"
3. Dify → DAGI Router → CrewAI (code_review workflow)
4. Returns quality score, security issues, recommendations

**Benefits:**
- Visual workflow builder (Dify)
- Multi-agent analysis (CrewAI)

---

### 3. Dify Knowledge Base + DAGI Context

**Scenario**: DAO documentation indexed in Dify

**Flow:**
1. User: "How do I submit a proposal?"
2. Dify retrieves relevant docs from knowledge base
3. Dify → DAGI Router with context
4. LLM generates personalized answer based on user role

**Benefits:**
- RAG (Retrieval-Augmented Generation) from Dify
- Context-aware responses from DAGI

---

## 🧪 Testing

### Test OpenAI-Compatible Endpoint

```bash
curl -X POST http://localhost:9102/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dagi-stack",
    "messages": [
      {"role": "user", "content": "Hello from Dify!"}
    ],
    "temperature": 0.7,
    "max_tokens": 200
  }'
```

**Expected Response:**
```json
{
  "id": "chatcmpl-a1b2c3d4",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "dagi-stack",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! I'm powered by DAGI Router..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 3,
    "completion_tokens": 15,
    "total_tokens": 18
  }
}
```

---

### Test in Dify UI

1. Create test app
2. Send message: "Test DAGI integration"
3. Check logs:
   ```bash
   docker-compose logs router | grep "dify"
   ```
4. Verify response from qwen3:8b

---

## 🔧 Troubleshooting

### Issue: Dify can't connect to DAGI Router

**Solution:**
- Verify Router is running: `curl http://localhost:9102/health`
- Check network: Dify and Router on same Docker network?
- Test endpoint: `curl http://localhost:9102/v1/chat/completions` (see above)

---

### Issue: Responses are slow

**Solution:**
- Check LLM performance: `docker-compose logs router | grep "duration_ms"`
- Reduce `max_tokens` in Dify config (default: 200)
- Increase Router timeout in `router-config.yml`

---

### Issue: Tools not working

**Solution:**
- Verify tool URL: `http://localhost:9102/route`
- Check request body format (mode, metadata)
- Test tool directly: `curl -X POST http://localhost:9102/route ...`

---

## 📈 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| /v1/chat/completions latency | < 5s | Includes LLM generation |
| Tools execution | < 2s | DevTools file ops |
| Workflow execution | < 60s | CrewAI multi-agent |

---

## 🔗 Resources

- **Dify Docs**: https://docs.dify.ai
- **Dify Custom Providers**: https://docs.dify.ai/guides/model-configuration/customizable-model
- **DAGI Router API**: [docs/api/router-api.md](../api/router-api.md)

---

## 🎉 What's Possible

With Dify + DAGI Router integration:

1. **Visual Workflows** (Dify) + **Complex Routing** (DAGI)
2. **Knowledge Base** (Dify) + **Multi-provider LLMs** (DAGI)
3. **UI/UX** (Dify) + **RBAC/Governance** (DAGI)
4. **Rapid Prototyping** (Dify) + **Production Infrastructure** (DAGI)

**Result**: Best of both worlds — beautiful UI and robust backend.

---

**Version**: 0.3.0 (planned)  
**Status**: Planned for Phase 4  
**Last Updated**: 2024-11-15
