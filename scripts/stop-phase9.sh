#!/bin/bash
# ============================================================================
# Stop Phase 9A — Living Map
# ============================================================================

echo "🛑 Stopping DAARION Phase 9A services..."
docker-compose -f docker-compose.phase9.yml down

echo "✅ Phase 9A services stopped"

