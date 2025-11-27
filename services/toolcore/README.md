# Toolcore Service

**Port:** 7009  
**Purpose:** Tool registry and execution engine for DAARION agents

## Features

✅ **Tool registry:**
- Config-driven (Phase 3)
- DB-backed (Phase 4)
- Permission model (agent allowlists)

✅ **Executors:**
- HTTP executor (call external services)
- Python executor (stub for Phase 3)

✅ **Security:**
- Permission checks (agent → tool)
- Timeouts per tool
- Error handling

## API

### GET /internal/tools

List available tools:

**Request:**
```bash
curl http://localhost:7009/internal/tools?agent_id=agent:sofia \
  -H "X-Internal-Secret: dev-secret-token"
```

**Response:**
```json
{
  "tools": [
    {
      "id": "projects.list",
      "name": "List Projects",
      "description": "Returns a list of projects for a microDAO",
      "input_schema": { ... },
      "executor": "http"
    }
  ],
  "total": 3
}
```

### POST /internal/tools/call

Execute a tool:

**Request:**
```json
{
  "tool_id": "projects.list",
  "agent_id": "agent:sofia",
  "microdao_id": "microdao:7",
  "args": {
    "microdao_id": "microdao:7"
  },
  "context": {
    "channel_id": "channel-uuid",
    "user_id": "user:123"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "projects": [
      { "id": "proj-1", "name": "Phase 3", "status": "active" }
    ]
  },
  "tool_id": "projects.list",
  "latency_ms": 123.4
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Connection failed: http://projects-service:8000/...",
  "tool_id": "projects.list",
  "latency_ms": 5000.0
}
```

### GET /internal/tools/{tool_id}

Get tool definition:

```bash
curl http://localhost:7009/internal/tools/projects.list \
  -H "X-Internal-Secret: dev-secret-token"
```

## Configuration

Edit `config.yaml`:

```yaml
tools:
  - id: "projects.list"
    name: "List Projects"
    description: "Returns a list of projects for a microDAO"
    input_schema:
      type: "object"
      properties:
        microdao_id: { type: "string" }
      required: ["microdao_id"]
    output_schema:
      type: "array"
      items: { type: "object" }
    executor: "http"
    target: "http://projects-service:8000/internal/tools/projects.list"
    allowed_agents: ["agent:sofia", "agent:pm"]
    timeout: 10
    enabled: true
```

## Adding New Tools

### HTTP Tool

```yaml
- id: "my.tool"
  name: "My Tool"
  description: "Does something useful"
  input_schema: { ... }
  output_schema: { ... }
  executor: "http"
  target: "http://my-service:8000/tool/endpoint"
  allowed_agents: ["agent:sofia"]  # or null for all
  timeout: 30
  enabled: true
```

### Python Tool (Phase 4)

```yaml
- id: "my.python.tool"
  name: "My Python Tool"
  executor: "python"
  target: "tools.my_module:my_function"
  ...
```

## Integration with agent-runtime

```python
import httpx

async def call_tool(tool_id, agent_id, args):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://toolcore:7009/internal/tools/call",
            headers={"X-Internal-Secret": "dev-secret-token"},
            json={
                "tool_id": tool_id,
                "agent_id": agent_id,
                "microdao_id": "microdao:7",
                "args": args
            }
        )
        result = response.json()
        
        if not result["ok"]:
            print(f"Tool failed: {result['error']}")
            return None
        
        return result["result"]
```

## Example: projects-service Tool Endpoint

```python
# projects-service/main.py

@app.post("/internal/tools/projects.list")
async def projects_list_tool(request: dict):
    """
    Tool endpoint for projects.list
    
    Expected payload:
    {
      "args": { "microdao_id": "..." },
      "context": { ... }
    }
    """
    microdao_id = request["args"]["microdao_id"]
    
    # Fetch projects from DB
    projects = await db.fetch_projects(microdao_id)
    
    return {
        "projects": [
            {"id": p.id, "name": p.name, "status": p.status}
            for p in projects
        ]
    }
```

## Setup

### Environment Variables

```bash
TOOLCORE_SECRET=dev-secret-token
```

### Local Development

```bash
cd services/toolcore

pip install -r requirements.txt

python main.py
```

### Docker

```bash
docker build -t toolcore .
docker run -p 7009:7009 toolcore
```

## Security Model

### Permission Checks

```python
allowed_agents: ["agent:sofia", "agent:pm"]
# Only these agents can call this tool

allowed_agents: null
# All agents can call this tool
```

### Timeouts

Each tool has a `timeout` (seconds). If execution exceeds timeout, it fails gracefully.

### Error Handling

- Connection errors → `ok: false`
- HTTP errors → `ok: false` with status code
- Timeouts → `ok: false` with timeout message

## Roadmap

### Phase 3 (Current):
- ✅ Config-based registry
- ✅ HTTP executor
- ✅ Python executor stub
- ✅ Permission checks
- ✅ 3 example tools

### Phase 3.5:
- 🔜 Tool usage tracking
- 🔜 Tool rate limiting
- 🔜 Advanced error handling
- 🔜 Tool chaining

### Phase 4:
- 🔜 DB-backed registry
- 🔜 Python executor with sandboxing
- 🔜 Tool marketplace
- 🔜 Agent-created tools
- 🔜 Tool versioning

## Troubleshooting

**Tool not found?**
- Check `config.yaml` for tool definition
- Restart service after config changes

**Permission denied?**
- Check `allowed_agents` in tool definition
- Ensure agent_id matches exactly

**Tool timeout?**
- Check if target service is running
- Increase `timeout` in config

**HTTP executor failing?**
- Test target URL directly: `curl http://...`
- Check service logs

---

**Status:** ✅ Phase 3 Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-11-24





