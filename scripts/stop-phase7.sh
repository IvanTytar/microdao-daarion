#!/bin/bash
# Stop DAARION Phase 7

echo "🛑 Stopping DAARION Phase 7..."
docker-compose -f docker-compose.phase7.yml down

echo "✅ Phase 7 stopped!"

