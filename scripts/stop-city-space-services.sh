#!/bin/bash

# Stop City and Space services

set -e

echo "🛑 Stopping DAARION City + Space Services..."

docker-compose -f docker-compose.city-space.yml down

echo "✅ Services stopped!"





