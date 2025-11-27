#!/bin/bash

# Start City and Space services with API Gateway

set -e

echo "🚀 Starting DAARION City + Space Services..."

# Build and start services
docker-compose -f docker-compose.city-space.yml up -d --build

echo ""
echo "✅ Services started!"
echo ""
echo "📊 Service URLs:"
echo "   City Service:    http://localhost:7001"
echo "   Space Service:   http://localhost:7002"
echo "   API Gateway:     http://localhost:8080"
echo ""
echo "🏥 Health Checks:"
echo "   City:    curl http://localhost:8080/health/city"
echo "   Space:   curl http://localhost:8080/health/space"
echo "   Gateway: curl http://localhost:8080/health"
echo ""
echo "📡 API Endpoints:"
echo "   City Snapshot:   http://localhost:8080/api/city/snapshot"
echo "   Space Planets:   http://localhost:8080/space/planets"
echo "   Space Nodes:     http://localhost:8080/space/nodes"
echo "   Space Events:    http://localhost:8080/space/events"
echo ""
echo "📖 API Docs:"
echo "   City:    http://localhost:7001/docs"
echo "   Space:   http://localhost:7002/docs"
echo ""
echo "📝 View logs:"
echo "   docker-compose -f docker-compose.city-space.yml logs -f"




