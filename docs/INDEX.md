# DAARION microDAO Repository Index

**Repository**: [IvanTytar/microdao-daarion](https://github.com/IvanTytar/microdao-daarion)

**Purpose**: Full-stack DAARION infrastructure - DAGI Stack + Documentation + Roadmap

---

## 📂 Repository Structure

```
microdao-daarion/
├── 📁 DAGI Stack (Production Infrastructure)
│   ├── router/                    # Core Router (main_v2.py, routing_engine.py)
│   ├── providers/                 # LLM, DevTools, CrewAI providers
│   ├── devtools-backend/          # File ops, test execution
│   ├── orchestrator/              # CrewAI multi-agent workflows
│   ├── gateway-bot/               # Telegram/Discord webhooks
│   ├── microdao/                  # RBAC service
│   ├── utils/                     # Structured logging
│   ├── docker-compose.yml         # 5-service orchestration
│   └── Dockerfile (x5)            # Service containers
│
├── 📁 Documentation
│   ├── README.md                  # Main project documentation
│   ├── FIRST-DEPLOY.md            # First deployment guide
│   ├── SCENARIOS.md               # Golden test scenarios
│   ├── PRODUCTION-CHECKLIST.md    # Pre-flight checklist
│   ├── READY-TO-DEPLOY.md         # Deployment readiness summary
│   ├── CHANGELOG.md               # Version history
│   ├── PHASE-2-COMPLETE.md        # Phase 2 summary
│   ├── PHASE-4-ROADMAP.md         # Phase 4 planning
│   ├── docs/
│   │   ├── INDEX.md               # This file
│   │   ├── DEPLOYMENT.md          # Deployment scenarios
│   │   ├── open-core-model.md     # Open Core licensing
│   │   └── integrations/
│   │       └── dify-integration.md # Dify integration guide
│
├── 📁 Testing
│   ├── smoke.sh                   # Smoke test suite (10 tests)
│   ├── test-devtools.sh           # DevTools E2E (11 tests)
│   ├── test-crewai.sh             # CrewAI E2E (13 tests)
│   ├── test-gateway.sh            # Gateway E2E (7 tests)
│   └── test_config_loader.py      # Unit tests
│
├── 📁 Configuration
│   ├── .env.example               # Environment template
│   ├── router-config.yml          # Routing rules
│   ├── requirements.txt           # Python dependencies
│   └── .gitignore                 # Git ignore rules
│
└── 📁 Kubernetes/Helm (Optional)
    └── chart/                     # Helm chart templates
```

---

## 🔧 Development Workflow

### Working with Cursor IDE

```bash
# Clone repository
git clone git@github.com:IvanTytar/microdao-daarion.git
cd microdao-daarion

# Open in Cursor
cursor .

# Make changes, commit, push
git add .
git commit -m "feat: your changes"
git push origin main
```

**Cursor Features:**
- AI code completion (GPT-4)
- Codebase indexing
- Multi-file editing
- Terminal integration

---

### Working with Warp.dev (Production Server)

```bash
# SSH to server
ssh user@server

# Navigate to working directory
cd /opt/dagi-router

# Pull latest changes from GitHub
git pull origin main

# Make changes (e.g., update config, fix bugs)
nano router-config.yml

# Commit and push
git add .
git commit -m "fix: update routing rule timeout"
git push origin main

# Deploy changes
docker-compose restart router
```

**Warp.dev Features:**
- AI Agent Mode (terminal assistant)
- Codebase semantic search
- Command suggestions
- Git integration

---

### Sync Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Flow                        │
└─────────────────────────────────────────────────────────────┘

Local (Cursor)
    ↓ git push
GitHub (microdao-daarion)
    ↓ git pull
Server (Warp.dev @ /opt/dagi-router)
    ↓ docker-compose restart
Production (5 services running)
```

**All environments stay in sync:**
1. Develop in Cursor → push to GitHub
2. Server pulls from GitHub → deploy changes
3. Warp.dev monitors logs, debug issues
4. Fixes pushed back to GitHub → loop continues

---

## 📋 Key Files Reference

### Core Router
- `main_v2.py` - Entry point
- `routing_engine.py` - Routing logic (1530 lines)
- `router_app.py` - FastAPI HTTP server
- `config_loader.py` - YAML config parser
- `router-config.yml` - Routing rules (10 rules, 6 providers)

### Providers
- `providers/llm_provider.py` - LLM base class
- `providers/devtools_provider.py` - DevTools integration (132 lines)
- `providers/crewai_provider.py` - CrewAI orchestration (122 lines)
- `providers/registry.py` - Provider discovery

### Services
- `devtools-backend/main.py` - DevTools FastAPI (261 lines)
- `orchestrator/crewai_backend.py` - CrewAI workflows (236 lines)
- `gateway-bot/main.py` - Bot gateway (100 lines)
- `microdao/rbac_api.py` - RBAC service (212 lines)

### Deployment
- `docker-compose.yml` - 5 services orchestration
- `Dockerfile` (x5) - Service containers
- `.env.example` - Configuration template (4.3KB)

### Documentation
- `README.md` - Main documentation (12KB)
- `FIRST-DEPLOY.md` - Deployment guide (10KB)
- `SCENARIOS.md` - Test scenarios (8KB)
- `PHASE-4-ROADMAP.md` - Phase 4 planning (11KB)

---

## 🎯 Quick Actions

### Deploy First Time
```bash
cd /opt/dagi-router
cp .env.example .env
nano .env  # Add tokens
docker-compose up -d
./smoke.sh
```

### Update Configuration
```bash
# Edit routing rules
nano router-config.yml

# Restart router
docker-compose restart router

# Verify
curl http://localhost:9102/health
```

### Debug Production
```bash
# View logs
docker-compose logs -f router

# Check specific service
docker-compose logs devtools | grep ERROR

# Monitor all services
docker-compose ps
```

### Run Tests
```bash
# Smoke tests (quick)
./smoke.sh

# Full E2E tests
./test-devtools.sh
./test-crewai.sh
./test-gateway.sh
```

---

## 🔗 External Resources

- **GitHub**: https://github.com/IvanTytar/microdao-daarion
- **Warp.dev**: https://warp.dev
- **Cursor**: https://cursor.sh
- **DAARION**: https://daarion.city
- **Discord**: https://discord.gg/daarion

---

## 📊 Current Status

**Version**: 0.2.0 (Phase 2 Complete)  
**Services**: 5 (Router, DevTools, CrewAI, Gateway, RBAC)  
**Code**: ~3,200 lines  
**Documentation**: 57KB  
**Test Coverage**: 95% (41 tests)  
**Deployment**: Production-ready ✅

---

## 🚀 Next Steps

1. **First Deployment** - Follow [FIRST-DEPLOY.md](../FIRST-DEPLOY.md)
2. **Golden Scenarios** - Test with [SCENARIOS.md](../SCENARIOS.md)
3. **Phase 4 Planning** - Review [PHASE-4-ROADMAP.md](../PHASE-4-ROADMAP.md)
4. **Ecosystem Integration** - Explore [integrations/](integrations/)

---

**Last Updated**: 2024-11-15  
**Maintainer**: Ivan Tytar (@IvanTytar)  
**License**: MIT (Core) - See [open-core-model.md](open-core-model.md)
