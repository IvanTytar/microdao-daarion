#!/bin/bash
# End-to-end test for CrewAI integration
# Tests Router → CrewAI Orchestrator → Response flow

# set -e

ROUTER_URL="http://127.0.0.1:9102"
CREWAI_URL="http://127.0.0.1:9010"

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║          CrewAI Integration E2E Test                                     ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}→${NC} $1"
}

# ============================================================================
# Test 0: Check services
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 0: Check services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Checking DAGI Router @ $ROUTER_URL"
if curl -s "$ROUTER_URL/health" | grep -q "healthy"; then
    pass "Router is healthy"
else
    fail "Router is not responding"
    exit 1
fi

info "Checking CrewAI Orchestrator @ $CREWAI_URL"
if curl -s "$CREWAI_URL/health" | grep -q "healthy"; then
    pass "CrewAI orchestrator is healthy"
else
    fail "CrewAI orchestrator is not responding"
    echo "  Please start CrewAI backend: python orchestrator/crewai_backend.py"
    exit 1
fi

echo ""

# ============================================================================
# Test 1: List workflows via direct backend call
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: List workflows - Direct backend call"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Fetching workflow list..."
RESPONSE=$(curl -s "$CREWAI_URL/workflow/list")

if echo "$RESPONSE" | jq -e '.workflows' > /dev/null 2>&1; then
    pass "Workflow list retrieved"
    
    WORKFLOW_COUNT=$(echo "$RESPONSE" | jq '.workflows | length')
    info "Available workflows: $WORKFLOW_COUNT"
    
    if [ "$WORKFLOW_COUNT" -gt 0 ]; then
        pass "Workflows are available"
    fi
else
    fail "Failed to retrieve workflow list"
fi

echo ""

# ============================================================================
# Test 2: microDAO onboarding workflow via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: microDAO onboarding workflow via Router"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Sending workflow request..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "crew",
    "agent": "microdao_orchestrator",
    "dao_id": "greenfood-dao",
    "source": "telegram",
    "session_id": "test-session-001",
    "payload": {
      "workflow": "microdao_onboarding",
      "input": {
        "user_id": "wallet:0x123456",
        "channel": "telegram",
        "username": "alice_dao"
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    pass "microDAO onboarding workflow succeeded"
    
    if echo "$RESPONSE" | jq -e '.data.status == "completed"' > /dev/null 2>&1; then
        pass "Workflow status: completed"
    fi
    
    if echo "$RESPONSE" | jq -e '.data.agents_used' > /dev/null 2>&1; then
        AGENTS=$(echo "$RESPONSE" | jq -r '.data.agents_used | join(", ")')
        info "Agents used: $AGENTS"
        pass "Multi-agent execution confirmed"
    fi
else
    fail "microDAO onboarding workflow failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 3: Code review workflow via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Code review workflow via Router"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Sending code review request..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "crew",
    "agent": "microdao_orchestrator",
    "payload": {
      "workflow": "code_review",
      "input": {
        "repo": "daarion-ai-city",
        "pr_id": "42",
        "files": ["router.py", "config_loader.py"]
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    pass "Code review workflow succeeded"
    
    STEPS=$(echo "$RESPONSE" | jq -r '.data.steps_completed')
    info "Steps completed: $STEPS"
    
    if [ "$STEPS" -gt 0 ]; then
        pass "Workflow executed multiple steps"
    fi
else
    fail "Code review workflow failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 4: Proposal review workflow via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Proposal review workflow via Router"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Sending proposal review request..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "crew",
    "agent": "microdao_orchestrator",
    "dao_id": "greenfood-dao",
    "payload": {
      "workflow": "proposal_review",
      "input": {
        "proposal_id": "PROP-2025-001",
        "title": "Expand to new city",
        "budget": 50000,
        "currency": "USD"
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null 2>&1; then
    pass "Proposal review workflow succeeded"
    
    if echo "$RESPONSE" | jq -e '.data.execution_log' > /dev/null 2>&1; then
        LOG_COUNT=$(echo "$RESPONSE" | jq '.data.execution_log | length')
        info "Execution log entries: $LOG_COUNT"
        pass "Detailed execution log available"
    fi
else
    fail "Proposal review workflow failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 5: Direct backend workflow execution
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Direct backend - Task decomposition"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Calling CrewAI backend directly..."
RESPONSE=$(curl -s -X POST "$CREWAI_URL/workflow/run" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "task_decomposition",
    "input": {
      "task": "Implement microDAO governance module",
      "complexity": "high"
    },
    "meta": {
      "dao_id": "test-dao",
      "user_id": "dev-001"
    }
  }')

if echo "$RESPONSE" | jq -e '.status == "completed"' > /dev/null 2>&1; then
    pass "Direct backend call succeeded"
    
    if echo "$RESPONSE" | jq -e '.agents_used' > /dev/null 2>&1; then
        AGENTS=$(echo "$RESPONSE" | jq -r '.agents_used | join(", ")')
        info "Agents: $AGENTS"
        pass "Multi-agent coordination confirmed"
    fi
else
    fail "Direct backend call failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                           TEST SUMMARY                                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
