#!/bin/bash
# ============================================================================
# Start Phase 8 — DAO Dashboard
# ============================================================================

set -e

echo "🚀 Starting DAARION Phase 8 — DAO Dashboard"
echo "============================================"

# Apply database migrations
echo ""
echo "📊 Applying database migrations..."
echo "Note: Make sure PostgreSQL is running first"
echo ""

# Migration 009: DAO Core
PGPASSWORD=postgres psql -h localhost -U postgres -d daarion -f migrations/009_create_dao_core.sql || {
  echo "⚠️  Migration 009 failed or already applied"
}

echo ""
echo "✅ Migrations applied"

# Start all services
echo ""
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.phase8.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Phase 8 services started!"
echo ""
echo "Services:"
echo "  - PostgreSQL:        http://localhost:5432"
echo "  - NATS:              http://localhost:4222"
echo "  - Auth Service:      http://localhost:7011"
echo "  - PDP Service:       http://localhost:7012"
echo "  - Usage Engine:      http://localhost:7013"
echo "  - Agents Service:    http://localhost:7014"
echo "  - MicroDAO Service:  http://localhost:7015"
echo "  - 🗳️  DAO Service:   http://localhost:7016"
echo ""
echo "Frontend:"
echo "  - DAO List:          http://localhost:5173/dao"
echo "  - DAO Dashboard:     http://localhost:5173/dao/{slug}"
echo ""
echo "📖 See PHASE8_READY.md for more details"
echo ""

