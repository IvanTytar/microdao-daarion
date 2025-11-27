#!/bin/bash

# Stop Phase 2 Agent Integration Services

echo "🛑 Stopping DAARION Phase 2 Services..."
echo ""

docker-compose -f docker-compose.agents.yml down

echo ""
echo "✅ Phase 2 services stopped"
echo ""
echo "To remove volumes:"
echo "  docker-compose -f docker-compose.agents.yml down -v"




