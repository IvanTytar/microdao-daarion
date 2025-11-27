#!/bin/bash

echo "🚀 Starting DAARION Phase 3 services..."
echo ""

# Check if .env.phase3 exists
if [ ! -f .env.phase3 ]; then
    echo "⚠️  .env.phase3 not found. Creating from example..."
    cp .env.phase3.example .env.phase3
    echo "✅ Created .env.phase3 - please edit it with your API keys"
    echo ""
fi

# Load environment
export $(cat .env.phase3 | grep -v '^#' | xargs)

# Build and start services
echo "📦 Building services..."
docker-compose -f docker-compose.phase3.yml build

echo ""
echo "▶️  Starting services..."
docker-compose -f docker-compose.phase3.yml up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Phase 3 services started!"
echo ""
echo "📊 Service Status:"
echo "  - LLM Proxy:            http://localhost:7007/health"
echo "  - Memory Orchestrator:  http://localhost:7008/health"
echo "  - Toolcore:             http://localhost:7009/health"
echo "  - Agent Runtime:        http://localhost:7006/health"
echo "  - Agent Filter:         http://localhost:7005/health"
echo "  - Router:               http://localhost:8000/health"
echo "  - Messaging Service:    http://localhost:7004/api/messaging/health"
echo "  - PostgreSQL:           localhost:5432"
echo "  - NATS:                 localhost:4222 (monitoring: localhost:8222)"
echo ""
echo "📝 View logs:"
echo "  docker-compose -f docker-compose.phase3.yml logs -f [service]"
echo ""
echo "🛑 Stop services:"
echo "  ./scripts/stop-phase3.sh"
echo ""




