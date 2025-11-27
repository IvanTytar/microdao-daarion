#!/bin/bash
# Start DAARION Phase 7 — microDAO Console

echo "🚀 Starting DAARION Phase 7..."
echo ""

# Apply migration 008
echo "📦 Applying migration 008 (microDAO Core)..."
docker-compose -f docker-compose.phase7.yml exec -T postgres psql -U postgres -d daarion < migrations/008_create_microdao_core.sql || echo "Migration already applied or failed (continuing...)"

echo ""
echo "🐳 Starting all services..."
docker-compose -f docker-compose.phase7.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ DAARION Phase 7 started!"
echo ""
echo "Services:"
echo "  - microdao-service: http://localhost:7015 ⭐ NEW"
echo "  - agents-service:   http://localhost:7014"
echo "  - auth-service:     http://localhost:7011"
echo "  - MicroDAO Console: http://localhost:3000/microdao"
echo ""
echo "To view logs: docker-compose -f docker-compose.phase7.yml logs -f"
echo "To stop: ./scripts/stop-phase7.sh"

