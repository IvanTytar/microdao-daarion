# GitHub Issues Template для DAARION DAGI Stack

Використовуйте ці шаблони для створення Issues в GitHub.

---

## 🏗️ Governance Tasks

### Issue: Setup Monorepo Structure
```markdown
**Title:** [Governance] Setup monorepo structure for DAGI Stack

**Labels:** `governance`, `setup`, `high-priority`

**Description:**
Створити монорепозиторій `daarion/dagi` з базовою структурою:

### Tasks
- [ ] Створити репо `daarion/dagi`
- [ ] Налаштувати структуру директорій:
  - `/router` - DAGI Router core
  - `/agents/devtools` - DevTools Agent
  - `/agents/crew-orchestrator` - CrewAI
  - `/microdao` - microDAO SDK
  - `/docs` - Documentation
  - `/config` - Configs
  - `/integration-tests` - Tests
- [ ] Налаштувати `.gitignore`
- [ ] Додати base `README.md`

**Acceptance Criteria:**
- Монорепо створено і доступно
- Всі директорії присутні
- README містить опис структури

**References:**
- TODO.md Section A.1
```

### Issue: Setup Git Branching Strategy
```markdown
**Title:** [Governance] Configure git branching strategy

**Labels:** `governance`, `git-flow`

**Description:**
Налаштувати git-flow branching strategy.

### Branches
- [ ] `main` - production-ready
- [ ] `develop` - integration branch
- [ ] `feature/*` - new features
- [ ] `release/*` - release preparation
- [ ] `hotfix/*` - critical fixes

**Acceptance Criteria:**
- Всі гілки створені
- Branch protection rules налаштовані
- Documented в CONTRIBUTING.md

**References:**
- TODO.md Section A.2
```

---

## 🔧 Technical Tasks

### Issue: Implement router-config.yml Loader
```markdown
**Title:** [Router] Implement YAML config loader

**Labels:** `router`, `feature`, `high-priority`

**Description:**
Реалізувати завантаження конфігурації з `router-config.yml`.

### Tasks
- [ ] Додати `pyyaml` в `requirements.txt`
- [ ] Створити `config_loader.py`
- [ ] Реалізувати функцію `load_config()`
- [ ] Додати validation для config schema
- [ ] Написати unit tests

**Code Example:**
```python
import yaml
from pathlib import Path

def load_config(config_path: Path) -> dict:
    with open(config_path) as f:
        return yaml.safe_load(f)
```

**Acceptance Criteria:**
- Config завантажується успішно
- Validation працює
- Tests pass

**References:**
- TODO.md Section D.3
- `/opt/dagi-router/router-config.yml`
```

### Issue: Create DevTools Agent Service
```markdown
**Title:** [Agent] Create DevTools Agent FastAPI service

**Labels:** `agent/devtools`, `feature`, `high-priority`

**Description:**
Створити окремий FastAPI сервіс для DevTools Agent.

### Tasks
- [ ] Створити `/opt/devtools-agent/`
- [ ] Setup FastAPI boilerplate
- [ ] Implement endpoints:
  - [ ] `POST /tools/fs/read`
  - [ ] `POST /tools/fs/write`
  - [ ] `POST /tools/ci/run-tests`
  - [ ] `POST /tools/git/diff`
  - [ ] `POST /tools/git/commit`
- [ ] Додати security middleware
- [ ] Write API tests

**Acceptance Criteria:**
- Service запускається на :8001
- Всі endpoints працюють
- Security validation впроваджена

**References:**
- TODO.md Section D.4
```

### Issue: Implement CrewAI Provider
```markdown
**Title:** [Agent] Implement CrewAI orchestrator provider

**Labels:** `agent/crew`, `feature`, `medium-priority`

**Description:**
Додати CrewAI provider в DAGI Router.

### Tasks
- [ ] Додати `crewai` в `router-config.yml`
- [ ] Створити `providers/crewai_provider.py`
- [ ] Реалізувати workflow execution API
- [ ] Додати routing rule для `mode=crew`
- [ ] Написати integration test

**Acceptance Criteria:**
- CrewAI provider працює
- Workflows виконуються
- Integration test pass

**References:**
- TODO.md Section E
```

---

## 📖 Documentation Tasks

### Issue: Setup Documentation Site
```markdown
**Title:** [Docs] Setup Docusaurus documentation site

**Labels:** `docs`, `setup`, `medium-priority`

**Description:**
Підняти Docusaurus для `docs.daarion.city`.

### Tasks
- [ ] Install Docusaurus
- [ ] Configure `docusaurus.config.js`
- [ ] Create docs structure:
  - [ ] Architecture
  - [ ] API Reference
  - [ ] Agents Guide
  - [ ] Security
  - [ ] Roadmap
- [ ] Setup GitHub Pages deploy
- [ ] Add CI/CD for docs

**Acceptance Criteria:**
- Docs site доступний на docs.daarion.city
- Auto-deploy працює
- Navigation зрозуміла

**References:**
- TODO.md Section B
```

---

## 🧪 Testing Tasks

### Issue: Create Golden Path Tests
```markdown
**Title:** [Testing] Implement golden path scenarios

**Labels:** `testing`, `integration`, `high-priority`

**Description:**
Створити E2E tests для основних сценаріїв.

### Scenarios
- [ ] Bugfix: DevTools знаходить і виправляє баг
- [ ] Refactor: Простий рефакторинг функції
- [ ] Architecture: Складний аналіз архітектури
- [ ] microDAO: Telegram → Router → LLM → Response
- [ ] CrewAI: Workflow execution

**Acceptance Criteria:**
- Всі сценарії автоматизовані
- Tests проходять успішно
- CI/CD інтегровано

**References:**
- TODO.md Sections D.6, F.4
```

---

## 🔒 Security Tasks

### Issue: Implement Audit Logging
```markdown
**Title:** [Security] Add audit logging to Router

**Labels:** `security`, `feature`, `high-priority`

**Description:**
Додати audit trail для всіх операцій.

### Tasks
- [ ] Створити `/router/audit/` структуру
- [ ] Log config changes
- [ ] Log agent calls
- [ ] Log routing decisions
- [ ] Log RBAC decisions
- [ ] Implement rotation (monthly)

**Acceptance Criteria:**
- Всі операції логуються
- Logs structured (JSON)
- Rotation працює

**References:**
- TODO.md Section A.5
```

---

## 📦 Release Tasks

### Issue: Prepare v1.0.0 Release
```markdown
**Title:** [Release] Prepare DAGI Stack v1.0.0

**Labels:** `release`, `v1.0.0`

**Description:**
Підготовка першого стабільного релізу.

### Checklist
- [ ] All P0 features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] CHANGELOG.md updated
- [ ] Security audit passed
- [ ] Performance benchmarks run
- [ ] Release notes written
- [ ] Docker images built
- [ ] Deployment tested

**Acceptance Criteria:**
- Tag v1.0.0 створений
- Release notes опубліковані
- Docker images в registry
- Documentation updated

**References:**
- TODO.md all sections
```

---

## 🏷️ Labels Guide

### Priority
- `critical` - Блокуючі issues
- `high-priority` - Важливі features
- `medium-priority` - Standard features
- `low-priority` - Nice to have

### Type
- `bug` - Bug reports
- `feature` - New features
- `enhancement` - Improvements
- `docs` - Documentation
- `security` - Security issues
- `testing` - Test improvements

### Component
- `governance` - Project structure
- `router` - DAGI Router
- `agent/devtools` - DevTools Agent
- `agent/crew` - CrewAI
- `microdao` - microDAO
- `docs` - Documentation
- `ci-cd` - CI/CD pipeline

### Status
- `blocked` - Blocked by other work
- `in-progress` - Currently working
- `needs-review` - Ready for review
- `ready-to-merge` - Approved

