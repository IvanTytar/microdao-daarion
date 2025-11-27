#!/bin/bash

echo "🛑 Stopping DAARION Phase 3 services..."
echo ""

docker-compose -f docker-compose.phase3.yml down

echo ""
echo "✅ Phase 3 services stopped"
echo ""
echo "To remove volumes (DB data):"
echo "  docker-compose -f docker-compose.phase3.yml down -v"
echo ""





