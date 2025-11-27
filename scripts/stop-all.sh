#!/bin/bash
# ============================================================================
# Stop DAARION ALL-IN-ONE Stack
# Phase INFRA
# ============================================================================

echo "🛑 Stopping DAARION ALL-IN-ONE Stack..."
docker-compose -f docker-compose.all.yml down

echo ""
echo "✅ All services stopped"
echo ""
echo "To remove volumes (⚠️  WARNING: This will delete all data):"
echo "  docker-compose -f docker-compose.all.yml down -v"
echo ""

