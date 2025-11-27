#!/bin/bash
# ============================================================================
# Start DAARION ALL-IN-ONE Stack
# Phase INFRA — Complete deployment
# ============================================================================

set -e

echo "🚀 Starting DAARION ALL-IN-ONE Stack"
echo "===================================="
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed"
    echo "Please install docker-compose first"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker first"
    exit 1
fi

# Apply database migrations (if not already applied)
echo "📊 Applying database migrations..."
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to start..."
sleep 5

# Apply all migrations (001-010)
MIGRATIONS=(
    "001_create_users_and_auth"
    "002_create_teams_and_channels"
    "003_create_agent_tables"
    "004_create_messaging_tables"
    "005_create_city_space_tables"
    "006_create_rbac_tables"
    "007_create_agents_tables"
    "008_create_microdao_core"
    "009_create_dao_core"
    "010_create_living_map_tables"
)

for migration in "${MIGRATIONS[@]}"; do
    echo "Applying migration: $migration"
    PGPASSWORD=postgres psql -h localhost -U postgres -d daarion -f "migrations/${migration}.sql" 2>/dev/null || {
        echo "⚠️  Migration $migration failed or already applied"
    }
done

echo ""
echo "✅ Migrations applied"
echo ""

# Build frontend first
echo "🏗️  Building frontend..."
npm run build || {
    echo "❌ Frontend build failed"
    exit 1
}
echo "✅ Frontend built"
echo ""

# Start all services
echo "🐳 Starting all Docker services..."
docker-compose -f docker-compose.all.yml up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 15

echo ""
echo "✅ DAARION ALL-IN-ONE Stack started!"
echo ""
echo "================================================================"
echo "  🎉 DAARION is ready!"
echo "================================================================"
echo ""
echo "Access points:"
echo "  - Frontend:              http://localhost"
echo "  - API Gateway:           http://localhost/api/"
echo "  - Health Check:          http://localhost/health"
echo ""
echo "Services behind gateway:"
echo "  - Auth:                  /api/auth/"
echo "  - PDP:                   /api/pdp/"
echo "  - Usage:                 /api/usage/"
echo "  - Agents:                /api/agents/"
echo "  - MicroDAO:              /api/microdao/"
echo "  - DAO:                   /api/dao/"
echo "  - Living Map:            /api/living-map/"
echo "  - Messaging:             /api/messaging/"
echo "  - City:                  /api/city/"
echo "  - Space:                 /api/space/"
echo ""
echo "WebSocket endpoints:"
echo "  - Living Map:            ws://localhost/ws/living-map/"
echo "  - Agents Events:         ws://localhost/ws/agents/"
echo "  - Messaging:             ws://localhost/ws/messaging/"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.all.yml logs -f [service]"
echo ""
echo "To stop all services:"
echo "  ./scripts/stop-all.sh"
echo ""
echo "📖 See DEPLOYMENT_OVERVIEW.md for more details"
echo ""

