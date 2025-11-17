# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

**DAGI Stack** (Decentralized Agentic Gateway Infrastructure) is a production-ready AI router with multi-agent orchestration, microDAO governance, and bot gateway integration. It's a microservices architecture for routing and orchestrating AI agents and LLM providers.

### Infrastructure & Deployment

**For complete infrastructure information** (servers, repositories, domains, deployment workflows), see:
- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** — Production servers, GitHub repos, DNS, services, deployment
- **[SYSTEM-INVENTORY.md](./SYSTEM-INVENTORY.md)** — Complete system inventory (GPU, AI models, services)
- **[docs/infrastructure_quick_ref.ipynb](./docs/infrastructure_quick_ref.ipynb)** — Jupyter Notebook for quick search

## Quick Start Commands

### Development

```bash
# Start all services via Docker Compose
docker-compose up -d

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f router
docker-compose logs -f gateway
docker-compose logs -f devtools
docker-compose logs -f crewai
docker-compose logs -f rbac

# Stop all services
docker-compose down

# Rebuild and restart after code changes
docker-compose up -d --build
```

### Testing

```bash
# Smoke tests - basic health checks for all services
./smoke.sh

# End-to-end tests for specific components
./test-devtools.sh    # DevTools integration
./test-crewai.sh      # CrewAI workflows
./test-gateway.sh     # Gateway + RBAC
./test-fastapi.sh     # FastAPI endpoints

# RAG pipeline evaluation
./tests/e2e_rag_pipeline.sh
python tests/rag_eval.py

# Unit tests
python -m pytest test_config_loader.py
python -m pytest services/parser-service/tests/
python -m pytest services/rag-service/tests/
```

### Local Development (without Docker)

```bash
# Start Router (main service)
python main_v2.py --config router-config.yml --port 9102

# Start DevTools Backend
cd devtools-backend && python main.py

# Start CrewAI Orchestrator
cd orchestrator && python crewai_backend.py

# Start Bot Gateway
cd gateway-bot && python main.py

# Start RBAC Service
cd microdao && python main.py
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit configuration with your tokens and settings
nano .env

# Validate router configuration
python config_loader.py
```

## Architecture

### Core Services (Microservices)

The DAGI Stack follows a microservices architecture with these primary services:

**1. DAGI Router** (Port 9102)
- Main routing engine that dispatches requests to appropriate providers
- Rule-based routing with priority-ordered rules defined in `router-config.yml`
- Handles RBAC context injection for microDAO chat mode
- **Key files:**
  - `main_v2.py` - FastAPI application entry point
  - `router_app.py` - Core RouterApp class with request handling logic
  - `routing_engine.py` - Rule matching and provider resolution
  - `config_loader.py` - Configuration loading and validation with Pydantic models
  - `router-config.yml` - Routing rules and provider configuration

**2. Bot Gateway** (Port 9300)
- HTTP server for bot platforms (Telegram, Discord)
- Normalizes platform-specific messages to unified format
- Integrates with RBAC service before forwarding to Router
- Implements DAARWIZZ system agent
- **Key files:** `gateway-bot/main.py`, `gateway-bot/http_api.py`, `gateway-bot/router_client.py`

**3. DevTools Backend** (Port 8008)
- Tool execution service for development tasks
- File operations (read/write), test execution, notebook execution
- Security: path validation, size limits
- **Key files:** `devtools-backend/main.py`

**4. CrewAI Orchestrator** (Port 9010)
- Multi-agent workflow execution
- Pre-configured workflows: `microdao_onboarding`, `code_review`, `proposal_review`, `task_decomposition`
- **Key files:** `orchestrator/crewai_backend.py`

**5. RBAC Service** (Port 9200)
- Role-based access control with roles: admin, member, contributor, guest
- DAO isolation for multi-tenancy
- **Key files:** `microdao/` directory

**6. RAG Service** (Port 9500)
- Document retrieval and question answering
- Uses embeddings (BAAI/bge-m3) and PostgreSQL for vector storage
- Integrates with Router for LLM calls
- **Key files:** `services/rag-service/`

**7. Memory Service** (Port 8000)
- Agent memory and context management
- **Key files:** `services/memory-service/`

**8. Parser Service**
- Document parsing and Q&A generation
- 2-stage pipeline: parse → Q&A build
- **Key files:** `services/parser-service/`

### Provider System

The system uses a provider abstraction to support multiple backends:

- **Base Provider** (`providers/base.py`) - Abstract base class
- **LLM Provider** (`providers/llm_provider.py`) - Ollama, DeepSeek, OpenAI
- **DevTools Provider** (`providers/devtools_provider.py`) - Development tools
- **CrewAI Provider** (`providers/crewai_provider.py`) - Multi-agent orchestration
- **Provider Registry** (`providers/registry.py`) - Centralized provider initialization

### Routing System

**Rule-Based Routing:**
- Rules defined in `router-config.yml` with priority ordering (lower = higher priority)
- Each rule specifies `when` conditions (mode, agent, metadata) and `use_llm`/`use_provider`
- Routing engine (`routing_engine.py`) matches requests to providers via `RoutingTable` class
- Special handling for `rag_query` mode (combines Memory + RAG → LLM)

**Request Flow:**
1. Request arrives at Router via HTTP POST `/route`
2. RBAC context injection (if chat mode with dao_id/user_id)
3. Rule matching in priority order
4. Provider resolution and invocation
5. Response returned with provider metadata

### Configuration Management

Configuration uses YAML + Pydantic validation:

- **`router-config.yml`** - Main config file with:
  - `node` - Node identification
  - `llm_profiles` - LLM provider configurations
  - `orchestrator_providers` - Orchestrator backends
  - `agents` - Agent definitions with tools
  - `routing` - Routing rules (priority-ordered)
  - `telemetry` - Logging and metrics
  - `policies` - Rate limiting, cost tracking

- **`config_loader.py`** - Loads and validates config with Pydantic models:
  - `RouterConfig` - Top-level config
  - `LLMProfile` - LLM provider settings
  - `AgentConfig` - Agent configuration
  - `RoutingRule` - Individual routing rule

## Key Concepts

### Agents and Modes

**Agents:**
- `devtools` - Development assistant (code analysis, refactoring, testing)
- `microdao_orchestrator` - Multi-agent workflow coordinator
- DAARWIZZ - System orchestrator agent (in Gateway)

**Modes:**
- `chat` - Standard chat with RBAC context injection
- `devtools` - Tool execution mode (file ops, tests)
- `crew` - CrewAI workflow orchestration
- `rag_query` - RAG + Memory hybrid query
- `qa_build` - Q&A generation from documents

### RBAC Context Injection

For microDAO chat mode, the Router automatically enriches requests with RBAC context:
- Fetches user roles and entitlements from RBAC service
- Injects into `payload.context.rbac` before provider call
- See `router_app.py:handle()` for implementation

### Multi-Agent Ecosystem

Follows DAARION.city agent hierarchy (A1-A4):
- **A1** - DAARION.city system agents (DAARWIZZ)
- **A2** - Platform agents (GREENFOOD, Energy Union, Water Union, etc.)
- **A3** - Public microDAO agents
- **A4** - Private microDAO agents

See `docs/agents.md` for complete agent map.

## Development Workflow

### Adding a New LLM Provider

1. Add profile to `router-config.yml`:
```yaml
llm_profiles:
  my_new_provider:
    provider: openai
    base_url: https://api.example.com
    model: my-model
    api_key_env: MY_API_KEY
```

2. Add routing rule:
```yaml
routing:
  - id: my_rule
    priority: 50
    when:
      mode: custom_mode
    use_llm: my_new_provider
```

3. Test configuration: `python config_loader.py`

### Adding a New Routing Rule

Rules in `router-config.yml` are evaluated in priority order (lower number = higher priority). Each rule has:
- `id` - Unique identifier
- `priority` - Evaluation order (1-100, lower is higher priority)
- `when` - Matching conditions (mode, agent, metadata_has, task_type, and)
- `use_llm` or `use_provider` - Target provider
- `description` - Human-readable purpose

### Debugging Routing

```bash
# Check which rule matches a request
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{"mode": "chat", "message": "test", "metadata": {}}'

# View routing table
curl http://localhost:9102/routing

# Check available providers
curl http://localhost:9102/providers
```

### Working with Docker Services

```bash
# View container status
docker ps

# Inspect container logs
docker logs dagi-router
docker logs -f dagi-gateway  # follow mode

# Execute commands in container
docker exec -it dagi-router bash

# Restart specific service
docker-compose restart router

# Check service health
curl http://localhost:9102/health
```

## Testing Strategy

### Smoke Tests (`smoke.sh`)
- Quick health checks for all services
- Basic functional tests (Router→LLM, DevTools fs_read, CrewAI workflow list, RBAC resolve)
- Run after deployment or major changes

### End-to-End Tests
- `test-devtools.sh` - Full Router→DevTools integration (file ops, tests)
- `test-crewai.sh` - CrewAI workflow execution
- `test-gateway.sh` - Gateway + RBAC + Router flow
- Each test includes health checks, functional tests, and result validation

### Unit Tests
- `test_config_loader.py` - Configuration loading and validation
- `services/parser-service/tests/` - Parser service components
- `services/rag-service/tests/` - RAG query and ingestion
- Use pytest: `python -m pytest <test_file>`

## Common Tasks

### Changing Router Configuration

1. Edit `router-config.yml`
2. Validate: `python config_loader.py`
3. Restart router: `docker-compose restart router`
4. Verify: `./smoke.sh`

### Adding Environment Variables

1. Add to `.env.example` with documentation
2. Add to `.env` with actual value
3. Add to `docker-compose.yml` environment section
4. Reference in code via `os.getenv()`

### Viewing Structured Logs

All services use structured JSON logging. Example:
```bash
docker-compose logs -f router | jq -r '. | select(.level == "ERROR")'
```

### Testing RBAC Integration

```bash
curl -X POST http://localhost:9200/rbac/resolve \
  -H "Content-Type: application/json" \
  -d '{"dao_id": "greenfood-dao", "user_id": "tg:12345"}'
```

### Manual Router Requests

```bash
# Chat mode (with RBAC)
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "chat",
    "message": "Hello",
    "dao_id": "test-dao",
    "user_id": "tg:123",
    "metadata": {}
  }'

# DevTools mode
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "devtools",
    "message": "read file",
    "payload": {
      "tool": "fs_read",
      "params": {"path": "/app/README.md"}
    }
  }'
```

## Tech Stack

- **Language:** Python 3.11+
- **Framework:** FastAPI, Uvicorn
- **Validation:** Pydantic
- **Config:** YAML (PyYAML)
- **HTTP Client:** httpx
- **Containerization:** Docker, Docker Compose
- **LLM Providers:** Ollama (local), DeepSeek, OpenAI
- **Testing:** pytest, bash scripts
- **Frontend:** React, TypeScript, Vite, TailwindCSS (for web UI)

## File Structure Conventions

- Root level: Main router components and entry points
- `providers/` - Provider implementations (LLM, DevTools, CrewAI)
- `gateway-bot/` - Bot gateway service (Telegram, Discord)
- `devtools-backend/` - DevTools tool execution service
- `orchestrator/` - CrewAI multi-agent orchestration
- `microdao/` - RBAC service
- `services/` - Additional services (RAG, Memory, Parser)
- `tests/` - E2E tests and evaluation scripts
- `docs/` - Documentation (including agents map)
- `chart/` - Kubernetes Helm chart
- Root scripts: `smoke.sh`, `test-*.sh` for testing

## Important Notes

- Router config is validated on startup - syntax errors will prevent service from starting
- RBAC context injection only happens in `chat` mode with both `dao_id` and `user_id` present
- All services expose `/health` endpoint for monitoring
- Docker network `dagi-network` connects all services
- Use structured logging - avoid print statements
- Provider timeout defaults to 30s (configurable per profile in `router-config.yml`)
- RAG query mode combines Memory context + RAG documents before calling LLM
- When modifying routing rules, test with `./smoke.sh` before committing
