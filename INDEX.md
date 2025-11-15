# DAARION DAGI Stack - Documentation Index

**Version:** 1.0.0  
**Last Updated:** 15.11.2025  
**Status:** 🚀 Active Development

---

## 📚 Documentation Structure

```
/opt/dagi-router/
├── INDEX.md                      ← Ви тут
├── TODO.md                       ← Unified task list
├── NEXT-STEPS.md                 ← Technical roadmap
├── README-DevTools.md            ← Quick start guide
├── GITHUB-ISSUES-TEMPLATE.md     ← GitHub issues templates
├── router-config.yml             ← Router configuration
├── .env                          ← Environment variables
├── main.py                       ← Router code
├── test-devtools.sh              ← Test script
└── /tmp/dagi-devtools-setup-summary.txt  ← Setup summary
```

---

## 🎯 Quick Navigation

### Getting Started
- **New to DAGI Stack?** → Start with `README-DevTools.md`
- **Want to see what's next?** → Check `NEXT-STEPS.md`
- **Need the full task list?** → See `TODO.md`
- **Creating GitHub Issues?** → Use `GITHUB-ISSUES-TEMPLATE.md`

### Configuration
- **Router Config:** `router-config.yml`
- **Environment:** `.env`
- **Current Setup Summary:** `/tmp/dagi-devtools-setup-summary.txt`

### Testing
- **Run Tests:** `./test-devtools.sh`
- **Logs:** `/tmp/dagi-router.log`

---

## 📖 Document Descriptions

### 1. README-DevTools.md
**Purpose:** Quick start guide  
**Audience:** Developers new to DAGI Stack  
**Content:**
- Current status
- Quick start commands
- File structure overview
- FAQ

**Use when:** You want to quickly understand and test the current setup

---

### 2. NEXT-STEPS.md
**Purpose:** Technical roadmap (detailed)  
**Audience:** Technical leads, developers  
**Content:**
- Step-by-step technical plan
- Implementation details
- Code examples
- Golden path scenarios
- Architecture diagrams

**Use when:** You're ready to implement next features

---

### 3. TODO.md
**Purpose:** Unified task list  
**Audience:** Project managers, developers, contributors  
**Content:**
- All tasks organized by section:
  - A: Governance & Repo
  - B: Documentation
  - C: Licensing
  - D: Router + DevTools + LLM
  - E: CrewAI Orchestrator
  - F: microDAO + Bots
- Progress tracking
- Priority order
- Phase planning

**Use when:** 
- Planning sprints
- Tracking overall progress
- Assigning tasks

---

### 4. GITHUB-ISSUES-TEMPLATE.md
**Purpose:** GitHub Issues templates  
**Audience:** GitHub contributors, project managers  
**Content:**
- Issue templates for all components
- Labels guide
- Acceptance criteria templates

**Use when:** Creating GitHub Issues or setting up GitHub Projects

---

### 5. router-config.yml
**Purpose:** DAGI Router configuration  
**Audience:** DevOps, developers  
**Content:**
- Node configuration
- LLM profiles (qwen3:8b, DeepSeek)
- Agent definitions (DevTools)
- Routing rules
- Telemetry settings

**Use when:** Configuring or debugging Router

---

### 6. .env
**Purpose:** Environment variables  
**Audience:** DevOps  
**Content:**
- OLLAMA_MODEL=qwen3:8b
- OLLAMA_BASE_URL=http://localhost:11434
- DEEPSEEK_* configuration

**Use when:** Setting up or changing environment

---

## 🎯 Workflows

### Workflow 1: Starting Development
```bash
1. Read README-DevTools.md
2. Run health checks:
   curl -s http://127.0.0.1:9101/health | jq
   ollama list
3. Run tests:
   ./test-devtools.sh
4. Check NEXT-STEPS.md for next tasks
```

### Workflow 2: Planning Sprint
```bash
1. Review TODO.md
2. Check current phase
3. Select tasks from current phase
4. Create GitHub Issues using GITHUB-ISSUES-TEMPLATE.md
5. Assign to GitHub Project board
```

### Workflow 3: Implementing Features
```bash
1. Check TODO.md for task details
2. Read NEXT-STEPS.md for implementation guidance
3. Update router-config.yml if needed
4. Implement feature
5. Run ./test-devtools.sh
6. Mark task as complete in TODO.md
7. Update Progress Tracking section
```

### Workflow 4: Debugging
```bash
1. Check /tmp/dagi-router.log
2. Review router-config.yml
3. Verify .env settings
4. Test with ./test-devtools.sh
5. Check NEXT-STEPS.md for troubleshooting
```

---

## 🔗 External Resources

### Current Infrastructure
- **DAGI Router:** http://127.0.0.1:9101
- **Ollama:** http://localhost:11434
- **Health Check:** http://127.0.0.1:9101/health

### Future Links (to be added)
- GitHub Repo: `daarion/dagi` (TBD)
- Documentation Site: `docs.daarion.city` (TBD)
- GitHub Project: "DAARION Engineering" (TBD)

---

## 📊 Current Status

### ✅ Completed
- qwen3:8b model setup via Ollama
- DAGI Router running on :9101
- router-config.yml created
- Basic documentation structure
- Test scripts

### 🔄 In Progress
- Router config loader implementation
- DevTools Agent design

### ⏳ Not Started
- Governance setup (monorepo, git-flow)
- Documentation site
- CrewAI integration
- microDAO bot integration

---

## 🚀 Quick Commands

```bash
# Check Router status
curl -s http://127.0.0.1:9101/health | jq

# List Ollama models
ollama list

# Run tests
cd /opt/dagi-router && ./test-devtools.sh

# View logs
tail -f /tmp/dagi-router.log

# Restart Router
pkill -f "uvicorn main:app.*9101"
cd /opt/dagi-router && nohup .venv/bin/uvicorn main:app --host 127.0.0.1 --port 9101 > /tmp/dagi-router.log 2>&1 &

# View configuration
cat router-config.yml
cat .env
```

---

## 📝 Contributing

### For New Contributors
1. Read `README-DevTools.md` first
2. Check `TODO.md` for available tasks
3. Use `GITHUB-ISSUES-TEMPLATE.md` to create issues
4. Follow git-flow branching (see TODO.md Section A.2)
5. Reference `NEXT-STEPS.md` for implementation details

### For Maintainers
1. Keep `TODO.md` updated with progress
2. Update `INDEX.md` when adding new docs
3. Maintain consistency across all docs
4. Review PRs against TODO.md checklist

---

## 🔄 Document Maintenance

**Update Frequency:**
- `TODO.md` - Daily (as tasks complete)
- `NEXT-STEPS.md` - Weekly (as implementation progresses)
- `README-DevTools.md` - On major changes
- `INDEX.md` - When new docs added
- `router-config.yml` - As configuration changes
- `.env` - As environment changes

**Version Control:**
- All docs versioned with code
- Breaking changes require version bump
- Docs frozen at release tags

---

## ❓ FAQ

**Q: Which document should I read first?**  
A: Start with `README-DevTools.md` for quick overview

**Q: Where's the full task breakdown?**  
A: See `TODO.md` - it's the master task list

**Q: How do I implement next features?**  
A: Check `NEXT-STEPS.md` for detailed guidance

**Q: Need to create GitHub Issue?**  
A: Use templates from `GITHUB-ISSUES-TEMPLATE.md`

**Q: Where's the configuration?**  
A: `router-config.yml` for Router, `.env` for environment

**Q: How do I know current status?**  
A: Check Progress Tracking in `TODO.md`

---

## 📞 Support

- **Technical Issues:** Check logs in `/tmp/dagi-router.log`
- **Configuration:** Review `router-config.yml` and `.env`
- **Implementation Help:** See `NEXT-STEPS.md`
- **Task Questions:** Refer to `TODO.md`

---

**Last Updated:** 15.11.2025  
**Maintained by:** DAARION Engineering Team  
**Version:** 1.0.0
