# DAGI Stack Open Core Model

**Version**: 0.2.0  
**License**: MIT (core components)  
**Last Updated**: 2024-11-15

---

## 🎯 Philosophy

DAGI Stack follows an **Open Core** model:
- **Core infrastructure** is open-source (MIT License)
- **Advanced/proprietary features** can remain private (optional)
- **Community-driven** development with transparent roadmap

**Goals:**
1. Enable anyone to build AI routers and agent systems
2. Maintain flexibility for commercial/proprietary extensions
3. Foster ecosystem growth through shared infrastructure

---

## ✅ Open Source Components (MIT License)

### Router Core
**Why Open**: Foundation for any routing system

- `routing_engine.py` - Rule-based routing logic
- `config_loader.py` - YAML configuration parser
- `router_app.py` - FastAPI HTTP server
- `main_v2.py` - Entry point and CLI

**Use Cases:**
- Build custom AI routers
- Extend routing rules
- Integrate with any LLM/agent backend

---

### Provider Interfaces
**Why Open**: Standard contracts for extensibility

- `providers/base_provider.py` - Abstract provider interface
- `providers/registry.py` - Provider discovery and registration
- `providers/llm_provider.py` - LLM provider base class
- `providers/ollama_provider.py` - Ollama integration
- `providers/openai_provider.py` - OpenAI integration
- `providers/deepseek_provider.py` - DeepSeek integration

**Use Cases:**
- Add new LLM providers (Anthropic, Cohere, etc.)
- Create custom agent providers
- Integrate with proprietary backends

---

### DevTools Backend
**Why Open**: Common development workflows

- `devtools-backend/main.py` - FastAPI service
- Endpoints: `/fs/read`, `/fs/write`, `/ci/run-tests`, `/notebook/execute`
- File operations, test execution, notebook support

**Use Cases:**
- Code review workflows
- Automated testing
- Workspace management

---

### RBAC Service
**Why Open**: Foundational access control

- `microdao/rbac_api.py` - Role resolution service
- Role definitions (admin, member, contributor, guest)
- Entitlement system

**Use Cases:**
- Multi-tenant access control
- DAO-based permissions
- Custom role hierarchies

---

### Bot Gateway
**Why Open**: Platform integrations

- `gateway-bot/main.py` - Telegram/Discord webhooks
- `gateway-bot/http_api.py` - HTTP endpoints
- `gateway-bot/router_client.py` - Router client

**Use Cases:**
- Add new platforms (Slack, WhatsApp)
- Custom chat normalization
- Webhook processing

---

### Utilities
**Why Open**: Shared infrastructure

- `utils/logger.py` - Structured JSON logging
- `utils/validation.py` - Request validation
- Request ID generation, error handling

**Use Cases:**
- Consistent logging across services
- Debugging and tracing
- Production observability

---

### Documentation
**Why Open**: Knowledge sharing

- All `.md` files (README, guides, API docs)
- Architecture diagrams
- Deployment guides
- Test scenarios

**Use Cases:**
- Learn routing patterns
- Deployment best practices
- Community contributions

---

### Test Suites
**Why Open**: Quality assurance

- `smoke.sh` - Smoke test suite
- `test-devtools.sh` - DevTools E2E tests
- `test-crewai.sh` - CrewAI E2E tests
- `test-gateway.sh` - Gateway E2E tests

**Use Cases:**
- Validate custom deployments
- Regression testing
- CI/CD integration

---

## ⚠️ Proprietary/Private Components (Optional)

These can remain private for commercial or strategic reasons:

### Custom CrewAI Workflows
**Why Private**: Domain-specific IP

- `orchestrator/crewai_backend.py` - Workflow implementations
- microDAO-specific workflows (onboarding, proposal review)
- Agent configurations and prompts

**Alternatives (Open):**
- Base CrewAI integration (open)
- Workflow interface/API (open)
- Example workflows (open)

---

### Advanced RBAC Policies
**Why Private**: Competitive advantage

- Custom DAO-specific rules
- Complex entitlement logic
- Integration with on-chain data

**Alternatives (Open):**
- Base RBAC service (open)
- Role resolution API (open)
- Example policies (open)

---

### LLM Fine-tuning Data
**Why Private**: Training data IP

- Custom training datasets
- Prompt engineering techniques
- Model fine-tuning parameters

**Alternatives (Open):**
- Provider interfaces (open)
- Base model configurations (open)

---

### Enterprise Features
**Why Private**: Revenue generation

- SSO integration (SAML, OAuth)
- Advanced audit logs
- SLA guarantees
- Premium support

**Alternatives (Open):**
- Basic authentication (open)
- Standard logging (open)

---

## 🔄 Contribution Model

### Open Source Contributions

**Welcome:**
- Bug fixes
- Performance improvements
- New provider implementations
- Documentation updates
- Test coverage
- Example workflows

**Process:**
1. Fork repository
2. Create feature branch
3. Submit Pull Request
4. Code review by maintainers
5. Merge after approval

**See:** [CONTRIBUTING.md](../CONTRIBUTING.md)

---

### Commercial Extensions

**Allowed:**
- Build proprietary services on top of DAGI Stack
- Offer hosted versions (SaaS)
- Create premium features
- Provide consulting/support

**Requirements:**
- Comply with MIT License terms
- Attribute DAGI Stack in documentation
- Consider contributing improvements back (optional)

---

## 📜 Licensing

### MIT License Summary

**Permissions:**
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

**Conditions:**
- 📄 Include license and copyright notice

**Limitations:**
- ⚠️ No liability
- ⚠️ No warranty

**Full License:** [LICENSE](../LICENSE)

---

## 🌐 Ecosystem Vision

### Current State (v0.2.0)
- Open-source core (Router, DevTools, RBAC, Gateway)
- Example workflows and integrations
- Production-ready deployment

### Short-term (v0.3.0-v0.5.0)
- Community provider implementations
- Additional workflow examples
- Integration guides (Dify, MCP)

### Long-term (v1.0.0+)
- Plugin marketplace
- Hosted community instances
- Certification program for providers
- Enterprise support offerings

---

## 🤝 Partners & Integrations

### Open Integrations
- Ollama (local LLM)
- OpenAI API
- DeepSeek API
- Telegram Bot API
- Discord Webhooks

### Planned Integrations
- Dify (LLM backend)
- MCP (Model Context Protocol)
- Anthropic Claude
- Hugging Face models
- Web3 wallets (for DAO auth)

---

## 📊 Metrics & Transparency

### Public Metrics (Planned)
- GitHub stars/forks
- Active contributors
- Issue resolution time
- Release cadence
- Community size (Discord)

### Development Transparency
- Public roadmap (GitHub Projects)
- Open issue tracker
- Public discussions
- Regular community calls (planned)

---

## 💬 Community

- **GitHub**: https://github.com/daarion/dagi-stack
- **Discord**: https://discord.gg/daarion
- **Discussions**: https://github.com/daarion/dagi-stack/discussions
- **Email**: dev@daarion.city

---

## 🎉 Why Open Core?

1. **Accelerate Innovation**: Community contributions improve core faster
2. **Reduce Vendor Lock-in**: Users can self-host, modify, extend
3. **Build Trust**: Transparent codebase, security audits possible
4. **Ecosystem Growth**: More providers = more value for everyone
5. **Sustainable Business**: Commercial extensions fund ongoing development

---

**DAGI Stack is infrastructure, not a product.** By open-sourcing the core, we enable the entire DAARION ecosystem to build on a shared foundation while maintaining flexibility for specialized/commercial use cases.

---

**Version**: 0.2.0  
**License**: MIT (core)  
**Last Updated**: 2024-11-15
