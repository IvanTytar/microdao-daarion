#!/bin/bash
# Test FastAPI DAGI Router

API_URL="http://127.0.0.1:9102"

echo "=== Testing DAGI Router FastAPI ==="
echo ""

echo "1. Health Check:"
curl -s $API_URL/health | python3 -m json.tool
echo -e "\n"

echo "2. Root Info:"
curl -s $API_URL/ | python3 -m json.tool
echo -e "\n"

echo "3. Providers List:"
curl -s $API_URL/providers | python3 -m json.tool
echo -e "\n"

echo "4. Routing Rules:"
curl -s $API_URL/routing | python3 -m json.tool
echo -e "\n"

echo "5. Simple DevTools Request:"
curl -s -X POST $API_URL/route \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "devtools",
    "message": "Що таке memory leak?"
  }' | python3 -m json.tool
echo -e "\n"

echo "6. Request with task_type:"
curl -s -X POST $API_URL/route \
  -H "Content-Type: application/json" \
  -d '{
    "agent": "devtools",
    "message": "Як виправити баг?",
    "payload": {"task_type": "bugfix"}
  }' | python3 -m json.tool
echo -e "\n"

echo "=== Tests Complete ==="
