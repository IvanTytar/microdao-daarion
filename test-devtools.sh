#!/bin/bash
# End-to-end test for DevTools integration
# Tests Router → DevTools Backend → Response flow

# set -e

ROUTER_URL="http://127.0.0.1:9102"
DEVTOOLS_URL="http://127.0.0.1:8008"

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║          DevTools Integration E2E Test                                   ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
# Test 0: Check services are running
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

info "Checking DevTools Backend @ $DEVTOOLS_URL"
if curl -s "$DEVTOOLS_URL/health" | grep -q "healthy"; then
    pass "DevTools backend is healthy"
else
    fail "DevTools backend is not responding"
    echo "  Please start DevTools backend: python devtools-backend/main.py"
    exit 1
fi

echo ""

# ============================================================================
# Test 1: fs_read via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: fs_read - Read router-config.yml"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Sending request..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "devtools",
    "message": "read config",
    "payload": {
      "tool": "fs_read",
      "params": {
        "path": "/opt/dagi-router/router-config.yml"
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    pass "fs_read succeeded"
    
    # Check if file content is present
    if echo "$RESPONSE" | jq -e '.data.content' | grep -q "DAGI Router"; then
        pass "File content contains expected data"
    else
        fail "File content missing or invalid"
    fi
else
    fail "fs_read failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 2: fs_write via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: fs_write - Write test file"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TEST_FILE="/tmp/devtools-test-$(date +%s).txt"
TEST_CONTENT="DevTools E2E Test - $(date)"

info "Writing to $TEST_FILE"
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d "{
    \"mode\": \"devtools\",
    \"message\": \"write test file\",
    \"payload\": {
      \"tool\": \"fs_write\",
      \"params\": {
        \"path\": \"$TEST_FILE\",
        \"content\": \"$TEST_CONTENT\"
      }
    }
  }")

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    pass "fs_write succeeded"
    
    # Verify file was actually written
    if [ -f "$TEST_FILE" ] && grep -q "DevTools E2E Test" "$TEST_FILE"; then
        pass "File was written and contains expected content"
        rm -f "$TEST_FILE"
    else
        fail "File was not written correctly"
    fi
else
    fail "fs_write failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 3: run_tests via Router
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: run_tests - Run pytest"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Running tests via DevTools..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "devtools",
    "message": "run tests",
    "payload": {
      "tool": "run_tests",
      "params": {
        "test_path": "test_config_loader.py"
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    pass "run_tests succeeded"
    
    # Check test results
    PASSED=$(echo "$RESPONSE" | jq -r '.data.passed')
    FAILED=$(echo "$RESPONSE" | jq -r '.data.failed')
    
    info "Tests passed: $PASSED, failed: $FAILED"
    
    if [ "$PASSED" -gt 0 ]; then
        info "Tests result: passed=$PASSED, failed=$FAILED" && pass "run_tests completed"
    fi
else
    fail "run_tests failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 4: notebook_execute via Router (simulated)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: notebook_execute - Simulate notebook execution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Executing notebook (simulated)..."
RESPONSE=$(curl -s -X POST "$ROUTER_URL/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "devtools",
    "message": "execute notebook",
    "payload": {
      "tool": "notebook_execute",
      "params": {
        "notebook_path": "/tmp/test.ipynb",
        "cell_index": 0
      }
    }
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    pass "notebook_execute succeeded"
    
    if echo "$RESPONSE" | jq -e '.data.status == "simulated"' > /dev/null; then
        pass "Notebook execution simulated (MVP)"
    fi
else
    fail "notebook_execute failed"
    echo "$RESPONSE" | jq .
fi

echo ""

# ============================================================================
# Test 5: Direct DevTools backend test
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: Direct DevTools Backend - fs_read"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info "Calling DevTools backend directly..."
RESPONSE=$(curl -s -X POST "$DEVTOOLS_URL/fs/read" \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/opt/dagi-router/requirements.txt",
    "user_id": "test-user"
  }')

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    pass "Direct DevTools backend call succeeded"
    
    if echo "$RESPONSE" | jq -e '.content' | grep -q "fastapi"; then
        pass "requirements.txt contains expected packages"
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
