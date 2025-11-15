# Changelog

All notable changes to DAGI Stack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Real CrewAI integration with live agents
- Production RBAC with PostgreSQL/MongoDB backend
- Docker containerization for all services
- Kubernetes deployment manifests
- Monitoring with Prometheus + Grafana
- CI/CD pipelines (GitHub Actions)
- Multi-node Router federation

---

## [0.2.0] - 2025-11-15

### Phase 2: Orchestration Layer - COMPLETE ✅

#### Added
- **Bot Gateway Service** (321 lines)
  - Telegram webhook handler
  - Discord webhook handler
  - Automatic DAO mapping
  - Router client integration

- **microDAO RBAC Service** (212 lines)
  - Role management (admin, member, contributor, guest)
  - Entitlements resolution (10 distinct permissions)
  - User-to-DAO mapping
  - RBAC resolution API

- **RBAC Integration in Router**
  - `rbac_client.py` for RBAC service communication
  - Automatic RBAC context injection for `mode=chat`
  - Context enrichment in `RouterApp.handle()`

- **Chat Mode Routing**
  - New routing rule `microdao_chat` (priority 10)
  - Automatic routing for chat requests
  - RBAC-aware LLM calls

#### Tests
- `test-gateway.sh` - Gateway + RBAC integration (6/7 passed - 86%)
- End-to-end flow: Bot → Gateway → Router → RBAC → LLM

#### Known Issues
- LLM timeout on high load (performance tuning needed, not architecture issue)

---

## [0.1.5] - 2025-11-15

### CrewAI Orchestrator Integration - COMPLETE ✅

#### Added
- **CrewAIProvider** (122 lines)
  - HTTP-based workflow orchestration
  - Metadata enrichment
  - Error handling

- **CrewAI Backend MVP** (236 lines)
  - 4 predefined multi-agent workflows:
    * `microdao_onboarding` - 3 agents (welcomer, role_assigner, guide)
    * `code_review` - 3 agents (reviewer, security_checker, performance_analyzer)
    * `proposal_review` - 3 agents (legal_checker, financial_analyzer, impact_assessor)
    * `task_decomposition` - 3 agents (planner, estimator, dependency_analyzer)
  - Simulated agent execution with logs
  - Workflow registry and validation

- **Orchestrator Provider Type**
  - New `orchestrator_providers` section in config
  - Auto-registration in provider registry
  - `mode=crew` routing rule

#### Tests
- `test-crewai.sh` - Full CrewAI integration (13/13 passed - 100%)

#### Configuration
- Updated `router-config.yml` to v0.5.0
- Added `microdao_orchestrator` agent

---

## [0.1.0] - 2025-11-15

### DevTools Integration - COMPLETE ✅

#### Added
- **DevToolsProvider** (132 lines)
  - HTTP backend communication
  - Tool mapping (fs_read, fs_write, run_tests, notebook_execute)
  - Request enrichment with DAO context

- **DevTools Backend MVP** (261 lines)
  - File system operations (read/write)
  - Test execution (pytest integration)
  - Notebook execution (simulated)
  - Basic security validation

- **Provider Registry Updates**
  - Auto-detect DevTools agents from config
  - Dynamic provider instantiation

#### Tests
- `test-devtools.sh` - E2E DevTools flow (10/11 passed - 91%)

#### Configuration
- Updated `router-config.yml` to v0.4.0
- Added `devtools_tool_execution` routing rule (priority 3)

---

## [0.0.5] - 2025-11-15

### Phase 1: Foundation - COMPLETE ✅

#### Added
- **Config Loader** (195 lines)
  - PyYAML + Pydantic validation
  - 8 Pydantic models for config schema
  - Config path resolution with env var support
  - Helper functions for config access

- **Provider Registry** (67 lines initially)
  - Config-driven provider builder
  - LLM provider support (OpenAI, Ollama)

- **Routing Engine** (156 lines)
  - Priority-based rule matching
  - Complex conditions (AND, metadata, API key checks)
  - RoutingTable class

- **RouterApp** (152 lines)
  - Main orchestration class
  - `from_config_file()` factory
  - `async handle()` method
  - Provider info and routing info methods

- **FastAPI HTTP Layer** (171 lines)
  - POST /route - main routing endpoint
  - GET /health, /info, /providers, /routing
  - Swagger/OpenAPI docs
  - Error handling

#### Tests
- `test_config_loader.py` - Unit tests (7/7 passed)

#### Configuration
- Initial `router-config.yml` with 2 LLM profiles
- DevTools agent definition
- 4 routing rules

---

## [0.0.1] - 2025-11-14

### Initial Setup

#### Added
- Project structure
- Basic FastAPI skeleton
- Environment setup
- Ollama + qwen3:8b integration
- `.env` configuration

---

[Unreleased]: https://github.com/daarion/dagi-stack/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/daarion/dagi-stack/compare/v0.1.5...v0.2.0
[0.1.5]: https://github.com/daarion/dagi-stack/compare/v0.1.0...v0.1.5
[0.1.0]: https://github.com/daarion/dagi-stack/compare/v0.0.5...v0.1.0
[0.0.5]: https://github.com/daarion/dagi-stack/compare/v0.0.1...v0.0.5
[0.0.1]: https://github.com/daarion/dagi-stack/releases/tag/v0.0.1
