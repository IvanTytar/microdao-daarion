# DAGI Stack Golden Scenarios

Production test scenarios for validating end-to-end functionality.

---

## 🎯 Scenario 1: Basic Chat (Telegram → Router → LLM)

**Objective**: Verify basic LLM routing with RBAC context injection.

### Setup
- User: `tg:12345` (member role in `greenfood-dao`)
- Mode: `chat`
- Expected: LLM response with DAO context

### Steps

1. **Send message in Telegram**
   ```
   Привіт! Що це за DAO?
   ```

2. **Expected flow**
   ```
   Telegram → Gateway (:9300)
              ↓ (enrich with dao_id, user_id)
           Router (:9102)
              ↓ (fetch RBAC context)
           RBAC (:9200)
              ↓ (inject roles: member, entitlements: 4)
           LLM Provider (Ollama :11434)
              ↓ (generate response with context)
           Response to user
   ```

3. **Verify in logs**
   ```bash
   docker-compose logs gateway | grep "tg:12345"
   docker-compose logs router | grep "mode=chat"
   docker-compose logs rbac | grep "greenfood-dao"
   ```

4. **Expected response**
   - Contains DAO name or context
   - Response time < 5s (if local LLM)
   - No errors in logs

### Success Criteria
- ✅ Message received by Gateway
- ✅ Request routed to correct LLM provider
- ✅ RBAC context injected (role: member, entitlements: 4)
- ✅ Response delivered to user
- ✅ Structured logs show full trace (request_id)

---

## 🚀 Scenario 2: microDAO Onboarding (CrewAI Workflow)

**Objective**: Validate multi-agent workflow orchestration.

### Setup
- User: `tg:newcomer001` (guest role)
- Mode: `crew`
- Workflow: `microdao_onboarding`

### Steps

1. **Trigger onboarding**
   ```bash
   curl -X POST http://localhost:9102/route \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Onboard new member",
       "mode": "crew",
       "metadata": {
         "workflow": "microdao_onboarding",
         "dao_id": "greenfood-dao",
         "user_id": "tg:newcomer001"
       }
     }'
   ```

2. **Expected flow**
   ```
   Request → Router
              ↓ (match rule: crew_mode, priority 5)
           CrewAI Orchestrator (:9010)
              ↓ (run microdao_onboarding)
           3 Agents:
              - welcomer (greet new member)
              - role_assigner (suggest role)
              - guide (provide next steps)
              ↓
           Response (workflow result + metadata)
   ```

3. **Verify workflow execution**
   ```bash
   docker-compose logs crewai | grep "microdao_onboarding"
   docker-compose logs router | grep "use_provider: microdao_orchestrator"
   ```

4. **Expected response**
   ```json
   {
     "status": "completed",
     "workflow": "microdao_onboarding",
     "agents": ["welcomer", "role_assigner", "guide"],
     "output": {
       "welcome_message": "...",
       "suggested_role": "contributor",
       "next_steps": [...]
     }
   }
   ```

### Success Criteria
- ✅ Routing rule matched (priority 5, mode=crew)
- ✅ CrewAI workflow executed
- ✅ All 3 agents completed tasks
- ✅ Workflow metadata returned
- ✅ Execution time < 60s

---

## 🛠️ Scenario 3: DevTools File Operation

**Objective**: Validate tool execution through Router.

### Setup
- User: `tg:admin001` (admin role)
- Mode: `devtools`
- Tool: `fs_read`

### Steps

1. **Request file read**
   ```bash
   curl -X POST http://localhost:9102/route \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Read README.md",
       "mode": "devtools",
       "metadata": {
         "tool": "fs_read",
         "params": {"path": "README.md"},
         "dao_id": "greenfood-dao",
         "user_id": "tg:admin001"
       }
     }'
   ```

2. **Expected flow**
   ```
   Request → Router
              ↓ (match rule: devtools_tool_execution, priority 3)
           DevTools Backend (:8008)
              ↓ (POST /fs/read)
           File system (workspace)
              ↓ (read README.md)
           Response (file content)
   ```

3. **Verify tool execution**
   ```bash
   docker-compose logs devtools | grep "fs_read"
   docker-compose logs router | grep "use_provider: devtools_local"
   ```

4. **Expected response**
   ```json
   {
     "status": "success",
     "tool": "fs_read",
     "content": "# DAGI Stack\n\n...",
     "size": 11120
   }
   ```

### Success Criteria
- ✅ RBAC verified (admin entitlement: `devtools_read`)
- ✅ DevTools provider called
- ✅ File content returned
- ✅ Security validated (path not outside workspace)
- ✅ Execution time < 1s

---

## 🔍 Scenario 4: Code Review Workflow

**Objective**: Multi-agent analysis with DevTools + CrewAI.

### Setup
- User: `tg:contributor001` (contributor role)
- Mode: `crew`
- Workflow: `code_review`

### Steps

1. **Submit code for review**
   ```bash
   curl -X POST http://localhost:9102/route \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Review my code changes",
       "mode": "crew",
       "metadata": {
         "workflow": "code_review",
         "dao_id": "greenfood-dao",
         "user_id": "tg:contributor001",
         "code_path": "src/router.py"
       }
     }'
   ```

2. **Expected flow**
   ```
   Request → Router → CrewAI (:9010)
              ↓
           3 Agents:
              - reviewer (code quality)
              - security_checker (vulnerabilities)
              - performance_analyzer (bottlenecks)
              ↓
           Aggregated report
   ```

3. **Expected response**
   ```json
   {
     "status": "completed",
     "workflow": "code_review",
     "findings": {
       "quality_score": 8.5,
       "security_issues": 0,
       "performance_warnings": 2
     },
     "recommendations": [...]
   }
   ```

### Success Criteria
- ✅ All 3 review agents executed
- ✅ Aggregated report generated
- ✅ RBAC verified (contributor: `code_review` entitlement)
- ✅ Execution time < 90s

---

## 📊 Scenario 5: RBAC Permission Check

**Objective**: Validate role-based access control.

### Setup
- User: `tg:guest123` (guest role)
- Attempted action: `devtools_write` (requires contributor+)

### Steps

1. **Attempt unauthorized action**
   ```bash
   curl -X POST http://localhost:9102/route \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Write to file",
       "mode": "devtools",
       "metadata": {
         "tool": "fs_write",
         "dao_id": "greenfood-dao",
         "user_id": "tg:guest123"
       }
     }'
   ```

2. **Expected flow**
   ```
   Request → Router
              ↓ (fetch RBAC)
           RBAC (:9200)
              ↓ (role: guest, entitlements: [chat_access])
           Router (check entitlement: devtools_write)
              ↓ (DENIED - missing entitlement)
           Error response
   ```

3. **Expected response**
   ```json
   {
     "status": "error",
     "code": "RBAC_PERMISSION_DENIED",
     "message": "User lacks entitlement: devtools_write",
     "user_role": "guest",
     "required_entitlement": "devtools_write"
   }
   ```

### Success Criteria
- ✅ RBAC context fetched
- ✅ Permission check executed
- ✅ Request rejected (403 or error response)
- ✅ Structured error message
- ✅ Audit log entry created

---

## 🧪 Running Scenarios

### Automated Test

```bash
# Run all golden scenarios
./test-scenarios.sh

# Run specific scenario
./test-scenarios.sh --scenario chat
./test-scenarios.sh --scenario onboarding
```

### Manual Test

```bash
# 1. Start services
docker-compose up -d

# 2. Wait for health checks
sleep 10

# 3. Run smoke tests
./smoke.sh

# 4. Execute scenarios manually (curl commands above)

# 5. Monitor logs
docker-compose logs -f
```

---

## 📈 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Chat response time | < 5s | TBD |
| Workflow execution | < 60s | TBD |
| DevTools latency | < 1s | TBD |
| RBAC resolution | < 100ms | TBD |
| Error rate | < 1% | TBD |

---

## 🔧 Troubleshooting

### Scenario fails: LLM timeout
- Check Ollama: `curl http://localhost:11434/api/tags`
- Increase timeout in `router-config.yml`
- Consider GPU acceleration

### Scenario fails: RBAC error
- Verify RBAC service: `curl http://localhost:9200/health`
- Check user exists: `curl -X POST http://localhost:9200/rbac/resolve -d '{"dao_id":"greenfood-dao","user_id":"tg:12345"}'`

### Scenario fails: Gateway not responding
- Check bot token in `.env`
- Verify Gateway health: `curl http://localhost:9300/health`
- Check Gateway logs: `docker-compose logs gateway`

---

**Version**: 0.2.0  
**Last updated**: 2024-11-15
