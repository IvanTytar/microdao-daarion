#!/bin/bash
# Smoke test suite for DAGI Stack
# Tests all 5 services with basic requests

set -e

ROUTER_URL="http://localhost:9102"
DEVTOOLS_URL="http://localhost:8008"
CREWAI_URL="http://localhost:9010"
RBAC_URL="http://localhost:9200"
GATEWAY_URL="http://localhost:9300"

echo "🧪 DAGI Stack Smoke Tests"
echo "========================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

test_health() {
  local name=$1
  local url=$2
  
  echo -n "Testing $name health... "
  if curl -s -f "$url/health" > /dev/null; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
    return 1
  fi
}

test_router_llm() {
  echo -n "Testing Router → LLM... "
  response=$(curl -s -X POST "$ROUTER_URL/route" \
    -H "Content-Type: application/json" \
    -d '{
      "prompt": "Say hello",
      "mode": "chat",
      "metadata": {}
    }' || echo "")
  
  if [[ "$response" == *"response"* ]] || [[ "$response" == *"Hello"* ]] || [[ "$response" == *"hello"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC} (may require Ollama running)"
    ((FAILED++))
  fi
}

test_devtools() {
  echo -n "Testing DevTools → fs_read... "
  response=$(curl -s -X POST "$DEVTOOLS_URL/fs/read" \
    -H "Content-Type: application/json" \
    -d '{
      "path": "README.md"
    }' || echo "")
  
  if [[ "$response" == *"content"* ]] || [[ "$response" == *"status"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

test_crewai() {
  echo -n "Testing CrewAI → workflow list... "
  response=$(curl -s -X GET "$CREWAI_URL/workflow/list" || echo "")
  
  if [[ "$response" == *"workflows"* ]] || [[ "$response" == *"microdao_onboarding"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

test_rbac() {
  echo -n "Testing RBAC → role resolve... "
  response=$(curl -s -X POST "$RBAC_URL/rbac/resolve" \
    -H "Content-Type: application/json" \
    -d '{
      "dao_id": "greenfood-dao",
      "user_id": "tg:12345"
    }' || echo "")
  
  if [[ "$response" == *"role"* ]] || [[ "$response" == *"entitlements"* ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

test_gateway() {
  echo -n "Testing Gateway → health... "
  response=$(curl -s -f "$GATEWAY_URL/health" || echo "")
  
  if [[ "$response" == *"status"* ]] || [[ "$response" == "OK" ]]; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

echo ""
echo "Running tests..."
echo ""

# Health checks
test_health "Router" "$ROUTER_URL"
test_health "DevTools" "$DEVTOOLS_URL"
test_health "CrewAI" "$CREWAI_URL"
test_health "RBAC" "$RBAC_URL"
test_health "Gateway" "$GATEWAY_URL"

echo ""
echo "Functional tests..."
echo ""

# Functional tests
test_router_llm
test_devtools
test_crewai
test_rbac
test_gateway

echo ""
echo "========================="
echo "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
