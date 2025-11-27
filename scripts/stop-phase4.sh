#!/bin/bash
# Stop DAARION Phase 4 Services

echo "🛑 Stopping DAARION Phase 4 services..."

docker-compose -f docker-compose.phase4.yml down

echo "✅ Phase 4 services stopped"





