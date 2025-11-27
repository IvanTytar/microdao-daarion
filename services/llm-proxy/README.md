# LLM Proxy Service

**Port:** 7007  
**Purpose:** Multi-provider LLM gateway for DAARION agents

## Features

✅ **Multi-provider support:**
- OpenAI (GPT-4, GPT-4-turbo, etc.)
- DeepSeek (DeepSeek-R1)
- Local LLMs (Ollama, vLLM, llama.cpp)

✅ **Model routing:**
- Logical model names → Physical provider models
- Config-driven routing (`config.yaml`)

✅ **Usage tracking:**
- Token counting
- Latency monitoring
- Cost estimation
- Per-agent/microDAO tracking

✅ **Rate limiting:**
- Per-agent limits (10 req/min default)
- In-memory (Phase 3), Redis-backed (Phase 4)

✅ **Security:**
- Internal-only API (`X-Internal-Secret` header)
- API key management via env vars

## API

### POST /internal/llm/proxy

**Request:**
```json
{
  "model": "gpt-4.1-mini",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "max_tokens": 100,
  "temperature": 0.7,
  "metadata": {
    "agent_id": "agent:sofia",
    "microdao_id": "microdao:7",
    "channel_id": "channel-uuid"
  }
}
```

**Response:**
```json
{
  "content": "Hello! How can I help you today?",
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 10,
    "total_tokens": 35
  },
  "provider": "openai",
  "model_resolved": "gpt-4-1106-preview",
  "latency_ms": 1234.5
}
```

### GET /internal/llm/models

List available models:
```json
{
  "models": [
    {
      "name": "gpt-4.1-mini",
      "provider": "openai",
      "physical_name": "gpt-4-1106-preview",
      "max_tokens": 4096
    },
    ...
  ]
}
```

### GET /internal/llm/usage?agent_id=agent:sofia

Get usage statistics:
```json
{
  "total_requests": 42,
  "total_tokens": 12345,
  "avg_latency_ms": 987.6,
  "success_rate": 0.98
}
```

## Configuration

Edit `config.yaml`:

```yaml
providers:
  openai:
    base_url: "https://api.openai.com/v1"
    api_key_env: "OPENAI_API_KEY"
  
  local:
    base_url: "http://localhost:11434"

models:
  gpt-4.1-mini:
    provider: "openai"
    physical_name: "gpt-4-1106-preview"
    cost_per_1k_prompt: 0.01
    cost_per_1k_completion: 0.03
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-...           # OpenAI API key
DEEPSEEK_API_KEY=sk-...         # DeepSeek API key
LLM_PROXY_SECRET=dev-secret-token  # Internal auth token
```

## Setup

### Local Development

```bash
cd services/llm-proxy

# Install dependencies
pip install -r requirements.txt

# Set API keys
export OPENAI_API_KEY="sk-..."

# Run
python main.py
```

### Docker

```bash
docker build -t llm-proxy .
docker run -p 7007:7007 \
  -e OPENAI_API_KEY="sk-..." \
  llm-proxy
```

### With docker-compose

```bash
docker-compose -f docker-compose.phase3.yml up llm-proxy
```

## Testing

### Test OpenAI

```bash
curl -X POST http://localhost:7007/internal/llm/proxy \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: dev-secret-token" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      {"role": "user", "content": "Say hello!"}
    ],
    "metadata": {
      "agent_id": "agent:test"
    }
  }'
```

### Test Local LLM

```bash
# Start Ollama
ollama serve
ollama pull qwen2.5:8b

# Test
curl -X POST http://localhost:7007/internal/llm/proxy \
  -H "Content-Type: application/json" \
  -H "X-Internal-Secret: dev-secret-token" \
  -d '{
    "model": "dagi-local-8b",
    "messages": [
      {"role": "user", "content": "Test"}
    ]
  }'
```

## Adding New Providers

1. Create `providers/my_provider.py`:

```python
class MyProvider:
    def __init__(self, config: ProviderConfig):
        self.config = config
    
    async def chat(self, messages, model_name, **kwargs) -> LLMResponse:
        # Implement provider logic
        ...
```

2. Register in `config.yaml`:

```yaml
providers:
  my_provider:
    base_url: "https://api.myprovider.com"
    api_key_env: "MY_PROVIDER_KEY"

models:
  my-model:
    provider: "my_provider"
    physical_name: "my-model-v1"
```

3. Initialize in `main.py`:

```python
from providers.my_provider import MyProvider

providers["my_provider"] = MyProvider(provider_config)
```

## Integration with agent-runtime

In `agent-runtime`:

```python
import httpx

async def call_llm(agent_blueprint, messages):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://llm-proxy:7007/internal/llm/proxy",
            headers={"X-Internal-Secret": "dev-secret-token"},
            json={
                "model": agent_blueprint.llm_model,
                "messages": messages,
                "metadata": {
                    "agent_id": agent_blueprint.id,
                    "microdao_id": agent_blueprint.microdao_id
                }
            }
        )
        return response.json()
```

## Roadmap

### Phase 3 (Current):
- ✅ Multi-provider support
- ✅ Basic rate limiting
- ✅ Usage logging
- ✅ OpenAI + DeepSeek + Local

### Phase 3.5:
- 🔜 Streaming responses
- 🔜 Response caching
- 🔜 Function calling support
- 🔜 Redis-backed rate limiting

### Phase 4:
- 🔜 Database-backed usage logs
- 🔜 Cost analytics
- 🔜 Billing integration
- 🔜 Advanced routing (fallbacks, load balancing)

## Troubleshooting

**Provider not working?**
```bash
# Check API key
docker logs llm-proxy | grep "api_key"

# Test directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Rate limit issues?**
```bash
# Check current limits
curl http://localhost:7007/internal/llm/usage?agent_id=agent:sofia \
  -H "X-Internal-Secret: dev-secret-token"
```

**Local LLM not responding?**
```bash
# Check Ollama
curl http://localhost:11434/api/version

# Check logs
docker logs llm-proxy | grep "local"
```

## Architecture

```
agent-runtime
    ↓
    POST /internal/llm/proxy
    ↓
llm-proxy:
    ├─ Rate limiter (check agent quota)
    ├─ Model router (logical → physical)
    ├─ Provider selector (OpenAI/DeepSeek/Local)
    └─ Usage tracker (log tokens, cost, latency)
    ↓
[OpenAI API | DeepSeek API | Local Ollama]
    ↓
Response → agent-runtime
```

## License

Internal DAARION service

---

**Status:** ✅ Phase 3 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24





