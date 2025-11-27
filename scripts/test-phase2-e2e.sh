#!/bin/bash

# DAARION Phase 2 E2E Test Script
# Tests the full agent integration flow

set -e

echo "🧪 DAARION Phase 2 E2E Test"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AGENT_FILTER_URL="http://localhost:7005"
ROUTER_URL="http://localhost:8000"
AGENT_RUNTIME_URL="http://localhost:7006"
MESSAGING_SERVICE_URL="http://localhost:7004"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass_test() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

fail_test() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    ((TESTS_FAILED++))
}

warn_test() {
    echo -e "${YELLOW}⚠️  WARN:${NC} $1"
}

# Test 1: Health Checks
echo "Test 1: Health Checks"
echo "----------------------"

if curl -s "$AGENT_FILTER_URL/health" | grep -q '"status":"ok"'; then
    pass_test "agent-filter is healthy"
else
    fail_test "agent-filter is not healthy"
fi

if curl -s "$ROUTER_URL/health" | grep -q '"status":"ok"'; then
    pass_test "router is healthy"
else
    fail_test "router is not healthy"
fi

if curl -s "$AGENT_RUNTIME_URL/health" | grep -q '"status":"ok"'; then
    pass_test "agent-runtime is healthy"
else
    fail_test "agent-runtime is not healthy"
fi

if curl -s "$MESSAGING_SERVICE_URL/health" | grep -q '"status":"ok"'; then
    pass_test "messaging-service is healthy"
else
    fail_test "messaging-service is not healthy"
fi

echo ""

# Test 2: Agent Filter Test
echo "Test 2: Agent Filter Decision"
echo "------------------------------"

FILTER_TEST_PAYLOAD='{
  "channel_id": "7c72d497-27aa-4e75-bb2f-4a4a21d4f91f",
  "matrix_event_id": "$test123:matrix.daarion.city",
  "sender_id": "user:93",
  "sender_type": "human",
  "microdao_id": "microdao:daarion",
  "created_at": "2025-11-24T12:00:00Z"
}'

FILTER_RESPONSE=$(curl -s -X POST "$AGENT_FILTER_URL/internal/agent-filter/test" \
  -H "Content-Type: application/json" \
  -d "$FILTER_TEST_PAYLOAD")

if echo "$FILTER_RESPONSE" | grep -q '"decision":"allow"'; then
    pass_test "agent-filter allows message"
else
    fail_test "agent-filter did not allow message"
    echo "Response: $FILTER_RESPONSE"
fi

if echo "$FILTER_RESPONSE" | grep -q '"target_agent_id":"agent:sofia"'; then
    pass_test "agent-filter targets correct agent"
else
    fail_test "agent-filter did not target correct agent"
fi

echo ""

# Test 3: Router Test
echo "Test 3: Router Invocation"
echo "-------------------------"

ROUTER_TEST_PAYLOAD='{
  "channel_id": "7c72d497-27aa-4e75-bb2f-4a4a21d4f91f",
  "matrix_event_id": "$test123:matrix.daarion.city",
  "microdao_id": "microdao:daarion",
  "decision": "allow",
  "target_agent_id": "agent:sofia"
}'

ROUTER_RESPONSE=$(curl -s -X POST "$ROUTER_URL/internal/router/test-messaging" \
  -H "Content-Type: application/json" \
  -d "$ROUTER_TEST_PAYLOAD")

if echo "$ROUTER_RESPONSE" | grep -q '"agent_id":"agent:sofia"'; then
    pass_test "router creates invocation"
else
    fail_test "router did not create invocation"
    echo "Response: $ROUTER_RESPONSE"
fi

if echo "$ROUTER_RESPONSE" | grep -q '"entrypoint":"channel_message"'; then
    pass_test "router sets correct entrypoint"
else
    fail_test "router did not set correct entrypoint"
fi

echo ""

# Test 4: NATS Connection Check
echo "Test 4: NATS Connection"
echo "-----------------------"

if curl -s "$AGENT_FILTER_URL/health" | grep -q '"nats_connected":true'; then
    pass_test "agent-filter connected to NATS"
else
    warn_test "agent-filter not connected to NATS (may be running in test mode)"
fi

if curl -s "$ROUTER_URL/health" | grep -q '"nats_connected":true'; then
    pass_test "router connected to NATS"
else
    warn_test "router not connected to NATS (may be running in test mode)"
fi

if curl -s "$AGENT_RUNTIME_URL/health" | grep -q '"nats_connected":true'; then
    pass_test "agent-runtime connected to NATS"
else
    warn_test "agent-runtime not connected to NATS (may be running in test mode)"
fi

echo ""

# Test 5: Messaging Service Internal Endpoints
echo "Test 5: Messaging Service Internal Endpoints"
echo "---------------------------------------------"

# Test channel context endpoint
CONTEXT_RESPONSE=$(curl -s "$MESSAGING_SERVICE_URL/internal/messaging/channels/7c72d497-27aa-4e75-bb2f-4a4a21d4f91f/context" || echo "")

if echo "$CONTEXT_RESPONSE" | grep -q 'microdao_id'; then
    pass_test "channel context endpoint works"
else
    warn_test "channel context endpoint may not be available (expected in Phase 2)"
fi

echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Check logs: docker logs -f agent-filter"
    echo "2. Send a real message in Messenger UI"
    echo "3. Watch for agent reply in 3-5 seconds"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check services are running: docker ps"
    echo "2. Check logs: docker logs agent-filter"
    echo "3. Check NATS: docker logs nats"
    exit 1
fi





