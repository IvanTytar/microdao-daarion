#!/bin/bash
# Stop DAARION Phase 6

echo "🛑 Stopping DAARION Phase 6..."
docker-compose -f docker-compose.phase6.yml down

echo "✅ Phase 6 stopped!"

