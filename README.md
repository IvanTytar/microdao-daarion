# DAGI Stack

**Decentralized Agentic Gateway Infrastructure**

Production-ready AI router with multi-agent orchestration, microDAO governance, and bot gateway integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Bot Gateway                          │
│                    (Telegram/Discord)                       │
│                       Port: 9300                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     DAGI Router                             │
│              (Dynamic Rule-Based Routing)                   │
│                       Port: 9102                            │
└───┬──────────────────┬──────────────────┬──────────────────┘
    │                  │                  │
    ↓                  ↓                  ↓
┌─────────┐    ┌──────────────┐    ┌──────────────┐
│   LLM   │    │   DevTools   │    │   CrewAI     │
│Provider │    │   Backend    │    │ Orchestrator │
│         │    │  Port: 8008  │    │  Port: 9010  │
└─────────┘    └──────────────┘    └──────────────┘
    ↑
    │ RBAC Context Injection
    │
┌─────────────────────────────────────────────────────────────┐
│                      RBAC Service                           │
│              (Role-Based Access Control)                    │
│                       Port: 9200                            │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Port | Description |
|-----------|------|-------------|
| **DAGI Router** | 9102 | Main routing engine with rule-based dispatch |
| **Bot Gateway** | 9300 | Telegram/Discord webhook receiver |
| **DevTools Backend** | 8008 | File operations, test execution, notebooks |
| **CrewAI Orchestrator** | 9010 | Multi-agent workflow execution |
| **RBAC Service** | 9200 | Role resolution and access control |
| **Ollama** | 11434 | Local LLM (optional) |

---

## 🚀 Quick Start

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 10GB+ disk space

### 1. Clone Repository

```bash
git clone https://github.com/daarion/dagi-stack.git
cd dagi-stack
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your tokens and settings
nano .env
```

**Required variables:**
- `TELEGRAM_BOT_TOKEN` - Get from @BotFather
- `OLLAMA_BASE_URL` - Local Ollama URL (or use remote LLM)

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Verify Health

```bash
./smoke.sh
```

Or manually:

```bash
curl http://localhost:9102/health  # Router
curl http://localhost:8008/health  # DevTools
curl http://localhost:9010/health  # CrewAI
curl http://localhost:9200/health  # RBAC
curl http://localhost:9300/health  # Gateway
```

### 5. Test Basic Routing

```bash
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello from DAGI!",
    "mode": "chat",
    "metadata": {}
  }'
```

---

## 📦 Services Overview

### DAGI Router

Central routing engine that dispatches requests based on configurable rules:

- **Rule-based routing**: Priority-ordered rules match requests to providers
- **Multi-provider support**: Ollama, DeepSeek, OpenAI, custom agents
- **Metadata enrichment**: Injects context (dao_id, user_id, RBAC roles)
- **Timeout handling**: Configurable timeouts with fallback strategies

**Key files:**
- `main_v2.py` - Entry point
- `routing_engine.py` - Core routing logic
- `router-config.yml` - Routing rules configuration

### Bot Gateway

HTTP server for bot platforms:

- **Telegram webhooks**: `/telegram/webhook`
- **Discord webhooks**: `/discord/webhook`
- **Chat normalization**: Converts platform-specific messages to unified format
- **RBAC integration**: Enriches requests with user roles before routing

**Key files:**
- `gateway-bot/main.py`
- `gateway-bot/http_api.py`
- `gateway-bot/router_client.py`

### DevTools Backend

Tool execution service for development tasks:

- **File operations**: Read/write files in workspace
- **Test execution**: Run pytest/jest/etc
- **Notebook execution**: Jupyter notebook support
- **Security**: Path validation, size limits

**Endpoints:**
- `POST /fs/read` - Read file
- `POST /fs/write` - Write file
- `POST /ci/run-tests` - Execute tests
- `POST /notebook/execute` - Run notebook

### CrewAI Orchestrator

Multi-agent workflow execution:

- **4 workflows**:
  - `microdao_onboarding` - Welcome new members
  - `code_review` - Code quality analysis
  - `proposal_review` - Governance proposal assessment
  - `task_decomposition` - Break down complex tasks

**Endpoints:**
- `POST /workflow/run` - Execute workflow
- `GET /workflow/list` - List available workflows

### RBAC Service

Role-based access control:

- **Roles**: admin, member, contributor, guest
- **Entitlements**: Granular permissions per role
- **DAO isolation**: Multi-tenancy support

**Endpoints:**
- `POST /rbac/resolve` - Resolve user role and permissions
- `GET /roles` - List all roles

---

## 🔧 Configuration

### Routing Rules

Edit `router-config.yml` to customize routing behavior:

```yaml
routing_rules:
  - name: "microdao_orchestrator"
    priority: 5
    conditions:
      mode: "crew"
    use_provider: "microdao_orchestrator"
    timeout_ms: 60000
```

**Rule fields:**
- `priority` - Lower = higher priority
- `conditions` - Match criteria (mode, prompt patterns, metadata)
- `use_provider` - Target provider name
- `timeout_ms` - Request timeout

### Environment Variables

See `.env.example` for full list. Key variables:

```bash
# LLM Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# Service Ports
ROUTER_PORT=9102
GATEWAY_PORT=9300

# Security
RBAC_SECRET_KEY=your-secret-here

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

---

## 🧪 Testing

### Smoke Tests

Run basic health checks:

```bash
./smoke.sh
```

### E2E Tests

Test individual components:

```bash
./test-devtools.sh    # DevTools integration
./test-crewai.sh      # CrewAI workflows
./test-gateway.sh     # Gateway + RBAC
```

### Manual Testing

```bash
# Test LLM routing
curl -X POST http://localhost:9102/route \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test", "mode": "chat", "metadata": {}}'

# Test DevTools
curl -X POST http://localhost:8008/fs/read \
  -H "Content-Type: application/json" \
  -d '{"path": "README.md"}'

# Test CrewAI
curl -X POST http://localhost:9010/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"workflow_name": "code_review", "inputs": {}}'

# Test RBAC
curl -X POST http://localhost:9200/rbac/resolve \
  -H "Content-Type: application/json" \
  -d '{"dao_id": "greenfood-dao", "user_id": "tg:12345"}'
```

---

## 📊 Monitoring & Logs

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f router
docker-compose logs -f gateway
```

### Structured JSON Logs

All services use structured logging:

```json
{
  "timestamp": "2024-11-15T12:00:00Z",
  "level": "INFO",
  "service": "router",
  "message": "Request routed successfully",
  "request_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "tg:12345",
  "dao_id": "greenfood-dao",
  "duration_ms": 125.5
}
```

### Health Checks

All services expose `/health` endpoint:

```bash
curl http://localhost:9102/health
```

---

## 🚢 Deployment

### Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Kubernetes

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Kubernetes manifests and Helm charts.

### Systemd

For production servers without containers:

```bash
sudo cp deploy/systemd/dagi-router.service /etc/systemd/system/
sudo systemctl enable dagi-router
sudo systemctl start dagi-router
```

Full deployment guide: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 🛣️ Roadmap

### Phase 1: Core Router ✅
- [x] Multi-provider LLM support
- [x] Rule-based routing engine
- [x] YAML configuration
- [x] Basic health checks

### Phase 2: Orchestration ✅
- [x] DevTools integration
- [x] CrewAI workflows
- [x] Bot gateway (Telegram/Discord)
- [x] RBAC service

### Phase 3: Production (Current)
- [x] Docker deployment
- [x] Structured logging
- [x] Smoke test suite
- [ ] Prometheus metrics
- [ ] CI/CD pipelines

### Phase 4: Governance (Planned)
- [ ] On-chain voting integration
- [ ] Token-weighted decisions
- [ ] Proposal lifecycle management
- [ ] Treasury operations

### Phase 5: Scale (Future)
- [ ] Horizontal scaling
- [ ] Load balancing
- [ ] Distributed tracing
- [ ] Performance optimization

---

## 📚 Documentation

- [Architecture Overview](docs/DEPLOYMENT.md#architecture)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [API Reference](docs/api/)
- [Development Guide](docs/development/)

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Website**: https://daarion.city
- **Documentation**: https://docs.daarion.city
- **GitHub**: https://github.com/daarion/dagi-stack
- **Discord**: https://discord.gg/daarion

---

## 💬 Support

- **Issues**: https://github.com/daarion/dagi-stack/issues
- **Discussions**: https://github.com/daarion/dagi-stack/discussions
- **Email**: dev@daarion.city

---

**Built with ❤️ by the DAARION Community**

---

## 🎯 First Deployment

Ready to deploy? Follow our step-by-step guide:

📖 **[First Deployment Guide](FIRST-DEPLOY.md)** - Complete walkthrough for first live deployment

**5-step process (15 minutes):**
1. Initial Setup - Configure `.env`, generate secrets
2. Pre-flight Checks - Verify Docker, disk, memory
3. Service Startup - `docker-compose up -d`
4. Health Verification - Run `./smoke.sh`
5. First Real Dialog - Test Telegram bot or curl

**Includes:**
- Pre-deployment checklist
- Troubleshooting guide
- Post-deployment verification
- Success confirmation criteria

---

## 🧪 Golden Scenarios

After deployment, validate your stack with production scenarios:

📖 **[Golden Scenarios Guide](SCENARIOS.md)** - 5 end-to-end test scenarios

**Scenarios:**
1. **Basic Chat** - Telegram → Gateway → Router → LLM (5s)
2. **microDAO Onboarding** - CrewAI 3-agent workflow (60s)
3. **DevTools File Operation** - Read/write files (1s)
4. **Code Review** - Multi-agent code analysis (90s)
5. **RBAC Permission Check** - Access control validation (100ms)

Each scenario includes:
- Setup requirements
- Expected flow diagram
- Verification commands
- Success criteria
- Troubleshooting tips

