#!/bin/bash
# ============================================================================
# Stop Phase 8 — DAO Dashboard
# ============================================================================

echo "🛑 Stopping DAARION Phase 8 services..."
docker-compose -f docker-compose.phase8.yml down

echo "✅ Phase 8 services stopped"

