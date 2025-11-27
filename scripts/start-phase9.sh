#!/bin/bash
# ============================================================================
# Start Phase 9A — Living Map (Backend)
# ============================================================================

set -e

echo "🚀 Starting DAARION Phase 9A — Living Map (Backend)"
echo "===================================================="

# Apply database migrations
echo ""
echo "📊 Applying database migrations..."
echo "Note: Make sure PostgreSQL is running first"
echo ""

# Migration 010: Living Map
PGPASSWORD=postgres psql -h localhost -U postgres -d daarion -f migrations/010_create_living_map_tables.sql || {
  echo "⚠️  Migration 010 failed or already applied"
}

echo ""
echo "✅ Migrations applied"

# Start all services
echo ""
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.phase9.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Phase 9A services started!"
echo ""
echo "Services:"
echo "  - PostgreSQL:           http://localhost:5432"
echo "  - NATS:                 http://localhost:4222"
echo "  - Auth Service:         http://localhost:7011"
echo "  - PDP Service:          http://localhost:7012"
echo "  - Usage Engine:         http://localhost:7013"
echo "  - Agents Service:       http://localhost:7014"
echo "  - MicroDAO Service:     http://localhost:7015"
echo "  - DAO Service:          http://localhost:7016"
echo "  - 🗺️  Living Map Service: http://localhost:7017"
echo ""
echo "Living Map API:"
echo "  - Health:               http://localhost:7017/living-map/health"
echo "  - Snapshot:             http://localhost:7017/living-map/snapshot"
echo "  - Entities:             http://localhost:7017/living-map/entities"
echo "  - History:              http://localhost:7017/living-map/history"
echo "  - WebSocket Stream:     ws://localhost:7017/living-map/stream"
echo ""
echo "📖 See PHASE9A_BACKEND_READY.md for more details"
echo ""

