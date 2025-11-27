#!/bin/bash
# Test Node Registry locally with SQLite

set -e

echo "🧪 Testing Node Registry Service (SQLite)"
echo ""

# Set environment for SQLite
export NODE_REGISTRY_ENV="development"
export NODE_REGISTRY_HTTP_PORT="9205"
export NODE_REGISTRY_DB_FILE="test_node_registry.db"

# Clean up old database
rm -f test_node_registry.db
echo "✅ Cleaned up old database"

# Start Node Registry in background
echo "🚀 Starting Node Registry Service..."
cd "$(dirname "$0")"

# Use SQLite database module
cp app/database_sqlite.py app/database.py

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 9205 --reload &
REGISTRY_PID=$!
echo "📝 Node Registry PID: $REGISTRY_PID"

# Wait for service to start
echo "⏳ Waiting for service to start..."
sleep 5

# Test health endpoint
echo ""
echo "1️⃣ Testing /health endpoint:"
curl -s http://localhost:9205/health | python3 -m json.tool

# Test bootstrap agent
echo ""
echo "2️⃣ Installing bootstrap dependencies..."
cd bootstrap
pip3 install -q -r requirements.txt

echo ""
echo "3️⃣ Starting bootstrap agent..."
export NODE_REGISTRY_URL="http://localhost:9205"
export NODE_ROLE="development"
export NODE_TYPE="router"
export HEARTBEAT_INTERVAL="10"

# Run bootstrap for 30 seconds
timeout 30 python3 node_bootstrap.py &
BOOTSTRAP_PID=$!
echo "📝 Bootstrap PID: $BOOTSTRAP_PID"

# Wait for registration
sleep 15

# Check nodes
echo ""
echo "4️⃣ Checking registered nodes:"
curl -s http://localhost:9205/api/v1/nodes | python3 -m json.tool

# Check network stats
echo ""
echo "5️⃣ Network statistics:"
curl -s http://localhost:9205/metrics | python3 -m json.tool

# Cleanup
echo ""
echo "🧹 Cleaning up..."
kill $REGISTRY_PID 2>/dev/null || true
kill $BOOTSTRAP_PID 2>/dev/null || true

echo ""
echo "✅ Test completed!"
echo ""
echo "📊 Database file: test_node_registry.db"
echo "💡 To inspect: sqlite3 test_node_registry.db"

