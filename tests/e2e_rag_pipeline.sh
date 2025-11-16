#!/bin/bash
# E2E test script for RAG pipeline: ingest → query

set -e

PARSER_URL="${PARSER_URL:-http://localhost:9400}"
RAG_URL="${RAG_URL:-http://localhost:9500}"
ROUTER_URL="${ROUTER_URL:-http://localhost:9102}"

echo "=== E2E RAG Pipeline Test ==="
echo ""

# Step 1: Ingest document
echo "Step 1: Ingesting document via /ocr/ingest..."
INGEST_RESPONSE=$(curl -s -X POST "${PARSER_URL}/ocr/ingest" \
  -F "file=@tests/fixtures/parsed_json_example.json" \
  -F "dao_id=daarion" \
  -F "doc_id=microdao-tokenomics-2025-11")

echo "Ingest response:"
echo "$INGEST_RESPONSE" | jq '.'
echo ""

DOC_ID=$(echo "$INGEST_RESPONSE" | jq -r '.doc_id')
RAG_INGESTED=$(echo "$INGEST_RESPONSE" | jq -r '.rag_ingested')

if [ "$RAG_INGESTED" != "true" ]; then
  echo "ERROR: Document was not ingested into RAG"
  exit 1
fi

echo "✓ Document ingested: doc_id=${DOC_ID}"
echo ""

# Step 2: Query via RAG Service directly
echo "Step 2: Querying RAG Service directly..."
RAG_QUERY_RESPONSE=$(curl -s -X POST "${RAG_URL}/query" \
  -H "Content-Type: application/json" \
  -d '{
    "dao_id": "daarion",
    "question": "Поясни токеноміку microDAO і роль стейкінгу"
  }')

echo "RAG query response:"
echo "$RAG_QUERY_RESPONSE" | jq '.'
echo ""

ANSWER=$(echo "$RAG_QUERY_RESPONSE" | jq -r '.answer')
CITATIONS_COUNT=$(echo "$RAG_QUERY_RESPONSE" | jq '.citations | length')

if [ -z "$ANSWER" ] || [ "$ANSWER" == "null" ]; then
  echo "ERROR: Empty answer from RAG Service"
  exit 1
fi

if [ "$CITATIONS_COUNT" -eq 0 ]; then
  echo "WARNING: No citations returned"
fi

echo "✓ RAG query successful: answer length=${#ANSWER}, citations=${CITATIONS_COUNT}"
echo ""

# Step 3: Query via Router (mode="rag_query")
echo "Step 3: Querying via Router (mode=rag_query)..."
ROUTER_QUERY_RESPONSE=$(curl -s -X POST "${ROUTER_URL}/route" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "rag_query",
    "dao_id": "daarion",
    "user_id": "test-user",
    "payload": {
      "question": "Поясни токеноміку microDAO і роль стейкінгу"
    }
  }')

echo "Router query response:"
echo "$ROUTER_QUERY_RESPONSE" | jq '.'
echo ""

ROUTER_OK=$(echo "$ROUTER_QUERY_RESPONSE" | jq -r '.ok')
ROUTER_TEXT=$(echo "$ROUTER_QUERY_RESPONSE" | jq -r '.data.text // .data.answer // ""')
ROUTER_CITATIONS=$(echo "$ROUTER_QUERY_RESPONSE" | jq '.data.citations // .metadata.citations // []')

if [ "$ROUTER_OK" != "true" ]; then
  echo "ERROR: Router query failed"
  exit 1
fi

if [ -z "$ROUTER_TEXT" ] || [ "$ROUTER_TEXT" == "null" ]; then
  echo "ERROR: Empty answer from Router"
  exit 1
fi

ROUTER_CITATIONS_COUNT=$(echo "$ROUTER_CITATIONS" | jq 'length')

echo "✓ Router query successful: answer length=${#ROUTER_TEXT}, citations=${ROUTER_CITATIONS_COUNT}"
echo ""

echo "=== E2E Test Complete ==="
echo "All steps passed successfully!"

