# TASK: PHASE 2 — AGENT INTEGRATION (agent_filter + Router + agent-runtime)

**Goal:**
Активувати повний ланцюг агентних відповідей у Messenger:
User → messaging-service → matrix-gateway → Matrix → NATS → agent_filter → DAGI Router → agent-runtime → LLM → messaging-service → Matrix → Frontend.

**Deliverables:**
- `services/agent-filter/` (rules + NATS + internal API)
- router extension (messaging.inbound → router.invoke.agent)
- `services/agent-runtime/` (LLM + memory + posting to channel)
- docker-compose integration
- documentation updates

---

## 1) SERVICE: agent-filter

**Create:** `services/agent-filter/`

**Files:**
- `main.py`
- `models.py`
- `rules.py`
- `config.yaml`
- `Dockerfile`
- `requirements.txt`
- `README.md`

### Specs:

#### models.py:

```python
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

class MessageCreatedEvent(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    sender_id: str
    sender_type: Literal["human", "agent"]
    microdao_id: str
    created_at: datetime

class FilterDecision(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    microdao_id: str
    decision: Literal["allow", "deny", "modify"]
    target_agent_id: Optional[str] = None
    rewrite_prompt: Optional[str] = None

class ChannelContext(BaseModel):
    microdao_id: str
    visibility: Literal["public", "private", "microdao"]
    allowed_agents: list[str] = []
    disabled_agents: list[str] = []

class FilterContext(BaseModel):
    channel: ChannelContext
    sender_is_owner: bool = False
    sender_is_admin: bool = False
    sender_is_member: bool = True
    local_time: Optional[datetime] = None
```

#### rules.py:

```python
from models import MessageCreatedEvent, FilterContext, FilterDecision
from datetime import datetime, time
import yaml

class FilterRules:
    def __init__(self, config_path: str = "config.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        self.quiet_hours_start = datetime.strptime(
            self.config['rules']['quiet_hours']['start'], 
            "%H:%M"
        ).time()
        self.quiet_hours_end = datetime.strptime(
            self.config['rules']['quiet_hours']['end'], 
            "%H:%M"
        ).time()
        self.default_agents = self.config['rules'].get('default_agents', {})
    
    def is_quiet_hours(self, dt: datetime) -> bool:
        current_time = dt.time()
        if self.quiet_hours_start > self.quiet_hours_end:
            # Overnight range (e.g., 23:00 - 07:00)
            return current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end
        else:
            return self.quiet_hours_start <= current_time <= self.quiet_hours_end
    
    def decide(self, event: MessageCreatedEvent, ctx: FilterContext) -> FilterDecision:
        """
        Baseline rules v1:
        - Block agent→agent loops
        - Map channel → allowed_agents
        - Apply quiet_hours
        - Return FilterDecision with decision + target_agent_id
        """
        base_decision = FilterDecision(
            channel_id=event.channel_id,
            message_id=event.message_id,
            matrix_event_id=event.matrix_event_id,
            microdao_id=event.microdao_id,
            decision="deny"
        )
        
        # Rule 1: Block agent→agent loops
        if event.sender_type == "agent":
            return base_decision
        
        # Rule 2: Check if agent is disabled
        if ctx.channel.disabled_agents:
            # For now, deny if any disabled agents exist
            return base_decision
        
        # Rule 3: Find target agent
        target_agent_id = None
        if ctx.channel.allowed_agents:
            target_agent_id = ctx.channel.allowed_agents[0]
        elif event.microdao_id in self.default_agents:
            target_agent_id = self.default_agents[event.microdao_id]
        
        if not target_agent_id:
            return base_decision
        
        # Rule 4: Check quiet hours
        if ctx.local_time and self.is_quiet_hours(ctx.local_time):
            return FilterDecision(
                channel_id=event.channel_id,
                message_id=event.message_id,
                matrix_event_id=event.matrix_event_id,
                microdao_id=event.microdao_id,
                decision="modify",
                target_agent_id=target_agent_id,
                rewrite_prompt="Відповідай стисло і тільки якщо запит важливий. Не ініціюй розмову сам."
            )
        
        # Rule 5: Allow
        return FilterDecision(
            channel_id=event.channel_id,
            message_id=event.message_id,
            matrix_event_id=event.matrix_event_id,
            microdao_id=event.microdao_id,
            decision="allow",
            target_agent_id=target_agent_id
        )
```

#### main.py:

```python
from fastapi import FastAPI, HTTPException
from models import MessageCreatedEvent, FilterDecision, ChannelContext, FilterContext
from rules import FilterRules
import httpx
import asyncio
import json
from datetime import datetime, timezone
import os

app = FastAPI(title="DAARION Agent Filter", version="1.0.0")

# Configuration
MESSAGING_SERVICE_URL = os.getenv("MESSAGING_SERVICE_URL", "http://messaging-service:7004")
NATS_URL = os.getenv("NATS_URL", "nats://nats:4222")

# Rules engine
rules_engine = FilterRules("config.yaml")

# NATS setup (mocked for now, replace with actual NATS client)
# import nats
# nc = None

@app.on_event("startup")
async def startup_event():
    print("Agent Filter starting up...")
    # nc = await nats.connect(NATS_URL)
    # await subscribe_to_messaging_events()
    asyncio.create_task(mock_nats_listener())

async def mock_nats_listener():
    """Mock NATS listener for testing"""
    print("Mock NATS listener started (replace with actual NATS subscription)")
    # In production:
    # sub = await nc.subscribe("messaging.message.created")
    # async for msg in sub.messages:
    #     await handle_message_created(json.loads(msg.data.decode()))

async def handle_message_created(event_data: dict):
    """Process incoming message.created events"""
    try:
        event = MessageCreatedEvent(**event_data)
        
        # Fetch channel context
        ctx = await fetch_channel_context(event.channel_id)
        
        # Apply rules
        decision = rules_engine.decide(event, ctx)
        
        # Publish decision to NATS
        await publish_decision(decision)
        
        print(f"Decision: {decision.decision} for channel {event.channel_id}")
    except Exception as e:
        print(f"Error processing message: {e}")

async def fetch_channel_context(channel_id: str) -> FilterContext:
    """Fetch channel context from messaging-service"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MESSAGING_SERVICE_URL}/internal/messaging/channels/{channel_id}/context"
            )
            response.raise_for_status()
            data = response.json()
            
            channel_ctx = ChannelContext(**data)
            return FilterContext(
                channel=channel_ctx,
                local_time=datetime.now(timezone.utc)
            )
    except httpx.HTTPStatusError as e:
        print(f"HTTP error fetching context: {e}")
        # Return default context
        return FilterContext(
            channel=ChannelContext(
                microdao_id="microdao:daarion",
                visibility="microdao"
            ),
            local_time=datetime.now(timezone.utc)
        )
    except Exception as e:
        print(f"Error fetching context: {e}")
        return FilterContext(
            channel=ChannelContext(
                microdao_id="microdao:daarion",
                visibility="microdao"
            ),
            local_time=datetime.now(timezone.utc)
        )

async def publish_decision(decision: FilterDecision):
    """Publish decision to NATS"""
    # In production:
    # await nc.publish("agent.filter.decision", decision.json().encode())
    print(f"Publishing decision: {decision.json()}")

@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-filter"}

@app.post("/internal/agent-filter/test", response_model=FilterDecision)
async def test_filter(event: MessageCreatedEvent):
    """Test endpoint for manual filtering"""
    ctx = await fetch_channel_context(event.channel_id)
    decision = rules_engine.decide(event, ctx)
    return decision
```

#### config.yaml:

```yaml
nats:
  servers: ["nats://nats:4222"]
  messaging_subject: "messaging.message.created"
  decision_subject: "agent.filter.decision"

rules:
  quiet_hours:
    start: "23:00"
    end: "07:00"
  default_agents:
    "microdao:daarion": "agent:sofia"
    "microdao:7": "agent:sofia"
```

#### requirements.txt:

```txt
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
httpx==0.25.1
python-nats==2.6.0
PyYAML==6.0.1
```

#### Dockerfile:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7005"]
```

#### README.md:

```markdown
# Agent Filter Service

Security & routing layer for DAARION agents in Messenger.

## Purpose
- Subscribe to NATS `messaging.message.created`
- Apply filtering rules (permissions, content, timing)
- Decide which agent should reply
- Publish to `agent.filter.decision`

## Rules
1. Block agent→agent loops
2. Map channels to allowed agents
3. Apply quiet hours (23:00–07:00)
4. Check disabled agents

## Running Locally
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 7005
```

## Testing
```bash
curl -X POST http://localhost:7005/internal/agent-filter/test \
  -H "Content-Type: application/json" \
  -d '{
    "channel_id": "test-channel",
    "matrix_event_id": "$event123",
    "sender_id": "user:1",
    "sender_type": "human",
    "microdao_id": "microdao:daarion",
    "created_at": "2025-11-24T10:00:00Z"
  }'
```

## NATS Events
- **Subscribes to:** `messaging.message.created`
- **Publishes to:** `agent.filter.decision`
```

---

## 2) DAGI ROUTER EXTENSION

**Extend existing router service:**

### Add subscription:

```python
# In router service (e.g., services/router/main.py)

from pydantic import BaseModel
from typing import Literal
import json

class FilterDecision(BaseModel):
    channel_id: str
    message_id: Optional[str] = None
    matrix_event_id: str
    microdao_id: str
    decision: Literal["allow", "deny", "modify"]
    target_agent_id: Optional[str] = None
    rewrite_prompt: Optional[str] = None

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: dict

async def handle_filter_decision(decision_data: dict):
    """Process agent.filter.decision events"""
    decision = FilterDecision(**decision_data)
    
    # Only process 'allow' decisions
    if decision.decision != "allow":
        print(f"Ignoring non-allow decision: {decision.decision}")
        return
    
    if not decision.target_agent_id:
        print(f"No target agent specified, ignoring")
        return
    
    # Create AgentInvocation
    invocation = AgentInvocation(
        agent_id=decision.target_agent_id,
        entrypoint="channel_message",
        payload={
            "channel_id": decision.channel_id,
            "message_id": decision.message_id,
            "matrix_event_id": decision.matrix_event_id,
            "microdao_id": decision.microdao_id,
            "rewrite_prompt": decision.rewrite_prompt
        }
    )
    
    # Publish to NATS
    await publish_agent_invocation(invocation)
    print(f"Routed to {invocation.agent_id}")

async def publish_agent_invocation(invocation: AgentInvocation):
    """Publish to router.invoke.agent"""
    # await nc.publish("router.invoke.agent", invocation.json().encode())
    print(f"Publishing invocation: {invocation.json()}")

# Add to router startup
async def subscribe_to_filter_decisions():
    """Subscribe to agent.filter.decision"""
    # sub = await nc.subscribe("agent.filter.decision")
    # async for msg in sub.messages:
    #     await handle_filter_decision(json.loads(msg.data.decode()))
    pass
```

### Add test endpoint:

```python
@app.post("/internal/router/test-messaging", response_model=AgentInvocation)
async def test_messaging_route(decision: FilterDecision):
    """Test endpoint for routing logic"""
    if decision.decision != "allow" or not decision.target_agent_id:
        raise HTTPException(status_code=400, detail="Decision not routable")
    
    invocation = AgentInvocation(
        agent_id=decision.target_agent_id,
        entrypoint="channel_message",
        payload={
            "channel_id": decision.channel_id,
            "message_id": decision.message_id,
            "matrix_event_id": decision.matrix_event_id,
            "microdao_id": decision.microdao_id,
            "rewrite_prompt": decision.rewrite_prompt
        }
    )
    return invocation
```

### Update config:

Create/update `router_config.yaml`:

```yaml
messaging_inbound:
  enabled: true
  source_subject: "agent.filter.decision"
  target_subject: "router.invoke.agent"
```

---

## 3) SERVICE: agent-runtime

**Create:** `services/agent-runtime/`

**Files:**
- `main.py`
- `models.py`
- `llm_client.py`
- `messaging_client.py`
- `memory_client.py`
- `config.yaml`
- `Dockerfile`
- `requirements.txt`
- `README.md`

### Specs:

#### models.py:

```python
from pydantic import BaseModel
from typing import Literal, Optional
from datetime import datetime

class AgentInvocation(BaseModel):
    agent_id: str
    entrypoint: Literal["channel_message", "direct", "cron"] = "channel_message"
    payload: dict

class AgentBlueprint(BaseModel):
    id: str
    name: str
    model: str
    instructions: str
    capabilities: dict = {}

class ChannelMessage(BaseModel):
    sender_id: str
    sender_type: Literal["human", "agent"]
    content: str
    created_at: datetime
```

#### llm_client.py:

```python
import httpx
import os

LLM_PROXY_URL = os.getenv("LLM_PROXY_URL", "http://llm-proxy:7007")

async def generate_response(model: str, messages: list[dict]) -> str:
    """Call LLM Proxy to generate response"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LLM_PROXY_URL}/internal/llm/proxy",
                json={
                    "model": model,
                    "messages": messages
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("content", "")
    except httpx.HTTPStatusError as e:
        print(f"LLM Proxy error: {e}")
        return "Вибачте, не можу відповісти зараз. (LLM error)"
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return "Вибачте, сталася помилка. (Connection error)"
```

#### messaging_client.py:

```python
import httpx
import os
from models import ChannelMessage

MESSAGING_SERVICE_URL = os.getenv("MESSAGING_SERVICE_URL", "http://messaging-service:7004")

async def get_channel_messages(channel_id: str, limit: int = 50) -> list[ChannelMessage]:
    """Fetch recent messages from channel"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{MESSAGING_SERVICE_URL}/internal/messaging/channels/{channel_id}/messages",
                params={"limit": limit}
            )
            response.raise_for_status()
            data = response.json()
            return [ChannelMessage(**msg) for msg in data]
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return []

async def post_message(agent_id: str, channel_id: str, text: str) -> bool:
    """Post agent reply to channel"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MESSAGING_SERVICE_URL}/internal/agents/{agent_id}/post-to-channel",
                json={
                    "channel_id": channel_id,
                    "text": text
                }
            )
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Error posting message: {e}")
        return False
```

#### memory_client.py:

```python
import httpx
import os

AGENT_MEMORY_URL = os.getenv("AGENT_MEMORY_URL", "http://agent-memory:7008")

async def query_memory(agent_id: str, microdao_id: str, query: str) -> list[dict]:
    """Query agent memory for relevant context"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{AGENT_MEMORY_URL}/internal/agent-memory/query",
                json={
                    "agent_id": agent_id,
                    "microdao_id": microdao_id,
                    "query": query
                }
            )
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])
    except Exception as e:
        print(f"Error querying memory: {e}")
        return []
```

#### main.py:

```python
from fastapi import FastAPI
from models import AgentInvocation, AgentBlueprint, ChannelMessage
from llm_client import generate_response
from messaging_client import get_channel_messages, post_message
from memory_client import query_memory
import asyncio
import json

app = FastAPI(title="DAARION Agent Runtime", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    print("Agent Runtime starting up...")
    asyncio.create_task(mock_nats_listener())

async def mock_nats_listener():
    """Mock NATS listener (replace with actual subscription)"""
    print("Mock NATS listener started")
    # In production:
    # sub = await nc.subscribe("router.invoke.agent")
    # async for msg in sub.messages:
    #     await handle_invocation(json.loads(msg.data.decode()))

async def handle_invocation(invocation_data: dict):
    """Process agent invocation"""
    try:
        invocation = AgentInvocation(**invocation_data)
        
        if invocation.entrypoint != "channel_message":
            print(f"Ignoring non-channel_message invocation: {invocation.entrypoint}")
            return
        
        # Extract payload
        channel_id = invocation.payload.get("channel_id")
        microdao_id = invocation.payload.get("microdao_id")
        rewrite_prompt = invocation.payload.get("rewrite_prompt")
        
        # 1. Load agent blueprint (mock for now)
        blueprint = await load_agent_blueprint(invocation.agent_id)
        
        # 2. Load channel history
        messages = await get_channel_messages(channel_id, limit=50)
        
        # 3. Get last human message
        last_human_msg = next(
            (msg for msg in reversed(messages) if msg.sender_type == "human"),
            None
        )
        
        if not last_human_msg:
            print("No human message found, skipping")
            return
        
        # 4. Query memory
        memory_results = await query_memory(
            invocation.agent_id,
            microdao_id,
            last_human_msg.content
        )
        
        # 5. Build prompt
        system_prompt = blueprint.instructions
        if rewrite_prompt:
            system_prompt += f"\n\nAdditional instructions: {rewrite_prompt}"
        
        llm_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # Add recent context
        for msg in messages[-10:]:
            role = "assistant" if msg.sender_type == "agent" else "user"
            llm_messages.append({
                "role": role,
                "content": msg.content
            })
        
        # Add memory context
        if memory_results:
            memory_context = "\n\n".join([r.get("text", "") for r in memory_results[:3]])
            llm_messages.insert(1, {
                "role": "system",
                "content": f"Relevant knowledge:\n{memory_context}"
            })
        
        # 6. Generate response
        response_text = await generate_response(blueprint.model, llm_messages)
        
        # 7. Post to channel
        success = await post_message(invocation.agent_id, channel_id, response_text)
        
        if success:
            print(f"Agent {invocation.agent_id} replied successfully")
        else:
            print(f"Failed to post agent reply")
        
    except Exception as e:
        print(f"Error handling invocation: {e}")

async def load_agent_blueprint(agent_id: str) -> AgentBlueprint:
    """Load agent blueprint (mock for now)"""
    # In production: GET /internal/agents/{agent_id}/blueprint
    return AgentBlueprint(
        id=agent_id,
        name="Sofia-Prime",
        model="gpt-4",
        instructions="Ти Sofia, помічниця команди DAARION. Допомагай планувати, організовувати та підсумовувати роботу."
    )

@app.get("/health")
async def health():
    return {"status": "ok", "service": "agent-runtime"}

@app.post("/internal/agent-runtime/test-channel")
async def test_channel(invocation: AgentInvocation):
    """Test endpoint for manual invocation"""
    await handle_invocation(invocation.dict())
    return {"status": "processed"}
```

#### config.yaml:

```yaml
nats:
  servers: ["nats://nats:4222"]
  invocation_subject: "router.invoke.agent"

services:
  messaging: "http://messaging-service:7004"
  agent_memory: "http://agent-memory:7008"
  llm_proxy: "http://llm-proxy:7007"
```

#### requirements.txt:

```txt
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
httpx==0.25.1
python-nats==2.6.0
PyYAML==6.0.1
```

#### Dockerfile:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7006"]
```

---

## 4) DOCKER + COMPOSE

**Create:** `docker-compose.agents.yml`

```yaml
version: '3.8'

services:
  agent-filter:
    build:
      context: ./services/agent-filter
      dockerfile: Dockerfile
    restart: always
    environment:
      MESSAGING_SERVICE_URL: http://messaging-service:7004
      NATS_URL: nats://nats:4222
    ports:
      - "7005:7005"
    depends_on:
      - nats
      - messaging-service
    networks:
      - daarion

  agent-runtime:
    build:
      context: ./services/agent-runtime
      dockerfile: Dockerfile
    restart: always
    environment:
      MESSAGING_SERVICE_URL: http://messaging-service:7004
      AGENT_MEMORY_URL: http://agent-memory:7008
      LLM_PROXY_URL: http://llm-proxy:7007
      NATS_URL: nats://nats:4222
    ports:
      - "7006:7006"
    depends_on:
      - nats
      - messaging-service
    networks:
      - daarion

networks:
  daarion:
    external: true
```

**Update existing `docker-compose.messenger.yml` to include agents:**

```yaml
# Add at the end
  agent-filter:
    extends:
      file: docker-compose.agents.yml
      service: agent-filter

  agent-runtime:
    extends:
      file: docker-compose.agents.yml
      service: agent-runtime
```

---

## 5) ACCEPTANCE CRITERIA

**Phase 2 Complete When:**

- ✅ Human writes message in Messenger
- ✅ messaging-service → matrix-gateway → Matrix works
- ✅ Matrix webhook triggers messaging.message.created
- ✅ agent_filter receives → outputs agent.filter.decision
- ✅ Router receives → emits router.invoke.agent
- ✅ agent-runtime receives → generates LLM answer
- ✅ agent-runtime posts reply → messaging-service → Matrix → Messenger UI
- ✅ Reply visible in Element + Messenger
- ✅ E2E latency < 5 seconds

---

## END OF TASK

**Implementation Order:**
1. agent-filter (1 week)
2. Router extension (3 days)
3. agent-runtime (2 weeks)
4. Docker integration (2 days)
5. Testing (3 days)

**Total Estimated Time:** 4 weeks





