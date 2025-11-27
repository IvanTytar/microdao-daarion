#!/bin/bash
# Start DAARION Phase 6 — Agent Lifecycle

echo "🚀 Starting DAARION Phase 6..."
echo ""

# Apply migration 007
echo "📦 Applying migration 007 (Agent Lifecycle tables)..."
docker-compose -f docker-compose.phase6.yml exec -T postgres psql -U postgres -d daarion < migrations/007_create_agents_tables.sql || echo "Migration already applied or failed (continuing...)"

echo ""
echo "🐳 Starting all services..."
docker-compose -f docker-compose.phase6.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ DAARION Phase 6 started!"
echo ""
echo "Services:"
echo "  - agents-service:  http://localhost:7014"
echo "  - auth-service:    http://localhost:7011"
echo "  - pdp-service:     http://localhost:7012"
echo "  - usage-engine:    http://localhost:7013"
echo "  - Agent Hub UI:    http://localhost:3000/agent-hub"
echo ""
echo "WebSocket:"
echo "  - ws://localhost:7014/ws/agents/stream"
echo ""
echo "To view logs: docker-compose -f docker-compose.phase6.yml logs -f"
echo "To stop: ./scripts/stop-phase6.sh"

