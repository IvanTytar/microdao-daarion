#!/bin/bash

# Start Phase 2 Agent Integration Services

echo "🚀 Starting DAARION Phase 2 Services..."
echo ""

# Check if docker network exists
if ! docker network inspect daarion >/dev/null 2>&1; then
    echo "📦 Creating daarion network..."
    docker network create daarion
fi

# Start services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.agents.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Phase 2 services started!"
echo ""
echo "Services:"
echo "  - agent-filter: http://localhost:7005"
echo "  - router: http://localhost:8000"
echo "  - agent-runtime: http://localhost:7006"
echo ""
echo "Check status:"
echo "  docker ps | grep -E '(agent-filter|router|agent-runtime)'"
echo ""
echo "Check logs:"
echo "  docker logs -f agent-filter"
echo "  docker logs -f router"
echo "  docker logs -f agent-runtime"
echo ""
echo "Run tests:"
echo "  ./scripts/test-phase2-e2e.sh"





